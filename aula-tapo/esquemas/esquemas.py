"""Esquema de montagem (Fritzing) do atuador ESP32 da aula Tapo.  python esquemas.py -> saida/*.fzz + *.png"""
import os, sys
from fzgen import *
from export import export

ESP32 = "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, RES, LED, RGB, BTN, BUZZER = "13f88e58b86d08d73d112f0fb05e6968", "ResistorModuleID", "5mmColorLEDModuleID", "d4d5af9700923b8a114f57961f29a8a0", "33b94ebdb1ef4e7cf0f8425956cfca60", "SparkFun-Electromechanical-BUZZER-NS"
RELE = "KY-019_53508512d6e73f1e81cc165d7ee107f3_8"       # c0 S, c1 +, c2 -, c3 NC, c4 Common, c5 NO
ESP_3V3, ESP_GND_R, ESP_GND_L, ESP_VIN = "connector0", "connector1", "connector28", "connector29"
ESP = {"D4": "connector4", "D25": "connector22", "D26": "connector23", "D27": "connector24", "D32": "connector20", "D33": "connector21"}
def rz(col): return col + 1 if col % 6 == 2 else col
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

def e1():
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(HALF, "Protoboard", 200, 30))
    sk.wire(esp, ESP_VIN, bb, "pin3X", VERMELHO)        # trilha de baixo: X = 5 V (VIN), W = GND
    sk.wire(esp, ESP_GND_R, bb, "pin3W", PRETO)
    sk.wire(esp, ESP_GND_L, bb, "pin3Z", PRETO)         # trilha de cima: Z = GND
    # --- modulo rele: S + - na linha J (cols 6-8); NC COM NO ficam em cima (fora da protoboard)
    rele = sk.add(Part(RELE, "Rele KY-019", 0, 0))
    sk.mount(rele, "connector0", bb, "pin19J", others=[("connector1", "pin20J"), ("connector2", "pin21J")])
    sk.wire(bb, "pin20F", bb, "pin21X", VERMELHO)       # + -> 5 V
    sk.wire(bb, "pin21F", bb, "pin22W", PRETO)          # - -> GND
    sk.wire(bb, "pin19G", esp, ESP["D26"], LARANJA)     # S -> GPIO 26
    # --- "lampada" de aula: LED alimentado pelo contato do rele (COM <- 5 V ; NO -> resistor -> LED -> GND)
    sk.wire(rele, "connector4", bb, "pin29X", VERMELHO)             # COM <- 5 V
    r = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
    sk.mount(r, "connector0", bb, "pin24I", others=[("connector1", "pin28I")])
    sk.wire(rele, "connector5", bb, "pin24J", AMARELO)              # NO -> resistor
    lamp = sk.add(Part(LED, "Lâmpada (LED)", 0, 0, props={"color": "Yellow (595nm)"}))
    sk.mount(lamp, "anode", bb, "pin28F", others=[("cathode", "pin29F")])
    sk.wire(bb, "pin29J", bb, "pin29Z", PRETO)
    # --- buzzer (em pe) e RGB
    bz = sk.add(Part(BUZZER, "Buzzer", 0, 0))
    sk.mount(bz, "connector0", bb, "pin4A", others=[("connector1", "pin4H")])
    sk.wire(bb, "pin4B", esp, ESP["D27"], "#8e44ad")
    sk.wire(bb, "pin4J", bb, "pin4Z", PRETO)
    rgb = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(rgb, "red anode", bb, "pin10B", others=[("common cathode", "pin11B"), ("green anode", "pin12B"), ("blue anode", "pin13B")])
    sk.wire(bb, "pin11A", bb, "pin11W", PRETO)
    for c, pino, cor, linha in [(10, ESP["D32"], VERMELHO, "A"), (12, ESP["D33"], VERDE, "C"), (13, ESP["D25"], AZUL, "D")]:
        rr = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
        sk.mount(rr, "connector0", bb, f"pin{c}{linha}", others=[("connector1", f"pin{c+4}{linha}")])
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)+1)}", esp, pino, cor)
    # --- botao local
    btn = sk.add(Part(BTN, "Botão luz", 0, 0))
    sk.mount(btn, "leg0", bb, "pin21B", others=[("leg1", "pin22B")])
    sk.wire(bb, "pin21A", esp, ESP["D4"], CINZA)
    sk.wire(bb, "pin22A", bb, "pin23W", PRETO)
    return sk.save(SAIDA, "01_esp32_rele_buzzer_rgb")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA):
        if f.endswith((".fzz", ".svg")) or f.startswith("01_"): os.remove(os.path.join(SAIDA, f))
    print("gerado", e1())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
