"""Esquemas de montagem (Fritzing) da sequencia de sensores: 6 sensores x (Uno, ESP32).
python esquemas.py -> saida/*.fzz + *.png"""
import os, sys
from fzgen import *
from export import export

UNO, ESP32 = "arduino_Uno_Rev3(fix)", "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, FULL = "13f88e58b86d08d73d112f0fb05e6968", "Breadboard-RSR03MB102-ModuleID"
RES = "ResistorModuleID"
DS18B20 = "DS18B20_fixed"                                   # c1 GND, c2 DQ, c3 VDD
DHT11 = "41f4209de2050129a62e62f6e2389ac4"                  # c1 VDD, c2 DATA, c3 NULL, c4 GND
MQ = "MQ-5_1"                                               # modulo 4 pinos: c0 VCC, c1 GND, c2 DO, c3 AO
BME680 = "adafruit_e653382e480159c08504cf3dc924d346_1"      # header: c37 VIN, c38 3V3, c39 GND, c40 SCL, c41 SDO, c42 SDA, c43 CS
PH = "prefix0000_642e08dceb3d1de4c31ea2bcfb635c6f_1"        # c0 A (Po), c1 +5V, c2 GND
UNO_5V, UNO_GND, UNO_A0, UNO_A4, UNO_A5, UNO_D2, UNO_D3 = "connector87", "connector88", "connector0", "connector4", "connector5", "connector63", "connector64"
ESP_3V3, ESP_GND_R, ESP_GND_L, ESP_VIN = "connector0", "connector1", "connector28", "connector29"
ESP = {"D4": "connector4", "D34": "connector18", "D27": "connector24", "D21": "connector10", "D22": "connector13"}

def rz(col): return col + 1 if col % 6 == 2 else col
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

# ---------- blocos reutilizaveis ----------
def base_uno():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_5V, bb, "pin3X", VERMELHO)          # trilha de baixo: X = +5 V, W = GND
    sk.wire(uno, UNO_GND, bb, "pin3W", PRETO)
    return sk, uno, bb

def base_esp32(alim_x=ESP_3V3, cor=VERMELHO):
    """ESP32 + protoboard 830. Trilha de baixo X = alimentacao do sensor (3V3 ou VIN), W = GND. Trilha de cima Z = GND."""
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(FULL, "Protoboard 830", 160, 30))
    sk.wire(esp, alim_x, bb, "pin3X", cor)
    sk.wire(esp, ESP_GND_R, bb, "pin3W", PRETO)
    sk.wire(esp, ESP_GND_L, bb, "pin3Z", PRETO)
    return sk, esp, bb

def montar_topo(sk, bb, mid, titulo, col, pinos):
    """monta a peca com os pinos (lista de connectorId, na ordem da esquerda p/ direita) na linha J a partir de col"""
    p = sk.add(Part(mid, titulo, 0, 0))
    sk.mount(p, pinos[0], bb, f"pin{col}J", others=[(c, f"pin{col+i}J") for i, c in enumerate(pinos) if i])
    return p

def divisor(sk, bb, col_sinal, col_no, placa, gpio):
    """AO(col_sinal) -> 1k -> no (col_no) -> 2k -> GND (trilha Z); no -> GPIO"""
    r1 = sk.add(Part(RES, "1 kΩ", 0, 0, props={"resistance": "1k"}))
    sk.mount(r1, "connector0", bb, f"pin{col_sinal}G", others=[("connector1", f"pin{col_no}G")])
    r2 = sk.add(Part(RES, "2 kΩ", 0, 0, props={"resistance": "2k"}))
    sk.mount(r2, "connector0", bb, f"pin{col_no}H", others=[("connector1", f"pin{col_no+4}H")])
    sk.wire(bb, f"pin{col_no+4}J", bb, f"pin{rz(col_no+4)}Z", PRETO)
    sk.wire(bb, f"pin{col_no}I", placa, gpio, AMARELO)

# ---------- 1. DS18B20 ----------
def ds18b20(sk, placa, bb, pino_dados):
    montar_topo(sk, bb, DS18B20, "DS18B20", 10, ["connector1", "connector2", "connector3"])   # GND DQ VDD
    sk.wire(bb, "pin10F", bb, "pin10W", PRETO)
    sk.wire(bb, "pin12F", bb, "pin12X", VERMELHO)
    r = sk.add(Part(RES, "4,7 kΩ", 0, 0, props={"resistance": "4.7k"}))
    sk.mount(r, "connector0", bb, "pin11G", others=[("connector1", "pin15G")])            # pull-up DQ -> +
    sk.wire(bb, "pin15F", bb, "pin15X", VERMELHO)
    sk.wire(bb, "pin11H", placa, pino_dados, AMARELO)
def e1(): sk, uno, bb = base_uno(); ds18b20(sk, uno, bb, UNO_D2); return sk.save(SAIDA, "01_ds18b20_uno")
def e1b(): sk, esp, bb = base_esp32(); ds18b20(sk, esp, bb, ESP["D4"]); return sk.save(SAIDA, "01b_ds18b20_esp32")

# ---------- 2. DHT11 ----------
def dht11(sk, placa, bb, pino_dados):
    montar_topo(sk, bb, DHT11, "DHT11", 10, ["connector1", "connector2", "connector3", "connector4"])   # VDD DATA NC GND
    sk.wire(bb, "pin10F", bb, "pin10X", VERMELHO)
    sk.wire(bb, "pin13F", bb, "pin13W", PRETO)
    r = sk.add(Part(RES, "10 kΩ", 0, 0, props={"resistance": "10k"}))
    sk.mount(r, "connector0", bb, "pin11G", others=[("connector1", "pin15G")])            # pull-up DATA -> + (so no sensor de 4 pinos)
    sk.wire(bb, "pin15F", bb, "pin15X", VERMELHO)
    sk.wire(bb, "pin11H", placa, pino_dados, AMARELO)
def e2(): sk, uno, bb = base_uno(); dht11(sk, uno, bb, UNO_D2); return sk.save(SAIDA, "02_dht11_uno")
def e2b(): sk, esp, bb = base_esp32(); dht11(sk, esp, bb, ESP["D4"]); return sk.save(SAIDA, "02b_dht11_esp32")

# ---------- 3/4. MQ-2 e MQ-135 (mesmo modulo) ----------
def mq_uno(nome, arquivo):
    sk, uno, bb = base_uno()
    montar_topo(sk, bb, MQ, nome, 10, ["connector0", "connector1", "connector2", "connector3"])   # VCC GND DO AO
    sk.wire(bb, "pin10F", bb, "pin10X", VERMELHO)
    sk.wire(bb, "pin11F", bb, "pin11W", PRETO)
    sk.wire(bb, "pin12G", uno, UNO_D3, CINZA)          # DO
    sk.wire(bb, "pin13H", uno, UNO_A0, AMARELO)        # AO
    return sk.save(SAIDA, arquivo)
def mq_esp32(nome, arquivo):
    sk, esp, bb = base_esp32(alim_x=ESP_VIN)           # aquecedor precisa de 5 V (VIN)
    montar_topo(sk, bb, MQ, nome, 10, ["connector0", "connector1", "connector2", "connector3"])
    sk.wire(bb, "pin10F", bb, "pin10X", VERMELHO)
    sk.wire(bb, "pin11F", bb, "pin11W", PRETO)
    sk.wire(bb, "pin12I", esp, ESP["D27"], CINZA)      # DO (3,3 V? o DO do modulo sai em 5 V - ver nota; opcional)
    divisor(sk, bb, 13, 18, esp, ESP["D34"])           # AO -> divisor -> GPIO 34
    return sk.save(SAIDA, arquivo)
def e3(): return mq_uno("MQ-2", "03_mq2_uno")
def e3b(): return mq_esp32("MQ-2", "03b_mq2_esp32")
def e4(): return mq_uno("MQ-135", "04_mq135_uno")
def e4b(): return mq_esp32("MQ-135", "04b_mq135_esp32")

# ---------- 5. BME680 (I2C) ----------
def bme680(sk, placa, bb, sda, scl):
    montar_topo(sk, bb, BME680, "BME680", 10, ["connector37", "connector38", "connector39", "connector40", "connector41", "connector42", "connector43"])
    sk.wire(bb, "pin10F", bb, "pin10X", VERMELHO)      # VIN/VCC
    sk.wire(bb, "pin12F", bb, "pin12W", PRETO)         # GND
    sk.wire(bb, "pin13G", placa, scl, VERDE)           # SCK/SCL
    sk.wire(bb, "pin15H", placa, sda, AZUL)            # SDI/SDA
def e5(): sk, uno, bb = base_uno(); bme680(sk, uno, bb, UNO_A4, UNO_A5); return sk.save(SAIDA, "05_bme680_uno")
def e5b(): sk, esp, bb = base_esp32(); bme680(sk, esp, bb, ESP["D21"], ESP["D22"]); return sk.save(SAIDA, "05b_bme680_esp32")

# ---------- 6. pH-4502C ----------
def e6():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    ph = sk.add(Part(PH, "pH-4502C + sonda", 330, 60))
    sk.wire(ph, "connector1", uno, UNO_5V, VERMELHO)   # V+
    sk.wire(ph, "connector2", uno, UNO_GND, PRETO)     # G
    sk.wire(ph, "connector0", uno, UNO_A0, AMARELO)    # Po
    return sk.save(SAIDA, "06_ph4502c_uno")
def e6b():
    sk, esp, bb = base_esp32(alim_x=ESP_VIN)           # placa pH precisa de 5 V
    ph = sk.add(Part(PH, "pH-4502C + sonda", 780, 200))
    sk.wire(ph, "connector1", bb, "pin57X", VERMELHO)  # V+ -> trilha 5 V
    sk.wire(ph, "connector2", bb, "pin57W", PRETO)     # G
    sk.wire(ph, "connector0", bb, "pin40J", AMARELO)   # Po -> divisor
    divisor(sk, bb, 40, 45, esp, ESP["D34"])
    return sk.save(SAIDA, "06b_ph4502c_esp32")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in (e1, e1b, e2, e2b, e3, e3b, e4, e4b, e5, e5b, e6, e6b): print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
