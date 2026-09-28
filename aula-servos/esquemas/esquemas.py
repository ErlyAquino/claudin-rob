"""Gera os esquemas de montagem (Fritzing) das atividades do curso de servos.
Uso:  python esquemas.py            -> gera .fzz em ./saida e exporta PNG via Fritzing + LibreOffice
Os .fzz podem ser abertos/editados no Fritzing (C:\\Ferramentas\\Fritzing\\Fritzing.exe).
"""
import os, sys
from fzgen import *
from export import export

UNO   = "arduino_Uno_Rev3(fix)"
ESP32 = "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1"
HALF  = "13f88e58b86d08d73d112f0fb05e6968"          # Half breadboard (rails: Y/X = +, Z/W = -)
FULL  = "Breadboard-RSR03MB102-ModuleID"            # Full breadboard 830
SERVO = "3234DBDC80leg"
POT   = "3234DFDC00PotentiometerModuleID"            # Rotary potentiometer (pernas a 0,2")
BTN   = "33b94ebdb1ef4e7cf0f8425956cfca60"          # Round pushbutton (pernas a 0,1")
CAP   = "MediumElectrolyticCapacitorModuleID"
PLUG  = "d8f570d723ea4d14f9b61b34575a9699"          # Power plug (VCC/GND)

# ids fixos para nomes ambiguos
UNO_5V, UNO_GND, UNO_A0, UNO_D9 = "connector87", "connector88", "connector0", "connector52"
ESP_3V3, ESP_GND_R, ESP_GND_L, ESP_VIN = "connector0", "connector1", "connector28", "connector29"
ESP = {"D13": "connector27", "D12": "connector26", "D14": "connector25", "D27": "connector24",
       "D34": "connector18", "D35": "connector19", "D32": "connector20", "D33": "connector21",
       "D25": "connector22", "D26": "connector23"}

SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")

def servo_em(sk, titulo, x, y, rot=90):
    """rot=90: pernas para baixo; rot=270: pernas para cima"""
    return sk.add(Part(SERVO, titulo, x, y, rot=rot))

def e1_uno_servo():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 0))
    srv = servo_em(sk, "Servo SG90", 330, -60)
    sk.wire(srv, "gnd", uno, UNO_GND, MARROM)
    sk.wire(srv, "vcc", uno, UNO_5V, VERMELHO)
    sk.wire(srv, "pulse", uno, UNO_D9, LARANJA)
    return sk.save(SAIDA, "01_uno_servo")

def pot_na_half(sk, bb, col, titulo="Pot 10k"):
    pot = sk.add(Part(POT, titulo, 0, 0))
    sk.mount(pot, "leg1", bb, f"pin{col}F", others=[("wiper", f"pin{col+2}F"), ("leg2", f"pin{col+4}F")])
    return pot

def e2_uno_pot_servo():
    sk = Sketch()
    uno = sk.add(Part(UNO, "Arduino Uno", 0, 70))
    bb  = sk.add(Part(HALF, "Protoboard", 330, 30))
    pot = pot_na_half(sk, bb, 9)
    srv = servo_em(sk, "Servo SG90", 520, -85)
    sk.wire(uno, UNO_5V, bb, "pin3Y", VERMELHO)          # 5 V -> trilha +
    sk.wire(uno, UNO_GND, bb, "pin3Z", PRETO)            # GND -> trilha -
    sk.wire(bb, "pin9J", bb, "pin9Z", PRETO)             # pot leg1 -> GND
    sk.wire(bb, "pin13J", bb, "pin13Y", VERMELHO)        # pot leg2 -> 5 V
    sk.wire(bb, "pin11J", uno, UNO_A0, AZUL)             # cursor -> A0
    sk.wire(srv, "gnd", bb, "pin24Z", MARROM)
    sk.wire(srv, "vcc", bb, "pin24Y", VERMELHO)
    sk.wire(srv, "pulse", uno, UNO_D9, LARANJA)
    return sk.save(SAIDA, "02_uno_pot_servo")

def e3_esp32_pot_servo():
    sk = Sketch()
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 30))
    bb  = sk.add(Part(HALF, "Protoboard", 170, 20))
    pot = pot_na_half(sk, bb, 9)
    srv = servo_em(sk, "Servo SG90", 380, 215, rot=270)
    sk.wire(esp, ESP_3V3, bb, "pin3Y", VERMELHO)         # 3V3 -> trilha + (pot)
    sk.wire(esp, ESP_GND_R, bb, "pin3Z", PRETO)          # GND -> trilha -
    sk.wire(bb, "pin9J", bb, "pin9Z", PRETO)
    sk.wire(bb, "pin13J", bb, "pin13Y", VERMELHO)
    sk.wire(bb, "pin11J", esp, ESP["D34"], AZUL)         # cursor -> GPIO34
    sk.wire(srv, "gnd", esp, ESP_GND_L, MARROM)          # servo alimentado pelo VIN (5 V)
    sk.wire(srv, "vcc", esp, ESP_VIN, VERMELHO)
    sk.wire(srv, "pulse", esp, ESP["D13"], LARANJA)
    return sk.save(SAIDA, "03_esp32_pot_servo")

def braco(sk, com_botoes=False):
    esp = sk.add(Part(ESP32, "ESP32 DevKit V1", 0, 110))
    bb  = sk.add(Part(FULL, "Protoboard 830", 150, 130))
    plug = sk.add(Part(PLUG, "Fonte 5 V 2 A", 150, 40))
    # trilhas de CIMA (Y+/Z-) = 5 V da fonte -> servos ; trilhas de BAIXO (X+/W-) = 3V3 do ESP32 -> pots. GND comum.
    sk.wire(plug, "VCC", bb, "pin3Y", VERMELHO)
    sk.wire(plug, "connector0", bb, "pin3Z", PRETO)
    sk.wire(esp, ESP_GND_L, bb, "pin5Z", PRETO)          # GND comum ESP32 <-> fonte
    sk.wire(esp, ESP_3V3, bb, "pin3X", VERMELHO)
    sk.wire(esp, ESP_GND_R, bb, "pin5W", PRETO)
    nomes = ["base", "ombro", "cotovelo", "garra"]
    adc = ["D34", "D35", "D32", "D33"]
    for i, col in enumerate([9, 17, 25, 33]):            # pots: pernas na linha B; fios descem para X/W
        pot = sk.add(Part(POT, f"Pot {nomes[i]}", 0, 0))
        sk.mount(pot, "leg1", bb, f"pin{col}B", others=[("wiper", f"pin{col+2}B"), ("leg2", f"pin{col+4}B")])
        sk.wire(bb, f"pin{col}A", bb, f"pin{col}W", PRETO)
        sk.wire(bb, f"pin{col+4}A", bb, f"pin{col+4}X", VERMELHO)
        sk.wire(bb, f"pin{col+2}A", esp, ESP[adc[i]], AZUL)
    cap = sk.add(Part(CAP, "470 uF", 0, 0, props={"capacitance": "470µF", "voltage": "10V"}))
    sk.mount(cap, "-", bb, "pin60J", others=[("+", "pin61J")])
    sk.wire(bb, "pin60I", bb, "pin60Z", PRETO)
    sk.wire(bb, "pin61I", bb, "pin61Y", VERMELHO)
    sinal = ["D13", "D12", "D14", "D27"]
    for i, col in enumerate([27, 37, 47, 57]):           # servos em fila acima da protoboard, pernas para baixo
        srv = servo_em(sk, f"Servo {nomes[i]}", 150 + col * 9 - 30, 0)
        sk.wire(srv, "gnd", bb, f"pin{col}Z", MARROM)
        sk.wire(srv, "vcc", bb, f"pin{col+2}Y", VERMELHO)
        sk.wire(srv, "pulse", esp, ESP[sinal[i]], [LARANJA, AMARELO, VERDE, BRANCO][i])
    if com_botoes:
        for col, gpio, nome in [(44, "D25", "GRAVAR"), (50, "D26", "PLAY")]:
            btn = sk.add(Part(BTN, f"Botao {nome}", 0, 0))
            sk.mount(btn, "leg0", bb, f"pin{col}B", others=[("leg1", f"pin{col+1}B")])
            sk.wire(bb, f"pin{col}A", esp, ESP[gpio], CINZA)
            sk.wire(bb, f"pin{col+1}A", bb, f"pin{col+1}W", PRETO)
    return sk

def e4_braco():   return braco(Sketch()).save(SAIDA, "04_esp32_braco_4servos")
def e5_braco_botoes(): return braco(Sketch(), com_botoes=True).save(SAIDA, "05_esp32_braco_botoes")

if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA): os.remove(os.path.join(SAIDA, f))
    for fn in (e1_uno_servo, e2_uno_pot_servo, e3_esp32_pot_servo, e4_braco, e5_braco_botoes):
        print("gerado", fn())
    if "--sem-export" not in sys.argv:
        for p in export(SAIDA): print("png", p, os.path.getsize(p) // 1024, "KB")
