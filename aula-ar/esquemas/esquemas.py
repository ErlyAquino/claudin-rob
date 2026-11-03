"""Esquemas de montagem (Fritzing) da aula de qualidade do ar: 5 sensores x (Uno, ESP32) + monitor completo.
python esquemas.py            -> saida/*.fzz + *.png  (precisa de sessao grafica para o Fritzing)
python esquemas.py --sem-export -> so os .fzz
Pecas novas (DHT11 3 pinos, DHT22 3 fios, MH-Z19B): ferramentas/fritzing/gerar_pecas_ar.py"""
import os, sys, math
from fzgen import *
from export import export

UNO, ESP32 = "arduino_Uno_Rev3(fix)", "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, FULL = "13f88e58b86d08d73d112f0fb05e6968", "Breadboard-RSR03MB102-ModuleID"
RES, RGB = "ResistorModuleID", "d4d5af9700923b8a114f57961f29a8a0"
DHT11 = "cria_dht11_mod3"        # c0 VCC, c1 DATA, c2 GND
DHT22 = "cria_dht22_fios"        # c0 VCC (vermelho), c1 DATA (amarelo), c2 GND (preto)
MQ = "MQ-5_1"                    # c0 VCC, c1 GND, c2 DO, c3 AO
MHZ = "cria_mhz19b"              # c0 Vin, c1 GND, c2 RX, c3 TX, c4 PWM
LARANJA_3V3 = "#ff7033"

def rz(col): return col + 1 if col % 6 == 2 else col      # trilhas pulam as colunas 8, 14, 20...
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

# ---------- bases ----------
def base_uno(cheia=False):
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(FULL if cheia else HALF, "Protoboard", 330, 20))
    sk.wire(uno, "connector87", bb, "pin3X", VERMELHO)     # 5V do header de alimentacao; trilha de baixo: X = +5 V, W = GND
    sk.wire(uno, "connector88", bb, "pin3W", PRETO)
    return sk, uno, bb

def base_esp32(alim="3V3"):
    """ESP32 + protoboard 830. X = alimentacao (3V3 ou VIN = 5 V da USB), W = GND."""
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(FULL, "Protoboard 830", 160, 30))
    sk.wire(esp, "connector0" if alim == "3V3" else "VIN", bb, "pin3X", LARANJA_3V3 if alim == "3V3" else VERMELHO)
    sk.wire(esp, "connector1", bb, "pin3W", PRETO)
    return sk, esp, bb

def colunas(mid, inicio):
    """primeira coluna livre que acomoda o corpo da peca a partir de `inicio`; devolve (col_1o_pino, prox_livre)"""
    p = Part(mid, "", 0, 0)
    xs = sorted(c[0] for c in p.cen.values())
    esq = math.ceil(xs[0] / 9 - 0.5); dir_ = math.ceil((p.w - xs[-1]) / 9 - 0.5)
    col = inicio + esq
    return col, col + round((xs[-1] - xs[0]) / 9) + dir_ + 1

def montar(sk, bb, mid, titulo, col, n):
    p = sk.add(Part(mid, titulo, 0, 0))
    sk.mount(p, "connector0", bb, f"pin{col}J", others=[(f"connector{i}", f"pin{col+i}J") for i in range(1, n)])
    return p

def resistor(sk, bb, valor, rotulo, c0, linha, c1=None):
    r = sk.add(Part(RES, rotulo, 0, 0, props={"resistance": valor}))
    sk.mount(r, "connector0", bb, f"pin{c0}{linha}", others=[("connector1", f"pin{c1 if c1 else c0+4}{linha}")])
    return r

def divisor_desce(sk, bb, col_sinal, placa, gpio):
    """Divisor na metade de BAIXO da protoboard (linhas A-E), para liberar a de cima para os sensores:
    sinal de 5 V (col_sinal, linha F) -> jumper -> E;  1 k (D) -> no;  2 k (C) -> GND (trilha W);  no (B) -> GPIO."""
    no = col_sinal + 4
    sk.wire(bb, f"pin{col_sinal}F", bb, f"pin{col_sinal}E", AMARELO)
    resistor(sk, bb, "1k", "1 kΩ", col_sinal, "D")
    resistor(sk, bb, "2k", "2 kΩ", no, "C")
    sk.wire(bb, f"pin{no+4}A", bb, f"pin{rz(no+4)}W", PRETO)
    sk.wire(bb, f"pin{no}B", placa, gpio, AMARELO)

# ---------- sensores ----------
def dht(sk, placa, bb, mid, titulo, pino, col=10, cor_vcc=VERMELHO, vcc_da_placa=None):
    montar(sk, bb, mid, titulo, col, 3)
    if vcc_da_placa: sk.wire(placa, vcc_da_placa, bb, f"pin{col}G", cor_vcc)
    else: sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", cor_vcc)
    sk.wire(bb, f"pin{col+2}F", bb, f"pin{rz(col+2)}W", PRETO)
    sk.wire(bb, f"pin{col+1}H", placa, pino, AMARELO)

def mq(sk, placa, bb, nome, col, ao, do=None, divisor=False):
    montar(sk, bb, MQ, nome, col, 4)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)
    sk.wire(bb, f"pin{col+1}F", bb, f"pin{rz(col+1)}W", PRETO)
    if do: sk.wire(bb, f"pin{col+2}G", placa, do, CINZA)
    if divisor: divisor_desce(sk, bb, col + 3, placa, ao)
    else: sk.wire(bb, f"pin{col+3}H", placa, ao, AMARELO)

def mhz19b(sk, placa, bb, col, rx_placa, tx_placa, divisor_rx):
    """rx_placa recebe do TX do sensor; tx_placa vai ao RX do sensor (pelo divisor 1k/2k no Uno)."""
    montar(sk, bb, MHZ, "MH-Z19B", col, 5)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)            # Vin 5 V
    sk.wire(bb, f"pin{col+1}F", bb, f"pin{rz(col+1)}W", PRETO)          # GND
    sk.wire(bb, f"pin{col+3}F", placa, rx_placa, VERDE)                # TX do sensor -> RX da placa
    rx = col + 2
    if divisor_rx:                                                     # TX da placa (5 V) -> 1 k -> RX -> 2 k -> GND
        resistor(sk, bb, "1k", "1 kΩ", rx, "G")                        # RX (rx) a coluna livre rx+4
        resistor(sk, bb, "2k", "2 kΩ", rx - 4, "H", rx)                # coluna livre rx-4 a RX
        sk.wire(bb, f"pin{rx-4}F", bb, f"pin{rz(rx-4)}W", PRETO)
        sk.wire(bb, f"pin{rx+4}I", placa, tx_placa, AZUL)
    else:
        sk.wire(bb, f"pin{rx}G", placa, tx_placa, AZUL)

def rgb(sk, placa, pinos, bb, col):
    """RGB catodo comum: R(col) K(col+1) G(col+2) B(col+3) na linha F; 220 R nos anodos ate col+4.."""
    led = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(led, "red anode", bb, f"pin{col}F", others=[("common cathode", f"pin{col+1}F"), ("green anode", f"pin{col+2}F"), ("blue anode", f"pin{col+3}F")])
    sk.wire(bb, f"pin{col+1}G", bb, f"pin{rz(col+1)}W", PRETO)
    for c, pino, corfio, linha in [(col, pinos[0], VERMELHO, "J"), (col + 2, pinos[1], VERDE, "I"), (col + 3, pinos[2], AZUL, "H")]:
        resistor(sk, bb, "220", "220 Ω", c, linha)
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)-1)}", placa, pino, corfio)

# ---------- 1 e 2: DHT11 (modulo 3 pinos) e DHT22 (3 fios) ----------
def e1():  sk, u, bb = base_uno(); dht(sk, u, bb, DHT11, "DHT11 (módulo 3 pinos)", "D2"); return sk.save(SAIDA, "01_dht11_uno")
def e1b(): sk, e, bb = base_esp32(); dht(sk, e, bb, DHT11, "DHT11 (módulo 3 pinos)", "D4", cor_vcc=LARANJA_3V3); return sk.save(SAIDA, "01b_dht11_esp32")
def e2():  sk, u, bb = base_uno(); dht(sk, u, bb, DHT22, "DHT22 (3 fios)", "D2"); return sk.save(SAIDA, "02_dht22_uno")
def e2b(): sk, e, bb = base_esp32(); dht(sk, e, bb, DHT22, "DHT22 (3 fios)", "D4", cor_vcc=LARANJA_3V3); return sk.save(SAIDA, "02b_dht22_esp32")

# ---------- 3 e 4: MQ-2 e MQ-135 ----------
def e_mq_uno(nome, arq):  sk, u, bb = base_uno(); mq(sk, u, bb, nome, 10, "A0", do="D3 PWM"); return sk.save(SAIDA, arq)
def e_mq_esp(nome, arq):  sk, e, bb = base_esp32(alim="VIN"); mq(sk, e, bb, nome, 10, "D34", divisor=True); return sk.save(SAIDA, arq)
def e3():  return e_mq_uno("MQ-2", "03_mq2_uno")
def e3b(): return e_mq_esp("MQ-2", "03b_mq2_esp32")
def e4():  return e_mq_uno("MQ-135", "04_mq135_uno")
def e4b(): return e_mq_esp("MQ-135", "04b_mq135_esp32")

# ---------- 5: MH-Z19B ----------
def e5():  sk, u, bb = base_uno(); mhz19b(sk, u, bb, 8, "D10 PWM/SS", "D11 PWM/MOSI", True); return sk.save(SAIDA, "05_mhz19b_uno")
def e5b(): sk, e, bb = base_esp32(alim="VIN"); mhz19b(sk, e, bb, 10, "RX2", "TX2", False); return sk.save(SAIDA, "05b_mhz19b_esp32")

# ---------- 6: monitor completo ----------
def e6():
    sk, u, bb = base_uno(cheia=True)
    c, prox = colunas(DHT11, 2);     dht(sk, u, bb, DHT11, "DHT11", "D2", col=c)
    c, prox = colunas(DHT22, prox);  dht(sk, u, bb, DHT22, "DHT22", "D4", col=c)
    c, prox = colunas(MQ, prox);     mq(sk, u, bb, "MQ-2", c, "A0")
    c, prox = colunas(MQ, prox);     mq(sk, u, bb, "MQ-135", c, "A1")
    c, prox = colunas(MHZ, prox);    mhz19b(sk, u, bb, c, "D10 PWM/SS", "D11 PWM/MOSI", True)
    rgb(sk, u, ["D9 PWM", "D6 PWM", "D5 PWM"], bb, max(prox, c + 13) + 1)
    return sk.save(SAIDA, "06_monitor_ar_uno")

def e6b():
    sk, e, bb = base_esp32(alim="VIN")                     # X = 5 V (MQ e MH-Z19B); os DHT vem do 3V3 direto
    c, prox = colunas(DHT22, 2);     dht(sk, e, bb, DHT22, "DHT22", "D4", col=c, cor_vcc=LARANJA_3V3, vcc_da_placa="3V3")
    c, prox = colunas(DHT11, prox);  dht(sk, e, bb, DHT11, "DHT11", "D13", col=c, cor_vcc=LARANJA_3V3, vcc_da_placa="3V3")
    c, prox = colunas(MQ, prox);     mq(sk, e, bb, "MQ-2", c, "D34", divisor=True)
    c, prox = colunas(MQ, prox);     mq(sk, e, bb, "MQ-135", c, "D35", divisor=True)
    c, prox = colunas(MHZ, prox);    mhz19b(sk, e, bb, c, "RX2", "TX2", False)
    rgb(sk, e, ["D25", "D26", "D27"], bb, prox + 1)
    return sk.save(SAIDA, "06b_monitor_ar_esp32")

TODOS = (e1, e1b, e2, e2b, e3, e3b, e4, e4b, e5, e5b, e6, e6b)
if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in TODOS: print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
