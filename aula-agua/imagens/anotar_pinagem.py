import sys
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = im.size                      # 1200 x 1600
# margem branca a direita e embaixo para os rotulos
MD, MB = 620, 330
tela = Image.new("RGB", (W + MD, H + MB), "white")
tela.paste(im, (0, 0))
d = ImageDraw.Draw(tela)
F = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
f1, f2 = ImageFont.truetype(F, 40), ImageFont.truetype(F, 34)
COR = "#c0392b"
def seta(p0, p1):
    d.line([p0, p1], fill=COR, width=6)
    x, y = p1; d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=COR)
def rot(xy, txt, alvo, fonte=f1):
    x, y = xy
    d.multiline_text((x, y), txt, fill="black", font=fonte, spacing=6)
    seta((x - 12, y + 24), alvo)
X = W + 40
rot((X, 150),  "Conector BNC\n(entra a sonda de vidro)", (790, 200))
rot((X, 560),  "CI 4502C: amplificador\nde alta impedância", (700, 880))
rot((X, 790),  "Potenciômetro de OFFSET\n(o mais perto do BNC):\nacerta pH 7 = 2,5 V no Po", (1010, 840))
rot((X, 1100), "Potenciômetro do LIMIAR\n(só afeta o pino Do)", (1010, 1190))
rot((X, 1340), "Barra de 6 pinos\n(detalhe abaixo)", (870, 1400))
# pinos: x aproximado de cada um na foto
pinos = [(572, "To", "temperatura\n(não usar)", "#555555"),
         (624, "Do", "limiar digital\n(não usar)", "#555555"),
         (680, "Po", "SAÍDA DE pH\n(fio de dados)", "#b8860b"),
         (730, "G",  "GND", "black"),
         (782, "G",  "GND", "black"),
         (836, "V+", "5 V", "#c0392b")]
# rotulos espalhados embaixo, com linha ate cada pino
n = len(pinos); passo = (W + MD - 80) / n
for i, (px, nome, desc, cor) in enumerate(pinos):
    cx = 40 + passo * i + passo / 2
    y0 = H + 70
    d.line([(px, 1560), (px, H + 10), (cx, y0 - 8)], fill=cor, width=6)
    d.text((cx, y0), nome, fill=cor, font=f1, anchor="ma")
    d.multiline_text((cx, y0 + 52), desc, fill=cor, font=f2, anchor="ma", align="center", spacing=4)
tela = tela.resize((tela.width * 2 // 3, tela.height * 2 // 3), Image.LANCZOS)
tela.save(dst, quality=88)
print(tela.size)
