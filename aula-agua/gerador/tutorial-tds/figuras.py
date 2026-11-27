"""Diagramas proprios do tutorial do sensor de condutividade (matplotlib; nada copiado da web).
  cadeia_ce.png       dos ions na agua ate o numero em uS/cm: sonda, placa, ADC do ESP32, curva, temperatura, K
  curva_modulo.png    a curva do fabricante (tensao -> CE), a zona morta do ADC, o fim da escala e a faixa da alface
  temperatura_ce.png  a mesma solucao de 1413 uS/cm lida de 21 a 28 C (tabela do metodo EPA 120.1) e a correcao de 2 %/C
  faixas_ce.png       CE recomendada para a alface em cada fonte, com o limite do modulo
  estudo_cometti.png  producao relativa x concentracao da solucao (Cometti et al., 2008)
  reservatorio.png    quanto a CE sobe num dia se as 25 plantas tirarem so agua, conforme o volume do reservatorio
  decisao_ce.png      repor agua ou nutriente: o que fazer com a CE subindo, caindo ou parada
  calibracao_k.png    a calibracao em um ponto (fator K) e a verificacao com a tolerancia de 5 %
  bancada_ce.png      a bancada NFT e o lugar da sonda de condutividade no reservatorio
  liga_desliga.png    o sensor de condutividade ligado so durante a propria leitura (convivio com a sonda de pH)
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-tds/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon
from matplotlib.ticker import FuncFormatter

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
AGUA = "#4fa3d9"
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
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=5))


def fio(ax, pts, cor="black", lw=2.0, ls="-", z=2):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=cor, lw=lw, ls=ls, zorder=z, solid_capstyle="round", solid_joinstyle="round")


def curva(v):
    """curva do fabricante do modulo: tensao (V) -> condutividade (uS/cm)"""
    return 133.42 * v**3 - 255.86 * v**2 + 857.39 * v


# ---------------------------------------------------------------- 1: cadeia do sinal
def cadeia_ce():
    fig, ax = plt.subplots(figsize=(9.4, 3.9))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.8); ax.axis("off")
    # copo com a sonda
    ax.add_patch(Rectangle((0.3, 1.0), 2.5, 2.5, fc="white", ec=CINZA, lw=1.5, zorder=1))
    ax.add_patch(Rectangle((0.3, 1.0), 2.5, 1.8, fc="#cfe8f7", ec="none", zorder=1))
    ax.add_patch(Rectangle((1.25, 2.3), 0.6, 2.2, fc="#1b1b1b", ec="black", zorder=3))
    for x in (1.35, 1.67):
        ax.add_patch(Rectangle((x, 1.5), 0.08, 0.85, fc="#bdbdbd", ec="#555", zorder=4))
    rng = np.random.default_rng(3)
    for i in range(14):
        x, y = rng.uniform(0.5, 2.6), rng.uniform(1.2, 2.6)
        if 1.2 < x < 1.9 and y > 1.4: continue
        pos = i % 2 == 0
        ax.text(x, y, "+" if pos else "−", ha="center", va="center", fontsize=8, color="white", zorder=5,
                bbox=dict(boxstyle="circle,pad=0.12", fc=VERM if pos else AZUL, ec="none"))
    seta(ax, (1.45, 1.75), (1.65, 1.75), cor=LARANJA, lw=1.4, estilo="<|-|>")
    ax.text(1.55, 0.45, "íons dos sais conduzem a corrente\nentre os dois eletrodos", ha="center", fontsize=7.5, color=CINZA)
    ax.text(1.15, 4.1, "sonda", ha="right", fontsize=8.5, color=CINZA)
    fio(ax, [(1.55, 4.5), (1.55, 5.3), (3.9, 5.3), (3.9, 4.6)], cor="#111", lw=2.5)
    # blocos
    blocos = [(3.1, "PLACA\nTDS Meter V1.0", "corrente alternada\nna sonda; saída:\ntensão de 0 a 2,3 V", "#fff4e5", LARANJA),
              (5.3, "ESP32\nGPIO 34 (ADC1)", "mede a tensão\n(30 leituras,\nsem os extremos)", "#deeaf6", AZUL),
              (7.5, "CURVA DO\nFABRICANTE", "tensão → CE\n(polinômio do\n3º grau)", "#deeaf6", AZUL),
              (9.7, "FATOR K", "correção da\ncalibração com a\nsolução de 1413", "#e8f5e9", VERDE),
              (11.9, "TEMPERATURA", "DS18B20: traz a CE\npara 25 °C\n(2 % por grau)", "#e8f5e9", VERDE)]
    for x, titulo, texto, cor, borda in blocos:
        caixa(ax, x, 3.3, 1.9, 1.3, titulo, cor=cor, borda=borda, fs=8, negrito=True)
        ax.text(x + 0.95, 2.55, texto, ha="center", va="center", fontsize=7.5, color=CINZA)
    for x in (5.0, 7.2, 9.4, 11.6):
        seta(ax, (x + 0.02, 3.95), (x + 0.28, 3.95), cor=AZUL)
    caixa(ax, 8.5, 0.35, 5.2, 1.1, "CE a 25 °C, em µS/cm\n÷ 1000 = mS/cm      × 0,5 = ppm (TDS)", cor="#fffde7", borda="#bfa500", fs=8.5, negrito=True)
    seta(ax, (12.85, 1.95), (12.85, 1.5), cor=VERDE)
    ax.text(5.9, 0.9, "A placa não mede sais diretamente:\nmede a facilidade com que a água\nconduz corrente. O resto é conta.", ha="center", fontsize=8, color=AZUL)
    salvar(fig, "cadeia_ce.png")


# ---------------------------------------------------------------- 2: curva do modulo
def curva_modulo():
    fig, ax = plt.subplots(figsize=(8.6, 4.3))
    v = np.linspace(0, 2.3, 200)
    ax.axhspan(1000, 1800, color="#e3f2e4", zorder=0)
    ax.text(0.05, 1400, "faixa de trabalho\nda alface\n(1,0 a 1,8 mS/cm)", fontsize=8.5, color=VERDE, va="center")
    ax.axvspan(0, 0.15, color="#fdecea", zorder=0)
    ax.text(0.075, 2050, "ADC do ESP32\nnão lê abaixo\nde 0,15 V", fontsize=7.5, color=VERM, ha="center", va="center")
    ax.plot(v, curva(v), color=AZUL, lw=2.5, zorder=3)
    ax.plot(v, 857.39 * v, color=CINZA, lw=1, ls=":", zorder=2)
    ax.text(1.62, 1470, "reta só com o 1º termo\n(para comparar)", fontsize=7.5, color=CINZA, rotation=38)
    ax.axvline(2.3, color=VERM, lw=1.2, ls="--")
    ax.text(2.28, 420, "fim da saída do módulo (2,3 V)", fontsize=8, color=VERM, rotation=90, ha="right")
    for ce in (1000, 1413, 1800):
        vi = np.interp(ce, curva(v), v)
        ax.plot([vi, vi], [0, ce], color=LARANJA, lw=1, ls="--", zorder=2)
        ax.plot(vi, ce, "o", color=LARANJA, zorder=4)
        ax.text(vi + 0.03, ce - 110, f"{ce} µS/cm\n{br(vi)} V", fontsize=8, color=LARANJA)
    ax.axhline(2000, color=CINZA, lw=0.8, ls="--"); ax.text(0.42, 2030, "1000 ppm (fator 0,5): a faixa anunciada do módulo", fontsize=8, color=CINZA)
    ax.set_xlim(0, 2.4); ax.set_ylim(0, 2400)
    ax.set_xlabel("tensão na saída A do sensor (V)"); ax.set_ylabel("condutividade pela curva (µS/cm)")
    ax.xaxis.set_major_formatter(virgula)
    sec = ax.secondary_yaxis("right", functions=(lambda y: y * 0.5, lambda y: y / 0.5)); sec.set_ylabel("TDS (ppm, fator 0,5)")
    ax.grid(alpha=0.25)
    fig.tight_layout()
    salvar(fig, "curva_modulo.png")


# ---------------------------------------------------------------- 3: temperatura
def temperatura_ce():
    t = np.array([21, 22, 23, 24, 25, 26, 27, 28]); ce = np.array([1305, 1332, 1359, 1386, 1413, 1441, 1468, 1496])
    fig, ax = plt.subplots(figsize=(8.2, 3.9))
    ax.plot(t, ce, "o-", color=LARANJA, lw=2, label="o que o sensor lê na solução-padrão (tabela do método EPA 120.1)")
    ax.plot(t, ce / (1 + 0.02 * (t - 25)), "s-", color=VERDE, lw=2, label="depois da correção: leitura ÷ [1 + 0,02 × (T − 25)]")
    ax.axhline(1413, color=CINZA, lw=0.8, ls="--")
    for ti, ci in zip(t, ce):
        ax.text(ti, ci + 9, str(ci), ha="center", fontsize=8, color=LARANJA)
    ax.set_xlabel("temperatura da solução (°C)"); ax.set_ylabel("condutividade (µS/cm)")
    ax.set_ylim(1280, 1530); ax.grid(alpha=0.25); ax.legend(fontsize=8, loc="upper left")
    ax.text(27.9, 1392, "1413 µS/cm a 25 °C", fontsize=8, color=CINZA, ha="right")
    fig.tight_layout()
    salvar(fig, "temperatura_ce.png")


# ---------------------------------------------------------------- 4: faixas por fonte
def faixas_ce():
    fontes = [("Embrapa Hortaliças (Carrijo e Makishima, 2000)\nCE inicial da solução", [(1.5, 2.5, AZUL)], None),
              ("Furlani e colab. (IAC, 2009)\nfolhosas, clima ameno", [], (2.0, AZUL)),
              ("Furlani e colab. (IAC, 2009)\nverão e clima quente (Norte e Nordeste)", [(1.0, 1.5, LARANJA)], None),
              ("Cometti e colab. (UFRRJ, 2008)\nclima quente, 30 °C de dia", [], (1.0, LARANJA)),
              ("Andrade (UFC, 2019)\nsemiárido do Ceará", [(0.9, 1.8, LARANJA)], None),
              ("Dalastra (UNESP, 2017), alface americana\npor fase: 0,8 → 1,3 → 1,8 → 1,3", [(0.8, 1.8, VERDE)], None),
              ("Oklahoma State University (2016)", [(1.2, 1.8, AZUL)], None),
              ("Cornell CEA (2013), sistema floating\n1,15 a 1,25 ACIMA da CE da água", [(1.15, 1.25, AZUL)], None)]
    fig, ax = plt.subplots(figsize=(9.2, 4.8))
    for i, (nome, barras, ponto) in enumerate(fontes):
        y = len(fontes) - 1 - i
        for a, b, cor in barras:
            ax.barh(y, b - a, left=a, height=0.5, color=cor, alpha=0.85, zorder=3)
            ax.text(b + (0.3 if b > 2.2 else 0.04) * 0 + 0.04, y, f"{br(a, 2).rstrip('0').rstrip(',')} a {br(b, 2).rstrip('0').rstrip(',')}", va="center", fontsize=8)
        if ponto:
            ax.plot(ponto[0], y, "D", color=ponto[1], ms=9, zorder=3)
            ax.text(ponto[0] + 0.08, y, f"cerca de {br(ponto[0], 1)}", va="center", fontsize=8)
    for a, b in ((0.8, 1.3), (1.3, 1.8)):
        ax.plot([a, a], [2.25, 1.75], color="white", lw=1.5, zorder=4)
    ax.set_yticks(range(len(fontes))); ax.set_yticklabels([f[0] for f in fontes][::-1], fontsize=8)
    ax.axvspan(2.0, 2.24, color="#fdecea", zorder=0); ax.axvline(2.24, color=VERM, lw=1.3, ls="--")
    ax.text(2.28, 4.6, "acima de ~2,2 mS/cm\no módulo satura\n(saída em 2,3 V)", fontsize=8, color=VERM, va="top")
    ax.text(2.12, -0.75, "fim da faixa\nanunciada", fontsize=7, color=VERM, ha="center", va="bottom")
    ax.set_xlim(0.5, 3.0); ax.set_ylim(-0.8, len(fontes) - 0.4)
    ax.set_xlabel("condutividade elétrica da solução (mS/cm a 25 °C)"); ax.xaxis.set_major_formatter(virgula)
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    salvar(fig, "faixas_ce.png")


# ---------------------------------------------------------------- 5: Cometti 2008
def estudo_cometti():
    conc = [12.5, 25, 50, 100]; prod = [20, 50, 100, 100]
    fig, ax = plt.subplots(figsize=(7.6, 3.7))
    barras = ax.bar([str(c).replace(".", ",") + " %" for c in conc], prod, color=[VERM, LARANJA, VERDE, AZUL], width=0.6, zorder=3)
    for b, p, extra in zip(barras, prod, ["", "", "cerca de\n0,98 mS/cm", "cerca de\n1,84 mS/cm"]):
        ax.text(b.get_x() + b.get_width() / 2, p + 2, f"{p} %", ha="center", fontsize=9, fontweight="bold")
        if extra: ax.text(b.get_x() + b.get_width() / 2, p / 2, extra, ha="center", va="center", fontsize=8.5, color="white")
    ax.set_ylim(0, 118); ax.set_ylabel("massa da parte aérea\n(solução completa = 100 %)")
    ax.set_xlabel("concentração da solução nutritiva (fórmula de Furlani = 100 %)")
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    salvar(fig, "estudo_cometti.png")


# ---------------------------------------------------------------- 6: reservatorio
def reservatorio():
    vol = np.array([12.5, 25, 37.5, 50, 75, 100])
    fig, ax = plt.subplots(figsize=(8.2, 3.8))
    for consumo, cor, rot in ((2.5, AZUL, "25 plantas × 100 mL/dia = 2,5 L/dia"), (5.0, LARANJA, "dia muito quente: o dobro, 5 L/dia")):
        ax.plot(vol, 100 * (vol / (vol - consumo) - 1), "o-", color=cor, lw=2, label=rot)
    for v in vol:
        ax.text(v, 100 * (v / (v - 2.5) - 1) - 4.8, br(100 * (v / (v - 2.5) - 1), 0) + " %", ha="center", fontsize=8, color=AZUL)
    ax.axhspan(0, 5, color="#e3f2e4", zorder=0)
    ax.set_xticks(vol); ax.set_xticklabels([f"{br(v, 1).rstrip('0').rstrip(',')} L\n({br(v / 25, 1).rstrip('0').rstrip(',')} L/planta)" for v in vol], fontsize=8)
    ax.set_ylabel("subida da CE em um dia\nsem repor a água (%)"); ax.set_ylim(-7, 70)
    ax.set_xlabel("volume de solução no reservatório, para 25 plantas")
    ax.grid(alpha=0.25); ax.legend(fontsize=8)
    fig.tight_layout()
    salvar(fig, "reservatorio.png")


# ---------------------------------------------------------------- 7: decisao
def decisao_ce():
    fig, ax = plt.subplots(figsize=(9.4, 5.0))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.6); ax.axis("off")
    caixa(ax, 4.2, 6.5, 5.6, 0.9, "1. De manhã: complete o reservatório com ÁGUA\naté a marca, misture e espere a leitura parar", cor="#deeaf6", negrito=True)
    caixa(ax, 4.9, 5.0, 4.2, 0.9, "2. Leia a CE (a 25 °C)\ne compare com a faixa desejada", cor="#fffde7", borda="#bfa500", negrito=True)
    seta(ax, (7, 6.45), (7, 5.95))
    colunas = [(0.3, "ABAIXO da faixa", "#dbe9f6", AZUL,
                "As plantas tiraram mais\nnutriente que água.",
                "Acrescente solução-estoque aos\npoucos, misture e meça de novo.\nRegra do IAC: uma dose para\ncada 0,25 mS/cm que faltar."),
               (4.9, "DENTRO da faixa", "#e3f2e4", VERDE,
                "Água e nutriente saíram\nna mesma proporção.",
                "Não acrescente nada.\nConfira o pH e anote\na leitura do dia."),
               (9.5, "ACIMA da faixa", "#fbe5d6", LARANJA,
                "Solução forte demais, ou sensor\nsujo ou descalibrado.",
                "Confira o sensor na solução\nde 1413. Se a leitura estiver\ncerta, troque parte da solução\npor água.")]
    for x, titulo, cor, borda, porque, fazer in colunas:
        caixa(ax, x, 3.75, 4.2, 0.7, titulo, cor=cor, borda=borda, fs=9.5, negrito=True)
        ax.text(x + 2.1, 3.1, porque, ha="center", va="center", fontsize=8, color=CINZA)
        caixa(ax, x, 0.75, 4.2, 1.75, fazer, cor="white", borda=borda, fs=8.5)
        seta(ax, (x + 2.1, 2.62), (x + 2.1, 2.55), cor=borda)
    seta(ax, (5.2, 4.95), (2.6, 4.5), cor=AZUL); seta(ax, (7, 4.95), (7, 4.5), cor=VERDE); seta(ax, (8.8, 4.95), (11.4, 4.5), cor=LARANJA)
    ax.text(7, 0.25, "Durante o dia, entre uma reposição e outra, é normal a CE SUBIR um pouco: no calor as plantas bebem mais água que nutriente.",
            ha="center", fontsize=8.5, color=AZUL)
    salvar(fig, "decisao_ce.png")


# ---------------------------------------------------------------- 8: calibracao
def calibracao_k():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.9), gridspec_kw=dict(width_ratios=[1.25, 1]))
    x = np.linspace(0, 2000, 50); k = 1413 / 1310
    a1.plot(x, x, color=CINZA, lw=1.2, ls="--", label="sem calibrar: K = 1")
    a1.plot(x, k * x, color=VERDE, lw=2.2, label=f"calibrado: K = 1413 ÷ 1310 = {br(k, 3)}")
    a1.plot(1310, 1310, "o", color=VERM, ms=8, zorder=4); a1.plot(1310, 1413, "o", color=VERDE, ms=8, zorder=4)
    seta(a1, (1310, 1325), (1310, 1398), cor=LARANJA)
    a1.text(1350, 1255, "o sensor dizia 1310", fontsize=8, color=VERM)
    a1.text(640, 1440, "a solução vale 1413", fontsize=8, color=VERDE)
    a1.plot(0, 0, "o", color=AZUL, ms=7, zorder=4); a1.text(60, 40, "a reta passa pelo zero:\nágua pura não conduz", fontsize=8, color=AZUL)
    a1.set_xlabel("CE pela curva do fabricante, já a 25 °C (µS/cm)"); a1.set_ylabel("CE verdadeira (µS/cm)")
    a1.set_xlim(-40, 2000); a1.set_ylim(-40, 2200); a1.grid(alpha=0.25); a1.legend(fontsize=8, loc="upper left")
    a1.set_title("Calibração em um ponto", fontsize=10)
    # verificacao
    ref = 717.5; lido = 739
    a2.axhspan(ref * 0.95, ref * 1.05, color="#e3f2e4"); a2.axhline(ref, color=VERDE, lw=1.2)
    a2.plot([0.5], [lido], "o", color=AZUL, ms=11, zorder=4)
    a2.text(0.56, lido + 4, f"lido: {lido} µS/cm\nerro: +{br(100 * (lido - ref) / ref, 1)} %", fontsize=8.5, color=AZUL, va="bottom")
    a2.text(0.03, ref * 1.05 + 3, f"+5 % = {br(ref * 1.05, 0)}", fontsize=8, color=VERDE)
    a2.text(0.03, ref * 0.95 - 9, f"−5 % = {br(ref * 0.95, 0)}", fontsize=8, color=VERDE)
    a2.text(0.03, ref + 3, f"segunda solução: {br(ref, 1)} µS/cm", fontsize=8, color=VERDE)
    a2.set_xlim(0, 1); a2.set_ylim(650, 790); a2.set_xticks([]); a2.set_ylabel("CE (µS/cm)")
    a2.set_title("Verificação em outro ponto (exemplo)", fontsize=10)
    fig.tight_layout()
    salvar(fig, "calibracao_k.png")


# ---------------------------------------------------------------- 9: bancada
def bancada_ce():
    fig, ax = plt.subplots(figsize=(9.4, 4.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off")
    ax.add_patch(Polygon([(1.2, 5.3), (8.4, 4.8), (8.4, 4.5), (1.2, 5.0)], fc="#e8e8e8", ec=CINZA, lw=1.3, zorder=2))
    ax.add_patch(Polygon([(1.2, 5.06), (8.4, 4.56), (8.4, 4.5), (1.2, 5.0)], fc=AGUA, ec="none", zorder=3))
    for x in np.linspace(1.9, 7.8, 6):
        y = 5.3 - (x - 1.2) * 0.5 / 7.2
        ax.plot([x, x], [y, y + 0.3], color=VERDE, lw=2.5, zorder=4)
        ax.add_patch(Circle((x, y + 0.5), 0.3, fc="#66bb6a", ec=VERDE, zorder=4))
    ax.text(4.8, 6.25, "canais NFT com 25 posições de alface (vista de lado, fora de escala)", ha="center", fontsize=8.5, color=CINZA)
    # reservatorio grande
    ax.add_patch(Rectangle((7.2, 0.4), 6.4, 2.9, fc="white", ec=CINZA, lw=1.5, zorder=1))
    ax.add_patch(Rectangle((7.2, 0.4), 6.4, 2.2, fc="#cfe8f7", ec="none", zorder=1))
    ax.text(9.8, 3.42, "reservatório", ha="center", fontsize=8.5, color=CINZA)
    fio(ax, [(8.4, 4.65), (8.9, 4.65), (8.9, 2.7)], cor=AGUA, lw=4); ax.text(9.05, 3.9, "retorno", fontsize=8, color=AZUL)
    caixa(ax, 7.45, 0.55, 1.1, 0.6, "BOMBA", cor="#ffe0b2", borda=LARANJA, fs=7.5, negrito=True)
    fio(ax, [(8.0, 1.15), (8.0, 3.8), (0.7, 3.8), (0.7, 5.15), (1.2, 5.15)], cor=AGUA, lw=4)
    # sondas
    ax.add_patch(Rectangle((10.55, 1.5), 0.3, 2.6, fc="#1b1b1b", ec="black", zorder=4))
    for x in (10.6, 10.76):
        ax.add_patch(Rectangle((x, 1.15), 0.04, 0.4, fc="#bdbdbd", ec="#555", zorder=5))
    ax.add_patch(Rectangle((11.25, 1.3), 0.12, 2.8, fc="#bdbdbd", ec="#555", zorder=4))
    ax.add_patch(Rectangle((12.85, 1.3), 0.22, 2.8, fc="#f5f5f5", ec="#555", zorder=4)); ax.add_patch(Circle((12.96, 1.3), 0.13, fc="#d6eaf8", ec="#555", zorder=5))
    ax.text(10.1, 4.45, "sonda de\ncondutividade", ha="center", fontsize=8, color=AZUL, fontweight="bold")
    ax.text(11.9, 4.75, "DS18B20\n(ao lado)", ha="center", fontsize=8, color=CINZA)
    seta(ax, (11.6, 4.65), (11.33, 4.15), cor=CINZA, lw=1)
    ax.text(12.96, 4.3, "sonda\nde pH", ha="center", fontsize=8, color=CINZA)
    seta(ax, (10.9, 0.85), (12.8, 0.85), cor=LARANJA, estilo="<|-|>"); ax.text(11.85, 0.52, "o mais longe possível", ha="center", fontsize=7.5, color=LARANJA)
    seta(ax, (9.0, 1.9), (10.5, 1.9), cor=LARANJA, estilo="<|-|>"); ax.text(9.75, 1.75, "longe do retorno,\nparedes e fundo", ha="center", fontsize=7.5, color=LARANJA, va="top")
    # caixa da eletronica
    caixa(ax, 2.0, 0.6, 3.6, 1.5, "caixa fechada, acima da água:\nESP32 + placa do TDS\n(só as sondas descem)", cor="#deeaf6", fs=8.5)
    fio(ax, [(5.6, 1.6), (6.3, 1.6), (6.3, 4.2), (10.7, 4.2), (10.7, 4.12)], cor="#111", lw=1.5, ls="--", z=1)
    ax.text(4.0, 2.4, "Wi‑Fi → servidor da telemetria → painel", ha="center", fontsize=8, color=AZUL)
    salvar(fig, "bancada_ce.png")


# ---------------------------------------------------------------- 10: liga e desliga
def liga_desliga():
    fig, ax = plt.subplots(figsize=(9.0, 2.9))
    t = np.linspace(0, 22, 2200)
    lig = ((t % 10) >= 0.9) & ((t % 10) < 1.9)
    ax.fill_between(t, 2.2, 2.2 + 0.9 * lig, step="pre", color=LARANJA, alpha=0.85)
    ax.plot(t, 2.2 + 0.9 * lig, color=LARANJA, lw=1.2, drawstyle="steps-pre")
    for t0 in (0, 10, 20):
        ax.add_patch(Rectangle((t0 + 0.05, 0.9), 0.8, 0.7, fc=VERDE, ec="none", alpha=0.8))
        ax.add_patch(Rectangle((t0 + 1.7, 0.9), 0.2, 0.7, fc=AZUL, ec="none"))
        if t0 < 20:
            ax.add_patch(Rectangle((t0 + 2.3, 0.9), 0.5, 0.7, fc="#8e44ad", ec="none", alpha=0.8))
    ax.text(-0.3, 2.65, "sensor de\ncondutividade", ha="right", va="center", fontsize=8.5, color=LARANJA)
    ax.text(-0.3, 1.25, "o que o nó lê", ha="right", va="center", fontsize=8.5, color=CINZA)
    ax.text(1.4, 3.25, "ligado 0,8 s + leitura", ha="center", fontsize=8, color=LARANJA)
    ax.text(6.4, 2.6, "desligado (GPIO 32 em 0 V): não injeta corrente na solução", ha="center", fontsize=8, color=CINZA)
    ax.text(0.45, 0.55, "temperatura", ha="center", fontsize=7.5, color=VERDE)
    ax.text(1.8, 1.72, "CE", ha="center", fontsize=7.5, color=AZUL)
    ax.text(2.3, 0.55, "pH (nó horta/no1)", ha="left", fontsize=7.5, color="#8e44ad")
    ax.set_xlim(-3.6, 22); ax.set_ylim(0.2, 3.6); ax.set_yticks([])
    ax.set_xlabel("tempo (s): o nó publica a cada 10 s")
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "liga_desliga.png")


if __name__ == "__main__":
    for f in (cadeia_ce, curva_modulo, temperatura_ce, faixas_ce, estudo_cometti, reservatorio, decisao_ce,
              calibracao_k, bancada_ce, liga_desliga):
        f()
