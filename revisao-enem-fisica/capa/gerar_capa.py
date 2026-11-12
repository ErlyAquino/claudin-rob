"""Gera os elementos da capa na identidade visual do cartaz "Aulão de Véspera" (referencia-aulao.webp):
fundo-a4.png e fundo-slide.png (fundo azul, faixas amarelas, painel central, estrelas) e as logos com
transparência (logo-gre.png, logo-pe.png, logo-ete.png, logo-enem.png).

Uso (a partir de python-dados/):  uv run python ../revisao-enem-fisica/capa/gerar_capa.py
As logos GRE Metro Sul, Governo de Pernambuco e ENEM são recortadas do cartaz (baixa resolução); a da ETE
vem de imagens/logos/ete.png, convertida para a versão branca usada no cartaz. Para trocar por arquivos
oficiais, basta substituir os PNG gerados (fundo transparente).
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.interpolate import splev, splprep

AQUI = os.path.dirname(os.path.abspath(__file__))
REF = Image.open(os.path.join(AQUI, "referencia-aulao.webp")).convert("RGB")
AZUL1, AZUL2, CLARO = (3, 96, 200), (3, 122, 206), (24, 150, 218)
AMARELO, PAINEL = (219, 238, 38), (8, 168, 208)


# ---------------------------------------------------------------- logos
def recorte(caixa, escala=8, lim=(22, 80), nome=None, branco=True):
    """Recorta a logo do cartaz e troca o fundo por transparência (distância de cor até o fundo)."""
    im = REF.crop(caixa)
    a = np.asarray(im).astype(float)
    borda = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    fundo = np.median(borda, axis=0)
    g = im.resize((im.width * escala, im.height * escala), Image.LANCZOS)
    p = np.asarray(g).astype(float)
    dist = np.sqrt(((p - fundo) ** 2).sum(axis=2))
    alfa = np.clip((dist - lim[0]) / (lim[1] - lim[0]), 0, 1)
    cor = np.clip((p - (1 - alfa[..., None]) * fundo) / np.maximum(alfa[..., None], 0.05), 0, 255)   # desfaz a mistura com o fundo
    if branco:   # o que é quase branco vira branco puro (sem franja azulada)
        quase = cor.min(axis=2) > 150
        cor[quase] = 255
    out = np.dstack([cor, alfa * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA").filter(ImageFilter.UnsharpMask(radius=3, percent=120, threshold=2))
    img.save(os.path.join(AQUI, nome))
    return img


def logo_ete():
    """Versão branca da logo da ETE (como no cartaz) a partir do arquivo em alta resolução."""
    src = Image.open(os.path.join(AQUI, "..", "..", "imagens", "logos", "ete.png")).convert("RGBA")
    a = np.asarray(src).astype(float)
    rgb, alfa = a[..., :3], a[..., 3] / 255
    brancura = np.clip((rgb.min(axis=2) - 170) / 70, 0, 1)        # letras "ETE" (brancas) ficam vazadas
    novo = alfa * (1 - brancura)
    out = np.dstack([np.full(rgb.shape, 255.0), novo * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    img = img.crop(img.getbbox())
    img.save(os.path.join(AQUI, "logo-ete.png"))


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
    im.paste(luz.filter(ImageFilter.GaussianBlur(max(w, h) * 0.08)), (0, 0), luz.filter(ImageFilter.GaussianBlur(max(w, h) * 0.08)))
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
    recorte((119, 590, 219, 648), nome="logo-gre.png")
    recorte((240, 592, 344, 648), nome="logo-pe.png")
    recorte((303, 288, 419, 347), nome="logo-enem.png", lim=(18, 60), branco=False)
    logo_ete()
    fundo("fundo-a4.png", 1654, 2339,
          faixas=[[(-0.08, 0.33), (0.07, 0.25), (0.03, 0.12), (0.17, 0.045), (0.33, 0.075), (0.47, -0.04)],
                  [(1.08, 0.70), (0.93, 0.76), (0.98, 0.865), (0.86, 0.935), (0.69, 0.955), (0.58, 1.05)]],
          larg=0.085, painel=(0.11, 0.135, 0.89, 0.905), estrelas=[(0.105, 0.47, 0.062), (0.895, 0.675, 0.062)], raio=0.055)
    fundo("fundo-slide.png", 2667, 1500,
          faixas=[[(-0.04, 0.52), (0.033, 0.37), (0.012, 0.17), (0.085, 0.065), (0.19, 0.105), (0.27, -0.06)],
                  [(1.04, 0.50), (0.967, 0.64), (0.99, 0.82), (0.925, 0.94), (0.81, 0.93), (0.74, 1.07)]],
          larg=0.05, painel=(0.055, 0.075, 0.945, 0.915), estrelas=[(0.055, 0.66, 0.03), (0.945, 0.3, 0.03)], raio=0.03)
    print("ok")
