"""Diagramas proprios do tutorial do sensor de luz BH1750 (matplotlib; nada copiado da web).
  bancada_luz.png     a bancada NFT e o lugar do sensor: virado para cima, na altura das folhas
  escala_lux.png      escala logaritmica de iluminancia com exemplos do dia a dia e a faixa do sensor
  espectro.png        a curva do olho V(lambda), a faixa que a planta usa (PAR) e um LED de cultivo vermelho + azul
  faixas_mtreg.png    faixa e passo do sensor conforme o registrador MTreg, com o sol pleno como referencia
  barramento_i2c.png  dois fios para varios modulos: enderecos no barramento I2C do ESP32
  lux_ppfd_dli.png    do lux ao DLI: as duas contas, com exemplo
  dia_luz.png         a luz ao longo de um dia (modelo simples): ceu limpo, sob tela de 50 %, nublado e painel de LED
  dli_cabo.png        luz diaria estimada ao ar livre no Cabo de Santo Agostinho, mes a mes, e sob telas de 35 e 50 %
  faixas_dli.png      luz diaria (DLI) para a alface em cada fonte
  decisao_luz.png     o que fazer com o DLI medido: suplementar, manter ou sombrear
  conferencia.png     conferencia com um luximetro: o fator de correcao e a tolerancia de 20 % do fabricante
  cosseno.png         a leitura cai com a inclinacao da luz (lei do cosseno) e com o sensor torto
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-bh1750/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon, Ellipse
from matplotlib.ticker import FuncFormatter

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM, AMARELO = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b", "#e0a800"
plt.rcParams["font.family"] = "DejaVu Sans"
virgula = FuncFormatter(lambda v, _: f"{v:g}".replace(".", ","))


def br(v, casas=1):
    return f"{v:.{casas}f}".replace(".", ",")


def milhar(v):
    return f"{v:,.0f}".replace(",", ".")


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


# ---------------------------------------------------------------- 1: bancada
def bancada_luz():
    fig, ax = plt.subplots(figsize=(9.4, 3.9))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off")
    fig.subplots_adjust(left=0.01, right=0.99, bottom=0.01, top=0.99)
    # painel de LED em cima
    ax.add_patch(Rectangle((3.0, 5.7), 6.0, 0.35, fc="#444", ec="black", zorder=3))
    for x in np.linspace(3.3, 8.7, 10):
        ax.add_patch(Circle((x, 5.68), 0.09, fc="#ff5fa2", ec="none", zorder=4))
    ax.text(6.0, 6.25, "painel de LED de cultivo (ou o sol, numa bancada externa)", ha="center", fontsize=8.5, color=CINZA)
    for x in np.linspace(4.3, 8.4, 6):
        seta(ax, (x, 5.5), (x, 3.75), cor=AMARELO, lw=1.2)
    # canal NFT inclinado com plantas
    ax.add_patch(Polygon([(2.2, 2.7), (9.8, 2.35), (9.8, 2.0), (2.2, 2.35)], fc="#e8e8e8", ec=CINZA, lw=1.3, zorder=2))
    for i, x in enumerate(np.linspace(3.0, 9.0, 6)):
        y = 2.68 - (x - 2.2) * 0.046
        if i == 3: continue                       # lugar do sensor
        ax.add_patch(Ellipse((x, y + 0.45), 0.95, 0.75, fc="#58a85c", ec="#2e7d32", lw=1, zorder=4))
        ax.add_patch(Ellipse((x - 0.2, y + 0.55), 0.5, 0.5, fc="#7cc47f", ec="none", zorder=5))
    # sensor numa haste, na altura das folhas
    xs = 3.0 + 3 * 1.2; ys = 2.68 - (xs - 2.2) * 0.046
    fio(ax, [(xs, ys - 0.1), (xs, ys + 0.78)], cor="#777", lw=3)
    ax.add_patch(Rectangle((xs - 0.3, ys + 0.78), 0.6, 0.14, fc=AZUL, ec="black", zorder=6))
    ax.add_patch(Rectangle((xs - 0.07, ys + 0.92), 0.14, 0.06, fc="#e8e8e8", ec="#555", zorder=7))
    ax.annotate("BH1750 virado para cima,\nnivelado, na altura das folhas,\nsem sombra de folha nem de fio",
                (xs + 0.25, ys + 0.9), (10.4, 4.3), fontsize=8.5, color=AZUL, ha="left", va="center",
                arrowprops=dict(arrowstyle="-|>", color=AZUL, lw=1.2))
    # reservatorio tampado
    ax.add_patch(Rectangle((9.9, 0.35), 2.6, 1.3, fc="#cfe8f7", ec=CINZA, lw=1.5, zorder=2))
    ax.add_patch(Rectangle((9.8, 1.65), 2.8, 0.14, fc="#333", ec="black", zorder=3))
    ax.text(11.2, 0.95, "reservatório\ncom tampa", ha="center", va="center", fontsize=8.5, color=AZUL)
    ax.annotate("solução sempre no escuro:\nluz na água cria algas", (11.6, 1.8), (12.0, 2.9), fontsize=8, color=CINZA,
                ha="center", arrowprops=dict(arrowstyle="-|>", color=CINZA, lw=1))
    fio(ax, [(9.8, 2.15), (10.4, 2.15), (10.4, 1.79)], cor="#4fa3d9", lw=3)
    fio(ax, [(10.0, 0.6), (1.6, 0.6), (1.6, 2.55), (2.2, 2.55)], cor="#4fa3d9", lw=3)
    ax.text(5.6, 0.25, "bomba e retorno da solução", ha="center", fontsize=8, color=CINZA)
    # caixa do no
    caixa(ax, 0.2, 3.6, 2.3, 1.2, "nó horta/no2\nESP32 + DHT22\n(caixa seca)", fs=8.5)
    fio(ax, [(2.5, 4.0), (5.0, 4.0), (xs - 0.3, ys + 0.85)], cor=VERDE, lw=1.6)
    ax.text(3.45, 4.12, "4 fios (I2C)", fontsize=8, color=VERDE, ha="center")
    salvar(fig, "bancada_luz.png")


# ---------------------------------------------------------------- 2: escala de lux
def escala_lux():
    fig, ax = plt.subplots(figsize=(9.4, 4.3))
    ax.set_xscale("log"); ax.set_xlim(0.03, 300000); ax.set_ylim(0, 10)
    itens = [(0.2, "lua cheia\n0,05 a 0,3"), (50, "sala de casa\n50"), (400, "escritório\n320 a 500"),
             (1000, "dia nublado\n1.000"), (16000, "luz do dia sem\nsol direto\n10 a 25 mil"),
             (60000, "sol direto\n32 a 100 mil")]
    for i, (x, t) in enumerate(itens):
        y = 6.6 if i % 2 == 0 else 8.2
        ax.plot([x, x], [4.6, y - 0.55], color=CINZA, lw=1)
        ax.plot([x], [4.6], "o", color=AMARELO, ms=7, mec=CINZA)
        ax.text(x, y, t, ha="center", va="center", fontsize=8.3)
    ax.axhline(4.6, color=CINZA, lw=1.2)
    # faixas do sensor
    ax.add_patch(Rectangle((1, 2.6), 54612 - 1, 0.8, fc="#deeaf6", ec=AZUL, lw=1.3))
    ax.text(230, 3.0, "faixa de fábrica do BH1750: 1 a 54.612 lx, passo de 1 lx", ha="center", va="center", fontsize=8.5, color=AZUL)
    ax.add_patch(Rectangle((54612, 2.6), 121557 - 54612, 0.8, fc="#fbe6d4", ec=LARANJA, lw=1.3))
    ax.annotate("faixa estendida\n(MTreg 31): até 121.557 lx", (80000, 2.6), (30000, 1.1), fontsize=8.3, color=LARANJA, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=LARANJA, lw=1))
    ax.add_patch(Rectangle((0.11, 2.6), 1 - 0.11, 0.8, fc="#e8f5e9", ec=VERDE, lw=1.3))
    ax.annotate("modo de 0,5 lx e\nMTreg 254: desde 0,11 lx", (0.35, 2.6), (0.6, 1.1), fontsize=8.3, color=VERDE, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=VERDE, lw=1))
    # alface
    ax.add_patch(Rectangle((13900, 0.15), 19700 - 13900, 0.5, fc="#58a85c", ec=VERDE))
    ax.text(12000, 0.4, "LED branco por 16 h para a alface: 14 a 20 mil lx", ha="right", va="center", fontsize=8.3, color=VERDE)
    ax.set_yticks([]); ax.set_xlabel("iluminância (lux) — escala logarítmica: cada marca vale 10 vezes a anterior")
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: milhar(v) if v >= 1 else f"{v:g}".replace(".", ",")))
    for s in ("top", "left", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "escala_lux.png")


# ---------------------------------------------------------------- 3: espectro
def V(l):
    """curva de sensibilidade do olho (fotopica), aproximacao analitica gaussiana; l em nm"""
    return 1.019 * np.exp(-285.4 * (l / 1000 - 0.559) ** 2)


def espectro():
    l = np.linspace(380, 760, 400)
    fig, ax = plt.subplots(figsize=(9.4, 4.0))
    ax.axvspan(400, 700, color="#e8f5e9", zorder=0)
    ax.text(550, 1.13, "faixa que a planta usa na fotossíntese (PAR): 400 a 700 nm — todos os fótons contam igual", ha="center", fontsize=8.5, color=VERDE)
    ax.plot([400, 400, 700, 700], [0, 1, 1, 0], color=VERDE, lw=1.6, ls="--", label="sensor de PAR ideal")
    ax.plot(l, V(l), color=AZUL, lw=2.4, label="olho humano, V(λ): o que o lux mede (aproximação)")
    led = 0.85 * np.exp(-((l - 450) / 11) ** 2) + 1.0 * np.exp(-((l - 660) / 11) ** 2)
    ax.fill_between(l, led, color="#ff5fa2", alpha=0.35, lw=0)
    ax.plot(l, led, color="#d6336c", lw=1.3, label="LED de cultivo vermelho + azul (esquemático)")
    ax.annotate("pico do BH1750:\n560 nm (verde‑amarelo)", (560, 1.0), (559, 0.3), fontsize=8.3, color=AZUL, ha="center",
                arrowprops=dict(arrowstyle="-|>", color=AZUL, lw=1))
    ax.annotate("aqui o olho (e o lux)\nquase não enxerga", (452, 0.04), (497, 0.8), fontsize=8.3, color="#d6336c", ha="center",
                arrowprops=dict(arrowstyle="-|>", color="#d6336c", lw=1))
    ax.annotate("", (660, 0.06), (700, 0.38), arrowprops=dict(arrowstyle="-|>", color="#d6336c", lw=1))
    ax.text(712, 0.42, "idem", fontsize=8.3, color="#d6336c", ha="center")
    for x, n in [(450, "azul"), (530, "verde"), (590, "amarelo"), (660, "vermelho")]:
        ax.text(x, -0.13, n, ha="center", fontsize=8, color=CINZA)
    ax.set_xlim(380, 760); ax.set_ylim(-0.18, 1.62); ax.set_yticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_xlabel("comprimento de onda (nm)"); ax.set_ylabel("resposta relativa")
    ax.legend(loc="upper right", fontsize=7.8, framealpha=0.95, ncol=1)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "espectro.png")


# ---------------------------------------------------------------- 4: MTreg
def faixas_mtreg():
    fig, ax = plt.subplots(figsize=(9.4, 3.3))
    dados = [(254, "MTreg 254\n(mais sensível)"), (69, "MTreg 69\n(de fábrica)"), (32, "MTreg 32\n(sketches 08b e 08c)"), (31, "MTreg 31\n(mínimo)")]
    for i, (m, nome) in enumerate(dados):
        mx = 65535 / 1.2 * 69 / m; passo = 1 / 1.2 * 69 / m; t = 120 * m / 69
        cor = "#deeaf6" if m == 69 else ("#fbe6d4" if m < 69 else "#e8f5e9")
        ax.barh(i, mx, color=cor, edgecolor=AZUL if m == 69 else (LARANJA if m < 69 else VERDE), height=0.62)
        ax.text(mx + 1500, i, f"até {milhar(mx)} lx · passo de {br(passo, 2)} lx · medida em {t:.0f} ms", va="center", fontsize=8.3)
    ax.set_yticks(range(len(dados))); ax.set_yticklabels([n for _, n in dados], fontsize=8.3)
    ax.axvline(100000, color=VERM, ls="--", lw=1.3)
    ax.text(101500, 3.95, "sol pleno: cerca de 100.000 lx", color=VERM, fontsize=8, va="center")
    ax.set_xlim(0, 215000); ax.set_ylim(-0.5, 4.25)
    ax.set_xlabel("iluminância máxima no modo de alta resolução (lux)")
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: milhar(v)))
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "faixas_mtreg.png")


# ---------------------------------------------------------------- 5: barramento I2C
def barramento_i2c():
    fig, ax = plt.subplots(figsize=(9.4, 3.6))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.4); ax.axis("off")
    caixa(ax, 0.3, 1.6, 2.4, 2.4, "ESP32\n(quem pergunta)\n\nGPIO 21 = SDA\nGPIO 22 = SCL", fs=8.5, negrito=False)
    fio(ax, [(2.7, 3.4), (13.4, 3.4)], cor="#1f77b4", lw=2.6)
    fio(ax, [(2.7, 2.2), (13.4, 2.2)], cor=VERDE, lw=2.6)
    ax.text(13.4, 3.58, "SDA (dados)", va="center", ha="right", fontsize=8.5, color="#1f77b4"); ax.text(13.4, 1.98, "SCL (relógio)", va="center", ha="right", fontsize=8.5, color=VERDE)
    mods = [(4.3, "BH1750\n0x23", "#fff4cc", AMARELO, "luz (este tutorial)\nADDR no 3V3: 0x5C"),
            (7.2, "ADS1115\n0x48", "#deeaf6", AZUL, "conversor A/D\n(nó horta/no1)"),
            (10.1, "DS3231\n0x68", "#e8f5e9", VERDE, "relógio\n(nó horta/no1)")]
    for x, nome, cor, borda, nota in mods:
        caixa(ax, x, 4.1, 1.9, 0.95, nome, cor=cor, borda=borda, fs=9, negrito=True)
        fio(ax, [(x + 0.6, 4.1), (x + 0.6, 3.4)], cor="#1f77b4", lw=2); ax.plot([x + 0.6], [3.4], "o", color="#1f77b4", ms=5)
        fio(ax, [(x + 1.3, 4.1), (x + 1.3, 2.2)], cor=VERDE, lw=2); ax.plot([x + 1.3], [2.2], "o", color=VERDE, ms=5)
        ax.text(x + 0.95, 1.15, nota, ha="center", va="center", fontsize=8, color=CINZA)
    ax.text(7.0, 0.3, "Cada módulo só responde quando o ESP32 chama o endereço dele. Dois módulos com o mesmo endereço não podem dividir os fios.",
            ha="center", fontsize=8.3, color="black")
    salvar(fig, "barramento_i2c.png")


# ---------------------------------------------------------------- 6: lux -> PPFD -> DLI
def lux_ppfd_dli():
    fig, ax = plt.subplots(figsize=(9.4, 3.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.2); ax.axis("off")
    caixa(ax, 0.2, 2.9, 3.0, 1.5, "LUX\no que o BH1750 mede\nluz para o olho humano", cor="#fff4cc", borda=AMARELO, fs=8.8)
    caixa(ax, 5.3, 2.9, 3.4, 1.5, "PPFD (µmol/m²/s)\nfótons úteis à planta\nque chegam por segundo", cor="#e8f5e9", borda=VERDE, fs=8.8)
    caixa(ax, 10.8, 2.9, 3.0, 1.5, "DLI (mol/m²/dia)\nfótons úteis somados\nno dia inteiro", cor="#deeaf6", borda=AZUL, fs=8.8)
    seta(ax, (3.3, 3.65), (5.2, 3.65), lw=2); seta(ax, (8.8, 3.65), (10.7, 3.65), lw=2)
    ax.text(4.25, 4.15, "÷ fator da fonte", ha="center", fontsize=7.8, color=LARANJA, fontweight="bold")
    ax.text(4.25, 3.0, "sol: 54\nLED branco: 67\n(lux por µmol)", ha="center", va="top", fontsize=8, color=LARANJA)
    ax.text(9.75, 4.15, "× tempo", ha="center", fontsize=8.5, color=LARANJA, fontweight="bold")
    ax.text(9.75, 3.0, "× segundos\n÷ 1.000.000", ha="center", va="top", fontsize=8, color=LARANJA)
    ax.text(1.7, 2.3, "como um velocímetro\nde luz visível", ha="center", fontsize=8, color=CINZA)
    ax.text(7.0, 2.3, "a intensidade da “chuva”\nde fótons, agora", ha="center", fontsize=8, color=CINZA)
    ax.text(12.3, 2.3, "o pluviômetro: quanto\n“choveu” de luz no dia", ha="center", fontsize=8, color=CINZA)
    ax.add_patch(FancyBboxPatch((0.15, 0.2), 13.7, 1.3, boxstyle="round,pad=0.02,rounding_size=0.08", fc="#f6f6f6", ec=CINZA, lw=1))
    ax.text(7.0, 0.85, "Exemplo, sob LED branco: 13.900 lx ÷ 67 = 208 µmol/m²/s.   Ligado 16 h: 208 × 16 × 3600 ÷ 1.000.000 = 12,0 mol/m²/dia.\n"
            "Exemplo, ao sol: média de 30.000 lx nas 12 h de luz ÷ 54 = 555 µmol/m²/s;  555 × 12 × 3600 ÷ 1.000.000 = 24,0 mol/m²/dia.",
            ha="center", va="center", fontsize=7.9)
    salvar(fig, "lux_ppfd_dli.png")


# ---------------------------------------------------------------- 7: curva de um dia
def dia_luz():
    t = np.linspace(0, 24, 1441)
    nasc, dur = 5.4, 12.3
    sol = np.where((t > nasc) & (t < nasc + dur), 100000 * np.clip(np.sin(np.pi * (t - nasc) / dur), 0, 1) ** 1.2, 0)
    rng = np.random.default_rng(7)
    nuvens = np.clip(0.32 + 0.10 * np.sin(t * 2.1) + 0.06 * np.sin(t * 7.3 + 1), 0.15, 0.6)
    nublado = sol * nuvens
    tela = sol * 0.5
    led = np.where((t >= 5) & (t < 21), 13900.0, 0)
    dli = lambda lux, fator: np.trapezoid(lux / fator, t * 3600) / 1e6
    fig, ax = plt.subplots(figsize=(9.4, 4.0))
    ax.plot(t, sol / 1000, color=AMARELO, lw=2.2, label=f"céu limpo, ao ar livre — {br(dli(sol, 54))} mol/m²/dia")
    ax.plot(t, tela / 1000, color=LARANJA, lw=2.0, label=f"o mesmo dia sob tela de 50 % — {br(dli(tela, 54))} mol/m²/dia")
    ax.plot(t, nublado / 1000, color=CINZA, lw=1.6, label=f"dia nublado, ao ar livre — {br(dli(nublado, 54))} mol/m²/dia")
    ax.plot(t, led / 1000, color="#8e44ad", lw=2.0, ls="--", label=f"LED branco de 13.900 lx por 16 h — {br(dli(led, 67))} mol/m²/dia")
    ax.axhline(54.612, color=AZUL, ls=":", lw=1.2)
    ax.text(0.3, 56.5, "fim da faixa de fábrica do sensor (54.612 lx): acima disso, a faixa estendida", fontsize=7.8, color=AZUL)
    ax.set_xlim(0, 24); ax.set_ylim(0, 108); ax.set_xticks(range(0, 25, 3))
    ax.set_xlabel("hora do dia"); ax.set_ylabel("iluminância (mil lux)")
    ax.legend(loc="upper right", fontsize=7.8, framealpha=0.95)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "dia_luz.png")


# ---------------------------------------------------------------- 8: DLI no Cabo, mes a mes
GLOBAL_MJ = [21.04, 21.24, 20.70, 18.85, 16.34, 14.73, 15.53, 16.71, 19.87, 21.28, 22.87, 22.05]   # NASA POWER, 8,29 S 35,03 O


def dli_cabo():
    meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    fora = np.array(GLOBAL_MJ) * 2.04
    fig, ax = plt.subplots(figsize=(9.4, 3.8))
    x = np.arange(12)
    ax.axhspan(12, 17, color="#e8f5e9", zorder=0)
    ax.text(11.45, 14.5, "meta da alface:\n12 a 17", fontsize=8, color=VERDE, va="center", ha="right")
    ax.plot(x, fora, "o-", color=AMARELO, lw=2.2, label="ao ar livre (estimativa regional)")
    ax.plot(x, fora * 0.65, "s-", color=LARANJA, lw=1.8, label="sob tela de 35 % de sombra real")
    ax.plot(x, fora * 0.5, "^-", color=CINZA, lw=1.8, label="sob tela de 50 % de sombra real")
    for i, v in enumerate(fora):
        ax.text(i, v + 1.6, f"{v:.0f}", ha="center", fontsize=7.8, color="#8a6d00")
    ax.set_xticks(x); ax.set_xticklabels(meses); ax.set_ylim(0, 56); ax.set_xlim(-0.5, 11.5)
    ax.set_ylabel("luz diária, DLI (mol/m²/dia)")
    ax.legend(loc="lower left", fontsize=7.8, framealpha=0.95, ncol=3)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "dli_cabo.png")


# ---------------------------------------------------------------- 9: faixas de DLI
def faixas_dli():
    itens = [("Paz, Fisher e Gómez (2019): mínimo em cultivo doméstico", 6.5, 9.7, CINZA),
             ("Kelly e colaboradores (2020): faixa ensaiada, mais luz = mais massa", 6.9, 15.6, AZUL),
             ("Cornell: máximo sem ventilação sobre as plantas", 11.6, 12.4, LARANJA),
             ("Virginia Tech (2025): alface", 12, 17, VERDE),
             ("Cornell: alvo com ventilador soprando de cima", 16.6, 17.4, VERDE),
             ("Both e colaboradores (1997): faixa do modelo de crescimento", 8, 22, AZUL)]
    fig, ax = plt.subplots(figsize=(9.4, 3.6))
    ax.axvspan(12, 17, color="#e8f5e9", zorder=0)
    for i, (nome, a, b, cor) in enumerate(itens):
        ax.barh(i, b - a, left=a, color=cor, height=0.5, alpha=0.85)
        ax.text(b + 0.4, i, nome, va="center", fontsize=8.2)
    ax.axvline(30, color=AMARELO, lw=1.3, ls="--")
    ax.text(30.5, 2.5, "ao ar livre no Cabo:\n30 a 47 (estimativa)", fontsize=7.8, color="#8a6d00", va="center")
    ax.set_yticks([]); ax.set_xlim(0, 48); ax.set_ylim(-0.6, 5.7); ax.invert_yaxis()
    ax.set_xlabel("luz diária, DLI (mol de fótons por m² por dia)")
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "faixas_dli.png")


# ---------------------------------------------------------------- 10: decisao
def decisao_luz():
    fig, ax = plt.subplots(figsize=(9.4, 4.2))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.4); ax.axis("off")
    caixa(ax, 4.6, 5.3, 4.8, 0.85, "DLI do dia, medido na altura das folhas", cor="#fff4cc", borda=AMARELO, fs=9.5, negrito=True)
    cols = [(0.3, "abaixo de 12", "#dde9f6", AZUL,
             "POUCA LUZ\n\nsinais: planta comprida e\nfina (estiolada), folhas claras,\ncrescimento lento\n\n• mais horas de painel\n• painel mais perto das folhas\n• limpar a cobertura\n• tirar ou trocar a tela"),
            (4.9, "12 a 17", "#e8f5e9", VERDE,
             "NA META\n\nmanter e registrar\n\ncom ar parado e úmido,\nficar perto de 12;\ncom ventilador sobre as\nplantas, pode ir a 17"),
            (9.5, "acima de 17", "#fbe6d4", LARANJA,
             "MUITA LUZ\n\nsinais: bordas das folhas\nnovas queimadas (tipburn),\nmurcha nas horas quentes\n\n• tela de sombreamento\n• menos horas de painel\n• ventilar as plantas\n• olhar a temperatura")]
    for x, rot, cor, borda, texto in cols:
        seta(ax, (7.0, 5.3), (x + 2.1, 4.75), cor=borda, lw=1.6)
        ax.text(x + 2.1, 4.52, rot + " mol/m²/dia", ha="center", fontsize=8.8, color=borda, fontweight="bold")
        ax.add_patch(FancyBboxPatch((x, 0.2), 4.2, 4.1, boxstyle="round,pad=0.02,rounding_size=0.1", fc=cor, ec=borda, lw=1.4))
        ax.text(x + 2.1, 2.25, texto, ha="center", va="center", fontsize=8.4)
    salvar(fig, "decisao_luz.png")


# ---------------------------------------------------------------- 11: conferencia com luximetro
def conferencia():
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.4, 3.9))
    ref = np.array([120, 480, 950, 5200, 11800, 23500])          # luximetro (valores de exemplo)
    lido = ref / 1.08 * np.array([1.01, 0.99, 1.0, 1.005, 0.995, 1.0])
    x = np.array([50, 40000])
    a.fill_between(x, x * 0.8, x * 1.2, color="#f3f3f3", label="tolerância do fabricante: ±20 %")
    a.plot(x, x, color=CINZA, ls="--", lw=1, label="sensor = luxímetro")
    a.plot(ref, lido, "o", color=AZUL, ms=6, label="leituras (exemplo)")
    a.plot(x, x / 1.08, color=LARANJA, lw=1.4, label="reta ajustada: fator = 1,08")
    a.set_xscale("log"); a.set_yscale("log"); a.set_xlim(80, 35000); a.set_ylim(80, 35000)
    a.set_xlabel("luxímetro de referência (lx)"); a.set_ylabel("BH1750 sem correção (lx)")
    a.legend(fontsize=7.4, loc="upper left"); a.set_title("antes: o sensor lê 8 % a menos", fontsize=9.5)
    erro = (lido * 1.08 - ref) / ref * 100
    b.axhspan(-5, 5, color="#e8f5e9"); b.axhline(0, color=CINZA, lw=1)
    b.plot(ref, erro, "o-", color=VERDE, ms=6)
    b.set_xscale("log"); b.set_ylim(-12, 12); b.set_xlabel("luxímetro de referência (lx)"); b.set_ylabel("erro depois da correção (%)")
    b.set_title("depois: leitura × 1,08", fontsize=9.5)
    b.text(100, 6.2, "faixa de ±5 %", fontsize=8, color=VERDE)
    for ax in (a, b):
        ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: milhar(v)))
        for s in ("top", "right"): ax.spines[s].set_visible(False)
    a.yaxis.set_major_formatter(FuncFormatter(lambda v, _: milhar(v)))
    fig.tight_layout(); salvar(fig, "conferencia.png")


# ---------------------------------------------------------------- 12: cosseno
def cosseno():
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.4, 3.5), gridspec_kw=dict(width_ratios=[1, 1.25]))
    a.set_xlim(0, 6); a.set_ylim(0, 4.2); a.axis("off")
    a.add_patch(Rectangle((1.6, 0.6), 2.8, 0.18, fc=AZUL, ec="black"))
    a.text(3.0, 0.3, "sensor nivelado", ha="center", fontsize=8.5, color=AZUL)
    fio(a, [(3.0, 0.78), (3.0, 3.9)], cor=CINZA, lw=1, ls="--")
    for ang, cor in [(0, AMARELO), (60, LARANJA)]:
        r = np.radians(ang)
        for dx in (-0.5, 0, 0.5):
            x1 = 3.0 + dx * np.cos(r) if ang else 3.0 + dx
            p0 = (x1 + 3.0 * np.sin(r), 0.78 + 3.0 * np.cos(r)); p1 = (x1, 0.82)
            seta(a, p0, p1, cor=cor, lw=1.3)
    a.text(2.2, 3.95, "luz de cima:\n100 %", ha="center", fontsize=8.3, color="#8a6d00")
    a.text(5.2, 2.9, "luz a 60°:\na mesma luz\nse espalha\n→ 50 %", ha="center", fontsize=8.3, color=LARANJA)
    ang = np.linspace(0, 89, 200)
    b.plot(ang, np.cos(np.radians(ang)) * 100, color=AZUL, lw=2.2)
    for x in (30, 45, 60, 75):
        y = np.cos(np.radians(x)) * 100
        b.plot([x], [y], "o", color=LARANJA); b.text(x + 2, y + 3, f"{x}°: {y:.0f} %", fontsize=8.2)
    b.set_xlabel("ângulo entre a luz e a vertical do sensor"); b.set_ylabel("leitura (% da luz de frente)")
    b.set_xlim(0, 90); b.set_ylim(0, 108); b.set_xticks(range(0, 91, 15))
    b.set_title("lei do cosseno (sensor ideal)", fontsize=9.5)
    for s in ("top", "right"): b.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "cosseno.png")


if __name__ == "__main__":
    bancada_luz(); escala_lux(); espectro(); faixas_mtreg(); barramento_i2c(); lux_ppfd_dli()
    dia_luz(); dli_cabo(); faixas_dli(); decisao_luz(); conferencia(); cosseno()
