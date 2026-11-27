"""Diagramas proprios do tutorial do sensor de pressao HX710B + MPS20N0040D (matplotlib; nada copiado da web).
  instalacao.png      o reservatorio, o tubo de medida, a mangueira e o sensor acima do nivel maximo
  coluna.png          a pressao hidrostatica P = rho.g.h: a coluna de agua e a reta pressao x profundidade
  ponte.png           a membrana de silicio e a ponte de Wheatstone do MPS20N0040D
  cadeia.png          da pressao ao numero em litros: ponte, HX710B, zero, ganho, formato do reservatorio
  protocolo.png       o trem de pulsos do HX710B: OUT avisa, 24 pulsos trazem os bits, o 25o escolhe a proxima leitura
  calibracao.png      zero + alturas medidas com a regua: a reta contagens -> cm e os residuos (valores de exemplo)
  consumo.png         consumo de agua por planta de alface nas fontes e o que isso da para 25 plantas
  nivel_ce.png        quanto a condutividade sobe quando o volume cai so por saida de agua
  dias.png            o nivel em tres dias de bancada: queda, reposicao e o nivel minimo (simulacao)
  ar_preso.png        o que o sensor mede de verdade: a interface ar/agua dentro do tubo, e por que ela anda
  formatos.png        do nivel ao volume: paredes retas, cilindro e balde conico
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-hx710b/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon, Ellipse
from matplotlib.ticker import FuncFormatter

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
AGUA, AR = "#bfe0f5", "#fff8dc"
ROXO = "#5b2a86"
plt.rcParams["font.family"] = "DejaVu Sans"
virgula = FuncFormatter(lambda v, _: f"{v:g}".replace(".", ","))


def br(v, casas=2):
    return f"{v:.{casas}f}".replace(".", ",")


def salvar(fig, nome):
    fig.savefig(os.path.join(AQUI, nome), dpi=200, facecolor="white")
    plt.close(fig)
    print("figura:", nome)


def caixa(ax, x, y, w, h, texto, cor="#deeaf6", borda=AZUL, fs=8.5, negrito=False, cortexto="black"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=cor, ec=borda, lw=1.3, zorder=3))
    ax.text(x + w / 2, y + h / 2, texto, zorder=4, ha="center", va="center", fontsize=fs,
            fontweight="bold" if negrito else "normal", color=cortexto)


def seta(ax, p0, p1, cor=CINZA, lw=1.5, estilo="-|>", rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=estilo, mutation_scale=12, color=cor, lw=lw, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=6))


def fio(ax, pts, cor="black", lw=2.0, ls="-", z=2):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=cor, lw=lw, ls=ls, zorder=z, solid_capstyle="round", solid_joinstyle="round")


def cota(ax, x, y0, y1, texto, cor=AZUL, lado="right", fs=8.5):
    seta(ax, (x, y0), (x, y1), cor=cor, lw=1.2, estilo="<|-|>")
    ax.text(x + (0.12 if lado == "right" else -0.12), (y0 + y1) / 2, texto, ha="left" if lado == "right" else "right",
            va="center", fontsize=fs, color=cor)


def modulo(ax, x, y):
    """a plaquinha roxa com o sensor preto e o bico para baixo"""
    ax.add_patch(FancyBboxPatch((x, y), 1.5, 1.0, boxstyle="round,pad=0.02,rounding_size=0.06", fc=ROXO, ec="black", lw=1, zorder=5))
    ax.add_patch(Rectangle((x + 0.15, y + 0.2), 0.6, 0.6, fc="#1b1b1b", ec="black", zorder=6))
    ax.add_patch(Rectangle((x + 0.38, y - 0.22), 0.14, 0.42, fc="#1b1b1b", ec="black", zorder=4))
    ax.text(x + 1.12, y + 0.5, "HX\n710B", color="white", fontsize=6.5, ha="center", va="center", zorder=7, fontweight="bold")


# ---------------------------------------------------------------- 1: instalacao
def instalacao():
    fig, ax = plt.subplots(figsize=(9.4, 5.2))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.7); ax.axis("off")
    # reservatorio
    x0, x1, yb, yt, yn = 1.0, 7.6, 0.8, 4.9, 3.9
    ax.add_patch(Rectangle((x0, yb), x1 - x0, yn - yb, fc=AGUA, ec="none", zorder=1))
    fio(ax, [(x0, yt), (x0, yb), (x1, yb), (x1, yt)], cor=CINZA, lw=3)
    ax.plot([x0, x1], [yn, yn], color=AZUL, lw=1.5, zorder=2)
    ax.text(3.3, 4.02, "superfície da solução", fontsize=8, color=AZUL)
    ax.plot([x0, x1], [4.55, 4.55], color=VERDE, lw=1, ls="--"); ax.text(7.7, 4.55, "marca de cheio", fontsize=8, color=VERDE, va="center")
    ax.plot([x0, x1], [1.85, 1.85], color=VERM, lw=1, ls="--"); ax.text(7.7, 1.85, "nível mínimo\n(bomba coberta, com folga)", fontsize=8, color=VERM, va="center")
    # bomba
    ax.add_patch(FancyBboxPatch((5.6, 0.9), 1.4, 0.7, boxstyle="round,pad=0.02,rounding_size=0.08", fc="#444", ec="black", zorder=3))
    ax.text(6.3, 1.25, "bomba", color="white", fontsize=8, ha="center", va="center", zorder=4)
    fio(ax, [(6.3, 1.6), (6.3, 5.6), (7.3, 5.6)], cor="#888", lw=4, z=2)
    ax.text(7.35, 5.6, "para os canais", fontsize=8, color=CINZA, va="center")
    # tubo de medida (rigido), com ar dentro
    tx, tw, tb = 2.6, 0.5, 1.2
    ax.add_patch(Rectangle((tx, tb), tw, 5.2 - tb, fc=AR, ec=CINZA, lw=1.5, zorder=3))
    ax.add_patch(Rectangle((tx + 0.02, tb), tw - 0.04, 0.18, fc=AGUA, ec="none", zorder=4))
    ax.add_patch(Rectangle((tx - 0.08, 5.2), tw + 0.16, 0.25, fc="#777", ec="black", zorder=5))
    ax.text(tx + tw / 2, 3.0, "ar preso", rotation=90, fontsize=8, ha="center", va="center", zorder=5, color=CINZA)
    ax.text(0.2, 5.75, "tampa vedada, com\nespigão para a mangueira", fontsize=8, color=CINZA)
    seta(ax, (2.0, 5.65), (2.6, 5.4), cor=CINZA, lw=1)
    ax.text(3.95, 2.75, "tubo de medida: rígido,\nde 15 a 25 mm por\ndentro, ponta aberta,\npreso na parede", fontsize=7.5, color=CINZA, va="center")
    # abraçadeiras
    for y in (2.2, 4.3):
        ax.add_patch(Rectangle((x0, y), tx + tw - x0 + 0.05, 0.1, fc="#999", ec="none", zorder=2))
    # cotas
    cota(ax, 3.5, tb, yn, "h", cor=AZUL, fs=11)
    ax.plot([tx + tw, 3.6], [tb, tb], color=AZUL, lw=0.8, ls=":")
    cota(ax, 1.75, yb, tb, "", cor=LARANJA, lado="left")
    ax.text(1.65, 0.45, "altura da ponta\nacima do fundo", fontsize=8, color=LARANJA, ha="center", va="center")
    # mangueira ate o sensor, com laco para cima
    fio(ax, [(tx + tw / 2, 5.45), (tx + tw / 2, 6.6), (9.6, 6.6), (9.6, 6.28)], cor="#2a9d8f", lw=3, z=4)
    ax.text(5.6, 6.8, "mangueira fina, curta e sem emendas", fontsize=8, color="#1c7268", ha="center")
    # caixa com sensor e esp32
    ax.add_patch(FancyBboxPatch((8.6, 4.9), 5.0, 2.6, boxstyle="round,pad=0.02,rounding_size=0.1", fc="#f4f4f4", ec=CINZA, lw=1.5, ls="--", zorder=1))
    ax.text(11.1, 7.25, "caixa seca, ACIMA do nível máximo", fontsize=8.5, color=CINZA, ha="center", fontweight="bold")
    modulo(ax, 9.15, 5.5)
    caixa(ax, 11.6, 5.3, 1.7, 1.4, "ESP32", cor="#333", borda="black", fs=9, negrito=True, cortexto="white")
    for i, c in enumerate(("#d62828", "#2a9d2a", "#1f6fb2", "black")):
        fio(ax, [(10.65, 5.7 + 0.2 * i), (11.6, 5.7 + 0.2 * i)], cor=c, lw=1.6, z=4)
    ax.text(10.9, 3.6, "h é a coluna de água acima da ponta\ndo tubo: é o que o sensor mede.\nO sensor nunca molha: a água sobe só\num pouco dentro do tubo e comprime\no ar, que leva a pressão até ele.", fontsize=8.5, color=AZUL, ha="center", va="center")
    ax.text(10.9, 1.2, "nível = h + altura da ponta\nvolume = nível × litros por cm", fontsize=9, color="black", ha="center", va="center",
            bbox=dict(boxstyle="round,pad=0.4", fc="#fffde7", ec="#bfa500"))
    salvar(fig, "instalacao.png")


# ---------------------------------------------------------------- 2: coluna e reta
def coluna():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 4.0), gridspec_kw=dict(width_ratios=[1, 1.35]))
    a1.set_xlim(0, 6); a1.set_ylim(0, 6); a1.axis("off")
    a1.add_patch(Rectangle((0.6, 0.6), 4.2, 3.8, fc=AGUA, ec="none"))
    fio(a1, [(0.6, 5.2), (0.6, 0.6), (4.8, 0.6), (4.8, 5.2)], cor=CINZA, lw=3)
    a1.plot([0.6, 4.8], [4.4, 4.4], color=AZUL, lw=1.5)
    a1.add_patch(Rectangle((2.0, 1.4), 1.0, 3.0, fc="#7fbfe8", ec=AZUL, lw=1.2, ls="--"))
    a1.text(2.5, 2.9, "coluna\nde água\nde área A", fontsize=8, ha="center", va="center", color=AZUL)
    a1.plot([1.6, 3.4], [1.4, 1.4], color="black", lw=2)
    seta(a1, (2.5, 5.6), (2.5, 4.5), cor=CINZA, lw=1.5); a1.text(2.65, 5.35, "pressão do ar,\nP atm", fontsize=8, color=CINZA)
    seta(a1, (2.5, 0.85), (2.5, 1.35), cor=VERM, lw=2); a1.text(2.7, 0.95, "P atm + ρ·g·h", fontsize=8.5, color=VERM)
    cota(a1, 3.9, 1.4, 4.4, "h", cor=AZUL, fs=11)
    a1.text(3.0, -0.05, "peso da coluna = ρ·(A·h)·g\npressão = peso ÷ A = ρ·g·h", fontsize=8.5, ha="center", va="top")
    a1.set_ylim(-0.9, 6)
    h = np.linspace(0, 4.2, 50)
    a2.plot(h * 100, 0.997 * 9.81 * h, color=AZUL, lw=2.5)
    a2.axhline(40, color=VERM, lw=1.2, ls="--"); a2.text(8, 38.6, "fim da faixa do MPS20N0040D: 40 kPa, cerca de 4,1 m de água", fontsize=8, color=VERM, va="top")
    a2.axvspan(0, 50, color="#e3f2e4"); a2.text(175, 4.0, "faixa verde: reservatório da bancada,\naté uns 50 cm, menos de 5 kPa", fontsize=8.5, color=VERDE, va="center")
    for cm in (30, 100, 300):
        p = 0.997 * 9.81 * cm / 100
        a2.plot(cm, p, "o", color=LARANJA, zorder=4)
        a2.text(cm + 8, p - 1.2, f"{cm} cm → {br(p, 2)} kPa", fontsize=8, color=LARANJA, va="top")
    a2.set_xlim(0, 420); a2.set_ylim(0, 44)
    a2.set_xlabel("profundidade h (cm)"); a2.set_ylabel("pressão acima da atmosférica (kPa)")
    a2.set_title("P = ρ·g·h   com ρ = 997 kg/m³ (água a 25 °C) e g = 9,81 m/s²:   97,8 Pa por cm", fontsize=8.5)
    a2.grid(alpha=0.3)
    fig.tight_layout()
    salvar(fig, "coluna.png")


# ---------------------------------------------------------------- 3: ponte de Wheatstone
def ponte():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 4.0), gridspec_kw=dict(width_ratios=[1, 1.1]))
    a1.set_xlim(0, 7); a1.set_ylim(0, 5.2); a1.axis("off")
    a1.set_title("O sensor em corte (fora de escala)", fontsize=9)
    a1.add_patch(Polygon([(0.8, 1.0), (2.2, 1.0), (2.9, 2.6), (0.8, 2.6)], fc="#b0b0b0", ec="black"))
    a1.add_patch(Polygon([(6.2, 1.0), (4.8, 1.0), (4.1, 2.6), (6.2, 2.6)], fc="#b0b0b0", ec="black"))
    xs = np.linspace(0.8, 6.2, 100)
    ys = 2.75 + 0.38 * np.exp(-((xs - 3.5) / 0.9) ** 2)
    a1.fill_between(xs, ys - 0.14, ys, color="#8fa9c9", ec="black", lw=0.8)
    for x in (2.75, 3.25, 3.75, 4.25):
        yy = 2.75 + 0.38 * np.exp(-((x - 3.5) / 0.9) ** 2)
        a1.add_patch(Rectangle((x - 0.13, yy), 0.26, 0.09, fc=VERM, ec="none", zorder=5))
    a1.text(3.5, 3.55, "4 resistores na membrana", fontsize=8, color=VERM, ha="center")
    for x in (2.9, 3.5, 4.1):
        seta(a1, (x, 1.3), (x, 2.45), cor=AZUL, lw=1.6)
    a1.text(3.5, 0.55, "pressão que chega pelo bico\n(o ar da mangueira)", fontsize=8.5, color=AZUL, ha="center")
    a1.text(3.5, 4.5, "em cima: ar da sala (pressão atmosférica)", fontsize=8, color=CINZA, ha="center")
    a1.text(0.2, 1.8, "silício", fontsize=8, color=CINZA, rotation=90, va="center")
    a1.text(3.5, 4.05, "membrana fina: enverga com a diferença de pressão", fontsize=8, color="#3d5a80", ha="center")
    # ponte
    a2.set_xlim(0, 8); a2.set_ylim(0, 5.6); a2.axis("off")
    a2.set_title("A ponte de Wheatstone", fontsize=9)
    T, L, R, B = (3.5, 5.0), (1.5, 2.8), (5.5, 2.8), (3.5, 0.6)

    def resistor(p, q, nome, sobe):
        (xa, ya), (xb, yb) = p, q
        fio(a2, [p, q], cor="black", lw=1.3)
        xm, ym = (xa + xb) / 2, (ya + yb) / 2
        ang = np.degrees(np.arctan2(yb - ya, xb - xa))
        a2.add_patch(Rectangle((xm - 0.5, ym - 0.16), 1.0, 0.32, angle=ang, rotation_point=(xm, ym), fc="white", ec=VERM, lw=1.6, zorder=3))
        dx = -0.75 if xm < 3.5 else 0.75
        a2.text(xm + dx, ym + (0.25 if ym > 2.8 else -0.25), f"{nome} {'↑' if sobe else '↓'}", fontsize=9, ha="center", va="center",
                color=VERM if sobe else AZUL, fontweight="bold")
    resistor(T, L, "R1", True); resistor(T, R, "R2", False); resistor(L, B, "R3", False); resistor(R, B, "R4", True)
    for p in (T, L, R, B):
        a2.add_patch(Circle(p, 0.08, fc="black", zorder=5))
    a2.text(3.5, 5.3, "+ alimentação (3,3 V)", fontsize=8.5, ha="center"); a2.text(3.5, 0.2, "GND", fontsize=8.5, ha="center")
    fio(a2, [L, (3.0, 2.8)], cor=VERDE, lw=1.3); fio(a2, [R, (4.0, 2.8)], cor=VERDE, lw=1.3)
    a2.text(3.5, 2.8, "ΔV", fontsize=10, ha="center", va="center", color=VERDE, fontweight="bold",
            bbox=dict(boxstyle="circle,pad=0.25", fc="white", ec=VERDE))
    a2.text(6.2, 4.6, "sem pressão:\nos quatro iguais,\nΔV ≈ 0", fontsize=8, color=CINZA, va="center")
    a2.text(6.2, 1.4, "com pressão:\ndois sobem, dois\ndescem; ΔV de\nalguns milivolts,\nproporcional\nà pressão", fontsize=8, color=CINZA, va="center")
    fig.tight_layout()
    salvar(fig, "ponte.png")


# ---------------------------------------------------------------- 4: cadeia do sinal
def cadeia():
    fig, ax = plt.subplots(figsize=(9.4, 3.3))
    ax.set_xlim(0, 14); ax.set_ylim(0, 4.6); ax.axis("off")
    blocos = [(0.2, "COLUNA\nDE ÁGUA", "h cm de água\n= 97,8 Pa por cm", AGUA, AZUL),
              (2.5, "AR PRESO\nNO TUBO", "leva a pressão\naté o sensor", AR, "#bfa500"),
              (4.8, "MPS20N0040D", "ponte: pressão →\nmilivolts", "#fdecea", VERM),
              (7.1, "HX710B", "amplifica 128×\ne converte em\ncontagens (24 bits)", "#efe3f7", ROXO),
              (9.4, "ZERO E GANHO", "(contagens − zero)\n÷ contagens por cm", "#e8f5e9", VERDE),
              (11.7, "RESERVATÓRIO", "+ altura da ponta\n× litros por cm", "#e8f5e9", VERDE)]
    for x, titulo, texto, cor, borda in blocos:
        caixa(ax, x, 2.6, 2.0, 1.3, titulo, cor=cor, borda=borda, fs=8, negrito=True)
        ax.text(x + 1.0, 1.85, texto, ha="center", va="center", fontsize=7.5, color=CINZA)
    for x in (2.2, 4.5, 6.8, 9.1, 11.4):
        seta(ax, (x + 0.02, 3.25), (x + 0.28, 3.25), cor=AZUL)
    ax.text(3.5, 4.25, "Física", fontsize=9, color=AZUL, ha="center", fontweight="bold")
    ax.text(7.0, 4.25, "Eletrônica", fontsize=9, color=ROXO, ha="center", fontweight="bold")
    ax.text(11.7, 4.25, "Contas no ESP32 (a calibração)", fontsize=9, color=VERDE, ha="center", fontweight="bold")
    caixa(ax, 3.2, 0.2, 7.2, 0.9, "profundidade (cm)  →  nível (cm)  →  volume (litros)", cor="#fffde7", borda="#bfa500", fs=9, negrito=True)
    seta(ax, (12.7, 1.4), (10.5, 0.7), cor=VERDE, rad=-0.2)
    salvar(fig, "cadeia.png")


# ---------------------------------------------------------------- 5: protocolo
def protocolo():
    fig, ax = plt.subplots(figsize=(9.4, 3.4))
    ax.set_xlim(-1.5, 31.5); ax.set_ylim(-1.2, 6.2); ax.axis("off")
    bits = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0]   # 0x121D98 = 1 187 224
    # SCK
    xs, ys = [-1.0, 3.0], [0, 0]
    for i in range(25):
        x = 3.0 + i
        xs += [x, x, x + 0.5, x + 0.5]; ys += [0, 1, 1, 0]
    xs += [30.5]; ys += [0]
    ax.plot(xs, ys, color=AZUL, lw=1.6)
    ax.text(-1.4, 0.5, "SCK", fontsize=9, color=AZUL, ha="right", va="center", fontweight="bold")
    ax.text(-1.4, 0.0, "(ESP32 →)", fontsize=6.5, color=AZUL, ha="right", va="center")
    # OUT
    xo, yo = [-1.0, 0.3, 0.3, 1.6, 1.6, 3.0], [3, 3, 2, 2, 2, 2]
    nivel = 0
    for i, b in enumerate(bits):
        x = 3.0 + i
        xo += [x, x]; yo += [2 + nivel, 2 + b]; nivel = b
    xo += [27.0, 27.0, 30.5]; yo += [2 + nivel, 3, 3]
    ax.plot(xo, yo, color=VERDE, lw=1.6)
    ax.text(-1.4, 2.6, "OUT", fontsize=9, color=VERDE, ha="right", va="center", fontweight="bold")
    ax.text(-1.4, 2.1, "(→ ESP32)", fontsize=6.5, color=VERDE, ha="right", va="center")
    for i, b in enumerate(bits):
        ax.text(3.5 + i, 3.35, str(b), fontsize=7, ha="center", color=VERDE)
        ax.text(3.25 + i, -0.45, str(i + 1), fontsize=5.5, ha="center", color=AZUL)
    ax.text(27.25, -0.45, "25", fontsize=6.5, ha="center", color=LARANJA, fontweight="bold")
    ax.text(3.5, 3.85, "bit 23\n(sinal)", fontsize=6.5, ha="center", color=CINZA)
    ax.text(26.5, 3.85, "bit 0", fontsize=6.5, ha="center", color=CINZA)
    ax.annotate("OUT desce:\nleitura pronta", (0.3, 2.5), (0.6, 5.0), fontsize=8, color=VERDE, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=VERDE, lw=1))
    ax.annotate("25º pulso: pede a próxima\nleitura da ponte, a 10 por\nsegundo. OUT volta a 1.", (27.25, 1.05), (26.5, 4.9), fontsize=8, color=LARANJA, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=LARANJA, lw=1))
    ax.text(12.0, 5.1, "24 pulsos, 24 bits, do mais significativo ao menos:\n0001 0010 0001 1101 1001 1000  =  1 187 224 contagens", fontsize=8.5, ha="center", color="black")
    ax.text(14.5, -1.05, "O ESP32 lê o OUT com o SCK em 1. Cada pulso dura cerca de 1 µs; SCK em 1 por mais de 60 µs põe o chip para dormir.", fontsize=7.5, ha="center", color=CINZA)
    salvar(fig, "protocolo.png")


# ---------------------------------------------------------------- 6: calibracao (exemplo)
ZERO_EX, SENS_EX = 91250.0, 51200.0
PONTOS_EX = [(0, 91250), (5, 348900), (10, 601800), (15, 860900), (20, 1114100), (25, 1372900), (30, 1626000)]


def calibracao():
    cm = np.array([p[0] for p in PONTOS_EX], float); ct = np.array([p[1] for p in PONTOS_EX], float)
    a, b = np.polyfit(cm, ct, 1)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.9), gridspec_kw=dict(width_ratios=[1.3, 1]))
    x = np.linspace(-1, 32, 10)
    a1.plot(x, a * x + b, color=AZUL, lw=2)
    a1.plot(cm, ct, "o", color=LARANJA, ms=7, zorder=4)
    a1.plot(0, ct[0], "s", color=VERDE, ms=9, zorder=5)
    a1.annotate("zero: ponta do tubo\nfora d'água", (0, ct[0]), (0.6, 1.0e6), fontsize=8, color=VERDE, va="center",
                arrowprops=dict(arrowstyle="-|>", color=VERDE, lw=1))
    a1.text(1, 1.45e6, f"reta ajustada:\ncontagens = {a:,.0f} × cm + {b:,.0f}".replace(",", " "), fontsize=8.5, color=AZUL)
    a1.text(13, 3.2e5, "inclinação = contagens por cm\n(o ganho da calibração)", fontsize=8.5, color=CINZA)
    a1.set_xlabel("profundidade da ponta do tubo, medida com a régua (cm)"); a1.set_ylabel("leitura do HX710B (contagens)")
    a1.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v/1e6:.1f}".replace(".", ",") + " mi" if v else "0"))
    a1.set_xlim(-1, 32); a1.set_ylim(0, 1.75e6); a1.grid(alpha=0.3)
    res = (ct - (a * cm + b)) / a * 10
    a2.axhspan(-2, 2, color="#e3f2e4"); a2.text(15.5, 1.55, "±2 mm", fontsize=8, color=VERDE, ha="center")
    a2.axhline(0, color=CINZA, lw=0.8)
    a2.bar(cm, res, width=2.2, color=LARANJA)
    a2.set_xlabel("profundidade (cm)"); a2.set_ylabel("resíduo: medido − reta (mm)")
    a2.set_ylim(-3, 3); a2.grid(alpha=0.3); a2.yaxis.set_major_formatter(virgula)
    a2.set_title("Quanto cada ponto foge da reta", fontsize=9)
    fig.suptitle("Valores de exemplo, inventados para ilustrar: os do seu sensor saem da sua calibração", fontsize=8, color=VERM, y=0.995)
    fig.tight_layout()
    salvar(fig, "calibracao.png")


# ---------------------------------------------------------------- 7: consumo por planta
def consumo():
    fontes = [("Furlani e col. (2009), média", 75, 100),
              ("Sanchez (2007), estufa climatizada, média", 89, 102),
              ("Andrade (2019), semiárido, média", 100, 130),
              ("Soares e col. (2015), Recife, média", 128, 180),
              ("Sanchez (2007), estufa comum, 5 a 15 dias", 130, 200),
              ("Sanchez (2007), estufa comum, média de 28 dias", 149, 327),
              ("Cometti e col. (2019), planta adulta", 300, 400),
              ("Sanchez (2007), estufa comum, 20 a 28 dias", 470, 630)]
    fig, ax = plt.subplots(figsize=(9.2, 4.2))
    for i, (nome, a, b) in enumerate(fontes):
        y = len(fontes) - 1 - i
        cor = VERM if a >= 300 else (LARANJA if a >= 128 else AZUL)
        ax.barh(y, b - a, left=a, height=0.55, color=cor, zorder=3)
        ax.text(b + 10, y, f"{a} a {b} mL", fontsize=8, va="center", color=cor)
    ax.set_yticks(range(len(fontes))); ax.set_yticklabels([f[0] for f in fontes][::-1], fontsize=8)
    ax.set_xlim(0, 760); ax.set_xlabel("água consumida por planta de alface, por dia (mL)")
    sec = ax.secondary_xaxis("top", functions=(lambda v: v * 25 / 1000, lambda v: v * 1000 / 25))
    sec.set_xlabel("para as 25 plantas da bancada (litros por dia)"); sec.xaxis.set_major_formatter(virgula)
    ax.grid(axis="x", alpha=0.3, zorder=0)
    fig.tight_layout()
    salvar(fig, "consumo.png")


# ---------------------------------------------------------------- 8: nivel x CE
def nivel_ce():
    fig, ax = plt.subplots(figsize=(8.2, 3.8))
    q = np.linspace(0, 40, 100)
    ax.plot(q, 100 * (1 / (1 - q / 100) - 1), color=AZUL, lw=2.5)
    ax.axvspan(0, 20, color="#e3f2e4"); ax.text(10, 60, "até 20 % de variação:\no limite de Cometti\ne col. (2019)", fontsize=8.5, color=VERDE, ha="center", va="center")
    for p in (10, 20, 30):
        s = 100 * (1 / (1 - p / 100) - 1)
        ax.plot([p, p, 0], [0, s, s], color=LARANJA, lw=1, ls="--"); ax.plot(p, s, "o", color=LARANJA, zorder=4)
        ax.text(p + 0.8, s - 4.5, f"−{p} % de volume\n+{br(s, 0)} % de CE", fontsize=8, color=LARANJA, va="top")
    ax.text(30.6, 4, "exemplo: 1,40 mS/cm vira\n1,75 com o reservatório\n20 % abaixo da marca,\nsem ninguém pôr adubo", fontsize=7.5, color=CINZA)
    ax.set_xlim(0, 40); ax.set_ylim(0, 70)
    ax.set_xlabel("queda do volume do reservatório (%), saindo só água"); ax.set_ylabel("subida da condutividade (%)")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    salvar(fig, "nivel_ce.png")


# ---------------------------------------------------------------- 9: tres dias
def dias():
    rng = np.random.default_rng(7)
    t = np.arange(0, 72, 1 / 6)                          # horas, de 10 em 10 min
    nivel = np.zeros_like(t); n = 30.0
    consumo_dia = [3.0, 4.5, 6.0]                        # L por dia; 1,2 L por cm
    for i, h in enumerate(t):
        d = int(h // 24); hora = h % 24
        taxa = consumo_dia[d] / 1.2 * max(0, np.sin((hora - 6) / 12 * np.pi)) * np.pi / 24 if 6 <= hora <= 18 else consumo_dia[d] / 1.2 * 0.004
        n -= taxa / 6
        if hora == 7 and d > 0: n = 30.0
        if d == 2 and abs(hora - 15.0) < 1e-6: n -= 0     # nada: so para marcar
        nivel[i] = n + rng.normal(0, 0.05)
    fig, ax = plt.subplots(figsize=(9.2, 3.9))
    ax.axhspan(0, 24, color="#fdecea"); ax.axhline(24, color=VERM, lw=1, ls="--"); ax.text(0.6, 23.4, "nível mínimo escolhido", fontsize=8, color=VERM)
    ax.axhline(30, color=VERDE, lw=1, ls="--"); ax.text(0.6, 30.25, "marca de cheio", fontsize=8, color=VERDE)
    for d in range(3):
        ax.axvspan(d * 24 + 18, d * 24 + 30, color="#eeeeee", zorder=0)
    ax.plot(t, nivel, color=AZUL, lw=1.8)
    ax.annotate("reposição com água,\nde manhã", (31, 30.05), (18.5, 30.4), fontsize=8, color=CINZA, arrowprops=dict(arrowstyle="-|>", color=CINZA, lw=1))
    ax.annotate("de dia o nível cai:\nas plantas transpiram", (13, 28.6), (2.5, 26.3), fontsize=8, color=CINZA, arrowprops=dict(arrowstyle="-|>", color=CINZA, lw=1))
    ax.annotate("à noite quase\nnão muda", (46, 26.25), (36.5, 24.6), fontsize=8, color=CINZA, arrowprops=dict(arrowstyle="-|>", color=CINZA, lw=1))
    ax.text(62, 28.9, "plantas maiores,\nqueda maior", fontsize=8, color=CINZA)
    for d, c in enumerate(consumo_dia):
        ax.text(d * 24 + 12, 20.2, f"dia {d + 1}: {br(c, 1)} L\n({br(c / 1.2, 1)} cm)", fontsize=8.5, ha="center", color=AZUL)
    ax.set_xlim(0, 72); ax.set_ylim(19.5, 31.2)
    ax.set_xticks(range(0, 73, 6)); ax.set_xticklabels([f"{h % 24}h" for h in range(0, 73, 6)])
    ax.set_xlabel("hora do dia (faixas cinza: noite)"); ax.set_ylabel("nível (cm)")
    ax.set_title("Simulação: reservatório de 1,2 L por cm, 25 plantas em crescimento", fontsize=8.5, color=VERM)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    salvar(fig, "dias.png")


# ---------------------------------------------------------------- 10: ar preso
def ar_preso():
    fig, ax = plt.subplots(figsize=(9.4, 4.3))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off")
    casos = [(0.7, 0.25, "logo depois de mergulhar", "a água entra um pouco e comprime\no ar (uns 3 % a 30 cm de fundo)", AZUL),
             (5.3, 0.9, "dias depois", "parte do ar se dissolveu ou vazou:\na água subiu no tubo e o sensor\nlê MENOS do que devia", VERM),
             (9.9, 0.0, "depois de tirar e recolocar", "tubo cheio de ar outra vez:\na leitura volta ao certo", VERDE)]
    for x, sobe, titulo, texto, cor in casos:
        ax.add_patch(Rectangle((x, 1.6), 3.4, 3.0, fc=AGUA, ec="none"))
        fio(ax, [(x, 5.3), (x, 1.6), (x + 3.4, 1.6), (x + 3.4, 5.3)], cor=CINZA, lw=2.5)
        ax.plot([x, x + 3.4], [4.6, 4.6], color=AZUL, lw=1.3)
        tx = x + 0.9
        ax.add_patch(Rectangle((tx, 2.1), 0.6, 3.6, fc=AR, ec=CINZA, lw=1.4, zorder=3))
        ax.add_patch(Rectangle((tx + 0.02, 2.1), 0.56, sobe, fc="#7fbfe8", ec="none", zorder=4))
        ax.plot([tx, tx + 0.6], [2.1 + sobe, 2.1 + sobe], color=cor, lw=2, zorder=5)
        cota(ax, x + 2.2, 2.1 + sobe, 4.6, "h que o\nsensor lê", cor=cor, fs=8)
        ax.plot([tx + 0.6, x + 2.3], [2.1 + sobe, 2.1 + sobe], color=cor, lw=0.8, ls=":")
        ax.text(x + 1.7, 6.1, titulo, fontsize=9, ha="center", fontweight="bold", color=cor)
        ax.text(x + 1.7, 0.75, texto, fontsize=8, ha="center", va="center", color=CINZA)
    seta(ax, (4.3, 3.3), (5.1, 3.3), cor=CINZA); seta(ax, (8.9, 3.3), (9.7, 3.3), cor=CINZA)
    salvar(fig, "ar_preso.png")


# ---------------------------------------------------------------- 11: formatos
def formatos():
    fig, ax = plt.subplots(figsize=(9.4, 3.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.2); ax.axis("off")
    # caixa
    ax.add_patch(Polygon([(0.6, 1.6), (3.4, 1.6), (4.2, 2.2), (4.2, 4.2), (1.4, 4.2), (0.6, 3.6)], fc="#e8f1f8", ec=CINZA, lw=1.5))
    ax.add_patch(Polygon([(0.6, 1.6), (3.4, 1.6), (3.4, 3.0), (0.6, 3.0)], fc=AGUA, ec=AZUL, lw=1))
    ax.add_patch(Polygon([(3.4, 1.6), (4.2, 2.2), (4.2, 3.6), (3.4, 3.0)], fc="#a9d3ee", ec=AZUL, lw=1))
    ax.add_patch(Polygon([(0.6, 3.0), (3.4, 3.0), (4.2, 3.6), (1.4, 3.6)], fc="#cfe8f7", ec=AZUL, lw=1))
    ax.text(2.0, 1.3, "C", fontsize=9, ha="center"); ax.text(4.0, 1.75, "L", fontsize=9); ax.text(0.35, 2.3, "nível", fontsize=8, ha="right", color=AZUL)
    ax.text(2.4, 4.75, "Caixa de paredes retas", fontsize=9, ha="center", fontweight="bold")
    ax.text(2.4, 0.55, "litros por cm = C × L ÷ 1000\n(C e L em cm, por dentro)", fontsize=8.5, ha="center", color=CINZA)
    # cilindro
    cx = 7.0
    ax.add_patch(Rectangle((cx - 1.2, 1.7), 2.4, 2.5, fc="#e8f1f8", ec="none"))
    ax.add_patch(Rectangle((cx - 1.2, 1.7), 2.4, 1.3, fc=AGUA, ec="none"))
    ax.add_patch(Ellipse((cx, 1.7), 2.4, 0.5, fc=AGUA, ec=CINZA, lw=1.5)); ax.add_patch(Ellipse((cx, 3.0), 2.4, 0.5, fc="#cfe8f7", ec=AZUL, lw=1))
    ax.add_patch(Ellipse((cx, 4.2), 2.4, 0.5, fc="#f4f8fb", ec=CINZA, lw=1.5))
    fio(ax, [(cx - 1.2, 1.7), (cx - 1.2, 4.2)], cor=CINZA, lw=1.5); fio(ax, [(cx + 1.2, 1.7), (cx + 1.2, 4.2)], cor=CINZA, lw=1.5)
    seta(ax, (cx - 1.2, 4.2), (cx + 1.2, 4.2), cor=LARANJA, estilo="<|-|>", lw=1); ax.text(cx, 4.33, "D", fontsize=9, ha="center", color=LARANJA)
    ax.text(cx, 4.75, "Bombona ou tubo em pé", fontsize=9, ha="center", fontweight="bold")
    ax.text(cx, 0.55, "litros por cm = 3,1416 × D² ÷ 4000\n(D em cm, por dentro)", fontsize=8.5, ha="center", color=CINZA)
    # balde conico
    bx = 11.6
    ax.add_patch(Polygon([(bx - 0.9, 1.6), (bx + 0.9, 1.6), (bx + 1.5, 4.2), (bx - 1.5, 4.2)], fc="#e8f1f8", ec=CINZA, lw=1.5))
    ax.add_patch(Polygon([(bx - 0.9, 1.6), (bx + 0.9, 1.6), (bx + 1.2, 2.9), (bx - 1.2, 2.9)], fc=AGUA, ec=AZUL, lw=1))
    ax.text(bx, 4.75, "Balde (paredes inclinadas)", fontsize=9, ha="center", fontweight="bold")
    ax.text(bx, 0.55, "não há um só “litros por cm”:\nencha de litro em litro e faça a tabela", fontsize=8.5, ha="center", color=CINZA)
    salvar(fig, "formatos.png")


if __name__ == "__main__":
    for f in (instalacao, coluna, ponte, cadeia, protocolo, calibracao, consumo, nivel_ce, dias, ar_preso, formatos):
        f()
