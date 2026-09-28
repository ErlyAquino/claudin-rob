"""Esquemas de montagem (Fritzing) da aula de ESP32-CAM.  python esquemas.py -> saida/*.fzz + *.png"""
import os, sys
from fzgen import *
from export import export

CAM = "ESP32-CAM_1"            # c0 5V, c1 GND, c2 IO12, c3 IO13, c4 IO15, c5 IO14, c6 IO2, c7 IO4 (esq.) | c8 GND, c9 U0T, c10 U0R, c11 VCC, c12 GND, c13 IO0, c14 IO16, c15 3V3 (dir.)
FTDI = "FTDI Basic-v13"        # c6 DTR, c7 RXI, c8 TXO, c9 POWER(5V), c10 CTS, c11 GND
PIR = "4a531c3119db2e1fd301cb1292e45937"   # c1 VDD, c2 SIG, c3 GND
HALF, RES, LED, RGB = "13f88e58b86d08d73d112f0fb05e6968", "ResistorModuleID", "5mmColorLEDModuleID", "d4d5af9700923b8a114f57961f29a8a0"
C = {"5V": "connector0", "GND": "connector1", "IO12": "connector2", "IO13": "connector3", "IO15": "connector4", "IO14": "connector5", "IO2": "connector6", "IO4": "connector7",
     "GND2": "connector8", "U0T": "connector9", "U0R": "connector10", "VCC": "connector11", "GND3": "connector12", "IO0": "connector13", "IO16": "connector14", "3V3": "connector15"}
def rz(col): return col + 1 if col % 6 == 2 else col
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

def e1_gravacao():
    """ESP32-CAM + adaptador USB-serial (FTDI) + jumper IO0-GND para gravar."""
    sk = Sketch()
    cam = sk.add(Part(CAM, "ESP32-CAM", 260, 20))
    ftdi = sk.add(Part(FTDI, "Adaptador USB-serial (5 V)", 60, 60))
    sk.wire(ftdi, "connector8", cam, C["U0R"], VERDE)      # TXO -> U0R
    sk.wire(ftdi, "connector7", cam, C["U0T"], AZUL)       # RXI -> U0T
    sk.wire(ftdi, "connector9", cam, C["5V"], VERMELHO)    # 5V
    sk.wire(ftdi, "connector11", cam, C["GND"], PRETO)     # GND
    sk.wire(cam, C["IO0"], cam, C["GND3"], AMARELO)        # jumper de gravacao (so durante o upload)
    return sk.save(SAIDA, "01_gravacao_ftdi")

def e2_seguranca():
    """ESP32-CAM + PIR + LED de status (o microSD vai no slot da propria placa)."""
    sk = Sketch()
    cam = sk.add(Part(CAM, "ESP32-CAM", 0, 40))
    bb = sk.add(Part(HALF, "Protoboard", 200, 30))
    sk.wire(cam, C["5V"], bb, "pin3X", VERMELHO); sk.wire(cam, C["GND"], bb, "pin3W", PRETO)
    pir = sk.add(Part(PIR, "PIR HC-SR501", 0, 0))
    sk.mount(pir, "connector1", bb, "pin10J", others=[("connector2", "pin11J"), ("connector3", "pin12J")])   # VDD SIG GND
    sk.wire(bb, "pin10F", bb, "pin10X", VERMELHO)
    sk.wire(bb, "pin12F", bb, "pin12W", PRETO)
    sk.wire(bb, "pin11G", cam, C["IO13"], AMARELO)
    led = sk.add(Part(LED, "LED status", 0, 0, props={"color": "Green (570nm)"}))
    sk.mount(led, "cathode", bb, "pin20F", others=[("anode", "pin21F")])
    sk.wire(bb, "pin20J", bb, "pin21W", PRETO)
    r = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
    sk.mount(r, "connector0", bb, "pin21J", others=[("connector1", "pin25J")])
    sk.wire(bb, "pin25I", cam, C["IO12"], VERDE)
    return sk.save(SAIDA, "02_seguranca_pir")

def e3_gestos():
    """ESP32-CAM + LED RGB nos GPIO 12/13/14."""
    sk = Sketch()
    cam = sk.add(Part(CAM, "ESP32-CAM", 0, 40))
    bb = sk.add(Part(HALF, "Protoboard", 200, 30))
    sk.wire(cam, C["GND"], bb, "pin3W", PRETO)
    rgb = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(rgb, "red anode", bb, "pin10F", others=[("common cathode", "pin11F"), ("green anode", "pin12F"), ("blue anode", "pin13F")])
    sk.wire(bb, "pin11J", bb, "pin11W", PRETO)
    for k, (c, pino, cor, linha) in enumerate([(10, C["IO12"], VERMELHO, "J"), (12, C["IO13"], VERDE, "I"), (13, C["IO14"], AZUL, "H")]):
        r = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
        sk.mount(r, "connector0", bb, f"pin{c}{linha}", others=[("connector1", f"pin{c+4}{linha}")])
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)-1)}", cam, pino, cor)
    return sk.save(SAIDA, "03_gestos_rgb")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA):
        if f.endswith((".fzz", ".png", ".svg")) and not f.startswith("opencv"): os.remove(os.path.join(SAIDA, f))
    for fn in (e1_gravacao, e2_seguranca, e3_gestos): print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
