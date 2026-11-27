"""Diagramas proprios do tutorial do pH-4502C (matplotlib; nada copiado da web).
  escala_ph.png      a escala de pH, [H+] e liquidos do dia a dia
  eletrodo.png       corte do eletrodo combinado de vidro
  cadeia_sinal.png   do pH ao numero: sonda -> amplificador -> divisor -> ADC -> reta
  reta_exemplo.png   exemplo numerico da calibracao de dois pontos
  divisor.png        o divisor 1 k / 2 k entre o Po e o GPIO 34 do ESP32
  nutrientes.png     pH x disponibilidade de nutrientes na solucao nutritiva
  culturas.png       faixas de pH e de condutividade por cultura
  bancada_nft.png    esquema da bancada hidroponica NFT com os sensores do no horta/no1
  no1_ligacao.png    ligacoes do no horta/no1 (telemetria-cria)
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-ph4502c/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.ticker
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon, Circle, Ellipse, FancyArrowPatch
from matplotlib.colors import LinearSegmentedColormap

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
plt.rcParams["font.family"] = "DejaVu Sans"


def salvar(fig, nome):
    fig.savefig(os.path.join(AQUI, nome), dpi=200, facecolor="white")
    plt.close(fig)
    print("figura:", nome)


def caixa(ax, x, y, w, h, texto, cor="#deeaf6", borda=AZUL, fs=8.5, negrito=False, cortexto="black"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=cor, ec=borda, lw=1.3, zorder=3))
    ax.text(x + w / 2, y + h / 2, texto, zorder=4, ha="center", va="center", fontsize=fs, fontweight="bold" if negrito else "normal", color=cortexto)


def seta(ax, p0, p1, cor=CINZA, lw=1.5, estilo="-|>", rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=estilo, mutation_scale=12, color=cor, lw=lw, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0))


# ---------------------------------------------------------------- 1: escala de pH
def escala_ph():
    cores = ["#c62828", "#d84315", "#ef6c00", "#f9a825", "#fdd835", "#c0ca33", "#7cb342", "#43a047",
             "#26a69a", "#1e88e5", "#1565c0", "#283593", "#4527a0", "#6a1b9a", "#4a148c"]
    fig, ax = plt.subplots(figsize=(9.4, 4.7))
    ax.set_xlim(-1.9, 15.3); ax.set_ylim(-4.95, 3.3); ax.axis("off")
    sup = str.maketrans("-0123456789", "⁻⁰¹²³⁴⁵⁶⁷⁸⁹")
    for p in range(15):
        ax.add_patch(Rectangle((p - 0.5, 0), 1, 1, fc=cores[p], ec="white", lw=1.5))
        ax.text(p, 0.5, str(p), ha="center", va="center", color="white", fontsize=13, fontweight="bold")
        ax.text(p, 1.25, "10" + str(-p).translate(sup) if p else "1", ha="center", va="bottom", fontsize=8.5, color=CINZA)
    ax.text(-0.75, 1.25, "[H⁺]\nmol/L", ha="right", va="bottom", fontsize=8, color=CINZA)
    ax.text(-0.75, 0.5, "pH", ha="right", va="center", fontsize=11, fontweight="bold")
    seta(ax, (6.3, 2.75), (-0.4, 2.75), cor=VERM); ax.text(3, 2.9, "mais ÁCIDO: mais H⁺", ha="center", fontsize=9.5, color=VERM, fontweight="bold")
    seta(ax, (7.7, 2.75), (14.4, 2.75), cor="#283593"); ax.text(11, 2.9, "mais BÁSICO (alcalino): menos H⁺", ha="center", fontsize=9.5, color="#283593", fontweight="bold")
    ax.text(7, 2.9, "neutro", ha="center", fontsize=9.5, color=VERDE, fontweight="bold")
    ax.annotate("", xy=(3.0, 2.15), xytext=(2.0, 2.15), arrowprops=dict(arrowstyle="<->", color=CINZA, lw=1))
    ax.text(2.5, 2.22, "÷10", ha="center", va="bottom", fontsize=8, color=CINZA)
    ax.text(3.2, 2.15, "cada unidade de pH = 10 vezes menos H⁺", ha="left", va="center", fontsize=8, color=CINZA)
    exemplos = [(0.0, "ácido de\nbateria"), (1.5, "suco\ngástrico"), (2.3, "limão"), (2.9, "vinagre,\nrefrigerante\nde cola"),
                (4.2, "tomate"), (5.0, "café"), (5.6, "chuva\nlimpa"), (6.6, "leite"), (7.0, "água\npura"), (7.4, "sangue"),
                (8.2, "água do mar,\nbicarbonato"), (10.0, "sabão"), (10.5, "leite de\nmagnésia"), (11.5, "amoníaco"),
                (12.6, "água\nsanitária"), (14.0, "soda\ncáustica")]
    niveis = [-0.55, -1.75]
    for i, (p, nome) in enumerate(exemplos):
        y = niveis[i % 2]
        ax.plot([p, p], [0, y + 0.08], color=CINZA, lw=0.7)
        ax.plot(p, 0, "v", color=CINZA, ms=4)
        ax.text(p, y, nome, ha="center", va="top", fontsize=7.3, linespacing=0.95)
    # faixas uteis
    y0 = -3.55
    ax.add_patch(Rectangle((5.5, y0), 1.0, 0.42, fc=VERDE, ec="none", alpha=0.85))
    ax.text(6.0, y0 - 0.12, "solução nutritiva da\nhidroponia: 5,5 a 6,5", ha="center", va="top", fontsize=8, color=VERDE, fontweight="bold")
    ax.add_patch(Rectangle((6.0, y0 - 1.25), 3.5, 0.3, fc="#5b9bd5", ec="none", alpha=0.85))
    ax.text(9.65, y0 - 1.1, "água tratada da torneira: 6,0 a 9,5", ha="left", va="center", fontsize=8, color=AZUL)
    for p, nome in ((4.0, "tampão 4,00"), (7.0, "tampão 7,00"), (10.0, "tampão 10,00")):
        ax.plot(p, y0 + 0.2, "D", color=LARANJA, ms=7, mec="white")
        if p != 7.0:
            ax.text(p, y0 - 0.12, nome, ha="center", va="top", fontsize=8, color=LARANJA, fontweight="bold")
    ax.text(7.35, y0 + 0.2, "tampão 7,00", ha="left", va="center", fontsize=8, color=LARANJA, fontweight="bold")
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    salvar(fig, "escala_ph.png")


# ---------------------------------------------------------------- 2: eletrodo combinado
def eletrodo():
    fig, ax = plt.subplots(figsize=(8.6, 6.2))
    ax.set_xlim(-6.2, 6.6); ax.set_ylim(-1.6, 10.6); ax.set_aspect("equal"); ax.axis("off")
    # amostra (copo)
    ax.add_patch(Rectangle((-2.6, -1.2), 5.2, 3.6, fc="#d6ecfa", ec="#5b9bd5", lw=1.5))
    ax.text(2.45, -1.0, "amostra", ha="right", va="bottom", fontsize=8.5, color=AZUL, style="italic")
    # corpo externo (referencia)
    ax.add_patch(Rectangle((-1.0, 1.0), 2.0, 8.0, fc="#fff3d6", ec="#555", lw=1.6))
    ax.add_patch(Polygon([(-1.0, 1.0), (-0.45, 0.35), (0.45, 0.35), (1.0, 1.0)], closed=True, fc="#fff3d6", ec="#555", lw=1.6))
    # tubo interno + bulbo
    ax.add_patch(Rectangle((-0.42, 0.5), 0.84, 8.5, fc="#e3f0ff", ec="#1565c0", lw=1.4))
    ax.add_patch(Circle((0, 0.0), 0.62, fc="#e3f0ff", ec="#1565c0", lw=2.2))
    ax.add_patch(Rectangle((-0.40, 0.3), 0.80, 0.5, fc="#e3f0ff", ec="none"))
    # fios
    ax.plot([0, 0], [0.05, 9.6], color="#444", lw=1.6)                    # eletrodo interno
    ax.plot([0, 0], [0.05, 1.3], color="#9e9e9e", lw=3.5)                  # Ag/AgCl
    ax.plot([0.72, 0.72], [2.6, 9.6], color="#444", lw=1.6)                # referencia
    ax.plot([0.72, 0.72], [2.6, 4.0], color="#9e9e9e", lw=3.5)
    # juncao
    ax.add_patch(Rectangle((0.93, 1.25), 0.14, 0.45, fc="#795548", ec="none"))
    # tampa e cabo
    ax.add_patch(Rectangle((-1.15, 9.0), 2.3, 0.7, fc="#37474f", ec="#222"))
    ax.plot([0, 0], [9.7, 10.5], color="#222", lw=4)
    ax.text(0.25, 10.25, "cabo coaxial até o BNC da placa", fontsize=8.5, va="center")

    def rot(txt, xy, xt, lado="esq"):
        ax.annotate(txt, xy=xy, xytext=xt, fontsize=8.3, va="center", ha="right" if lado == "esq" else "left",
                    arrowprops=dict(arrowstyle="-", color=VERM, lw=1), linespacing=1.15)
    rot("membrana de vidro (bulbo):\nvidro especial, fino e frágil;\né aqui que a tensão aparece", (-0.6, -0.05), (-2.9, 0.1))
    rot("solução interna de pH fixo (7)\n+ KCl", (-0.3, 5.2), (-2.9, 5.6))
    rot("eletrodo interno\n(fio de prata com AgCl)", (-0.03, 3.0), (-2.9, 3.6))
    rot("pino central do BNC:\nsinal do vidro", (0.0, 9.35), (-2.9, 9.35))
    rot("eletrólito de referência\n(KCl 3 mol/L, em gel)", (0.85, 6.6), (2.9, 7.2), "dir")
    rot("eletrodo de referência\n(prata com AgCl): tensão fixa,\nnão depende do pH", (0.75, 3.4), (2.9, 4.6), "dir")
    rot("junção (diafragma poroso):\ncontato elétrico entre o KCl\ne a amostra; entope com sujeira", (1.05, 1.45), (2.9, 1.6), "dir")
    rot("carcaça do BNC:\nreferência", (0.72, 9.35), (2.9, 9.35), "dir")
    ax.text(0, -1.45, "A placa mede a diferença de tensão entre os dois fios: 0 mV em pH 7, cerca de 59 mV por unidade de pH (25 °C).",
            ha="center", va="top", fontsize=8.3, color=CINZA)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.05)
    salvar(fig, "eletrodo.png")


# ---------------------------------------------------------------- 3: cadeia de sinal
def cadeia_sinal():
    fig, ax = plt.subplots(figsize=(9.4, 3.3))
    ax.set_xlim(0, 20); ax.set_ylim(0, 6.6); ax.axis("off")
    blocos = [("Líquido", "pH 0 a 14", "#e8f5e9", VERDE),
              ("Sonda de vidro", "+414 a −414 mV\n(−59 mV por pH)\n0 mV em pH 7", "#deeaf6", AZUL),
              ("Placa pH‑4502C", "amplifica ×3\ne soma 2,5 V\nPo: 0 a 5 V", "#deeaf6", AZUL),
              ("Divisor 1 k / 2 k", "× 2/3\n(só no ESP32)\n0 a 3,33 V", "#fff4e5", LARANJA),
              ("Conversor A/D", "Uno: 10 bits\nESP32: 12 bits\nADS1115: 16 bits", "#deeaf6", AZUL),
              ("Sketch", "pH = 7 +\n(V − V7) /\ninclinação", "#e8f5e9", VERDE)]
    w, gap, x = 2.75, 0.62, 0.15
    for i, (tit, txt, cor, borda) in enumerate(blocos):
        ax.add_patch(FancyBboxPatch((x, 1.6), w, 3.5, boxstyle="round,pad=0.02,rounding_size=0.12", fc=cor, ec=borda, lw=1.4))
        ax.text(x + w / 2, 4.55, tit, ha="center", va="center", fontsize=8.8, fontweight="bold", color=borda)
        ax.text(x + w / 2, 2.95, txt, ha="center", va="center", fontsize=8, linespacing=1.3)
        if i < len(blocos) - 1:
            seta(ax, (x + w + 0.06, 3.35), (x + w + gap - 0.06, 3.35), cor=CINZA, lw=1.8)
        x += w + gap
    ex = ["exemplo: pH 4,00", "+177 mV", "Po = 3,03 V", "D34 = 2,02 V", "número", "4,00"]
    x = 0.15
    for t in ex:
        ax.text(x + w / 2, 1.1, t, ha="center", va="center", fontsize=8, color=LARANJA, fontweight="bold"); x += w + gap
    ax.annotate("", xy=(19.9, 5.75), xytext=(3.6, 5.75), arrowprops=dict(arrowstyle="<->", color=VERM, lw=1.2))
    ax.text(11.7, 6.05, "a calibração com tampões mede esta cadeia inteira de uma vez", ha="center", fontsize=8.5, color=VERM)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    salvar(fig, "cadeia_sinal.png")


# ---------------------------------------------------------------- 4: exemplo numerico da reta
def reta_exemplo():
    v7, v4 = 2.560, 3.040                       # exemplo de bancada no Uno
    incl = (v4 - v7) / (4 - 7)
    fig, ax = plt.subplots(figsize=(8.6, 4.4))
    ph = np.linspace(2, 12, 50)
    ax.plot(ph, v7 + incl * (ph - 7), color=AZUL, lw=2, label="reta calibrada: V = 2,560 − 0,160 × (pH − 7)")
    ax.plot(ph, 2.5 - 0.1775 * (ph - 7), color=CINZA, lw=1.2, ls="--", label="reta ideal: V = 2,500 − 0,177 × (pH − 7)")
    ax.plot([7, 4], [v7, v4], "o", color=LARANJA, ms=9, zorder=5)
    ax.annotate("ponto 1: tampão 7,00\nV7 = 2,560 V  (comando c7)", (7, v7), xytext=(8.3, 2.95), fontsize=8.5,
                arrowprops=dict(arrowstyle="->", color=LARANJA))
    ax.annotate("ponto 2: tampão 4,00\nV = 3,040 V  (comando c4)", (4, v4), xytext=(4.6, 3.45), fontsize=8.5,
                arrowprops=dict(arrowstyle="->", color=LARANJA))
    # triangulo da inclinacao
    ax.plot([4, 7, 7], [v4, v4, v7], color=VERM, lw=1, ls=":")
    ax.text(5.5, v4 + 0.03, "Δ pH = 3", ha="center", fontsize=8, color=VERM)
    ax.text(7.08, (v4 + v7) / 2, "Δ V = 0,480 V", ha="left", va="center", fontsize=8, color=VERM)
    # leitura de uma amostra
    va = 2.70; pa = 7 + (va - v7) / incl
    ax.plot([2, pa, pa], [va, va, 1.2], color=VERDE, lw=1.2, ls="--")
    ax.plot(pa, va, "s", color=VERDE, ms=7, zorder=5)
    ax.text(2.1, va + 0.03, "amostra: V = 2,700 V", fontsize=8.5, color=VERDE)
    ax.text(pa + 0.08, 1.27, f"pH = 7 + (2,700 − 2,560) / (−0,160) = {pa:.2f}".replace(".", ","), fontsize=8.5, color=VERDE)
    ax.set_xlabel("pH"); ax.set_ylabel("tensão no pino A0 (V)"); ax.set_xlim(2, 12); ax.set_ylim(1.2, 3.8)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda y, _: f"{y:.1f}".replace(".", ",")))
    ax.grid(alpha=0.3); ax.legend(fontsize=8, loc="lower left")
    ax.set_title("Calibração de dois pontos: a reta passa pelos dois tampões", fontsize=10)
    fig.tight_layout(); salvar(fig, "reta_exemplo.png")


# ---------------------------------------------------------------- 5: o divisor entre o Po e o ESP32
def divisor():
    fig, ax = plt.subplots(figsize=(9.4, 4.3))
    ax.set_xlim(0, 20); ax.set_ylim(0, 9.2); ax.axis("off")
    # placa de pH
    caixa(ax, 0.4, 2.0, 4.6, 5.6, "", cor="#e8f5e9", borda=VERDE)
    ax.text(2.7, 7.15, "placa pH‑4502C", ha="center", fontsize=9, fontweight="bold", color=VERDE)
    ax.text(2.7, 6.55, "(BNC para cima,\npinos para baixo)", ha="center", va="center", fontsize=7.5, color=CINZA)
    nomes = ["To", "Do", "Po", "G", "G", "V+"]
    cores = [CINZA, CINZA, "#b8860b", "#222", "#222", VERM]
    xs = [0.95 + 0.7 * i for i in range(6)]
    for x, n, c in zip(xs, nomes, cores):
        ax.add_patch(Rectangle((x - 0.13, 1.45), 0.26, 1.0, fc="#333", ec="none", zorder=5))
        ax.text(x, 2.75, n, ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=c)
    ax.text(xs[0] + 0.35, 3.45, "não ligar", ha="center", fontsize=7, color=CINZA)
    # ESP32
    caixa(ax, 15.6, 2.0, 4.0, 5.6, "", cor="#eceff1", borda="#333")
    ax.text(17.6, 7.15, "ESP32 DevKit V1", ha="center", fontsize=9, fontweight="bold")
    for nome, y, c in (("D34 (GPIO 34)", 5.6, "#b8860b"), ("VIN (5 V da USB)", 4.0, VERM), ("GND", 2.7, "#222")):
        ax.plot(15.6, y, "s", color="#333", ms=5, zorder=5)
        ax.text(15.85, y, nome, ha="left", va="center", fontsize=8.2, color=c, fontweight="bold")
    # Po -> 1k -> no -> 2k -> GND
    AM = "#b8860b"
    ax.plot([xs[2], xs[2], 6.2, 6.2, 7.2], [1.45, 0.75, 0.75, 5.6, 5.6], color=AM, lw=2.2)
    ax.add_patch(Rectangle((7.2, 5.25), 2.2, 0.7, fc="#f5deb3", ec="#8d6e63", lw=1.2, zorder=4))
    ax.text(8.3, 5.6, "1 kΩ", ha="center", va="center", fontsize=8.5, fontweight="bold", zorder=5)
    ax.plot([9.4, 15.6], [5.6, 5.6], color=AM, lw=2.2)
    ax.plot(11.0, 5.6, "o", color=AM, ms=9, zorder=6)
    ax.text(11.0, 6.05, "nó do divisor", ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=AM)
    ax.plot([11.0, 11.0], [5.6, 4.75], color=AM, lw=2.2)
    ax.add_patch(Rectangle((10.65, 3.05), 0.7, 1.7, fc="#f5deb3", ec="#8d6e63", lw=1.2, zorder=4))
    ax.text(11.55, 3.9, "2 kΩ", ha="left", va="center", fontsize=8.5, fontweight="bold")
    # GND comum e 5 V
    ax.plot([xs[3], xs[3], 14.6, 14.6, 15.6], [1.45, 1.05, 1.05, 2.7, 2.7], color="#222", lw=2)
    ax.plot([xs[4], xs[4]], [1.45, 1.05], color="#222", lw=2)
    ax.plot([11.0, 11.0], [3.05, 1.05], color="#222", lw=2); ax.plot(11.0, 1.05, "o", color="#222", ms=6)
    ax.plot([xs[5], xs[5], 13.8, 13.8, 15.6], [1.45, 0.35, 0.35, 4.0, 4.0], color=VERM, lw=2)
    # tensoes
    ax.text(6.35, 3.2, "Po: 0 a 5 V\n2,50 V em pH 7", ha="left", va="center", fontsize=8, color=AM)
    ax.text(13.2, 6.05, "0 a 3,33 V\n1,67 V em pH 7", ha="center", va="bottom", fontsize=8, color=AM)
    ax.text(10.0, 8.5, "V(D34) = V(Po) × 2 kΩ / (1 kΩ + 2 kΩ) = V(Po) × 2/3", ha="center", fontsize=9.5, fontweight="bold", color=AZUL)
    ax.text(10.0, 7.9, "o fio do ESP32 sai do nó, entre os dois resistores, nunca direto do Po", ha="center", fontsize=8.3, color=VERM)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    salvar(fig, "divisor.png")


if __name__ == "__main__":
    import sys
    from importlib import import_module
    escala_ph(); eletrodo(); cadeia_sinal(); reta_exemplo(); divisor()
    try:
        h = import_module("figuras_hidroponia")
        h.tudo()
    except ModuleNotFoundError:
        print("figuras_hidroponia.py ausente: so as figuras de pH foram geradas", file=sys.stderr)
