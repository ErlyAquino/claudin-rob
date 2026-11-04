"""Esquemas de montagem (Fritzing) da aula de agua: pH-4502C, YF-S201, HX710B x (Uno, ESP32) + ADS1115 + monitor completo.
python esquemas.py            -> saida/*.fzz + *.png  (precisa de sessao grafica para o Fritzing)
python esquemas.py --sem-export -> so os .fzz
Pecas novas (YF-S201, HX710B, ADS1115): ferramentas/fritzing/gerar_pecas_agua.py"""
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

TODOS = (e1, e1b, e1c, e2, e2b, e3, e3b, e4, e4b)
if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in TODOS: print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
