"""Diagramas proprios do tutorial do conversor de nivel logico (matplotlib; nada copiado da web).
  pinagem.png        a plaquinha de 4 canais vista de cima: fileira HV, fileira LV e os pares de cada canal
  canal_bss138.png   o circuito de um canal (BSS138 + dois resistores de 10 k) e os tres estados da linha
  decisao.png        fluxograma "preciso de conversor?"
  barramento_no1.png onde o conversor entra no no horta/no1 da telemetria-cria
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-conversor-nivel/figuras.py
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
C5V, C3V3 = "#c0392b", "#e67e22"          # cores das duas alimentacoes
plt.rcParams["font.family"] = "DejaVu Sans"


def salvar(fig, nome):
    fig.savefig(os.path.join(AQUI, nome), dpi=200, facecolor="white")
    plt.close(fig)
    print("figura:", nome)


def tela(w, h, xmax, ymax):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, xmax); ax.set_ylim(0, ymax); ax.axis("off")
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    return fig, ax


def caixa(ax, x, y, w, h, texto, cor="#deeaf6", borda=AZUL, fs=8.5, negrito=False, cortexto="black"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=cor, ec=borda, lw=1.3, zorder=3))
    ax.text(x + w / 2, y + h / 2, texto, zorder=4, ha="center", va="center", fontsize=fs,
            fontweight="bold" if negrito else "normal", color=cortexto)


def seta(ax, p0, p1, cor=CINZA, lw=1.5, estilo="-|>", rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=estilo, mutation_scale=12, color=cor, lw=lw, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=5))


def fio(ax, pts, cor="black", lw=2.0, ls="-", z=2):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=cor, lw=lw, ls=ls, zorder=z, solid_capstyle="round", solid_joinstyle="round")


def resistor(ax, x, y0, y1, rotulo, lado="left"):
    """resistor vertical (retangulo) entre y0 e y1"""
    m = (y0 + y1) / 2
    fio(ax, [(x, y0), (x, m - 0.35)]); fio(ax, [(x, m + 0.35), (x, y1)])
    ax.add_patch(Rectangle((x - 0.13, m - 0.35), 0.26, 0.7, fc="white", ec="black", lw=1.6, zorder=3))
    ax.text(x + (-0.25 if lado == "left" else 0.25), m, rotulo, ha="right" if lado == "left" else "left", va="center", fontsize=8.5)


# ---------------------------------------------------------------- 1: pinagem
def pinagem():
    fig, ax = tela(7.6, 3.9, 15.2, 7.8)
    x0, y0, w, h = 4.1, 1.9, 7.0, 4.0
    ax.add_patch(FancyBboxPatch((x0, y0), w, h, boxstyle="round,pad=0.02,rounding_size=0.15", fc="#b8312f", ec="#7b1f1e", lw=2, zorder=2))
    nomes_hv = ["HV1", "HV2", "HV", "GND", "HV3", "HV4"]
    nomes_lv = ["LV1", "LV2", "LV", "GND", "LV3", "LV4"]
    xs = [x0 + 0.75 + 1.1 * i for i in range(6)]
    for x, a, b in zip(xs, nomes_hv, nomes_lv):
        for y, n in ((y0 + h - 0.5, a), (y0 + 0.5, b)):
            ax.add_patch(Circle((x, y), 0.2, fc="#e8d28a", ec="#7a5c12", lw=1.5, zorder=4))
            ax.add_patch(Circle((x, y), 0.07, fc="#333", ec="none", zorder=5))
            ax.text(x, y + (-0.5 if y > y0 + 2 else 0.5), n, color="white", ha="center", va="center", fontsize=8.5, fontweight="bold", zorder=5)
    for i in (0, 1, 4, 5):                      # um transistor por canal
        ax.add_patch(Rectangle((xs[i] - 0.25, y0 + h / 2 - 0.2), 0.5, 0.4, fc="#1b1b1b", ec="black", zorder=4))
        seta(ax, (xs[i], y0 + 1.25), (xs[i], y0 + h - 1.25), cor="#ffd9d6", lw=1.2, estilo="<|-|>")
    ax.text(x0 + w / 2, y0 + h / 2, "4 × BSS138", color="white", ha="center", va="center", fontsize=8, zorder=5)
    # lado HV
    ax.text(x0 + w / 2, 7.35, "Lado de 5 V  (HV = high voltage, tensão mais alta)", ha="center", fontsize=9.5, fontweight="bold", color=C5V)
    ax.text(x0 + w / 2, 6.8, "vai aos módulos de 5 V", ha="center", fontsize=8.5, color=C5V)
    ax.text(x0 + w / 2, 0.85, "Lado de 3,3 V  (LV = low voltage, tensão mais baixa)", ha="center", fontsize=9.5, fontweight="bold", color=C3V3)
    ax.text(x0 + w / 2, 0.3, "vai aos GPIOs do ESP32", ha="center", fontsize=8.5, color=C3V3)
    # notas laterais
    caixa(ax, 0.15, 4.5, 3.4, 1.25, "HV: entra o 5 V\n(referência do lado alto)", cor="#fdecea", borda=C5V, fs=8)
    seta(ax, (3.55, 5.1), (xs[2] - 0.25, y0 + h - 0.5), cor=C5V, rad=-0.15)
    caixa(ax, 0.15, 2.05, 3.4, 1.25, "LV: entra o 3,3 V\n(referência do lado baixo)", cor="#fff3e0", borda=C3V3, fs=8)
    seta(ax, (3.55, 2.7), (xs[2] - 0.25, y0 + 0.5), cor=C3V3, rad=0.15)
    caixa(ax, 11.65, 4.5, 3.4, 1.25, "GND: os dois são o\nmesmo ponto na placa", cor="#eeeeee", borda=CINZA, fs=8)
    seta(ax, (11.65, 5.1), (xs[3] + 0.25, y0 + h - 0.5), cor=CINZA, rad=0.15)
    caixa(ax, 11.65, 2.05, 3.4, 1.25, "Canal = um par:\nHV1 com LV1, HV2 com LV2…", cor="#e8f5e9", borda=VERDE, fs=8)
    seta(ax, (11.65, 2.7), (xs[5] + 0.3, y0 + h / 2), cor=VERDE, rad=-0.15)
    salvar(fig, "pinagem.png")


# ---------------------------------------------------------------- 2: circuito de um canal
def mosfet(ax, xs_, xd, y, yg):
    """NMOS simplificado: fonte (S) em xs_, dreno (D) em xd, na altura y; porta (G) sobe ate yg. Diodo interno de S para D."""
    xm = (xs_ + xd) / 2
    fio(ax, [(xs_, y), (xm - 0.55, y)]); fio(ax, [(xm + 0.55, y), (xd, y)])
    fio(ax, [(xm - 0.55, y), (xm - 0.55, y + 0.45)]); fio(ax, [(xm + 0.55, y), (xm + 0.55, y + 0.45)])
    fio(ax, [(xm - 0.75, y + 0.45), (xm + 0.75, y + 0.45)], lw=3.2)        # canal
    fio(ax, [(xm - 0.6, y + 0.72), (xm + 0.6, y + 0.72)], lw=2.2)          # placa da porta
    fio(ax, [(xm, y + 0.72), (xm, yg)])
    ax.text(xm - 0.75, y + 0.2, "S", ha="right", fontsize=8.5, color=CINZA)
    ax.text(xm + 0.75, y + 0.2, "D", ha="left", fontsize=8.5, color=CINZA)
    ax.text(xm + 0.12, y + 1.05, "G", ha="left", fontsize=8.5, color=CINZA)
    # diodo interno (anodo na fonte, catodo no dreno)
    yd = y - 0.75
    fio(ax, [(xm - 0.55, y), (xm - 0.55, yd), (xm - 0.2, yd)], lw=1.3, cor=CINZA)
    fio(ax, [(xm + 0.2, yd), (xm + 0.55, yd), (xm + 0.55, y)], lw=1.3, cor=CINZA)
    ax.add_patch(Polygon([(xm - 0.2, yd - 0.2), (xm - 0.2, yd + 0.2), (xm + 0.2, yd)], fc=CINZA, ec=CINZA, zorder=3))
    fio(ax, [(xm + 0.2, yd - 0.2), (xm + 0.2, yd + 0.2)], lw=1.6, cor=CINZA)
    ax.text(xm, yd - 0.45, "diodo interno", ha="center", fontsize=7.5, color=CINZA)
    ax.text(xm, y + 0.02, "BSS138", ha="center", va="bottom", fontsize=7.5, color=AZUL, fontweight="bold")


def canal_bss138():
    fig, ax = tela(7.6, 5.6, 15.2, 11.2)
    yt, yl = 10.2, 7.3                       # trilhas de alimentacao e a linha de sinal
    # trilhas
    fio(ax, [(1.6, yt), (7.6, yt)], cor=C3V3, lw=2.6); ax.text(1.5, yt, "LV = 3,3 V", ha="right", va="center", fontsize=9, color=C3V3, fontweight="bold")
    fio(ax, [(10.2, yt), (13.6, yt)], cor=C5V, lw=2.6); ax.text(13.7, yt, "HV = 5 V", ha="left", va="center", fontsize=9, color=C5V, fontweight="bold")
    # lado LV
    fio(ax, [(2.0, yl), (6.4, yl)], cor=C3V3, lw=2.2)
    resistor(ax, 4.2, yl, yt, "10 kΩ")
    ax.add_patch(Circle((4.2, yl), 0.09, fc="black", zorder=4)); ax.add_patch(Circle((4.2, yt), 0.09, fc="black", zorder=4))
    caixa(ax, 0.15, yl - 0.5, 1.85, 1.0, "LV1\n(ESP32)", cor="#fff3e0", borda=C3V3, fs=8.5, negrito=True)
    # lado HV
    fio(ax, [(8.8, yl), (13.2, yl)], cor=C5V, lw=2.2)
    resistor(ax, 11.6, yl, yt, "10 kΩ", lado="right")
    ax.add_patch(Circle((11.6, yl), 0.09, fc="black", zorder=4)); ax.add_patch(Circle((11.6, yt), 0.09, fc="black", zorder=4))
    caixa(ax, 13.2, yl - 0.5, 1.85, 1.0, "HV1\n(módulo 5 V)", cor="#fdecea", borda=C5V, fs=8.5, negrito=True)
    # mosfet: fonte no lado LV, dreno no lado HV, porta no 3,3 V
    mosfet(ax, 6.4, 8.8, yl, yt)
    ax.add_patch(Circle((7.6, yt), 0.09, fc="black", zorder=4))
    # tres estados
    estados = [
        ("1. Ninguém puxa a linha", "Os resistores levam cada lado\nà sua tensão: 3,3 V e 5 V.\nPorta e fonte iguais: o\ntransistor fica aberto.", "#eeeeee", CINZA),
        ("2. O ESP32 puxa LV1 a 0 V", "A fonte cai a 0 V e a porta\ncontinua em 3,3 V: o transistor\nconduz e leva HV1 a 0 V.", "#fff3e0", C3V3),
        ("3. O módulo puxa HV1 a 0 V", "O diodo interno conduz e\nderruba LV1; aí o transistor\nliga e LV1 vai a 0 V.", "#fdecea", C5V),
    ]
    for i, (t, d, cor, borda) in enumerate(estados):
        x = 0.2 + i * 5.0
        ax.add_patch(FancyBboxPatch((x, 0.25), 4.75, 4.2, boxstyle="round,pad=0.02,rounding_size=0.1", fc=cor, ec=borda, lw=1.3, zorder=2))
        ax.text(x + 2.375, 3.9, t, ha="center", va="center", fontsize=8.8, fontweight="bold", zorder=4)
        ax.text(x + 2.375, 2.55, d, ha="center", va="center", fontsize=8.2, zorder=4)
        res = ["LV1 = 3,3 V   HV1 = 5 V", "LV1 = 0 V   HV1 ≈ 0 V", "LV1 ≈ 0 V   HV1 = 0 V"][i]
        ax.text(x + 2.375, 0.85, res, ha="center", va="center", fontsize=8.5, fontweight="bold", color=AZUL, zorder=4)
    salvar(fig, "canal_bss138.png")


# ---------------------------------------------------------------- 3: fluxograma de decisao
def decisao():
    fig, ax = tela(7.6, 7.4, 15.2, 14.8)
    P = dict(cor="#deeaf6", borda=AZUL, fs=8.6, negrito=True)
    xq, wq, xr, wr = 0.3, 7.0, 9.0, 5.9
    perguntas = [
        (12.6, "1. O módulo é alimentado em 3,3 V\ne os resistores de pull-up dele vão ao 3,3 V?",
         "Nada: ligue direto.\nBH1750, DS3231, DS18B20, HX710B, TDS", "#e8f5e9", VERDE),
        (9.6, "2. O sinal é analógico?\n(uma tensão que varia: Po do pH, AO dos MQ)",
         "O conversor NÃO serve.\nDivisor resistivo ou ADS1115", "#fdecea", VERM),
        (6.6, "3. O mesmo fio leva dados nos dois sentidos?\n(SDA e SCL do I²C, dados do 1-Wire)",
         "Conversor de nível:\num canal para cada fio", "#fff3e0", LARANJA),
        (3.6, "4. Só o módulo de 5 V fala e o ESP32 escuta?\n(ECHO do HC-SR04, pulsos do YF-S201)",
         "Divisor 1 kΩ / 2 kΩ basta\n(ou um canal livre do conversor)", "#fff3e0", LARANJA),
    ]
    h = 1.7
    for i, (y, q, r, cor, borda) in enumerate(perguntas):
        caixa(ax, xq, y, wq, h, q, **P)
        caixa(ax, xr, y, wr, h, r, cor=cor, borda=borda, fs=8.6)
        seta(ax, (xq + wq, y + h / 2), (xr, y + h / 2), cor=VERDE)
        ax.text((xq + wq + xr) / 2, y + h / 2 + 0.22, "sim", ha="center", fontsize=8.5, color=VERDE, fontweight="bold")
        seta(ax, (xq + wq / 2, y), (xq + wq / 2, y - 1.3))
        ax.text(xq + wq / 2 + 0.2, y - 0.65, "não", ha="left", va="center", fontsize=8.5, color=CINZA, fontweight="bold")
    caixa(ax, xq, 0.4, wq + 1.6 + wr + 0.1, 1.9,
          "Sobrou o caso em que só o ESP32 fala e o módulo de 5 V escuta (relé, TRIG do HC-SR04).\n"
          "Costuma funcionar direto, porque 3,3 V já passa do nível alto de muitos módulos; não há risco para o ESP32.\n"
          "Se o módulo não reconhecer o nível, use um canal do conversor.", cor="#eeeeee", borda=CINZA, fs=8.3)
    salvar(fig, "decisao.png")


# ---------------------------------------------------------------- 4: o conversor no horta/no1
def barramento_no1():
    fig, ax = tela(7.6, 5.0, 15.2, 10.0)
    # zonas
    ax.add_patch(Rectangle((0.1, 0.15), 6.6, 9.7, fc="#fff8ee", ec=C3V3, lw=1.2, ls="--", zorder=0))
    ax.add_patch(Rectangle((8.9, 0.15), 6.2, 9.7, fc="#fdf1f0", ec=C5V, lw=1.2, ls="--", zorder=0))
    ax.text(3.4, 9.5, "Lado de 3,3 V", ha="center", fontsize=10, fontweight="bold", color=C3V3)
    ax.text(12.0, 9.5, "Lado de 5 V", ha="center", fontsize=10, fontweight="bold", color=C5V)
    # pecas
    caixa(ax, 0.4, 3.2, 2.5, 5.2, "ESP32\nDevKit V1", cor="#d9d9d9", borda="#333", fs=9.5, negrito=True)
    caixa(ax, 6.95, 3.6, 1.7, 4.8, "Conversor\nde nível\n\ncanais\n1, 2 e 3", cor="#f4c7c3", borda="#7b1f1e", fs=8.3, negrito=True)
    caixa(ax, 4.0, 8.0, 2.4, 1.0, "DS3231 em 3,3 V", cor="#e8f5e9", borda=VERDE, fs=8)
    caixa(ax, 9.6, 6.6, 2.6, 1.8, "ADS1115\nem 5 V (0x48)", cor="#deeaf6", borda=AZUL, fs=8.5, negrito=True)
    caixa(ax, 12.9, 8.0, 2.0, 0.8, "pH-4502C", cor="white", borda=CINZA, fs=8)
    caixa(ax, 12.9, 7.0, 2.0, 0.8, "TDS", cor="white", borda=CINZA, fs=8)
    caixa(ax, 12.9, 6.0, 2.0, 0.8, "pressão", cor="white", borda=CINZA, fs=8)
    for y in (8.4, 7.4, 6.4):
        seta(ax, (12.9, y), (12.2, min(max(y, 6.9), 8.1)), cor=CINZA, lw=1.2)
    ax.text(12.55, 5.55, "sinais analógicos:\nnão passam pelo conversor", ha="center", va="top", fontsize=7.5, color=CINZA)
    caixa(ax, 9.6, 3.7, 2.6, 1.0, "YF-S201 (vazão)", cor="white", borda=CINZA, fs=8)
    # I2C
    for y, cor, n in ((7.6, "#418dd9", "SDA  GPIO 21"), (7.0, "#25a535", "SCL  GPIO 22")):
        fio(ax, [(2.9, y), (6.95, y)], cor=cor, lw=2.2); fio(ax, [(8.65, y), (9.6, y)], cor=cor, lw=2.2)
        ax.text(3.05, y + 0.1, n, fontsize=7.5, va="bottom", color=cor)
    fio(ax, [(4.9, 7.6), (4.9, 8.0)], cor="#418dd9", lw=2.2); fio(ax, [(5.5, 7.0), (5.5, 8.0)], cor="#25a535", lw=2.2)
    ax.text(9.1, 7.82, "I²C", fontsize=7.5, ha="center", color=CINZA)
    # vazao pelo canal 3
    fio(ax, [(2.9, 4.2), (6.95, 4.2)], cor="#b8860b", lw=2.2); fio(ax, [(8.65, 4.2), (9.6, 4.2)], cor="#b8860b", lw=2.2)
    ax.text(3.05, 4.3, "pulsos  GPIO 27", fontsize=7.5, va="bottom", color="#b8860b")
    # ligacoes diretas
    diretos = [("DS18B20 (pull-up no 3,3 V)", "GPIO 4"), ("boia (contato ao GND)", "GPIO 25"), ("VCC do TDS", "GPIO 32")]
    for i, (n, g) in enumerate(diretos):
        y = 2.6 - i * 0.8
        caixa(ax, 3.6, y - 0.32, 3.0, 0.64, n, cor="#e8f5e9", borda=VERDE, fs=7.5)
        fio(ax, [(1.2 + i * 0.5, 3.2), (1.2 + i * 0.5, y), (3.6, y)], cor=VERDE, lw=1.6)
        ax.text(3.15, y + 0.06, g, fontsize=6.8, va="bottom", ha="center", color=VERDE)
    caixa(ax, 9.6, 1.1, 3.6, 1.6, "Módulo de relés em 5 V\nIN1 direto do GPIO 26,\nsem conversor", cor="white", borda=CINZA, fs=8)
    fio(ax, [(2.7, 3.2), (2.7, 0.4), (8.2, 0.4), (8.2, 1.9), (9.6, 1.9)], cor=CINZA, lw=1.6, ls="--")
    salvar(fig, "barramento_no1.png")


if __name__ == "__main__":
    pinagem(); canal_bss138(); decisao(); barramento_no1()
