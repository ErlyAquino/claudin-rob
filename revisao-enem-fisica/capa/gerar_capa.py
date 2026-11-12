"""Gera os elementos da capa na identidade visual do cartaz "Aulão de Véspera" (referencia-aulao.webp):
fundo-a4.png e fundo-slide.png (fundo azul, faixas amarelas, painel central, estrelas) e as quatro logos.

Uso (a partir de python-dados/):  uv run python ../revisao-enem-fisica/capa/gerar_capa.py

Origem das logos (arquivos em baixadas/ e em imagens/logos/):
- logo-ete.png   imagens/logos/ete.png (arquivo da escola, em alta resolução)
- logo-see.png   portal.educacao.pe.gov.br/marcas (logo oficial da Secretaria de Educação, versão colorida horizontal)
- logo-enem.png  Wikimedia Commons, "Logotipo do Enem.svg" (marca atual do exame)
- logo-gre.png   recorte de uma publicação do perfil oficial da GRE Metro Sul no Instagram (não há arquivo
                 oficial para baixar; é a maior versão pública encontrada). Se tiver o arquivo original,
                 substitua logo-gre.png.
As logos são coloridas e vão sobre cartão branco na capa.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.interpolate import splev, splprep

AQUI = os.path.dirname(os.path.abspath(__file__))
BAIX = os.path.join(AQUI, "baixadas")
AZUL1, AZUL2, CLARO = (3, 96, 200), (3, 122, 206), (24, 150, 218)
AMARELO, PAINEL = (219, 238, 38), (8, 168, 208)


# ---------------------------------------------------------------- logos
def justa(img):
    """Recorta a margem transparente."""
    img = img.convert("RGBA")
    return img.crop(img.getbbox())


def logos():
    justa(Image.open(os.path.join(AQUI, "..", "..", "imagens", "logos", "ete.png"))).save(os.path.join(AQUI, "logo-ete.png"))
    justa(Image.open(os.path.join(BAIX, "logo-SEE-periodo-eleitoral_color_horizontal.png"))).save(os.path.join(AQUI, "logo-see.png"))
    justa(Image.open(os.path.join(BAIX, "enem.png"))).save(os.path.join(AQUI, "logo-enem.png"))
    # GRE Metro Sul: logo colorida sobre o cartão branco da publicação; amplia 4x e limpa o fundo para branco puro
    g = Image.open(os.path.join(BAIX, "gre-post-instagram.webp")).convert("RGB").crop((378, 1606, 638, 1748))
    g = g.resize((g.width * 4, g.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=4, percent=90, threshold=2))
    a = np.asarray(g).astype(float)
    quase_branco = a.min(axis=2) > 238
    a[quase_branco] = 255
    Image.fromarray(a.astype(np.uint8), "RGB").save(os.path.join(AQUI, "logo-gre.png"))


# ---------------------------------------------------------------- fundo
def curva(pontos, n=500):
    x, y = zip(*pontos)
    tck, _ = splprep([x, y], s=0, k=3)
    u = np.linspace(0, 1, n)
    return np.array(splev(u, tck)).T


def estrela(d, cx, cy, r, cor):
    pts = []
    for k in range(16):
        ang = k * np.pi / 8
        rr = r if k % 4 == 0 else (r * 0.2 if k % 4 == 2 else r * 0.3)
        pts.append((cx + rr * np.sin(ang), cy - rr * np.cos(ang)))
    d.polygon(pts, fill=cor)


def fundo(nome, W, H, faixas, larg, painel, estrelas, raio):
    S = 2   # superamostragem
    w, h = W * S, H * S
    yy = np.linspace(0, 1, h)[:, None, None]
    base = (np.array(AZUL1) * (1 - yy) + np.array(AZUL2) * yy) * np.ones((h, w, 3))
    im = Image.fromarray(base.astype(np.uint8), "RGB")
    # manchas claras suaves
    luz = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dl = ImageDraw.Draw(luz)
    for fx, fy, fr in [(0.25, 0.2, 0.35), (0.8, 0.45, 0.3), (0.35, 0.85, 0.32)]:
        r = fr * max(w, h) * 0.6
        dl.ellipse([fx * w - r, fy * h - r, fx * w + r, fy * h + r], fill=CLARO + (150,))
    luz = luz.filter(ImageFilter.GaussianBlur(max(w, h) * 0.08))
    im.paste(luz, (0, 0), luz)
    d = ImageDraw.Draw(im)
    # faixas amarelas
    r = larg * w / 2
    for pts in faixas:
        for px, py in curva(pts):
            d.ellipse([px * w - r, py * h - r, px * w + r, py * h + r], fill=AMARELO)
    # painel central translúcido
    cam = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dc = ImageDraw.Draw(cam)
    x0, y0, x1, y1 = painel
    dc.rounded_rectangle([x0 * w, y0 * h, x1 * w, y1 * h], radius=raio * w, fill=PAINEL + (222,))
    im.paste(cam, (0, 0), cam)
    d = ImageDraw.Draw(im)
    for ex, ey, er in estrelas:
        estrela(d, ex * w, ey * h, er * w, AMARELO)
    im.resize((W, H), Image.LANCZOS).save(os.path.join(AQUI, nome), optimize=True)


if __name__ == "__main__":
    logos()
    fundo("fundo-a4.png", 1654, 2339,
          faixas=[[(-0.08, 0.33), (0.07, 0.25), (0.03, 0.12), (0.17, 0.045), (0.33, 0.075), (0.47, -0.04)],
                  [(1.08, 0.70), (0.93, 0.76), (0.98, 0.865), (0.86, 0.935), (0.69, 0.955), (0.58, 1.05)]],
          larg=0.085, painel=(0.11, 0.135, 0.89, 0.905), estrelas=[(0.105, 0.47, 0.062), (0.895, 0.675, 0.062)], raio=0.055)
    fundo("fundo-slide.png", 2667, 1500,
          faixas=[[(-0.04, 0.52), (0.033, 0.37), (0.012, 0.17), (0.085, 0.065), (0.19, 0.105), (0.27, -0.06)],
                  [(1.04, 0.50), (0.967, 0.64), (0.99, 0.82), (0.925, 0.94), (0.81, 0.93), (0.74, 1.07)]],
          larg=0.05, painel=(0.055, 0.075, 0.945, 0.915), estrelas=[(0.055, 0.66, 0.03), (0.945, 0.3, 0.03)], raio=0.03)
    print("ok")
