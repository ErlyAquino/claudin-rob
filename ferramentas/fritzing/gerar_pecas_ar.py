"""Gera as pecas Fritzing extras da aula de qualidade do ar (aula-ar):
  - cria_dht11_mod3 : modulo DHT11 de 3 pinos (VCC | DATA no meio | GND), com LED e resistor de pull-up na placa
  - cria_dht22_fios : DHT22/AM2302 com 3 fios (vermelho VCC, amarelo DATA, preto GND)
  - cria_mhz19b     : sensor de CO2 MH-Z19B (NDIR), barra de pinos Vin GND RX TX PWM

Saida: ferramentas/fritzing/user-parts/{user/*.fzp, svg/user/{breadboard,schematic,pcb,icon}/*.svg}
Depois copie user-parts/* para ~/Documentos/Fritzing/parts (e ~/Documents/Fritzing/parts) - o setup-linux-mint.sh faz isso.
Unidades: polegadas, viewBox em milesimos de polegada (mil). Passo dos pinos: 100 mil (protoboard)."""
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "user-parts")


def svg(w, h, corpo):
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.2" '
            f'width="{w/1000:.3f}in" height="{h/1000:.3f}in" viewBox="0 0 {w} {h}">\n{corpo}\n</svg>\n')


def pino_bb(i, x, y):
    """pino macho visto de cima: quadrado dourado de 60 mil centrado em (x, y)"""
    return (f'<rect id="connector{i}pin" x="{x-30}" y="{y-30}" width="60" height="60" fill="#c8a24a" stroke="#7a5c12" stroke-width="6"/>')


def texto(x, y, t, tam=50, cor="#ffffff", anc="middle", peso="bold", rot=0):
    tr = f' transform="rotate({rot} {x} {y})"' if rot else ""
    return (f'<text x="{x}" y="{y}" font-family="Droid Sans, DejaVu Sans, sans-serif" font-size="{tam}" '
            f'font-weight="{peso}" fill="{cor}" text-anchor="{anc}"{tr}>{t}</text>')


def grade(x0, y0, w, h, cor="#0b5394", fundo="#3d85c6", passo=60):
    """carcaca com a grade de ventilacao tipica dos DHT"""
    s = [f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="30" fill="{fundo}" stroke="{cor}" stroke-width="10"/>']
    for yy in range(y0 + 60, y0 + h - 40, passo):
        for xx in range(x0 + 50, x0 + w - 40, passo):
            s.append(f'<rect x="{xx}" y="{yy}" width="{passo-25}" height="{passo-30}" rx="6" fill="{cor}"/>')
    return "\n".join(s)


# ---------------------------------------------------------------- pecas
def dht11_mod3():
    W, H = 500, 1200
    xs = [150, 250, 350]; yp = 1130
    c = ['<g id="breadboard">',
         '<rect x="10" y="560" width="480" height="630" rx="30" fill="#1c4587" stroke="#0b2a5a" stroke-width="10"/>',   # placa
         '<circle cx="80" cy="640" r="35" fill="#ffffff" stroke="#999" stroke-width="6"/>',                                # furo
         grade(70, 20, 360, 560),
         texto(250, 690, "DHT11", 70),
         # LED de energia e resistor SMD (10k) - o pull-up ja vem na placa
         '<rect x="330" y="740" width="90" height="50" fill="#e06666" stroke="#990000" stroke-width="6"/>',
         texto(375, 840, "LED", 38),
         '<rect x="90" y="740" width="110" height="50" fill="#333" stroke="#000" stroke-width="6"/>',
         texto(145, 840, "10k", 38),
         texto(150, 1040, "+", 70), texto(250, 1040, "S", 60), texto(350, 1040, "−", 70),
         texto(250, 960, "VCC DATA GND", 34, peso="normal")]
    for i, x in enumerate(xs):
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_dht11_mod3", titulo="Módulo DHT11 (3 pinos: VCC, DATA, GND)", label="DHT",
                desc="Módulo DHT11 de 3 pinos com LED e resistor de pull-up na placa. Pino do meio = dados.",
                pinos=[("VCC", "alimentação 3,3–5,5 V"), ("DATA", "dados (1 fio)"), ("GND", "terra")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


def dht22_fios():
    W, H = 600, 1800
    xs = [200, 300, 400]; yp = 1730
    cores = ["#cc0000", "#f1c232", "#222222"]
    c = ['<g id="breadboard">', grade(40, 20, 520, 760, cor="#999999", fundo="#f3f3f3", passo=70),
         '<rect x="40" y="780" width="520" height="180" rx="20" fill="#efefef" stroke="#999" stroke-width="10"/>',
         texto(300, 900, "DHT22", 80, cor="#444")]
    for i, (x, cor) in enumerate(zip(xs, cores)):
        c.append(f'<path d="M {240 + i*60} 960 C {240 + i*60} 1250, {x} 1350, {x} 1640" fill="none" stroke="{cor}" stroke-width="40" stroke-linecap="round"/>')
        c.append(f'<rect x="{x-40}" y="1620" width="80" height="80" fill="#111"/>')       # capa do conector
        c.append(pino_bb(i, x, yp))
    c.append(texto(300, 1560, "VCC  DATA  GND", 40, cor="#444", peso="normal"))
    c.append("</g>")
    return dict(mid="cria_dht22_fios", titulo="DHT22 / AM2302 com 3 fios (vermelho, amarelo, preto)", label="DHT",
                desc="DHT22 (AM2302) com cabo: vermelho = VCC, amarelo = dados, preto = GND. A versão com cabo já tem o pull-up interno.",
                pinos=[("VCC", "fio vermelho, 3,3–6 V"), ("DATA", "fio amarelo, dados"), ("GND", "fio preto, terra")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


def mhz19b():
    W, H = 1400, 1000
    nomes = ["Vin", "GND", "RX", "TX", "PWM"]
    xs = [500 + 100 * i for i in range(len(nomes))]; yp = 930
    c = ['<g id="breadboard">',
         '<rect x="10" y="10" width="1380" height="960" rx="30" fill="#38761d" stroke="#274e13" stroke-width="10"/>',   # placa verde
         '<rect x="70" y="70" width="1260" height="640" rx="40" fill="#d4af37" stroke="#8a6d1c" stroke-width="12"/>',   # caixa dourada
         '<rect x="110" y="110" width="1180" height="560" rx="30" fill="none" stroke="#b8952b" stroke-width="8"/>',
         texto(700, 340, "MH-Z19B", 150, cor="#5b4300"),
         texto(700, 480, "CO₂ NDIR 0–5000 ppm", 70, cor="#5b4300", peso="normal"),
         '<circle cx="1230" cy="600" r="30" fill="#ffffff" stroke="#8a6d1c" stroke-width="6"/>']
    for i, (x, n) in enumerate(zip(xs, nomes)):
        c.append(texto(x, 840, n, 44, rot=0))
        c.append(pino_bb(i, x, yp))
    c.append("</g>")
    return dict(mid="cria_mhz19b", titulo="MH-Z19B sensor de CO2 (NDIR)", label="CO2",
                desc="Sensor de CO2 por infravermelho não dispersivo, alimentação 4,5–5,5 V, UART 9600 baud com nível de 3,3 V.",
                pinos=[("Vin", "alimentação 5 V"), ("GND", "terra"), ("RX", "recebe (nível 3,3 V)"), ("TX", "envia (nível 3,3 V)"), ("PWM", "saída PWM (opcional)")],
                bb=svg(W, H, "\n".join(c)), w=W, h=H, xs=xs, yp=yp)


# ---------------------------------------------------------------- vistas comuns
def esquematico(p):
    n = len(p["pinos"]); h = 300 + 300 * n; w = 1500
    c = ['<g id="schematic">',
         f'<rect x="500" y="100" width="900" height="{h-200}" fill="none" stroke="#000" stroke-width="20"/>',
         texto(950, 220, p["label"], 90, cor="#000")]
    for i, (nome, _) in enumerate(p["pinos"]):
        y = 400 + 300 * i
        c.append(f'<line id="connector{i}pin" x1="0" y1="{y}" x2="500" y2="{y}" stroke="#000" stroke-width="20"/>')
        c.append(f'<rect id="connector{i}terminal" x="0" y="{y-10}" width="20" height="20" fill="none"/>')
        c.append(texto(540, y + 30, nome, 90, cor="#000", anc="start", peso="normal"))
    c.append("</g>")
    return svg(w, h, "\n".join(c))


def pcb(p):
    w, h = p["w"], p["h"]
    cobre = lambda camada: "\n".join([f'<g id="{camada}">'] + [
        f'<circle id="connector{i}pin" cx="{x}" cy="{p["yp"]}" r="38" fill="none" stroke="#f7bd13" stroke-width="20"/>'
        for i, x in enumerate(p["xs"])] + ["</g>"])
    silk = f'<g id="silkscreen"><rect x="10" y="10" width="{w-20}" height="{h-20}" fill="none" stroke="#000" stroke-width="10"/></g>'
    return svg(w, h, silk + "\n" + cobre("copper0") + "\n" + cobre("copper1"))


def fzp(p):
    arq = p["mid"]
    cons = []
    for i, (nome, d) in enumerate(p["pinos"]):
        cons.append(f'''  <connector id="connector{i}" type="male" name="{nome}">
   <description>{d}</description>
   <views>
    <breadboardView><p layer="breadboard" svgId="connector{i}pin"/></breadboardView>
    <schematicView><p layer="schematic" svgId="connector{i}pin" terminalId="connector{i}terminal"/></schematicView>
    <pcbView><p layer="copper0" svgId="connector{i}pin"/><p layer="copper1" svgId="connector{i}pin"/></pcbView>
   </views>
  </connector>''')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<module moduleId="{arq}" fritzingVersion="0.9.4">
 <version>1</version>
 <author>Espaço Cria (gerar_pecas_ar.py)</author>
 <title>{p["titulo"]}</title>
 <label>{p["label"]}</label>
 <date>2026-11-03</date>
 <tags><tag>cria</tag><tag>qualidade do ar</tag></tags>
 <properties><property name="family">{arq}</property><property name="variant">variant 1</property></properties>
 <description>{p["desc"]}</description>
 <views>
  <iconView><layers image="icon/{arq}_icon.svg"><layer layerId="icon"/></layers></iconView>
  <breadboardView><layers image="breadboard/{arq}_breadboard.svg"><layer layerId="breadboard"/></layers></breadboardView>
  <schematicView><layers image="schematic/{arq}_schematic.svg"><layer layerId="schematic"/></layers></schematicView>
  <pcbView><layers image="pcb/{arq}_pcb.svg"><layer layerId="silkscreen"/><layer layerId="copper0"/><layer layerId="copper1"/></layers></pcbView>
 </views>
 <connectors>
{chr(10).join(cons)}
 </connectors>
</module>
'''


def gravar(caminho, conteudo):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf8") as f:
        f.write(conteudo)
    print("gravado", os.path.relpath(caminho, BASE))


if __name__ == "__main__":
    for p in (dht11_mod3(), dht22_fios(), mhz19b()):
        a = p["mid"]
        gravar(f"{BASE}/user/{a}.fzp", fzp(p))
        gravar(f"{BASE}/svg/user/breadboard/{a}_breadboard.svg", p["bb"])
        gravar(f"{BASE}/svg/user/icon/{a}_icon.svg", p["bb"].replace('id="breadboard"', 'id="icon"'))
        gravar(f"{BASE}/svg/user/schematic/{a}_schematic.svg", esquematico(p))
        gravar(f"{BASE}/svg/user/pcb/{a}_pcb.svg", pcb(p))
