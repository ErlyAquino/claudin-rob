"""Esquemas de montagem (Fritzing) da aula de LEDs.  python esquemas.py -> saida/*.fzz + *.png"""
import os, sys
from fzgen import *
from export import export

UNO, ESP32 = "arduino_Uno_Rev3(fix)", "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF, FULL = "13f88e58b86d08d73d112f0fb05e6968", "Breadboard-RSR03MB102-ModuleID"
LED, RGB, RES = "5mmColorLEDModuleID", "d4d5af9700923b8a114f57961f29a8a0", "ResistorModuleID"
POT, BTN = "3234DFDC00PotentiometerModuleID", "33b94ebdb1ef4e7cf0f8425956cfca60"
UNO_5V, UNO_GND, UNO_A0 = "connector87", "connector88", "connector0"
UNO_D = {n: f"connector{51 + n - 8}" for n in range(8, 14)}      # D8..D13 -> connector51..56
UNO_D[2] = "connector63"
ESP_3V3, ESP_GND_R, ESP_GND_L = "connector0", "connector1", "connector28"
ESP = {"D25": "connector22", "D26": "connector23", "D27": "connector24", "D14": "connector25", "D12": "connector26",
       "D13": "connector27", "D4": "connector4", "D34": "connector18"}
CORES_LED = {"vermelho": "Red (633nm)", "amarelo": "Yellow (595nm)", "verde": "Green (570nm)"}

def rz(col):
    """coluna valida de trilha: as trilhas pulam as colunas 8, 14, 20, 26, ... (col % 6 == 2)"""
    return col + 1 if col % 6 == 2 else col

SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

def e1_led():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    led = sk.add(Part(LED, "LED", 0, 0, props={"color": "Red (633nm)"}))
    sk.mount(led, "cathode", bb, "pin10F", others=[("anode", "pin11F")])
    res = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
    sk.mount(res, "connector0", bb, "pin11J", others=[("connector1", "pin15J")])
    sk.wire(bb, "pin10J", bb, "pin10Z", PRETO)                     # catodo -> trilha GND
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    sk.wire(uno, UNO_D[8], bb, "pin15I", LARANJA)                   # pino 8 -> resistor -> anodo
    return sk.save(SAIDA, "01_uno_led")

def e2_led_botao():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    led = sk.add(Part(LED, "LED", 0, 0, props={"color": "Red (633nm)"}))
    sk.mount(led, "cathode", bb, "pin10F", others=[("anode", "pin11F")])
    res = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
    sk.mount(res, "connector0", bb, "pin11J", others=[("connector1", "pin15J")])
    sk.wire(bb, "pin10J", bb, "pin10Z", PRETO)
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    sk.wire(uno, UNO_D[8], bb, "pin15I", LARANJA)
    btn = sk.add(Part(BTN, "Botão", 0, 0))
    sk.mount(btn, "leg0", bb, "pin22B", others=[("leg1", "pin23B")])
    sk.wire(bb, "pin22A", uno, UNO_D[2], CINZA)                     # botao -> pino 2
    sk.wire(bb, "pin23A", bb, "pin23W", PRETO)                     # outro lado -> GND (trilha de baixo)
    sk.wire(bb, "pin3Z", bb, "pin3W", PRETO)                       # une as duas trilhas GND
    return sk.save(SAIDA, "02_uno_led_botao")

def semaforo(sk, placa, pinos, bb, col0=8, gnd_rail="Z"):
    """3 LEDs (vermelho, amarelo, verde) em pe nas colunas col0, col0+3, col0+6; resistores no anodo."""
    for i, (nome, pino, corfio) in enumerate(zip(["vermelho", "amarelo", "verde"], pinos, [VERMELHO, AMARELO, VERDE])):
        c = col0 + i * 7
        led = sk.add(Part(LED, f"LED {nome}", 0, 0, props={"color": CORES_LED[nome]}))
        sk.mount(led, "cathode", bb, f"pin{c}F", others=[("anode", f"pin{c+1}F")])
        sk.wire(bb, f"pin{c}J", bb, f"pin{rz(c)}{gnd_rail}", PRETO)
        res = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
        sk.mount(res, "connector0", bb, f"pin{c+1}J", others=[("connector1", f"pin{c+5}J")])
        sk.wire(bb, f"pin{c+5}I", placa, pino, corfio)

def e3_semaforo():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    semaforo(sk, uno, [UNO_D[10], UNO_D[9], UNO_D[8]], bb)
    return sk.save(SAIDA, "03_uno_semaforo")

def e4_semaforo_botao():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    semaforo(sk, uno, [UNO_D[10], UNO_D[9], UNO_D[8]], bb)
    btn = sk.add(Part(BTN, "Botão pedestre", 0, 0))
    sk.mount(btn, "leg0", bb, "pin24B", others=[("leg1", "pin25B")])
    sk.wire(bb, "pin24A", uno, UNO_D[2], CINZA)
    sk.wire(bb, "pin25A", bb, "pin25W", PRETO)
    sk.wire(bb, "pin3Z", bb, "pin3W", PRETO)
    return sk.save(SAIDA, "04_uno_semaforo_botao")

def rgb_na_bb(sk, placa, pinos, bb, col=8):
    """RGB catodo comum em pe: R(col) COM(col+1) G(col+2) B(col+3) na linha F; resistores nos anodos."""
    rgb = sk.add(Part(RGB, "LED RGB", 0, 0))
    sk.mount(rgb, "red anode", bb, f"pin{col}F", others=[("common cathode", f"pin{col+1}F"), ("green anode", f"pin{col+2}F"), ("blue anode", f"pin{col+3}F")])
    sk.wire(bb, f"pin{col+1}J", bb, f"pin{rz(col+1)}Z", PRETO)          # comum -> GND
    for k, (c, pino, corfio, linha) in enumerate([(col, pinos[0], VERMELHO, "J"), (col+2, pinos[1], VERDE, "I"), (col+3, pinos[2], AZUL, "H")]):
        res = sk.add(Part(RES, "220 Ω", 0, 0, props={"resistance": "220"}))
        sk.mount(res, "connector0", bb, f"pin{c}{linha}", others=[("connector1", f"pin{c+4}{linha}")])
        sk.wire(bb, f"pin{c+4}{chr(ord(linha)-1)}", placa, pino, corfio)

def e5_rgb_pot():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 60))
    bb = sk.add(Part(HALF, "Protoboard", 330, 20))
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)
    sk.wire(uno, UNO_5V, bb, "pin3Y", VERMELHO)
    rgb_na_bb(sk, uno, [UNO_D[9], UNO_D[10], UNO_D[11]], bb)
    pot = sk.add(Part(POT, "Pot 10k", 0, 0))
    sk.mount(pot, "leg1", bb, "pin22B", others=[("wiper", "pin24B"), ("leg2", "pin26B")])
    sk.wire(bb, "pin22A", bb, "pin22W", PRETO)
    sk.wire(bb, "pin26A", bb, "pin27X", VERMELHO)
    sk.wire(bb, "pin24A", uno, UNO_A0, AZUL)
    sk.wire(bb, "pin3Z", bb, "pin3W", PRETO); sk.wire(bb, "pin3Y", bb, "pin3X", VERMELHO)   # une trilhas
    btn = sk.add(Part(BTN, "Botão modo", 0, 0))
    sk.mount(btn, "leg0", bb, "pin29B", others=[("leg1", "pin30B")])
    sk.wire(bb, "pin29A", uno, UNO_D[2], CINZA)
    sk.wire(bb, "pin30A", bb, "pin30W", PRETO)
    return sk.save(SAIDA, "05_uno_rgb_pot")

def e6_esp32():
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 40))
    bb = sk.add(Part(FULL, "Protoboard 830", 160, 30))
    sk.wire(esp, ESP_GND_L, bb, "pin3Z", PRETO)
    sk.wire(esp, ESP_3V3, bb, "pin3X", VERMELHO)
    sk.wire(esp, ESP_GND_R, bb, "pin3W", PRETO)
    semaforo(sk, esp, [ESP["D25"], ESP["D26"], ESP["D27"]], bb, col0=8)
    rgb_na_bb(sk, esp, [ESP["D14"], ESP["D12"], ESP["D13"]], bb, col=31)
    pot = sk.add(Part(POT, "Pot 10k", 0, 0))
    sk.mount(pot, "leg1", bb, "pin40B", others=[("wiper", "pin42B"), ("leg2", "pin44B")])
    sk.wire(bb, "pin40A", bb, "pin40W", PRETO)
    sk.wire(bb, "pin44A", bb, "pin45X", VERMELHO)
    sk.wire(bb, "pin42A", esp, ESP["D34"], AZUL)
    btn = sk.add(Part(BTN, "Botão", 0, 0))
    sk.mount(btn, "leg0", bb, "pin50B", others=[("leg1", "pin51B")])
    sk.wire(bb, "pin50A", esp, ESP["D4"], CINZA)
    sk.wire(bb, "pin51A", bb, "pin51W", PRETO)
    return sk.save(SAIDA, "06_esp32_semaforo_rgb_web")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in (e1_led, e2_led_botao, e3_semaforo, e4_semaforo_botao, e5_rgb_pot, e6_esp32): print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
