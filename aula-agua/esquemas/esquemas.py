"""Esquemas de montagem (Fritzing) da aula de agua: pH-4502C, YF-S201, HX710B x (Uno, ESP32) + ADS1115 + monitor completo.
python esquemas.py            -> saida/*.fzz + *.png  (precisa de sessao grafica para o Fritzing)
python esquemas.py --sem-export -> so os .fzz
python esquemas.py --so 05     -> regenera so os esquemas cujo nome comeca com 05 (timer da bomba), sem tocar nos outros
python esquemas.py --so 06     -> idem, so os do sensor de condutividade (TDS Meter V1.0)
python esquemas.py --so 07     -> idem, so os do sensor de temperatura DS18B20 (TO-92, sonda e dois no mesmo fio)
python esquemas.py --so 11     -> idem, so o do conversor de nivel logico (peca do core "I2C level shifter bidirectional")
Pecas novas (YF-S201, HX710B, ADS1115, TDS Meter): ferramentas/fritzing/gerar_pecas_agua.py"""
import os, sys, math
from fzgen import *
from export import export

UNO, ESP32 = "arduino_Uno_Rev3(fix)", "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, FULL = "13f88e58b86d08d73d112f0fb05e6968", "Breadboard-RSR03MB102-ModuleID"
RES, RGB = "ResistorModuleID", "d4d5af9700923b8a114f57961f29a8a0"
BUZZER = "SparkFun-Electromechanical-BUZZER-NS"
PH = "prefix0000_642e08dceb3d1de4c31ea2bcfb635c6f_1"   # DFRobot pH: c0 Po, c1 V+, c2 GND (peca solta, com BNC)
YF = "cria_yfs201"                                     # c0 VCC (vermelho), c1 SIG (amarelo), c2 GND (preto)
HX = "cria_hx710b"                                     # c0 VCC, c1 OUT, c2 SCK, c3 GND
ADS = "cria_ads1115"                                   # c0 VDD c1 GND c2 SCL c3 SDA c4 ADDR c5 ALRT c6 A0 c7 A1 c8 A2 c9 A3
LARANJA_3V3 = "#ff7033"; ROXO = "#8e44ad"

def rz(col): return col + 1 if col % 6 == 2 else col      # trilhas pulam as colunas 8, 14, 20...
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

# ---------- bases ----------
def base_uno(cheia=False):
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(FULL if cheia else HALF, "Protoboard", 330, 20))
    sk.wire(uno, "connector87", bb, "pin3X", VERMELHO)     # 5V; trilha de baixo: X = +5 V, W = GND
    sk.wire(uno, "connector88", bb, "pin3W", PRETO)
    return sk, uno, bb

def base_esp32(alim="VIN"):
    """ESP32 + protoboard 830. X = alimentacao (VIN = 5 V da USB, ou 3V3), W = GND."""
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(FULL, "Protoboard 830", 160, 30))
    sk.wire(esp, alim, bb, "pin3X", VERMELHO if alim == "VIN" else LARANJA_3V3)
    sk.wire(esp, "connector1", bb, "pin3W", PRETO)
    return sk, esp, bb

def montar(sk, bb, mid, titulo, col, n):
    p = sk.add(Part(mid, titulo, 0, 0))
    sk.mount(p, "connector0", bb, f"pin{col}J", others=[(f"connector{i}", f"pin{col+i}J") for i in range(1, n)])
    return p

def resistor(sk, bb, valor, rotulo, c0, linha, c1=None):
    r = sk.add(Part(RES, rotulo, 0, 0, props={"resistance": valor}))
    sk.mount(r, "connector0", bb, f"pin{c0}{linha}", others=[("connector1", f"pin{c1 if c1 else c0+4}{linha}")])
    return r

def divisor_desce(sk, bb, col_sinal, destino, pino):
    """Divisor 1 k / 2 k na metade de BAIXO da protoboard: sinal de 5 V (col_sinal, linha F) -> E; 1 k (D) -> no;
    2 k (C) -> GND (trilha W); no (B) -> `pino` de `destino` (a placa, ou a propria protoboard: entrada do ADS1115)."""
    no = col_sinal + 4
    sk.wire(bb, f"pin{col_sinal}F", bb, f"pin{col_sinal}E", AMARELO)
    resistor(sk, bb, "1k", "1 kΩ", col_sinal, "D")
    resistor(sk, bb, "2k", "2 kΩ", no, "C")
    sk.wire(bb, f"pin{no+4}A", bb, f"pin{rz(no+4)}W", PRETO)
    sk.wire(bb, f"pin{no}B", destino, pino, AMARELO)

# ---------- sensores ----------
def ph(sk, placa, bb, x, y, col_po=None, pino=None):
    """Placa de pH (peca solta, fora da protoboard): V+ e G nas trilhas; Po direto no pino (Uno) ou na coluna col_po (divisor)."""
    p = sk.add(Part(PH, "pH-4502C + sonda BNC", x, y))
    if bb is not None:
        sk.wire(p, "connector1", bb, "pin57X", VERMELHO)
        sk.wire(p, "connector2", bb, "pin57W", PRETO)
    else:
        sk.wire(p, "connector1", placa, "connector87", VERMELHO)
        sk.wire(p, "connector2", placa, "connector88", PRETO)
    if col_po: sk.wire(p, "connector0", bb, f"pin{col_po}J", AMARELO)
    else: sk.wire(p, "connector0", placa, pino, AMARELO)
    return p

def yf(sk, placa, bb, col, pino, divisor=False):
    montar(sk, bb, YF, "YF-S201", col, 3)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)           # vermelho: 5 V
    sk.wire(bb, f"pin{col+2}F", bb, f"pin{rz(col+2)}W", PRETO)         # preto: GND
    if divisor: divisor_desce(sk, bb, col + 1, placa, pino)            # amarelo (5 V) -> divisor -> GPIO
    else: sk.wire(bb, f"pin{col+1}G", placa, pino, AMARELO)

def hx(sk, placa, bb, col, out, sck, vcc_da_placa=None):
    montar(sk, bb, HX, "HX710B", col, 4)
    if vcc_da_placa: sk.wire(placa, vcc_da_placa, bb, f"pin{col}G", LARANJA_3V3)   # ESP32: 3V3 direto
    else: sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)
    sk.wire(bb, f"pin{col+1}H", placa, out, VERDE)
    sk.wire(bb, f"pin{col+2}I", placa, sck, AZUL)
    sk.wire(bb, f"pin{col+3}F", bb, f"pin{rz(col+3)}W", PRETO)

def ads(sk, esp, bb, col):
    """ADS1115 em 3,3 V: VDD <- 3V3, GND, SCL <- D22, SDA <- D21, ADDR -> GND (0x48). Devolve a coluna do A0."""
    montar(sk, bb, ADS, "ADS1115", col, 10)
    sk.wire(esp, "3V3", bb, f"pin{col}G", LARANJA_3V3)
    sk.wire(bb, f"pin{col+1}F", bb, f"pin{rz(col+1)}W", PRETO)
    sk.wire(bb, f"pin{col+2}H", esp, "D22", VERDE)
    sk.wire(bb, f"pin{col+3}I", esp, "D21", AZUL)
    sk.wire(bb, f"pin{col+4}F", bb, f"pin{rz(col+4)}W", PRETO)
    return col + 6

def rgb(sk, placa, pinos, bb, col):
    """RGB catodo comum: R(col) K(col+1) G(col+2) B(col+3) na linha F; 220 R nos anodos ate col+4.."""
    led = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(led, "red anode", bb, f"pin{col}F", others=[("common cathode", f"pin{col+1}F"), ("green anode", f"pin{col+2}F"), ("blue anode", f"pin{col+3}F")])
    sk.wire(bb, f"pin{col+1}G", bb, f"pin{rz(col+1)}W", PRETO)
    for c, pino, corfio, linha in [(col, pinos[0], VERMELHO, "J"), (col + 2, pinos[1], VERDE, "I"), (col + 3, pinos[2], AZUL, "H")]:
        resistor(sk, bb, "220", "220 Ω", c, linha)
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)-1)}", placa, pino, corfio)

def buzzer(sk, placa, bb, col, pino):
    """Buzzer em pe: pino 1 na linha A, pino 2 cai na linha H da mesma coluna."""
    bz = sk.add(Part(BUZZER, "Buzzer", 0, 0))
    sk.mount(bz, "connector0", bb, f"pin{col}A", others=[("connector1", f"pin{col}H")])
    sk.wire(bb, f"pin{col}B", placa, pino, ROXO)
    sk.wire(bb, f"pin{col}I", bb, f"pin{rz(col)}W", PRETO)

# ---------- 1: pH ----------
def e1():
    sk = Sketch(); uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    ph(sk, uno, None, 330, 60, pino="A0")
    return sk.save(SAIDA, "01_ph4502c_uno")
def e1b():
    sk, esp, bb = base_esp32("VIN"); ph(sk, esp, bb, 800, 40, col_po=40); divisor_desce(sk, bb, 40, esp, "D34")
    return sk.save(SAIDA, "01b_ph4502c_esp32")
def e1c():
    sk, esp, bb = base_esp32("VIN"); a0 = ads(sk, esp, bb, 2)
    ph(sk, esp, bb, 800, 40, col_po=30); divisor_desce(sk, bb, 30, bb, f"pin{a0}I")
    return sk.save(SAIDA, "01c_ph4502c_esp32_ads1115")

# ---------- 2: YF-S201 ----------
def e2():  sk, u, bb = base_uno(); yf(sk, u, bb, 10, "D2"); return sk.save(SAIDA, "02_yfs201_uno")
def e2b(): sk, e, bb = base_esp32("VIN"); yf(sk, e, bb, 10, "D27", divisor=True); return sk.save(SAIDA, "02b_yfs201_esp32")

# ---------- 3: HX710B ----------
def e3():  sk, u, bb = base_uno(); hx(sk, u, bb, 10, "D3 PWM", "D4"); return sk.save(SAIDA, "03_hx710b_uno")
def e3b(): sk, e, bb = base_esp32("3V3"); hx(sk, e, bb, 10, "D18", "D19"); return sk.save(SAIDA, "03b_hx710b_esp32")

# ---------- 4: monitor completo ----------
def e4():
    sk, u, bb = base_uno(cheia=True)
    yf(sk, u, bb, 3, "D2")                           # o corpo do sensor ocupa ate a coluna ~12
    hx(sk, u, bb, 17, "D3 PWM", "D4")
    rgb(sk, u, ["D9 PWM", "D6 PWM", "D5 PWM"], bb, 24)
    buzzer(sk, u, bb, 36, "D8")
    ph(sk, u, bb, 970, 40, pino="A0")                 # V+ e G nas trilhas; Po direto no A0
    return sk.save(SAIDA, "04_monitor_agua_uno")

def e4b():
    sk, e, bb = base_esp32("VIN")
    yf(sk, e, bb, 3, "D27", divisor=True)            # divisor ocupa as colunas 4-12 da metade de baixo
    hx(sk, e, bb, 17, "D18", "D19", vcc_da_placa="3V3")
    rgb(sk, e, ["D25", "D26", "D33"], bb, 24)
    buzzer(sk, e, bb, 36, "D14")
    ph(sk, e, bb, 800, 40, col_po=40); divisor_desce(sk, bb, 40, e, "D34")
    return sk.save(SAIDA, "04b_monitor_agua_esp32")

# ---------- 5: timer da bomba (modulo rele KY-019; lado de 12 V: fonte -> COM, NF -> bomba) ----------
RELE = "KY-019_53508512d6e73f1e81cc165d7ee107f3_8"     # c0 S, c1 +, c2 -, c3 NC (NF), c4 Common, c5 NO (NA)
MOTOR, PLUGUE, RTC = "1000FADF10011leg", "d8f570d723ea4d14f9b61b34575a9699", "cria_ds3231"   # copia da peca ZS-042 do core com o grupo id="breadboard" (sem ele nao renderiza)

def rele_bomba(sk, placa, x, y, pino, v5, gnd, cor_sinal=LARANJA):
    """Modulo rele solto (jumpers direto na placa) + fonte de 12 V e bomba (motor DC) pelo contato NF."""
    r = sk.add(Part(RELE, "Módulo relé", x, y))
    sk.wire(r, "connector0", placa, pino, cor_sinal)
    sk.wire(r, "connector1", placa, v5, VERMELHO)
    sk.wire(r, "connector2", placa, gnd, PRETO)
    bomba = sk.add(Part(MOTOR, "Bomba 12 V", x - 190, y - 125, rot=180))   # NF e o borne da esquerda: bomba a esquerda
    fonte = sk.add(Part(PLUGUE, "Fonte 12 V", x + 150, y - 95, rot=180))
    sk.wire(fonte, "connector1", r, "connector4", VERMELHO)          # + 12 V -> COM
    sk.wire(r, "connector3", bomba, "connector0", VERMELHO)          # NF -> + da bomba
    sk.wire(bomba, "connector1", fonte, "connector0", PRETO)         # - da bomba -> - da fonte
    return r

def e5():
    sk = Sketch(); uno = sk.add(Part(UNO, "Arduino Uno", 0, 120))
    rele_bomba(sk, uno, 400, 150, "D7", "connector87", "connector88")
    return sk.save(SAIDA, "05_timer_bomba_uno")

def e5d():
    sk = Sketch(); uno = sk.add(Part(UNO, "Arduino Uno", 0, 120))
    rele_bomba(sk, uno, 400, 150, "D7", "connector87", "connector88")
    rtc = sk.add(Part(RTC, "DS3231 (ZS-042)", 400, 330))
    sk.wire(rtc, "connector1", uno, "connector87", VERMELHO)
    sk.wire(rtc, "connector0", uno, "connector88", PRETO)
    sk.wire(rtc, "connector2", uno, "A4/SDA", AZUL)
    sk.wire(rtc, "connector3", uno, "A5/SCL", VERDE)
    return sk.save(SAIDA, "05d_timer_bomba_rtc_uno")

def e5e():
    sk = Sketch(); esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 120))
    rele_bomba(sk, esp, 330, 150, "D26", "VIN", "connector28")
    return sk.save(SAIDA, "05e_timer_bomba_esp32")

# ---------- 6: condutividade (TDS Meter V1.0 no ESP32; trilha X = 3V3) ----------
TDS, DS18B20 = "cria_tds", "cria_ds18b20_sonda"        # TDS: c0 - (GND), c1 + (VCC), c2 A | DS18B20 (cabo): c0 VDD, c1 DQ, c2 GND

def tds(sk, esp, bb, col, pino_a, pino_vcc=None):
    """Placa do TDS na protoboard: - na trilha W; + na trilha X (3V3) ou num GPIO que liga o sensor so na leitura; A no ADC1."""
    montar(sk, bb, TDS, "TDS Meter V1.0 + sonda", col, 3)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}W", PRETO)
    if pino_vcc: sk.wire(bb, f"pin{col+1}H", esp, pino_vcc, LARANJA)
    else: sk.wire(bb, f"pin{col+1}F", bb, f"pin{rz(col+1)}X", LARANJA_3V3)
    sk.wire(bb, f"pin{col+2}I", esp, pino_a, AMARELO)

def ds18b20(sk, esp, bb, col, pino):
    """DS18B20 a prova d'agua: vermelho na trilha X (3V3), preto na W, amarelo no GPIO, com 4,7 k entre o amarelo e o 3V3."""
    montar(sk, bb, DS18B20, "DS18B20 à prova d'água", col, 3)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", LARANJA_3V3)
    sk.wire(bb, f"pin{col+2}F", bb, f"pin{rz(col+2)}W", PRETO)
    resistor(sk, bb, "4.7k", "4,7 kΩ", col + 1, "G", col + 5)
    sk.wire(bb, f"pin{col+5}F", bb, f"pin{rz(col+5)}X", LARANJA_3V3)
    sk.wire(bb, f"pin{col+1}H", esp, pino, VERDE)

def e6():
    sk, esp, bb = base_esp32("3V3"); tds(sk, esp, bb, 15, "D34")
    return sk.save(SAIDA, "06_tds_teste_esp32")

def e6b():
    sk, esp, bb = base_esp32("3V3"); tds(sk, esp, bb, 15, "D34", pino_vcc="D32"); ds18b20(sk, esp, bb, 39, "D4")
    return sk.save(SAIDA, "06b_tds_ds18b20_esp32")

# ---------- 7: temperatura (DS18B20 no ESP32, dados no GPIO 4; trilha X = 3V3) ----------
TO92 = "cria_ds18b20_to92"                             # visto pela face plana: c0 GND, c1 DQ, c2 VDD

def ds18b20_to92(sk, esp, bb, col, pino=None, pullup=True):
    """DS18B20 TO-92 na protoboard, face plana para a frente: GND na trilha W, VDD na X (3V3), DQ no GPIO,
    com 4,7 k entre o DQ e o 3V3. Sem `pino` nem `pullup`, o DQ fica para ser emendado no fio de outro sensor."""
    montar(sk, bb, TO92, "DS18B20 (TO-92)", col, 3)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}W", PRETO)
    sk.wire(bb, f"pin{col+2}F", bb, f"pin{rz(col+2)}X", LARANJA_3V3)
    if pullup:
        resistor(sk, bb, "4.7k", "4,7 kΩ", col + 1, "G", col + 5)
        sk.wire(bb, f"pin{col+5}F", bb, f"pin{rz(col+5)}X", LARANJA_3V3)
    if pino: sk.wire(bb, f"pin{col+1}H", esp, pino, VERDE)

def e7():
    sk, esp, bb = base_esp32("3V3"); ds18b20_to92(sk, esp, bb, 30, "D4")
    return sk.save(SAIDA, "07_ds18b20_to92_esp32")

def e7b():
    sk, esp, bb = base_esp32("3V3"); ds18b20(sk, esp, bb, 30, "D4")
    return sk.save(SAIDA, "07b_ds18b20_sonda_esp32")

def e7c():
    """Dois sensores no mesmo fio: os dados do TO-92 emendados nos da sonda; um resistor so para os dois."""
    sk, esp, bb = base_esp32("3V3")
    ds18b20_to92(sk, esp, bb, 21, pullup=False)
    ds18b20(sk, esp, bb, 39, "D4")
    sk.wire(bb, "pin22I", bb, "pin40I", VERDE)
    return sk.save(SAIDA, "07c_ds18b20_dois_sensores_esp32")

TODOS = (e1, e1b, e1c, e2, e2b, e3, e3b, e4, e4b, e5, e5d, e5e, e6, e6b, e7, e7b, e7c)
# ---------- 11: conversor de nivel logico (4 canais, BSS138) entre o ESP32 (3,3 V) e o ADS1115 em 5 V, como no horta/no1 ----------
CONV = "I2C_level_converter_444e27d4b4b231371fe2ccfc428902c1_1"   # peca do core: c0 LV4 c1 LV3 c2 GND c3 LV c4 LV2 c5 LV1 | c6 HV1 c7 HV2 c8 HV c9 GND c10 HV3 c11 HV4

def e11():
    """Trilha X = 5 V (VIN), W = GND. Conversor solto, entre o ESP32 e a protoboard (as fileiras ficam a 0,4 pol.): fileira HV em cima, LV embaixo;
    LV <- 3V3, HV <- 5 V, GND comum; canal 1 = SDA (D21), canal 2 = SCL (D22). ADS1115 com VDD em 5 V, ADDR no GND (0x48)."""
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    cv = sk.add(Part(CONV, "Conversor de nível lógico", 200, 218))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(esp, "VIN", bb, "pin3X", VERMELHO)
    sk.wire(esp, "connector1", bb, "pin3W", PRETO)
    col = 6
    montar(sk, bb, ADS, "ADS1115 (em 5 V)", col, 10)
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)            # VDD em 5 V
    sk.wire(bb, f"pin{col+1}F", bb, f"pin{rz(col+1)}W", PRETO)
    sk.wire(bb, f"pin{col+4}F", bb, f"pin{rz(col+4)}W", PRETO)           # ADDR no GND: 0x48
    sk.wire(cv, "connector3", esp, "3V3", LARANJA_3V3)                   # LV <- 3,3 V
    sk.wire(cv, "connector2", esp, "connector1", PRETO)                  # GND (lado LV)
    sk.wire(cv, "connector5", esp, "D21", AZUL)                          # LV1 <- SDA
    sk.wire(cv, "connector4", esp, "D22", VERDE)                         # LV2 <- SCL
    sk.wire(cv, "connector8", bb, "pin4X", VERMELHO)                     # HV <- 5 V
    sk.wire(cv, "connector9", bb, "pin4W", PRETO)                       # GND (lado HV)
    sk.wire(cv, "connector6", bb, f"pin{col+3}H", AZUL)                  # HV1 -> SDA do ADS1115
    sk.wire(cv, "connector7", bb, f"pin{col+2}G", VERDE)                 # HV2 -> SCL do ADS1115
    return sk.save(SAIDA, "11_conversor_nivel_ads1115_esp32")
TODOS += (e11,)

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    so = sys.argv[sys.argv.index("--so") + 1] if "--so" in sys.argv else None
    if so:                                   # python esquemas.py --so 05  -> regenera so os esquemas cujo nome comeca com 05
        import shutil, tempfile
        final, SAIDA = SAIDA, tempfile.mkdtemp(prefix="esq_")
        for fn in TODOS: fn()
        for f in os.listdir(SAIDA):
            if not f.startswith(so): os.remove(os.path.join(SAIDA, f))
        if "--sem-export" not in sys.argv: export(SAIDA)
        for f in sorted(os.listdir(SAIDA)): shutil.copy2(os.path.join(SAIDA, f), final); print("gerado", f)
        shutil.rmtree(SAIDA); sys.exit()
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in TODOS: print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
