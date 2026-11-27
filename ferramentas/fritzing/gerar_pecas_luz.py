"""Gera a peca Fritzing do sensor de luz da hidroponia (aula-agua, tutorial do BH1750):
  - cria_bh1750 : modulo GY-302 com o sensor de luminosidade BH1750FVI (I2C), 5 pinos na ordem da serigrafia:
                  VCC, GND, SCL, SDA, ADDR. Desenhado maior que o real (a placa tem ~19 x 14 mm) para a
                  inscricao e a ordem dos pinos ficarem legiveis.

Saida: ferramentas/fritzing/user-parts/{user/*.fzp, svg/user/{breadboard,schematic,pcb,icon}/*.svg}
Depois copie user-parts/* para ~/Documents/Fritzing/parts (Linux pt-BR: ~/Documentos/...) - o setup-linux-mint.sh faz isso.
Reaproveita as funcoes de desenho e de fzp de gerar_pecas_ar.py (mesma pasta). Script separado do gerar_pecas_agua.py
para regenerar so esta peca, sem tocar nas outras."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_pecas_ar import BASE, svg, pino_bb, texto, esquematico, pcb, fzp, gravar


def bh1750():
    W, H = 700, 900
    nomes = ["VCC", "GND", "SCL", "SDA", "ADDR"]
    xs = [150 + 100 * i for i in range(5)]; yp = 830
    c = ['<g id="breadboard">',
         '<rect x="10" y="10" width="680" height="870" rx="30" fill="#1f4e79" stroke="#102a44" stroke-width="10"/>',   # placa azul
         '<circle cx="80" cy="80" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<circle cx="620" cy="80" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         # o sensor: CI pequeno com a janela transparente por onde a luz entra
         '<rect x="270" y="150" width="160" height="130" rx="8" fill="#e8e8e8" stroke="#666" stroke-width="6"/>',
         '<rect x="315" y="180" width="70" height="70" rx="6" fill="#3a3a3a" stroke="#000" stroke-width="4"/>',
         '<rect x="338" y="203" width="24" height="24" fill="#b08d2e"/>',                                            # fotodiodo
         # raios de luz chegando ao sensor
         "".join(f'<line x1="{350 + dx}" y1="35" x2="{350 + dx // 3}" y2="130" stroke="#f1c232" stroke-width="10" stroke-linecap="round"/>'
                 for dx in (-110, -40, 40, 110)),
         texto(350, 365, "BH1750", 76),
         texto(350, 435, "GY-302 · luz em lux", 44, cor="#dceaf7", peso="normal"),
         texto(350, 495, "I2C · 0x23 (ADDR no 3V3: 0x5C)", 34, cor="#dceaf7", peso="normal"),
         '<rect x="90" y="530" width="120" height="50" fill="#333" stroke="#000" stroke-width="4"/>',                 # regulador / resistores (decorativo)
         '<rect x="490" y="530" width="120" height="50" fill="#333" stroke="#000" stroke-width="4"/>']
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(texto(x, 745, n, 34, rot=-60, anc="start"))
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_bh1750", titulo="BH1750 (GY-302) sensor de luminosidade I2C", label="LUX",
                desc="Módulo GY-302 com o sensor de luz ambiente BH1750FVI: iluminância em lux, 16 bits, interface I2C. Endereço 0x23 com ADDR solto ou no GND; 0x5C com ADDR no 3,3 V. Alimentação pelo 3,3 V do ESP32.",
                pinos=[("VCC", "alimentação: 3,3 V do ESP32"), ("GND", "terra"), ("SCL", "I2C clock (GPIO 22 no ESP32)"),
                       ("SDA", "I2C dados (GPIO 21 no ESP32)"), ("ADDR", "endereço: solto ou GND 0x23, 3,3 V 0x5C")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


if __name__ == "__main__":
    for p in (bh1750(),):
        a = p["mid"]
        gravar(f"{BASE}/user/{a}.fzp", fzp(p).replace("<tag>qualidade do ar</tag>", "<tag>agua</tag><tag>luz</tag>").replace("gerar_pecas_ar.py", "gerar_pecas_luz.py"))
        gravar(f"{BASE}/svg/user/breadboard/{a}_breadboard.svg", p["bb"])
        gravar(f"{BASE}/svg/user/icon/{a}_icon.svg", p["bb"].replace('id="breadboard"', 'id="icon"'))
        gravar(f"{BASE}/svg/user/schematic/{a}_schematic.svg", esquematico(p))
        gravar(f"{BASE}/svg/user/pcb/{a}_pcb.svg", pcb(p))
