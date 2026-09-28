"""Esquemas de montagem (Fritzing) da aula de sensor de distancia.  python esquemas.py -> saida/*.fzz + *.png"""
import os, sys
from fzgen import *
from export import export

UNO, ESP32 = "arduino_Uno_Rev3(fix)", "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, FULL = "13f88e58b86d08d73d112f0fb05e6968", "Breadboard-RSR03MB102-ModuleID"
HCSR04 = "hc-sr04_ultrafix_b8f5923dd02482d2c2bcc2b7aec1cdd8_13"     # VCC TRIG ECHO GND
BUZZER = "SparkFun-Electromechanical-BUZZER-NS"                       # 2 pinos
RGB, RES = "d4d5af9700923b8a114f57961f29a8a0", "ResistorModuleID"
UNO_5V, UNO_GND = "connector87", "connector88"
UNO_D = {n: f"connector{51 + n - 8}" for n in range(8, 14)}
UNO_D.update({2: "connector63", 3: "connector64", 5: "connector66", 6: "connector67"})
ESP_3V3, ESP_GND_R, ESP_GND_L, ESP_VIN = "connector0", "connector1", "connector28", "connector29"
ESP = {"D25": "connector22", "D26": "connector23", "D27": "connector24", "D5": "connector7", "D18": "connector8", "D19": "connector9"}

def rz(col): return col + 1 if col % 6 == 2 else col
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

def sensor_na_bb(sk, bb, col, placa, trig, echo, via_divisor=None):
    """HC-SR04 com os 4 pinos na linha J (col..col+3): VCC, TRIG, ECHO, GND; corpo fora da protoboard.
       Alimentacao pelas trilhas de BAIXO (X+/W-); GND do divisor pela trilha de CIMA (Z-)."""
    s = sk.add(Part(HCSR04, "HC-SR04", 0, 0))
    sk.mount(s, "VCC", bb, f"pin{col}J", others=[("TRIG", f"pin{col+1}J"), ("ECHO", f"pin{col+2}J"), ("GND", f"pin{col+3}J")])
    sk.wire(bb, f"pin{col}F", bb, f"pin{rz(col)}X", VERMELHO)            # VCC -> trilha +
    sk.wire(bb, f"pin{col+3}F", bb, f"pin{rz(col+3)}W", PRETO)         # GND -> trilha -
    sk.wire(bb, f"pin{col+1}G", placa, trig, LARANJA)                   # TRIG
    if via_divisor is None:
        sk.wire(bb, f"pin{col+2}G", placa, echo, AMARELO)               # ECHO direto (Uno, 5 V)
    else:
        # divisor 1k/2k: ECHO -> 1k -> no (c) -> 2k -> GND ; no -> GPIO (3,3 V)
        c = via_divisor
        r1 = sk.add(Part(RES, "1 kΩ", 0, 0, props={"resistance": "1k"}))
        sk.mount(r1, "connector0", bb, f"pin{col+2}F", others=[("connector1", f"pin{c}F")])
        r2 = sk.add(Part(RES, "2 kΩ", 0, 0, props={"resistance": "2k"}))
        sk.mount(r2, "connector0", bb, f"pin{c}G", others=[("connector1", f"pin{c+4}G")])
        sk.wire(bb, f"pin{c+4}J", bb, f"pin{rz(c+4)}Z", PRETO)
        sk.wire(bb, f"pin{c}H", placa, echo, AMARELO)
    return s

def rgb_na_bb(sk, placa, pinos, bb, col):
    rgb = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(rgb, "red anode", bb, f"pin{col}F", others=[("common cathode", f"pin{col+1}F"), ("green anode", f"pin{col+2}F"), ("blue anode", f"pin{col+3}F")])
    sk.wire(bb, f"pin{col+1}J", bb, f"pin{rz(col+1)}Z", PRETO)
    for k, (c, pino, corfio, linha) in enumerate([(col, pinos[0], VERMELHO, "J"), (col+2, pinos[1], VERDE, "I"), (col+3, pinos[2], AZUL, "H")]):
        res = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
        sk.mount(res, "connector0", bb, f"pin{c}{linha}", others=[("connector1", f"pin{c+4}{linha}")])
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)-1)}", placa, pino, corfio)

def buzzer_na_bb(sk, bb, col, placa, pino):
    """Buzzer em pe: pino 1 na linha A, pino 2 (82 px acima) cai na linha H da mesma coluna."""
    bz = sk.add(Part(BUZZER, "Buzzer", 0, 0))
    sk.mount(bz, "connector0", bb, f"pin{col}A", others=[("connector1", f"pin{col}H")])
    sk.wire(bb, f"pin{col}B", placa, pino, "#8e44ad")                   # sinal
    sk.wire(bb, f"pin{col}J", bb, f"pin{rz(col)}Z", PRETO)              # outro pino -> GND (trilha de cima)
    return bz

def e1_uno_sensor():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_5V, bb, "pin3X", VERMELHO); sk.wire(uno, UNO_GND, bb, "pin3W", PRETO)
    sensor_na_bb(sk, bb, 12, uno, UNO_D[9], UNO_D[10])
    return sk.save(SAIDA, "01_uno_hcsr04")

def e2_uno_buzzer():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    buzzer_na_bb(sk, bb, 12, uno, UNO_D[8])
    return sk.save(SAIDA, "02_uno_buzzer")

def e3_uno_alarme():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_5V, bb, "pin3X", VERMELHO); sk.wire(uno, UNO_GND, bb, "pin3W", PRETO); sk.wire(bb, "pin3Z", bb, "pin3W", PRETO)
    sensor_na_bb(sk, bb, 4, uno, UNO_D[9], UNO_D[10])
    rgb_na_bb(sk, uno, [UNO_D[5], UNO_D[6], UNO_D[3]], bb, col=16)
    buzzer_na_bb(sk, bb, 27, uno, UNO_D[8])
    return sk.save(SAIDA, "03_uno_alarme_re")

def e4_esp32_alarme():
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(FULL, "Protoboard 830", 160, 30))
    sk.wire(esp, ESP_VIN, bb, "pin3X", VERMELHO)          # 5 V do USB para o sensor (trilha de baixo)
    sk.wire(esp, ESP_GND_L, bb, "pin3W", PRETO)
    sk.wire(esp, ESP_GND_R, bb, "pin3Z", PRETO)
    sensor_na_bb(sk, bb, 6, esp, ESP["D5"], ESP["D18"], via_divisor=12)
    rgb_na_bb(sk, esp, [ESP["D25"], ESP["D26"], ESP["D27"]], bb, col=30)
    buzzer_na_bb(sk, bb, 44, esp, ESP["D19"])
    return sk.save(SAIDA, "04_esp32_alarme")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA):
        if not f.startswith("grafico"): os.remove(os.path.join(SAIDA, f))
    for fn in (e1_uno_sensor, e2_uno_buzzer, e3_uno_alarme, e4_esp32_alarme): print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
