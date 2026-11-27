"""Gera a peca Fritzing extra da aula de agua (aula-agua):
  - cria_yfs201 : sensor de vazao YF-S201 / ZJ-S201 (turbina + sensor Hall), G1/2", cabo de 3 fios
                  (vermelho VCC, amarelo SINAL, preto GND)
  - cria_hx710b, cria_ads1115 : modulo de pressao e conversor A/D
  - cria_tds    : modulo "TDS Meter V1.0" (condutividade/TDS analogico, clone do Gravity TDS) com a sonda de 2 eletrodos;
                  pinos na ordem da serigrafia: - (GND), + (VCC), A (saida analogica)
  - cria_ds18b20_sonda : DS18B20 a prova d'agua, cabo de 3 fios (vermelho VDD, amarelo dados, preto GND)
  - cria_ds18b20_to92  : DS18B20 no encapsulamento TO-92, visto pela face plana (1 GND, 2 DQ, 3 VDD)

Saida: ferramentas/fritzing/user-parts/{user/*.fzp, svg/user/{breadboard,schematic,pcb,icon}/*.svg}
Depois copie user-parts/* para ~/Documents/Fritzing/parts (Linux pt-BR: ~/Documentos/...) - o setup-linux-mint.sh faz isso.
Reaproveita as funcoes de desenho e de fzp de gerar_pecas_ar.py (mesma pasta)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_pecas_ar import BASE, svg, pino_bb, texto, esquematico, pcb, fzp, gravar


def yfs201():
    W, H = 1300, 1700
    xs = [550, 650, 750]; yp = 1630                       # 3 pinos, passo 100 mil
    cores = ["#cc0000", "#f1c232", "#222222"]              # vermelho VCC, amarelo sinal, preto GND
    c = ['<g id="breadboard">',
         # roscas G1/2 (entrada a esquerda, saida a direita)
         '<rect x="10" y="330" width="220" height="260" rx="10" fill="#b7b7b7" stroke="#666" stroke-width="8"/>',
         '<rect x="1070" y="330" width="220" height="260" rx="10" fill="#b7b7b7" stroke="#666" stroke-width="8"/>',
         "".join(f'<line x1="{x}" y1="335" x2="{x}" y2="585" stroke="#777" stroke-width="6"/>' for x in list(range(40, 230, 30)) + list(range(1100, 1290, 30))),
         # corpo da turbina
         '<rect x="200" y="270" width="900" height="380" rx="60" fill="#2f2f2f" stroke="#111" stroke-width="10"/>',
         '<circle cx="650" cy="460" r="230" fill="#3d3d3d" stroke="#111" stroke-width="10"/>',       # tampa do sensor Hall
         '<circle cx="650" cy="460" r="150" fill="#262626" stroke="#111" stroke-width="8"/>',
         # rotor (visivel na vista de cima, estilizado)
         "".join(f'<rect x="635" y="330" width="30" height="130" rx="10" fill="#9fc5e8" transform="rotate({a} 650 460)"/>' for a in range(0, 360, 60)),
         '<circle cx="650" cy="460" r="28" fill="#666"/>',
         texto(650, 740, "YF-S201 · G1/2\"", 60, cor="#ffffff"),
         texto(650, 820, "1–30 L/min · 450 pulsos/L", 46, cor="#dddddd", peso="normal"),
         # seta do sentido do fluxo
         '<path d="M 320 200 L 940 200 L 940 160 L 1040 220 L 940 280 L 940 240 L 320 240 Z" fill="#4a86e8" stroke="#1c4587" stroke-width="6"/>',
         texto(650, 130, "sentido da água", 44, cor="#1c4587", peso="normal"),
         # saida do cabo
         '<rect x="590" y="640" width="120" height="120" rx="20" fill="#111"/>']
    for i, (x, cor) in enumerate(zip(xs, cores)):
        c.append(f'<path d="M {620 + i*30} 760 C {620 + i*30} 1100, {x} 1250, {x} 1540" fill="none" stroke="{cor}" stroke-width="40" stroke-linecap="round"/>')
        c.append(f'<rect x="{x-40}" y="1520" width="80" height="80" fill="#111"/>')       # capa do pino
        c.append(pino_bb(i, x, yp))
    c.append(texto(650, 1470, "VCC  SINAL  GND", 40, cor="#444", peso="normal"))
    c.append("</g>")
    return dict(mid="cria_yfs201", titulo="YF-S201 / ZJ-S201 sensor de vazão (efeito Hall)", label="FLUXO",
                desc="Sensor de vazão de água G1/2\" com turbina e sensor Hall: ~450 pulsos por litro (F = 7,5 × Q). Vermelho = VCC 5–18 V, amarelo = pulsos, preto = GND.",
                pinos=[("VCC", "fio vermelho, alimentação 5–18 V"), ("SIG", "fio amarelo, pulsos do sensor Hall"), ("GND", "fio preto, terra")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


def hx710b():
    """modulo HX710B + sensor MPS20N0040D (0-40 kPa): placa roxa com 4 pinos VCC OUT SCK GND e o bico para a mangueira"""
    W, H = 900, 1100
    nomes = ["VCC", "OUT", "SCK", "GND"]
    xs = [300 + 100 * i for i in range(4)]; yp = 1030
    c = ['<g id="breadboard">',
         '<rect x="10" y="300" width="880" height="760" rx="30" fill="#5b2c6f" stroke="#3b1a4a" stroke-width="10"/>',   # placa
         '<circle cx="80" cy="370" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<circle cx="820" cy="370" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         # sensor MPS20N0040D (caixa preta) com o bico de ar para cima
         '<rect x="250" y="80" width="400" height="330" rx="30" fill="#222" stroke="#000" stroke-width="10"/>',
         '<rect x="420" y="10" width="60" height="90" rx="10" fill="#444" stroke="#000" stroke-width="6"/>',       # bico
         texto(450, 230, "MPS20N", 54, cor="#dddddd"), texto(450, 300, "0040D", 54, cor="#dddddd"),
         texto(450, 370, "0–40 kPa", 40, cor="#bbbbbb", peso="normal"),
         # CI HX710B
         '<rect x="320" y="470" width="260" height="140" rx="10" fill="#111" stroke="#000" stroke-width="6"/>',
         texto(450, 555, "HX710B", 56, cor="#ffffff"),
         texto(450, 700, "24 bits · pressão", 46, cor="#f3e5f5", peso="normal"),
         texto(450, 780, "VCC   OUT   SCK   GND", 44, cor="#ffffff"),
         '<rect x="100" y="640" width="110" height="60" fill="#333" stroke="#000" stroke-width="4"/>',           # capacitor/regulador (decorativo)
         '<rect x="690" y="640" width="110" height="60" fill="#333" stroke="#000" stroke-width="4"/>']
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(texto(x, 950, n, 40))
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_hx710b", titulo="Módulo HX710B + MPS20N0040D (pressão 0–40 kPa)", label="PRESSAO",
                desc="Sensor de pressão piezorresistivo MPS20N0040D (0–40 kPa, manométrico) com conversor A/D de 24 bits HX710B. Interface de 2 fios (OUT = dados, SCK = clock), 2,6–5,5 V.",
                pinos=[("VCC", "alimentação 2,6–5,5 V"), ("OUT", "dados (DOUT): fica em 0 quando há leitura pronta"), ("SCK", "clock: 25 pulsos = leitura"), ("GND", "terra")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


def ads1115():
    """modulo ADS1115 (conversor A/D de 16 bits, I2C): placa azul com 10 pinos VDD GND SCL SDA ADDR ALRT A0 A1 A2 A3"""
    W, H = 1100, 800
    nomes = ["VDD", "GND", "SCL", "SDA", "ADDR", "ALRT", "A0", "A1", "A2", "A3"]
    xs = [100 + 100 * i for i in range(10)]; yp = 730
    c = ['<g id="breadboard">',
         '<rect x="10" y="10" width="1080" height="770" rx="30" fill="#1f4e79" stroke="#102a44" stroke-width="10"/>',
         '<circle cx="80" cy="80" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<circle cx="1020" cy="80" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<rect x="400" y="220" width="300" height="200" rx="10" fill="#111" stroke="#000" stroke-width="6"/>',    # CI
         texto(550, 335, "ADS1115", 60, cor="#ffffff"),
         texto(550, 140, "ADC 16 bits · I2C · 4 canais", 46, cor="#dceaf7", peso="normal"),
         texto(550, 500, "PGA ±0,256 … ±6,144 V   ADDR: GND=0x48 VDD=0x49", 36, cor="#dceaf7", peso="normal"),
         '<rect x="120" y="250" width="200" height="60" fill="#333" stroke="#000" stroke-width="4"/>',           # pull-ups (decorativo)
         '<rect x="780" y="250" width="200" height="60" fill="#333" stroke="#000" stroke-width="4"/>']
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(texto(x, 640, n, 34, rot=-60, anc="start"))
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_ads1115", titulo="ADS1115 conversor A/D de 16 bits (I2C)", label="ADC",
                desc="Conversor analógico-digital de 16 bits com 4 canais, amplificador de ganho programável e interface I2C. 2,0–5,5 V. Endereço 0x48 com ADDR no GND.",
                pinos=[("VDD", "alimentação 2,0–5,5 V"), ("GND", "terra"), ("SCL", "I2C clock"), ("SDA", "I2C dados"), ("ADDR", "endereço: GND 0x48, VDD 0x49, SDA 0x4A, SCL 0x4B"),
                       ("ALRT", "saída de alerta/pronto (opcional)"), ("A0", "entrada analógica 0"), ("A1", "entrada analógica 1"), ("A2", "entrada analógica 2"), ("A3", "entrada analógica 3")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)

def tds():
    """modulo TDS Meter V1.0 (condutividade / TDS analogico): placa com 3 pinos  -  +  A  e a sonda de 2 eletrodos no cabo"""
    W, H = 900, 1750
    nomes = ["−", "+", "A"]
    xs = [350, 450, 550]; yp = 1680
    c = ['<g id="breadboard">',
         # sonda (ponta para cima): dois eletrodos de metal, corpo preto a prova d'agua
         '<rect x="405" y="20" width="26" height="150" rx="8" fill="#d9d9d9" stroke="#777" stroke-width="5"/>',
         '<rect x="469" y="20" width="26" height="150" rx="8" fill="#d9d9d9" stroke="#777" stroke-width="5"/>',
         '<rect x="370" y="150" width="160" height="330" rx="40" fill="#1b1b1b" stroke="#000" stroke-width="8"/>',
         texto(650, 110, "2 eletrodos", 40, cor="#444", peso="normal", anc="start"),
         texto(650, 330, "sonda", 46, cor="#444", anc="start"),
         texto(650, 385, "(só ela vai na água)", 34, cor="#444", peso="normal", anc="start"),
         # cabo da sonda ate o conector de 2 pinos da placa
         '<path d="M 450 480 C 450 560, 300 560, 300 660 S 450 740, 450 800" fill="none" stroke="#111" stroke-width="34" stroke-linecap="round"/>',
         # placa
         '<rect x="10" y="790" width="880" height="930" rx="30" fill="#17375e" stroke="#0b1f38" stroke-width="10"/>',
         '<circle cx="80" cy="860" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<circle cx="820" cy="860" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',
         '<rect x="350" y="800" width="200" height="110" rx="10" fill="#f3f3f3" stroke="#999" stroke-width="6"/>',      # conector XH da sonda
         '<rect x="330" y="1010" width="240" height="150" rx="10" fill="#111" stroke="#000" stroke-width="6"/>',      # CI
         texto(450, 1250, "TDS Meter V1.0", 64, cor="#ffffff"),
         texto(450, 1330, "condutividade · 0–1000 ppm", 44, cor="#dceaf7", peso="normal"),
         texto(450, 1400, "3,3–5,5 V · saída 0–2,3 V", 44, cor="#dceaf7", peso="normal"),
         '<rect x="110" y="1040" width="130" height="60" fill="#333" stroke="#000" stroke-width="4"/>',
         '<rect x="660" y="1040" width="130" height="60" fill="#333" stroke="#000" stroke-width="4"/>',
         '<rect x="290" y="1600" width="320" height="110" rx="10" fill="#f3f3f3" stroke="#999" stroke-width="6"/>']    # conector de 3 pinos
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(texto(x, 1570, n, 70))
        c.append(pino_bb(i, x, yp))
    c.append(texto(450, 1490, "GND  VCC  sinal", 40, cor="#dceaf7", peso="normal"))
    c.append("</g>")
    return dict(mid="cria_tds", titulo="TDS Meter V1.0 (condutividade / TDS analógico) com sonda", label="TDS",
                desc="Módulo analógico de condutividade elétrica / TDS (clone do Gravity TDS): 3,3–5,5 V, saída 0–2,3 V, 0–1000 ppm, sonda de 2 eletrodos à prova d'água excitada em corrente alternada. A placa não é à prova d'água.",
                pinos=[("GND", "terra (−)"), ("VCC", "alimentação 3,3–5,5 V (+)"), ("A", "saída analógica 0–2,3 V")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)

def ds18b20_sonda():
    """DS18B20 a prova d'agua: capsula de inox na ponta de um cabo de 3 fios (vermelho VDD, amarelo dados, preto GND)"""
    W, H = 600, 1750
    xs = [200, 300, 400]; yp = 1680
    cores = ["#cc0000", "#f1c232", "#222222"]
    c = ['<g id="breadboard">',
         '<rect x="262" y="20" width="76" height="430" rx="34" fill="#d9d9d9" stroke="#777" stroke-width="8"/>',       # capsula de inox
         '<rect x="255" y="430" width="90" height="120" rx="14" fill="#1b1b1b" stroke="#000" stroke-width="6"/>',      # termorretratil
         '<path d="M 300 550 C 300 700, 420 760, 300 900 S 300 1050, 300 1120" fill="none" stroke="#111" stroke-width="40" stroke-linecap="round"/>',
         texto(370, 200, "DS18B20", 46, cor="#444", anc="start"),
         texto(370, 255, "à prova d'água", 34, cor="#444", peso="normal", anc="start")]
    for i, (x, cor) in enumerate(zip(xs, cores)):
        c.append(f'<path d="M {280 + i*20} 1110 C {280 + i*20} 1330, {x} 1380, {x} 1590" fill="none" stroke="{cor}" stroke-width="36" stroke-linecap="round"/>')
        c.append(f'<rect x="{x-40}" y="1570" width="80" height="80" fill="#111"/>')
        c.append(pino_bb(i, x, yp))
    c.append(texto(300, 1530, "VDD  DADOS  GND", 36, cor="#444", peso="normal"))
    c.append("</g>")
    return dict(mid="cria_ds18b20_sonda", titulo="DS18B20 à prova d'água (sonda com cabo de 3 fios)", label="TEMP",
                desc="Sensor de temperatura digital DS18B20 em cápsula de inox com cabo: vermelho = VDD (3,0–5,5 V), amarelo = dados (1-Wire, com resistor de 4,7 kΩ até o VDD), preto = GND.",
                pinos=[("VDD", "fio vermelho, 3,0–5,5 V"), ("DQ", "fio amarelo, dados 1-Wire"), ("GND", "fio preto, terra")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


def ds18b20_to92():
    """DS18B20 no encapsulamento TO-92, visto de frente (face plana com a inscricao): 1 GND, 2 DQ (dados), 3 VDD.
    Desenhado maior que o real (o corpo tem ~5 mm) para a inscricao e a ordem dos pinos ficarem legiveis."""
    W, H = 500, 950
    xs = [150, 250, 350]; yp = 880
    nomes = ["GND", "DQ", "VDD"]
    c = ['<g id="breadboard">',
         '<path d="M 70 330 L 70 120 Q 70 40 150 40 L 350 40 Q 430 40 430 120 L 430 330 Z" fill="#1b1b1b" stroke="#000" stroke-width="8"/>',   # face plana
         '<rect x="70" y="330" width="360" height="26" fill="#333" stroke="#000" stroke-width="6"/>',
         texto(250, 150, "DALLAS", 50, cor="#dddddd"),
         texto(250, 225, "18B20", 62, cor="#ffffff"),
         texto(250, 295, "1   2   3", 46, cor="#bbbbbb", peso="normal")]
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(f'<rect x="{x-13}" y="356" width="26" height="500" fill="#bdbdbd" stroke="#777" stroke-width="4"/>')    # perna
        c.append(texto(x, 620, n, 44, cor="#444", rot=-90))
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_ds18b20_to92", titulo="DS18B20 TO-92 (visto pela face plana)", label="TEMP",
                desc="Sensor de temperatura digital DS18B20 no encapsulamento TO-92, visto pela face plana: pino 1 = GND, pino 2 = DQ (dados 1-Wire, com resistor de 4,7 kΩ até o VDD), pino 3 = VDD (3,0–5,5 V).",
                pinos=[("GND", "pino 1, terra"), ("DQ", "pino 2, dados 1-Wire"), ("VDD", "pino 3, 3,0–5,5 V")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


if __name__ == "__main__":
    for p in (yfs201(), hx710b(), ads1115(), tds(), ds18b20_sonda(), ds18b20_to92()):
        a = p["mid"]
        gravar(f"{BASE}/user/{a}.fzp", fzp(p).replace("<tag>qualidade do ar</tag>", "<tag>agua</tag>").replace("gerar_pecas_ar.py", "gerar_pecas_agua.py"))
        gravar(f"{BASE}/svg/user/breadboard/{a}_breadboard.svg", p["bb"])
        gravar(f"{BASE}/svg/user/icon/{a}_icon.svg", p["bb"].replace('id="breadboard"', 'id="icon"'))
        gravar(f"{BASE}/svg/user/schematic/{a}_schematic.svg", esquematico(p))
        gravar(f"{BASE}/svg/user/pcb/{a}_pcb.svg", pcb(p))
