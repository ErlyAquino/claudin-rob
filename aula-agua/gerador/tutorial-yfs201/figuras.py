"""Diagramas proprios do tutorial do sensor de vazao YF-S201 (matplotlib; nada copiado da web).
  corte_sensor.png     o sensor por dentro: turbina com ima, sensor Hall, placa e os tres fios
  pulsos.png           o trem de pulsos em duas vazoes e a conta frequencia -> L/min
  curva_folha.png      a tabela da folha de dados comparada com as formulas F = 7,5 Q e F = 7 Q
  janela.png           o tamanho do "degrau" da leitura conforme o tempo de contagem (1 s e 10 s)
  faixa_sensor.png     a faixa do sensor (1 a 30 L/min) contra a vazao de um canal e a da linha principal
  vazoes_fontes.png    vazao recomendada por canal em cada fonte
  estudos_vazao.png    producao relativa da alface conforme a vazao, em quatro experimentos brasileiros
  bancada_vazao.png    a bancada NFT e os lugares possiveis para o sensor
  divisor.png          o divisor 1 k / 2 k e a conferencia com o multimetro
  calibracao_balde.png o metodo do balde e a reta pulsos x litros (valores de exemplo)
  alerta.png           o ciclo da bomba, a vazao e a regra do alerta de "sem vazao"
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-yfs201/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon, Wedge
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


# tabela da folha de dados (Sea, modelo YF-S201): vazao em L/min -> frequencia em Hz
FOLHA_Q = np.array([2, 4, 6, 8, 10, 12.0])
FOLHA_F = np.array([16, 32.5, 49.3, 65.5, 82, 90.2])


# ---------------------------------------------------------------- 1: o sensor por dentro
def corte_sensor():
    fig, ax = plt.subplots(figsize=(9.4, 4.4))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off"); ax.set_aspect("equal")
    # tubo de entrada e de saida, com agua
    for x0, x1 in ((0.6, 4.2), (7.8, 11.4)):
        ax.add_patch(Rectangle((x0, 2.2), x1 - x0, 1.4, fc="#cfe8f7", ec="none", zorder=1))
        ax.plot([x0, x1], [3.6, 3.6], color="#333", lw=3, zorder=2); ax.plot([x0, x1], [2.2, 2.2], color="#333", lw=3, zorder=2)
    for x in np.arange(0.8, 2.4, 0.22):
        ax.plot([x, x], [3.62, 3.82], color="#777", lw=1.6); ax.plot([x, x], [1.98, 2.18], color="#777", lw=1.6)
    for x in np.arange(9.7, 11.3, 0.22):
        ax.plot([x, x], [3.62, 3.82], color="#777", lw=1.6); ax.plot([x, x], [1.98, 2.18], color="#777", lw=1.6)
    ax.text(1.5, 4.0, "rosca de 1/2\"", ha="center", fontsize=8, color=CINZA)
    # camara da turbina
    ax.add_patch(Circle((6.0, 2.9), 2.0, fc="#cfe8f7", ec="#333", lw=3, zorder=2))
    for a in range(0, 360, 60):
        r = np.radians(a + 15)
        ax.add_patch(Polygon([(6.0 + 0.3 * np.cos(r - 0.5), 2.9 + 0.3 * np.sin(r - 0.5)),
                              (6.0 + 1.65 * np.cos(r + 0.25), 2.9 + 1.65 * np.sin(r + 0.25)),
                              (6.0 + 1.65 * np.cos(r + 0.42), 2.9 + 1.65 * np.sin(r + 0.42)),
                              (6.0 + 0.3 * np.cos(r + 0.5), 2.9 + 0.3 * np.sin(r + 0.5))], fc="#f4f4f4", ec="#555", lw=1.2, zorder=3))
    ax.add_patch(Circle((6.0, 2.9), 0.36, fc="#888", ec="#333", lw=1.2, zorder=4))
    # ima numa das pas (perto do topo)
    ax.add_patch(Rectangle((5.72, 4.2), 0.56, 0.3, fc=VERM, ec="black", lw=1, zorder=5))
    ax.text(6.0, 4.35, "N S", ha="center", va="center", fontsize=6.5, color="white", zorder=6, fontweight="bold")
    seta(ax, (7.45, 4.25), (7.0, 4.75), cor=AZUL, rad=0.35, lw=1.8)
    ax.text(7.7, 4.78, "a água gira a turbina", fontsize=7.5, color=AZUL, ha="left", va="center")
    # setas da agua
    for y in (2.6, 3.2):
        seta(ax, (0.9, y), (3.6, y), cor=AGUA, lw=2.2); seta(ax, (8.4, y), (11.1, y), cor=AGUA, lw=2.2)
    ax.text(2.6, 1.6, "entrada", ha="center", fontsize=8.5, color=AZUL); ax.text(9.8, 1.6, "saída", ha="center", fontsize=8.5, color=AZUL)
    # compartimento seco: parede, sensor Hall e placa
    ax.add_patch(Rectangle((4.6, 5.0), 2.8, 1.25, fc="#f1f1f1", ec="#333", lw=2, zorder=3))
    ax.add_patch(Rectangle((4.9, 5.55), 2.2, 0.16, fc="#2e7d32", ec="#1b4d1e", zorder=4))
    ax.add_patch(Rectangle((5.78, 5.12), 0.44, 0.42, fc="#111", ec="black", zorder=5))
    ax.text(4.5, 5.33, "sensor Hall", ha="right", va="center", fontsize=8.5, color="black")
    seta(ax, (4.55, 5.33), (5.74, 5.33), cor=CINZA, lw=1)
    ax.text(4.5, 5.95, "compartimento seco,\nseparado da água", ha="right", va="center", fontsize=7.5, color=CINZA)
    ax.text(4.5, 4.45, "ímã preso à turbina", ha="right", va="center", fontsize=8.5)
    seta(ax, (4.55, 4.45), (5.68, 4.38), cor=CINZA, lw=1)
    # fios
    for i, (cor, nome) in enumerate(((VERM, "vermelho: + 5 V"), ("#e0b000", "amarelo: pulsos"), ("#111", "preto: GND"))):
        y = 6.05 - 0.28 * i
        fio(ax, [(7.1, 5.72), (7.7, y), (9.3, y)], cor=cor, lw=2.6, z=4)
        ax.text(9.45, y, nome, va="center", fontsize=8, color="black")
    # explicacao
    caixa(ax, 11.6, 0.35, 2.3, 5.4, "A cada volta, o ímã\npassa na frente do\nsensor Hall.\n\nO sensor percebe o\ncampo magnético e\nmuda a saída:\num pulso por volta\ndo ímã.\n\nMais água,\nmais voltas,\nmais pulsos\npor segundo.", cor="#fffde7", borda="#bfa500", fs=7.8)
    ax.text(6.0, 0.45, "Desenho esquemático, fora de escala: mostra a ideia, não as medidas da peça.",
            ha="center", fontsize=7.5, color=CINZA)
    salvar(fig, "corte_sensor.png")


# ---------------------------------------------------------------- 2: trem de pulsos
def pulsos():
    fig, eixos = plt.subplots(2, 1, figsize=(8.8, 4.2), sharex=True)
    for ax, q, cor in zip(eixos, (2.0, 8.0), (AZUL, LARANJA)):
        f = 7.5 * q
        t = np.linspace(0, 0.5, 4000)
        v = np.where((t * f) % 1 < 0.5, 5.0, 0.0)
        ax.plot(t * 1000, v, color=cor, lw=1.8)
        ax.set_ylim(-0.8, 6.6); ax.set_yticks([0, 5]); ax.set_ylabel("saída (V)", fontsize=8.5)
        ax.text(497, 5.75, f"{br(q, 0)} L/min  →  {br(f, 0)} pulsos por segundo ({br(f, 0)} Hz)", ha="right", fontsize=9, color=cor, fontweight="bold")
        T = 1000 / f
        ax.annotate("", xy=(T, -0.45), xytext=(2 * T, -0.45), arrowprops=dict(arrowstyle="<->", color=CINZA, lw=1))
        ax.text(1.5 * T, -0.38, f"{br(T, 0)} ms", ha="center", va="bottom", fontsize=7.5, color=CINZA,
                bbox=dict(fc="white", ec="none", pad=0.5))
        ax.grid(alpha=0.25); ax.tick_params(labelsize=8)
        for s in ("top", "right"): ax.spines[s].set_visible(False)
    eixos[1].set_xlabel("tempo (milissegundos)", fontsize=9)
    eixos[0].set_title("O sinal do fio amarelo: uma onda quadrada cuja frequência acompanha a vazão", fontsize=10, color=AZUL)
    fig.tight_layout()
    salvar(fig, "pulsos.png")


# ---------------------------------------------------------------- 3: folha de dados x formulas
def curva_folha():
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.4, 3.9))
    q = np.linspace(0, 13, 50)
    a.plot(q, 7.5 * q, color=AZUL, lw=2, label="F = 7,5 × Q  (450 pulsos/L)")
    a.plot(q, 7.0 * q, color=CINZA, lw=1.4, ls="--", label="F = 7 × Q  (420 pulsos/L)")
    a.plot(FOLHA_Q, FOLHA_F, "o", color=LARANJA, ms=7, label="tabela da folha de dados", zorder=5)
    a.set_xlabel("vazão Q (L/min)", fontsize=9); a.set_ylabel("frequência F (Hz)", fontsize=9)
    a.set_xlim(0, 13); a.set_ylim(0, 105); a.grid(alpha=0.3); a.legend(fontsize=7.8, loc="upper left")
    a.set_title("Frequência × vazão", fontsize=10, color=AZUL)
    ppl = FOLHA_F * 60 / FOLHA_Q
    b.axhline(450, color=AZUL, lw=2); b.text(1.2, 452, "450 (F = 7,5 Q)", color=AZUL, fontsize=8, va="bottom", ha="left")
    b.axhline(420, color=CINZA, lw=1.4, ls="--"); b.text(12.8, 422, "420 (F = 7 Q)", color=CINZA, fontsize=8, va="bottom", ha="right")
    b.plot(FOLHA_Q, ppl, "o-", color=LARANJA, ms=7, lw=1.2)
    for x, y in zip(FOLHA_Q, ppl):
        b.text(x, y + 5, f"{y:.0f}", ha="center", fontsize=8, color=LARANJA)
    b.axvspan(0, 1, color="#fdecea"); b.text(1.15, 408, "abaixo de 1 L/min: fora da faixa", fontsize=7, color=VERM, ha="left", va="center")
    b.set_xlabel("vazão Q (L/min)", fontsize=9); b.set_ylabel("pulsos por litro", fontsize=9)
    b.set_xlim(0, 13); b.set_ylim(400, 510); b.grid(alpha=0.3)
    b.set_title("O mesmo, em pulsos por litro", fontsize=10, color=AZUL)
    for ax in (a, b): ax.tick_params(labelsize=8)
    fig.tight_layout()
    salvar(fig, "curva_folha.png")


# ---------------------------------------------------------------- 4: janela de contagem
def janela():
    fig, ax = plt.subplots(figsize=(8.6, 3.9))
    rng = np.random.default_rng(7)
    t = np.arange(0, 120)
    real = 1.6 + 0.05 * np.sin(t / 15)
    fase = rng.uniform(0, 1)
    acumulado = np.floor(np.cumsum(real * 450 / 60) + fase)
    por_seg = np.diff(np.concatenate([[0], acumulado]))
    q1 = por_seg * 60 / 450
    q10 = np.array([por_seg[max(0, i - 9):i + 1].sum() * 60 / (450 * min(i + 1, 10)) for i in range(len(t))])
    ax.step(t, q1, where="post", color="#9db7d0", lw=1.3, label="contando 1 s: cada pulso vale 0,13 L/min")
    ax.plot(t, q10, color=AZUL, lw=2.2, label="média de 10 s: cada pulso vale 0,013 L/min")
    ax.plot(t, real, color=LARANJA, lw=1.3, ls="--", label="vazão verdadeira (exemplo)")
    ax.set_xlabel("tempo (s)", fontsize=9); ax.set_ylabel("vazão (L/min)", fontsize=9)
    ax.set_ylim(1.2, 2.0); ax.grid(alpha=0.3); ax.legend(fontsize=8, loc="upper right"); ax.tick_params(labelsize=8)
    ax.yaxis.set_major_formatter(virgula)
    ax.set_title("Vazão baixa: poucos pulsos por segundo, leitura “em degraus”", fontsize=10, color=AZUL)
    fig.tight_layout()
    salvar(fig, "janela.png")


# ---------------------------------------------------------------- 5: faixa do sensor x bancada
def faixa_sensor():
    fig, ax = plt.subplots(figsize=(9.2, 3.5))
    ax.set_xscale("log"); ax.set_xlim(0.25, 40); ax.set_ylim(0, 5.2)
    ax.axvspan(0.25, 1, color="#fdecea", zorder=0); ax.axvspan(1, 2, color="#fff4e5", zorder=0); ax.axvspan(2, 30, color="#e8f5e9", zorder=0)
    ax.text(0.5, 4.85, "a turbina pode\nnem girar", ha="center", va="top", fontsize=7.8, color=VERM)
    ax.text(1.42, 4.85, "gira, mas a folha\nde dados não\ntem ponto aqui", ha="center", va="top", fontsize=7.4, color=LARANJA)
    ax.text(7.7, 4.85, "faixa em que a folha de dados traz medidas (2 a 12 L/min) e segue até 30", ha="center", va="top", fontsize=7.8, color=VERDE)
    barras = [(3.3, 0.5, 1.0, "um canal, mudas (0,5 a 1,0 L/min)", VERM),
              (2.6, 1.0, 2.0, "um canal, alface (1 a 2 L/min)", LARANJA),
              (1.9, 5.0, 10.0, "5 canais juntos (5 a 10 L/min)", VERDE),
              (1.2, 7.5, 15.0, "saída da bomba, com retorno de 50 % (7,5 a 15 L/min)", VERDE),
              (0.5, 1.0, 30.0, "YF-S201: 1 a 30 L/min", AZUL)]
    for y, x0, x1, nome, cor in barras:
        ax.barh(y, x1 - x0, left=x0, height=0.42, color=cor, zorder=3)
        if x1 < 3: ax.text(x1 * 1.08, y, nome, va="center", fontsize=8.3)
        elif x0 > 3: ax.text(x0 / 1.08, y, nome, va="center", ha="right", fontsize=8.3)
        else: ax.text(5.5, y, nome, va="center", ha="center", fontsize=8.3, color="white", fontweight="bold", zorder=4)
    ax.set_yticks([]); ax.set_xticks([0.3, 0.5, 1, 2, 5, 10, 20, 30]); ax.xaxis.set_major_formatter(virgula)
    ax.set_xlabel("vazão (L/min), em escala logarítmica", fontsize=9); ax.tick_params(labelsize=8)
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "faixa_sensor.png")


# ---------------------------------------------------------------- 6: recomendacoes por fonte
def vazoes_fontes():
    fig, ax = plt.subplots(figsize=(9.2, 3.9))
    fontes = [("Furlani e col. (2009): mudas", 0.5, 1.0, "#9db7d0"),
              ("Furlani e col. (2009): alface (ciclo curto)", 1.5, 2.0, AZUL),
              ("Embrapa, Circular 22 (2000): fase inicial", 0.5, 1.0, "#9db7d0"),
              ("Embrapa, Circular 22 (2000): fase final", 1.0, 2.0, AZUL),
              ("SENAR-PR (2016)", 1.5, 2.0, AZUL),
              ("Emater-PA, Manual 16 (clima quente e úmido)", 1.5, 2.0, LARANJA)]
    for i, (nome, a, b, cor) in enumerate(reversed(fontes)):
        ax.barh(i, b - a, left=a, height=0.55, color=cor, zorder=3)
        ax.text(b + 0.05, i, f"{br(a, 1)} a {br(b, 1)}", va="center", fontsize=8.5)
    ax.set_yticks(range(len(fontes))); ax.set_yticklabels([f[0] for f in reversed(fontes)], fontsize=8.5)
    ax.axvline(1.0, color=VERM, lw=1.3, ls="--", zorder=4)
    ax.text(0.98, len(fontes) - 0.42, "início da faixa\ndo YF-S201", color=VERM, fontsize=7.8, ha="right", va="top")
    ax.set_xlim(0, 2.6); ax.set_xlabel("vazão por canal (L/min)", fontsize=9); ax.xaxis.set_major_formatter(virgula)
    ax.grid(axis="x", alpha=0.3); ax.tick_params(axis="x", labelsize=8)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "vazoes_fontes.png")


# ---------------------------------------------------------------- 7: experimentos
def estudos_vazao():
    fig, ax = plt.subplots(figsize=(8.8, 4.1))
    estudos = [("Genuncio e col. (2012), Seropédica-RJ, ‘Lucy Brown’", [0.75, 1.0, 1.5], [100.6, 109.0, 121.2], AZUL, "o"),
               ("Santos e col. (2011), Cascavel-PR, ‘Vera’", [0.5, 1.0, 1.5], [272.16, 286.49, 351.09], LARANJA, "s"),
               ("Morais e col. (2025), Alegrete-RS, crespa", [0.5, 1.0, 1.5, 2.0, 2.5], [250.5, 282.75, 316, 338.5, 346.6], VERDE, "^")]
    for nome, q, m, cor, marca in estudos:
        m = np.array(m)
        ax.plot(q, 100 * m / m.max(), marker=marca, color=cor, lw=1.8, ms=7, label=nome)
    ax.axvspan(1.5, 2.0, color="#e3f2e4", zorder=0)
    ax.text(1.75, 62, "faixa mais\nrecomendada\n(1,5 a 2,0)", ha="center", fontsize=8, color=VERDE)
    ax.text(2.35, 60, "três estudos diferentes:\ncompare a forma das\ncurvas, não os números", ha="center", fontsize=7.5, color=CINZA)
    ax.set_xlabel("vazão por canal (L/min)", fontsize=9); ax.set_ylabel("massa fresca (% da maior do estudo)", fontsize=9)
    ax.set_xlim(0.3, 2.7); ax.set_ylim(55, 120); ax.set_yticks([60, 70, 80, 90, 100]); ax.grid(alpha=0.3); ax.legend(fontsize=7.8, loc="upper left")
    ax.xaxis.set_major_formatter(virgula); ax.tick_params(labelsize=8)
    ax.set_title("Menos vazão, menos alface: três experimentos em NFT", fontsize=10, color=AZUL)
    fig.tight_layout()
    salvar(fig, "estudos_vazao.png")


# ---------------------------------------------------------------- 8: a bancada e o lugar do sensor
def bancada_vazao():
    fig, ax = plt.subplots(figsize=(9.6, 5.0))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.4); ax.axis("off")
    # canais (5), inclinados
    for i in range(5):
        y0 = 6.5 - 0.55 * i
        ax.add_patch(Polygon([(4.6, y0), (11.4, y0 - 0.45), (11.4, y0 - 0.75), (4.6, y0 - 0.3)], fc="#f4f4f4", ec="#555", lw=1.2, zorder=2))
        for k in range(5):
            x = 5.3 + 1.3 * k
            ax.add_patch(Circle((x, y0 - 0.15 - 0.066 * (x - 4.6)), 0.13, fc=VERDE, ec="#1b4d1e", lw=0.8, zorder=3))
    ax.text(8.0, 6.95, "5 canais com 5 plantas (exemplo; a bancada tem 25 posições)", ha="center", fontsize=8.5, color=CINZA)
    # distribuidor a esquerda
    fio(ax, [(4.3, 6.6), (4.3, 4.0)], cor=AGUA, lw=5)
    for i in range(5):
        y0 = 6.42 - 0.55 * i
        fio(ax, [(4.3, y0), (4.7, y0 - 0.05)], cor=AGUA, lw=2.5)
    ax.text(4.12, 4.62, "distribuidor", ha="right", va="center", rotation=90, fontsize=7.5, color=AZUL)
    # coletor a direita e retorno
    fio(ax, [(11.55, 5.95), (11.55, 3.0), (9.6, 3.0), (9.6, 2.35)], cor=AGUA, lw=5)
    ax.text(11.75, 4.3, "coletor e\nretorno ao\nreservatório", fontsize=8, color=AZUL, va="center")
    # reservatorio
    ax.add_patch(Rectangle((5.6, 0.5), 5.2, 1.9, fc="white", ec="#333", lw=2, zorder=1))
    ax.add_patch(Rectangle((5.6, 0.5), 5.2, 1.4, fc="#cfe8f7", ec="none", zorder=1))
    ax.text(8.9, 1.15, "reservatório", ha="center", fontsize=9, color=AZUL)
    ax.add_patch(Rectangle((6.0, 0.6), 0.9, 0.6, fc="#555", ec="black", zorder=3)); ax.text(6.45, 0.9, "bomba", color="white", ha="center", va="center", fontsize=7, zorder=4)
    # linha principal: bomba -> filtro -> sensor -> distribuidor ; desvio de retorno
    fio(ax, [(6.45, 1.2), (6.45, 3.3), (1.4, 3.3), (1.4, 4.0), (4.3, 4.0)], cor=AGUA, lw=5)
    ax.add_patch(Rectangle((5.2, 3.08), 0.75, 0.44, fc="#fff4e5", ec=LARANJA, lw=1.5, zorder=4)); ax.text(5.575, 3.3, "filtro", ha="center", va="center", fontsize=7.5, zorder=5)
    # desvio (retorno) antes do sensor
    fio(ax, [(4.7, 3.3), (4.7, 2.6), (5.75, 2.6), (5.75, 2.35)], cor=AGUA, lw=3)
    ax.text(4.55, 2.75, "desvio de retorno\n(agita e areja)", ha="right", va="center", fontsize=7.5, color=CINZA)
    # sensor A na linha principal (trecho reto horizontal)
    ax.add_patch(Rectangle((2.3, 3.82), 1.1, 0.36, fc="#2f2f2f", ec="black", zorder=5)); ax.add_patch(Circle((2.85, 4.0), 0.3, fc="#3d3d3d", ec="black", zorder=6))
    seta(ax, (2.45, 4.45), (3.25, 4.45), cor=AZUL, lw=1.6)
    caixa(ax, 0.1, 4.85, 3.7, 0.95, "A  Linha principal, depois do desvio:\nmede o que vai para TODOS os canais\n(5 a 10 L/min: dentro da faixa)", cor="#e8f5e9", borda=VERDE, fs=7.6)
    seta(ax, (2.85, 4.83), (2.85, 4.35), cor=VERDE, lw=1.2)
    # sensor B na entrada de um canal
    ax.add_patch(Circle((4.5, 5.28), 0.16, fc="#3d3d3d", ec=VERM, lw=1.6, zorder=6))
    caixa(ax, 0.1, 6.2, 3.3, 0.95, "B  Num canal só (1 a 2 L/min):\nno limite de baixo do sensor;\nnão recomendado", cor="#fdecea", borda=VERM, fs=7.6)
    seta(ax, (3.42, 6.35), (4.38, 5.4), cor=VERM, lw=1.2)
    # sensor C na saida da bomba
    caixa(ax, 0.1, 0.9, 4.0, 0.95, "C  Antes do desvio: mede tudo o que\na bomba empurra, mas não diz\nquanto chega aos canais", cor="#fff4e5", borda=LARANJA, fs=7.6)
    seta(ax, (4.12, 1.6), (6.3, 2.75), cor=LARANJA, lw=1.2)
    ax.text(7.0, 0.12, "Desenho fora de escala. Trecho reto antes e depois do sensor; a seta do corpo no sentido da água; placa e ESP32 longe da água.",
            ha="center", fontsize=7.3, color=CINZA)
    salvar(fig, "bancada_vazao.png")


# ---------------------------------------------------------------- 9: divisor
def divisor():
    fig, ax = plt.subplots(figsize=(9.0, 3.6))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.6); ax.axis("off")
    caixa(ax, 0.3, 1.9, 2.4, 2.0, "YF-S201\nalimentado\nem 5 V", cor="#2f2f2f", borda="black", fs=9, negrito=True, cortexto="white")
    fio(ax, [(2.7, 2.9), (4.0, 2.9)], cor="#e0b000", lw=3)
    ax.text(3.35, 3.1, "amarelo", ha="center", fontsize=8)
    ax.text(3.35, 2.45, "pulsos de\n0 e 5 V", ha="center", va="top", fontsize=7.5, color=CINZA)
    ax.add_patch(Rectangle((4.0, 2.65), 1.6, 0.5, fc="#f3d9a4", ec="#7a5a1a", lw=1.4, zorder=3)); ax.text(4.8, 2.9, "1 kΩ", ha="center", va="center", fontsize=9, zorder=4)
    fio(ax, [(5.6, 2.9), (9.0, 2.9)], cor="#e0b000", lw=3)
    ax.add_patch(Circle((6.6, 2.9), 0.1, fc="black", zorder=5))
    fio(ax, [(6.6, 2.9), (6.6, 2.3)], cor="black", lw=2)
    ax.add_patch(Rectangle((6.35, 1.0), 0.5, 1.3, fc="#f3d9a4", ec="#7a5a1a", lw=1.4, zorder=3)); ax.text(7.0, 1.65, "2 kΩ", va="center", fontsize=9)
    fio(ax, [(6.6, 1.0), (6.6, 0.55)], cor="black", lw=2); fio(ax, [(6.25, 0.55), (6.95, 0.55)], cor="black", lw=2.5)
    ax.text(6.6, 0.2, "GND", ha="center", fontsize=8.5)
    caixa(ax, 9.0, 1.9, 2.3, 2.0, "ESP32\nGPIO 27\n(máx. 3,3 V)", cor="#deeaf6", borda=AZUL, fs=9, negrito=True)
    ax.text(7.8, 3.15, "0 e 3,3 V", ha="center", fontsize=8.5, color=VERDE, fontweight="bold")
    ax.text(5.6, 4.9, "tensão no GPIO  =  5 V  ×  2 k ÷ (1 k + 2 k)  =  3,3 V", ha="center", fontsize=10, color=AZUL, fontweight="bold")
    caixa(ax, 11.6, 0.3, 2.25, 5.0, "ANTES DE LIGAR\nAO ESP32:\n\nmultímetro entre\no ponto do meio\ne o GND.\n\nGire a turbina\ndevagar com um\nsopro: a leitura\nalterna entre\n0 V e cerca\nde 3,3 V.", cor="#fdecea", borda=VERM, fs=7.6)
    seta(ax, (11.58, 3.9), (6.72, 3.0), cor=VERM, lw=1, rad=0.25, ls="--")
    salvar(fig, "divisor.png")


# ---------------------------------------------------------------- 10: calibracao com o balde
def calibracao_balde():
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.6, 4.0), gridspec_kw=dict(width_ratios=[1, 1.15]))
    a.set_xlim(0, 7); a.set_ylim(0, 6); a.axis("off")
    fio(a, [(0.2, 4.6), (2.0, 4.6)], cor=AGUA, lw=6); fio(a, [(3.2, 4.6), (4.6, 4.6), (4.9, 4.2), (4.9, 3.5)], cor=AGUA, lw=6)
    a.add_patch(Rectangle((2.0, 4.35), 1.2, 0.5, fc="#2f2f2f", ec="black", zorder=5)); a.add_patch(Circle((2.6, 4.6), 0.38, fc="#3d3d3d", ec="black", zorder=6))
    a.text(2.6, 5.25, "sensor na posição\ndefinitiva", ha="center", fontsize=7.8)
    a.text(0.3, 4.95, "da bomba", fontsize=7.8, color=AZUL)
    a.add_patch(Polygon([(3.7, 3.4), (6.1, 3.4), (5.8, 0.6), (4.0, 0.6)], fc="white", ec="#333", lw=2))
    a.add_patch(Polygon([(3.83, 2.4), (5.97, 2.4), (5.8, 0.6), (4.0, 0.6)], fc="#cfe8f7", ec="none"))
    for y, t in ((1.2, "2 L"), (1.8, "4 L"), (2.4, "6 L"), (3.0, "8 L")):
        a.plot([3.9, 4.25], [y, y], color="#333", lw=1); a.text(4.3, y, t, fontsize=7, va="center")
    for y in (3.3, 3.0, 2.7): a.plot([4.9, 4.9], [y, y - 0.15], color=AGUA, lw=3)
    a.text(4.9, 0.25, "recipiente com volume conhecido", ha="center", fontsize=8)
    a.text(0.2, 3.0, "1. zerar a contagem\n2. encher até a marca\n3. anotar os pulsos\n4. pulsos ÷ litros", fontsize=8.5, va="top", color=AZUL)
    a.text(0.2, 1.2, "Exemplo:\n2 790 pulsos em 6,00 L\n= 465 pulsos por litro", fontsize=8.5, va="top", color=LARANJA, fontweight="bold")
    # reta: pulsos x litros em tres vazoes (exemplo)
    litros = np.array([6.0, 6.0, 6.0, 4.0, 4.0, 2.0]); vaz = ["8 L/min", "6 L/min", "4 L/min", "8 L/min", "4 L/min", "6 L/min"]
    ppl = np.array([462, 466, 471, 461, 472, 467.0]); pul = litros * ppl
    cores = {"8 L/min": AZUL, "6 L/min": VERDE, "4 L/min": LARANJA}
    x = np.linspace(0, 7, 10)
    b.plot(x, 450 * x, color=CINZA, lw=1.2, ls="--", label="folha de dados: 450 pulsos/L")
    b.plot(x, 466 * x, color="black", lw=1.4, label="reta deste sensor: 466 pulsos/L")
    for v in cores:
        m = np.array([vv == v for vv in vaz]); b.plot(litros[m], pul[m], "o", color=cores[v], ms=7, label=f"ensaios a {v}", zorder=5)
    b.set_xlabel("volume coletado (L)", fontsize=9); b.set_ylabel("pulsos contados", fontsize=9)
    b.set_xlim(0, 7); b.set_ylim(0, 3400); b.grid(alpha=0.3); b.legend(fontsize=7.6, loc="upper left"); b.tick_params(labelsize=8)
    b.set_title("Valores de exemplo, não medidos", fontsize=9, color=VERM)
    fig.tight_layout()
    salvar(fig, "calibracao_balde.png")


# ---------------------------------------------------------------- 11: alerta
def alerta():
    fig, (a, b) = plt.subplots(2, 1, figsize=(9.2, 3.9), sharex=True, gridspec_kw=dict(height_ratios=[1, 1.6]))
    t = np.arange(0, 150, 0.25)
    bomba = ((t // 15) % 2 == 0).astype(float)
    vaz = bomba * 7.4
    falha = t >= 60                         # a partir de 60 min a bomba liga, mas a agua nao passa
    vaz[falha] = 0
    a.fill_between(t, 0, bomba, step="post", color="#9db7d0"); a.set_yticks([0, 1]); a.set_yticklabels(["desligada", "ligada"], fontsize=8)
    a.set_ylim(-0.15, 1.3); a.set_title("Timer em 15 min ligada e 15 min desligada; alerta ajustado para 20 min", fontsize=10, color=AZUL)
    a.text(1, 1.1, "bomba (o que o timer manda)", fontsize=8, color=AZUL)
    b.plot(t, vaz, color=AZUL, lw=2); b.set_ylabel("vazão (L/min)", fontsize=9); b.set_ylim(-0.8, 10)
    b.axvline(60, color=VERM, lw=1.2, ls="--"); b.text(60.8, 8.6, "entupiu ou a bomba\nparou de puxar", fontsize=8, color=VERM, va="top")
    b.axvspan(65, 150, color="#fdecea", zorder=0)
    b.annotate("", xy=(45, 2.2), xytext=(65, 2.2), arrowprops=dict(arrowstyle="<->", color=CINZA, lw=1))
    b.text(55, 2.5, "20 min\nsem vazão", ha="center", fontsize=7.8, color=CINZA)
    b.text(107, 5.0, "ALERTA\n(página vermelha, LED piscando,\ncirculacao = 0 no painel)", ha="center", va="center", fontsize=9, color=VERM, fontweight="bold")
    b.annotate("", xy=(15, 1.2), xytext=(30, 1.2), arrowprops=dict(arrowstyle="<->", color=VERDE, lw=1))
    b.text(22.5, 1.5, "pausa normal:\n15 min", ha="center", fontsize=7.5, color=VERDE)
    b.set_xlabel("tempo (min)", fontsize=9); b.set_xlim(0, 150)
    for ax in (a, b):
        ax.tick_params(labelsize=8)
        for s in ("top", "right"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "alerta.png")


if __name__ == "__main__":
    corte_sensor(); pulsos(); curva_folha(); janela(); faixa_sensor(); vazoes_fontes(); estudos_vazao()
    bancada_vazao(); divisor(); calibracao_balde(); alerta()
