"""Diagramas proprios do tutorial do sensor de temperatura DS18B20 (matplotlib; nada copiado da web).
  bancada_temp.png     a bancada NFT e o lugar do DS18B20 no reservatorio
  pinagem.png          o TO-92 visto pela face plana e a sonda a prova d'agua, com as cores dos fios
  um_fio.png           o barramento de um fio: resistor de pull-up, varios sensores e quem puxa a linha
  sinais.png           os sinais no fio: reset e presenca, escrever 0 e 1, ler um bit
  endereco.png         os 64 bits do endereco (familia, numero de serie, CRC) e os 9 bytes da memoria
  resolucao.png        resolucao de 9 a 12 bits: passo e tempo de conversao
  sem_bloquear.png     pedir a conversao e ler depois: o loop() nao para
  faixa_temp.png       a temperatura da solucao e o que cada faixa significa para a alface
  oxigenio.png         oxigenio dissolvido na agua saturada x temperatura
  estudo_cometti.png   resfriar a solucao a 26 C: ganho de massa (Cometti e colab., 2013)
  compensacao.png      a temperatura dentro das outras medidas: condutividade (2 %/C) e pH (Nernst)
  banho_gelo.png       o banho de gelo e o ajuste do zero
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-ds18b20/figuras.py
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


def resistor(ax, x, y0, y1, cor=CINZA, rotulo=None):
    """resistor vertical em ziguezague entre (x, y0) e (x, y1)"""
    n = 6; ys = np.linspace(y0, y1, n * 2 + 1); xs = [x] + [x + (0.12 if i % 2 == 0 else -0.12) for i in range(n * 2 - 1)] + [x]
    ax.plot(xs, ys, color=cor, lw=1.8, zorder=4)
    if rotulo: ax.text(x + 0.25, (y0 + y1) / 2, rotulo, fontsize=8, va="center", color=cor)


# ---------------------------------------------------------------- 1: bancada
def bancada_temp():
    fig, ax = plt.subplots(figsize=(9.4, 4.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off")
    ax.add_patch(Polygon([(1.2, 5.3), (8.4, 4.8), (8.4, 4.5), (1.2, 5.0)], fc="#e8e8e8", ec=CINZA, lw=1.3, zorder=2))
    ax.add_patch(Polygon([(1.2, 5.06), (8.4, 4.56), (8.4, 4.5), (1.2, 5.0)], fc=AGUA, ec="none", zorder=3))
    for x in np.linspace(1.9, 7.8, 6):
        y = 5.3 - (x - 1.2) * 0.5 / 7.2
        ax.plot([x, x], [y, y + 0.3], color=VERDE, lw=2.5, zorder=4)
        ax.add_patch(Circle((x, y + 0.5), 0.3, fc="#66bb6a", ec=VERDE, zorder=4))
    ax.text(4.8, 6.25, "canais NFT com 25 posições de alface (vista de lado, fora de escala)", ha="center", fontsize=8.5, color=CINZA)
    ax.add_patch(Rectangle((7.2, 0.4), 6.4, 2.9, fc="white", ec=CINZA, lw=1.5, zorder=1))
    ax.add_patch(Rectangle((7.2, 0.4), 6.4, 2.2, fc="#cfe8f7", ec="none", zorder=1))
    ax.text(12.3, 0.6, "reservatório", ha="center", fontsize=8.5, color=CINZA)
    fio(ax, [(8.4, 4.65), (8.9, 4.65), (8.9, 2.7)], cor=AGUA, lw=4); ax.text(9.05, 3.9, "retorno", fontsize=8, color=AZUL)
    caixa(ax, 7.45, 0.55, 1.1, 0.6, "BOMBA", cor="#ffe0b2", borda=LARANJA, fs=7.5, negrito=True)
    fio(ax, [(8.0, 1.15), (8.0, 3.8), (0.7, 3.8), (0.7, 5.15), (1.2, 5.15)], cor=AGUA, lw=4)
    # DS18B20 (destaque), sonda de CE ao lado, pH longe
    ax.add_patch(Rectangle((10.9, 1.2), 0.16, 1.0, fc="#bdbdbd", ec="#555", zorder=5))
    fio(ax, [(10.98, 2.2), (10.98, 4.1)], cor="#111", lw=2.5, z=4)
    ax.add_patch(Rectangle((11.55, 1.5), 0.3, 2.6, fc="#1b1b1b", ec="black", zorder=4))
    ax.add_patch(Rectangle((12.85, 1.3), 0.22, 2.8, fc="#f5f5f5", ec="#555", zorder=4)); ax.add_patch(Circle((12.96, 1.3), 0.13, fc="#d6eaf8", ec="#555", zorder=5))
    ax.text(10.45, 4.5, "DS18B20\n(cápsula de inox)", ha="center", fontsize=8, color=AZUL, fontweight="bold")
    ax.text(11.85, 4.85, "sonda de\ncondutividade", ha="center", fontsize=8, color=CINZA)
    seta(ax, (11.8, 4.75), (11.7, 4.15), cor=CINZA, lw=1)
    ax.text(12.96, 4.3, "sonda\nde pH", ha="center", fontsize=8, color=CINZA)
    seta(ax, (9.0, 1.7), (10.85, 1.7), cor=LARANJA, estilo="<|-|>")
    ax.text(9.9, 1.55, "longe do retorno e\nda bomba; a meia\naltura da solução", ha="center", fontsize=7.5, color=LARANJA, va="top")
    caixa(ax, 2.0, 0.6, 3.6, 1.5, "caixa fechada, acima da água:\nESP32 e resistor de 4,7 kΩ\n(só a cápsula e o cabo descem)", cor="#deeaf6", fs=8.5)
    fio(ax, [(5.6, 1.6), (6.3, 1.6), (6.3, 4.2), (10.98, 4.2), (10.98, 4.1)], cor="#111", lw=1.5, ls="--", z=1)
    ax.text(4.0, 2.4, "Wi‑Fi → servidor da telemetria → painel", ha="center", fontsize=8, color=AZUL)
    ax.text(4.0, 3.0, "tampa e sombra no reservatório:\na solução não deve passar da\ntemperatura do ar", ha="center", fontsize=8, color=VERDE)
    salvar(fig, "bancada_temp.png")


# ---------------------------------------------------------------- 2: pinagem
def pinagem():
    fig, ax = plt.subplots(figsize=(9.4, 4.4))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.6); ax.axis("off")
    # TO-92 de frente
    ax.text(2.2, 6.0, "TO‑92 visto pela face plana\n(a que tem a inscrição)", ha="center", fontsize=9, fontweight="bold", color=AZUL)
    ax.add_patch(FancyBboxPatch((0.9, 3.6), 2.6, 1.6, boxstyle="round,pad=0.02,rounding_size=0.25", fc="#1b1b1b", ec="black", lw=1.5, zorder=3))
    ax.add_patch(Rectangle((0.88, 3.55), 2.64, 0.3, fc="#1b1b1b", ec="black", zorder=3))
    ax.text(2.2, 4.75, "DALLAS", color="#ddd", ha="center", fontsize=8, zorder=4)
    ax.text(2.2, 4.3, "18B20", color="white", ha="center", fontsize=11, fontweight="bold", zorder=4)
    for i, (x, nome, cor, lig) in enumerate([(1.3, "1 GND", "#222", "terra"), (2.2, "2 DQ", "#bf9000", "dados"), (3.1, "3 VDD", VERM, "3,0 a 5,5 V")]):
        ax.add_patch(Rectangle((x - 0.05, 1.7), 0.1, 1.85, fc="#bdbdbd", ec="#777", zorder=2))
        ax.text(x, 1.35, nome, ha="center", fontsize=8.5, fontweight="bold", color=cor)
        ax.text(x, 0.95, lig, ha="center", fontsize=7, color=CINZA)
    # TO-92 por baixo
    ax.text(5.3, 6.0, "visto por baixo\n(pelas pernas)", ha="center", fontsize=9, fontweight="bold", color=AZUL)
    ax.add_patch(Wedge((5.3, 4.1), 0.95, 0, 180, fc="#1b1b1b", ec="black", lw=1.5, zorder=3))
    ax.plot([4.35, 6.25], [4.1, 4.1], color="black", lw=2.5, zorder=4)
    for x, n in ((4.75, "1"), (5.3, "2"), (5.85, "3")):
        ax.add_patch(Circle((x, 4.4), 0.1, fc="#bdbdbd", ec="#777", zorder=5)); ax.text(x, 4.72, n, color="white", ha="center", fontsize=8, zorder=5)
    ax.text(5.3, 3.75, "face plana", ha="center", fontsize=8, color=CINZA)
    ax.text(5.3, 2.6, "Invertido (VDD e GND trocados),\no chip esquenta em segundos\ne pode queimar: confira antes\nde ligar a alimentação.", ha="center", fontsize=8, color=VERM)
    # sonda
    ax.text(10.6, 6.1, "sonda à prova d'água: o mesmo chip numa cápsula de inox", ha="center", fontsize=9, fontweight="bold", color=AZUL)
    ax.add_patch(FancyBboxPatch((7.4, 4.75), 2.2, 0.36, boxstyle="round,pad=0.01,rounding_size=0.15", fc="#d9d9d9", ec="#777", lw=1.3, zorder=3))
    ax.add_patch(Rectangle((9.55, 4.72), 0.55, 0.42, fc="#1b1b1b", ec="black", zorder=4))
    fio(ax, [(10.1, 4.93), (11.6, 4.93)], cor="#111", lw=5)
    ax.text(8.5, 5.3, "cápsula de aço inox,\n6 mm de diâmetro", ha="center", fontsize=7.5, color=CINZA)
    ax.text(10.9, 5.25, "cabo de cerca de 1 m", ha="center", fontsize=7.5, color=CINZA)
    for dy, cor in ((0.22, "#cc0000"), (0, "#f1c232"), (-0.22, "#222")):
        fio(ax, [(11.6, 4.93), (12.1, 4.93 + dy), (13.4, 4.93 + dy)], cor=cor, lw=3)
    ax.text(13.5, 5.15, "VDD", fontsize=8, va="center"); ax.text(13.5, 4.93, "dados", fontsize=8, va="center"); ax.text(13.5, 4.71, "GND", fontsize=8, va="center")
    # tabela de cores
    linhas = [("o mais comum (DFRobot, tipo A)", ["#cc0000", "#222222", "#f1c232"]),
              ("Adafruit: dados no branco", ["#cc0000", "#222222", "#ffffff"]),
              ("Adafruit: GND no azul", ["#cc0000", "#2e75b6", "#f1c232"]),
              ("DFRobot, tipo B: amarelo é GND!", ["#cc0000", "#f1c232", "#2e7d32"])]
    x0, y0 = 7.2, 3.75
    for j, cab in enumerate(["cabo", "VDD", "GND", "dados"]):
        ax.text(x0 + [1.5, 4.2, 5.15, 6.1][j], y0, cab, ha="center", fontsize=8, fontweight="bold", color=AZUL)
    for i, (nome, cores) in enumerate(linhas):
        y = y0 - 0.5 * (i + 1)
        ax.text(x0, y, nome, ha="left", va="center", fontsize=7.5)
        for j, c in enumerate(cores):
            ax.add_patch(Rectangle((x0 + 3.8 + j * 0.95, y - 0.12), 0.8, 0.24, fc=c, ec="#555", lw=0.8))
    ax.text(10.6, 0.95, "As cores não são padronizadas: vale a folha do vendedor. Sem ela,\ndescubra pelo teste da seção 9.2. Só o vermelho (VDD) se repete.", ha="center", fontsize=8, color=VERM)
    ax.plot([6.9, 6.9], [0.6, 6.5], color="#cccccc", lw=1)
    salvar(fig, "pinagem.png")


# ---------------------------------------------------------------- 3: barramento
def um_fio():
    fig, ax = plt.subplots(figsize=(9.4, 4.3))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.3); ax.axis("off")
    fio(ax, [(0.6, 5.6), (13.4, 5.6)], cor=LARANJA, lw=2.5); ax.text(0.6, 5.8, "3V3", fontsize=9, color=LARANJA, fontweight="bold")
    fio(ax, [(0.6, 0.6), (13.4, 0.6)], cor="#222", lw=2.5); ax.text(0.6, 0.25, "GND", fontsize=9, color="#222", fontweight="bold")
    fio(ax, [(2.3, 3.5), (13.0, 3.5)], cor=VERDE, lw=3); ax.text(4.9, 3.68, "fio de dados (DQ)", fontsize=8.5, color=VERDE, ha="center")
    fio(ax, [(3.6, 5.6), (3.6, 5.1)], cor=CINZA); resistor(ax, 3.6, 5.1, 4.1, cor=VERM, rotulo="4,7 kΩ\n(pull‑up)"); fio(ax, [(3.6, 4.1), (3.6, 3.5)], cor=CINZA)
    caixa(ax, 0.5, 2.6, 1.8, 1.8, "ESP32\nGPIO 4", cor="#deeaf6", fs=9, negrito=True)
    # chaves para o GND (dreno aberto)
    def chave(x, rot):
        fio(ax, [(x, 3.5), (x, 2.5)], cor=CINZA)
        fio(ax, [(x, 2.5), (x + 0.28, 1.95)], cor=CINZA, lw=2.2)
        ax.add_patch(Circle((x, 2.5), 0.06, fc=CINZA, ec="none", zorder=5)); ax.add_patch(Circle((x, 1.85), 0.06, fc=CINZA, ec="none", zorder=5))
        fio(ax, [(x, 1.85), (x, 0.6)], cor=CINZA)
        ax.text(x + 0.4, 2.2, rot, fontsize=7.5, color=CINZA, va="center")
    chave(2.9, "chave do\nESP32")
    for x, nome in ((6.2, "sensor 1\n28‑7A‑4C‑…‑00‑00‑A1"), (9.2, "sensor 2\n28‑19‑B2‑…‑00‑00‑5E"), (12.2, "sensor 3\n…")):
        caixa(ax, x - 1.1, 4.25, 2.2, 0.85, nome, cor="#e8f5e9", borda=VERDE, fs=7.5)
        fio(ax, [(x, 4.25), (x, 3.5)], cor=VERDE, lw=2)
        fio(ax, [(x + 0.6, 5.1), (x + 0.6, 5.6)], cor=LARANJA, lw=1.5)
        chave(x, "chave do\nsensor")
    ax.text(7.0, 6.65, "Ninguém empurra o fio para 3,3 V: cada um só sabe PUXAR para 0 V (fechar a chave) ou SOLTAR.\n"
            "Solto, quem leva o fio de volta a 3,3 V é o resistor. Sem ele, o fio fica boiando e a leitura é −127 °C.",
            ha="center", fontsize=8.5, color=AZUL, bbox=dict(fc="white", ec="none", pad=2), zorder=6)
    salvar(fig, "um_fio.png")


# ---------------------------------------------------------------- 4: sinais
def sinais():
    fig, axs = plt.subplots(1, 3, figsize=(9.4, 3.3), gridspec_kw=dict(width_ratios=[1.5, 1.2, 1]))

    def base(ax, titulo, tmax):
        ax.set_title(titulo, fontsize=9.5); ax.set_ylim(-0.75, 1.6); ax.set_xlim(-0.04 * tmax, tmax)
        ax.set_yticks([0, 1]); ax.set_yticklabels(["0 V", "3,3 V"], fontsize=8)
        ax.set_xlabel("tempo (µs)", fontsize=8); ax.tick_params(labelsize=8)
        for s in ("top", "right"): ax.spines[s].set_visible(False)

    def subida(t0, tau, t1):          # o resistor sobe o fio devagar (curva de carga)
        t = np.linspace(t0, t1, 40); return t, 1 - np.exp(-(t - t0) / tau)

    ax = axs[0]; base(ax, "1. Reset e presença", 1000)
    ax.plot([-40, 0, 0, 480], [1, 1, 0, 0], color=AZUL, lw=2.2)
    t, v = subida(480, 6, 510); ax.plot(t, v, color=CINZA, lw=2.2)
    ax.plot([510, 510, 620], [1, 0, 0], color=VERDE, lw=2.2)
    t, v = subida(620, 6, 1000); ax.plot(t, v, color=CINZA, lw=2.2)
    ax.text(240, -0.3, "ESP32 puxa o fio\npor 480 µs ou mais", ha="center", va="top", fontsize=7.5, color=AZUL)
    ax.text(700, -0.3, "o sensor responde:\npuxa de 60 a 240 µs", ha="center", va="top", fontsize=7.5, color=VERDE)
    ax.text(495, 1.25, "solta", ha="center", fontsize=7.5, color=CINZA)

    ax = axs[1]; base(ax, "2. Escrever um bit", 200)
    ax.plot([-8, 0, 0, 6], [1, 1, 0, 0], color=AZUL, lw=2.2); t, v = subida(6, 2, 70); ax.plot(t, v, color=AZUL, lw=2.2)
    ax.plot([70, 100, 100, 165], [1, 1, 0, 0], color=LARANJA, lw=2.2); t, v = subida(165, 2, 200); ax.plot(t, v, color=LARANJA, lw=2.2)
    ax.text(35, 1.25, "bit 1", ha="center", fontsize=8.5, color=AZUL, fontweight="bold")
    ax.text(35, -0.3, "pulso curto\n(1 a 15 µs)", ha="center", va="top", fontsize=7.5, color=AZUL)
    ax.text(133, 1.25, "bit 0", ha="center", fontsize=8.5, color=LARANJA, fontweight="bold")
    ax.text(133, -0.3, "pulso longo\n(60 a 120 µs)", ha="center", va="top", fontsize=7.5, color=LARANJA)

    ax = axs[2]; base(ax, "3. Ler um bit", 90)
    ax.plot([-3, 0, 0, 3], [1, 1, 0, 0], color=AZUL, lw=2.2)
    t, v = subida(3, 1.5, 90); ax.plot(t, v, color=AZUL, lw=1.6, ls="--")
    ax.plot([3, 45], [0, 0], color=VERDE, lw=2.2); t, v = subida(45, 2, 90); ax.plot(t, v, color=VERDE, lw=2.2)
    ax.axvline(13, color=VERM, lw=1.2, ls=":"); ax.text(15, 1.42, "o ESP32 olha\no fio aqui\n(antes de 15 µs)", fontsize=7, color=VERM, va="top")
    ax.text(50, -0.3, "sensor segura em 0: bit 0\nsensor solta (tracejado): bit 1", ha="center", va="top", fontsize=7.5, color=VERDE)
    fig.tight_layout()
    salvar(fig, "sinais.png")


# ---------------------------------------------------------------- 5: endereco e memoria
def endereco():
    fig, ax = plt.subplots(figsize=(9.4, 3.9))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.0); ax.axis("off")
    ax.text(0.3, 5.6, "O endereço (ROM de 64 bits = 8 bytes), gravado na fábrica e diferente em cada chip", fontsize=9.5, fontweight="bold", color=AZUL)
    ex = ["28", "7A", "4C", "1E", "0F", "00", "00", "A1"]
    cores = ["#fbe5d6"] + ["#deeaf6"] * 6 + ["#e8f5e9"]; bordas = [LARANJA] + [AZUL] * 6 + [VERDE]
    for i, (b, c, bd) in enumerate(zip(ex, cores, bordas)):
        caixa(ax, 0.5 + i * 1.3, 4.3, 1.2, 0.8, b, cor=c, borda=bd, fs=12, negrito=True)
    ax.text(1.1, 3.75, "FAMÍLIA\n28 = DS18B20", ha="center", va="top", fontsize=8, color=LARANJA)
    ax.text(5.65, 3.75, "NÚMERO DE SÉRIE (48 bits)\n281 trilhões de combinações: nunca se repete", ha="center", va="top", fontsize=8, color=AZUL)
    ax.text(10.2, 3.75, "CRC\nconfere os outros 7", ha="center", va="top", fontsize=8, color=VERDE)
    ax.text(11.4, 4.7, "exemplo inventado;\no programa 07 mostra\no do seu sensor", fontsize=8, color=CINZA, va="center")
    ax.text(0.3, 2.55, "A memória de trabalho (scratchpad, 9 bytes), lida a cada medida", fontsize=9.5, fontweight="bold", color=AZUL)
    nomes = ["temp.\n(baixo)", "temp.\n(alto)", "alarme\nTH", "alarme\nTL", "config.\n(resolução)", "reserv.", "reserv.", "reserv.", "CRC"]
    cs = ["#fff2cc", "#fff2cc", "#f2f2f2", "#f2f2f2", "#deeaf6", "#f2f2f2", "#f2f2f2", "#f2f2f2", "#e8f5e9"]
    for i, (n, c) in enumerate(zip(nomes, cs)):
        caixa(ax, 0.5 + i * 1.3, 1.2, 1.2, 0.9, n, cor=c, borda=CINZA, fs=7.5)
        ax.text(1.1 + i * 1.3, 0.95, f"byte {i}", ha="center", fontsize=7.5, color=CINZA)
    ax.text(12.3, 1.65, "temperatura =\nnúmero de 16 bits\n× 0,0625 °C", fontsize=8, color="#7f6000", va="center")
    ax.text(6.3, 0.35, "Exemplo: bytes 0 e 1 = 0x0191 = 401   →   401 × 0,0625 = 25,0625 °C.      Na partida, antes da 1ª conversão: 0x0550 = 85 °C.",
            ha="center", fontsize=8, color=CINZA)
    salvar(fig, "endereco.png")


# ---------------------------------------------------------------- 6: resolucao
def resolucao():
    bits = [9, 10, 11, 12]; passo = [0.5, 0.25, 0.125, 0.0625]; tempo = [93.75, 187.5, 375, 750]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.0, 3.3))
    b = a1.bar([f"{x} bits" for x in bits], passo, color=[CINZA, CINZA, CINZA, AZUL], width=0.6, zorder=3)
    for r, p in zip(b, passo): a1.text(r.get_x() + r.get_width() / 2, p + 0.012, br(p, 4).rstrip("0") + " °C", ha="center", fontsize=8.5)
    a1.set_ylabel("menor passo da leitura (°C)"); a1.set_ylim(0, 0.6); a1.yaxis.set_major_formatter(virgula); a1.grid(axis="y", alpha=0.25)
    a1.set_title("Resolução", fontsize=10)
    b = a2.bar([f"{x} bits" for x in bits], tempo, color=[CINZA, CINZA, CINZA, AZUL], width=0.6, zorder=3)
    for r, t in zip(b, tempo): a2.text(r.get_x() + r.get_width() / 2, t + 15, br(t, 2).rstrip("0").rstrip(",") + " ms", ha="center", fontsize=8.5)
    a2.set_ylabel("tempo máximo de conversão (ms)"); a2.set_ylim(0, 860); a2.grid(axis="y", alpha=0.25)
    a2.set_title("Tempo de cada medida", fontsize=10)
    fig.text(0.5, 0.01, "Cada bit a mais divide o passo por 2 e dobra o tempo. A exatidão continua a mesma: ±0,5 °C de −10 a +85 °C.", ha="center", fontsize=8.5, color=AZUL)
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    salvar(fig, "resolucao.png")


# ---------------------------------------------------------------- 7: sem bloquear
def sem_bloquear():
    fig, ax = plt.subplots(figsize=(9.2, 3.3))
    ax.set_xlim(-0.75, 4.4); ax.set_ylim(0, 4.4); ax.set_yticks([])
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    ax.set_xlabel("tempo (s)")
    # com delay
    ax.text(-0.7, 3.5, "esperando\nparado", fontsize=8.5, color=VERM, va="center", fontweight="bold")
    for t0 in (0, 2):
        ax.add_patch(Rectangle((t0, 3.15), 0.75, 0.7, fc="#fdecea", ec=VERM, lw=1.2)); ax.text(t0 + 0.375, 3.5, "preso 750 ms:\no celular espera", ha="center", va="center", fontsize=7.5, color=VERM)
        ax.add_patch(Rectangle((t0 + 0.75, 3.15), 1.25, 0.7, fc="#e3f2e4", ec=VERDE, lw=1.2)); ax.text(t0 + 1.375, 3.5, "atende o celular", ha="center", va="center", fontsize=7.5, color=VERDE)
    # sem bloquear
    ax.text(-0.7, 1.7, "sem bloquear\n(sketch 07b)", fontsize=8.5, color=VERDE, va="center", fontweight="bold")
    ax.add_patch(Rectangle((0, 1.35), 4.3, 0.7, fc="#e3f2e4", ec=VERDE, lw=1.2))
    ax.text(2.15, 1.7, "o loop() atende o celular o tempo todo", ha="center", va="center", fontsize=8, color=VERDE)
    for t0 in (0, 2):
        ax.plot([t0, t0], [1.35, 2.3], color=AZUL, lw=1.5); ax.text(t0 + 0.03, 2.4, "pede a\nconversão", fontsize=7.5, color=AZUL, va="bottom")
        ax.plot([t0 + 0.8, t0 + 0.8], [1.35, 2.3], color=LARANJA, lw=1.5); ax.text(t0 + 0.83, 2.4, "busca o\nresultado", fontsize=7.5, color=LARANJA, va="bottom")
        ax.add_patch(Rectangle((t0, 0.55), 0.75, 0.45, fc="#fff2cc", ec="#bfa500", lw=1)); ax.text(t0 + 0.375, 0.77, "chip convertendo", ha="center", va="center", fontsize=7)
    ax.text(-0.7, 0.77, "dentro\ndo sensor", fontsize=8, color=CINZA, va="center")
    fig.tight_layout()
    salvar(fig, "sem_bloquear.png")


# ---------------------------------------------------------------- 8: faixa de temperatura
def faixa_temp():
    fig, ax = plt.subplots(figsize=(9.4, 4.1))
    zonas = [(10, 15, "#bcd6ee", "indesejável\n(abaixo de 15 °C)"), (15, 20, "#dbe9f6", "fria: crescimento\nmais lento"),
             (20, 25, "#b9e0bb", "ADEQUADA\n20 a 25 °C"), (25, 30, "#fbe0c6", "atenção: menos oxigênio,\nmais Pythium"),
             (30, 36, "#f6c1bb", "indesejável\n(acima de 30 °C)")]
    for a, b, cor, rot in zonas:
        ax.add_patch(Rectangle((a, 0), b - a, 1, fc=cor, ec="white", lw=1.5))
        ax.text((a + b) / 2, 0.5, rot, ha="center", va="center", fontsize=8.5, fontweight="bold" if "ADEQ" in rot else "normal")
    marcas = [(20, 25, 1.45, AZUL, "Embrapa Hortaliças (2000): “adequada a faixa de 20 °C a 25 °C”; indesejável abaixo de 15 e acima de 30"),
              (24, 26, 2.05, AZUL, "Cornell (2013): 24 a 26 °C, “não mais que 25 °C” (sistema floating: aquece a 24, resfria a 26)"),
              (25, 36, 2.65, LARANJA, "Embrapa Hortaliças (2015): surtos severos de Pythium com a solução acima de 25 °C"),
              (24, 29.9, 3.25, VERM, "Cometti e colab. (2013): sem controle, a solução foi de 24,0 a 29,9 °C; limitada a 26 °C, a alface rendeu mais")]
    for a, b, y, cor, rot in marcas:
        ax.plot([a, b], [y, y], color=cor, lw=5, solid_capstyle="butt")
        ax.text(10.2, y + 0.16, rot, fontsize=7.8, color=cor)
    ax.set_xlim(10, 36); ax.set_ylim(-0.05, 3.75); ax.set_yticks([])
    ax.set_xticks(range(10, 37, 2)); ax.set_xlabel("temperatura da solução nutritiva (°C)")
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "faixa_temp.png")


# ---------------------------------------------------------------- 9: oxigenio dissolvido
def oxigenio():
    t = np.array([0, 5, 10, 15, 20, 25, 30, 35]); od = np.array([14.62, 12.77, 11.29, 10.08, 9.09, 8.26, 7.56, 6.95])
    fig, ax = plt.subplots(figsize=(8.6, 4.1))
    ax.axvspan(20, 25, color="#e3f2e4", zorder=0); ax.text(22.5, 12.4, "faixa adequada\nda solução", ha="center", fontsize=8, color=VERDE)
    ax.plot(t, od, "o-", color=AZUL, lw=2.3, zorder=3, label="água doce saturada de ar, ao nível do mar (760 mmHg)")
    for ti, oi in zip(t, od): ax.text(ti + 0.4, oi + 0.35, br(oi, 2), fontsize=8.5, color=AZUL)
    ax.axhline(7, color=VERDE, lw=1.2, ls="--"); ax.text(0.3, 7.15, "7 mg/L: valor de trabalho do manual da Cornell", fontsize=8, color=VERDE)
    ax.axhline(4, color=LARANJA, lw=1.2, ls="--"); ax.text(0.3, 4.15, "4 mg/L: mínimo para a alface crescer bem (Cornell)", fontsize=8, color=LARANJA)
    ax.axhline(3, color=VERM, lw=1.2, ls="--"); ax.text(0.3, 2.45, "3 mg/L: estresse visível e risco de perda do cultivo (Cornell)", fontsize=8, color=VERM)
    ax.annotate("", xy=(30, 7.56), xytext=(20, 9.09), arrowprops=dict(arrowstyle="-|>", color=VERM, lw=1.3, connectionstyle="arc3,rad=-0.3"))
    ax.text(26.6, 9.6, "de 20 para 30 °C:\n17 % menos oxigênio", fontsize=8, color=VERM)
    ax.set_xlabel("temperatura da água (°C)"); ax.set_ylabel("oxigênio dissolvido na saturação (mg/L)")
    ax.set_xlim(0, 37); ax.set_ylim(2, 15.5); ax.grid(alpha=0.25); ax.legend(fontsize=8, loc="upper right")
    fig.tight_layout()
    salvar(fig, "oxigenio.png")


# ---------------------------------------------------------------- 10: Cometti 2013
def estudo_cometti():
    ce = ["1,0 dS/m", "2,0 dS/m", "3,0 dS/m"]; ganho = [11.9, 44.1, 122.5]
    fig, ax = plt.subplots(figsize=(7.6, 3.6))
    b = ax.bar(ce, ganho, color=[AZUL, VERDE, LARANJA], width=0.55, zorder=3)
    for r, g in zip(b, ganho): ax.text(r.get_x() + r.get_width() / 2, g + 3, "+" + br(g, 1) + " %", ha="center", fontsize=9.5, fontweight="bold")
    ax.set_ylim(0, 145); ax.set_ylabel("ganho de massa fresca de folhas\ncom a solução limitada a 26 °C")
    ax.set_xlabel("condutividade elétrica da solução nutritiva")
    ax.grid(axis="y", alpha=0.25)
    ax.text(0.02, 0.95, "comparação: solução sem controle,\nque foi de 24,0 a 29,9 °C", transform=ax.transAxes, fontsize=8.5, color=CINZA, va="top")
    fig.tight_layout()
    salvar(fig, "estudo_cometti.png")


# ---------------------------------------------------------------- 11: compensacao
def compensacao():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.7))
    t = np.linspace(18, 34, 50)
    a1.plot(t, 1400 * (1 + 0.02 * (t - 25)), color=LARANJA, lw=2.2, label="o que o sensor lê, sem correção")
    a1.plot(t, 1400 + 0 * t, color=VERDE, lw=2.2, label="referida a 25 °C, com o DS18B20")
    for ti in (20, 30):
        v = 1400 * (1 + 0.02 * (ti - 25)); a1.plot(ti, v, "o", color=LARANJA); a1.text(ti + 0.3, v - 55, f"{v:.0f}\n({'+' if ti > 25 else '−'}10 %)", fontsize=8, color=LARANJA)
    a1.set_xlabel("temperatura da solução (°C)"); a1.set_ylabel("condutividade (µS/cm)"); a1.set_ylim(1150, 1750)
    a1.set_title("Condutividade: 2 % por grau", fontsize=10); a1.grid(alpha=0.25); a1.legend(fontsize=7.5, loc="upper left")
    ph = np.linspace(4, 9, 50)
    for ti, cor in ((20, AZUL), (30, VERM), (35, LARANJA)):
        erro = (7 - ph) * (1 - (273.15 + ti) / 298.15)      # pH lido (inclinacao de 25 C) - pH verdadeiro
        a2.plot(ph, erro, color=cor, lw=2, label=f"solução a {ti} °C")
    a2.axhspan(-0.2, 0.2, color="#e3f2e4", zorder=0); a2.text(4.05, 0.215, "critério do projeto: ±0,2 pH", fontsize=7.5, color=VERDE, ha="left")
    a2.axvspan(5.5, 6.5, color="#fff2cc", zorder=0, alpha=0.7); a2.text(6.0, -0.17, "faixa da\nalface", fontsize=7.5, color="#7f6000", ha="center")
    a2.set_xlabel("pH verdadeiro da solução"); a2.set_ylabel("erro do pH lido sem compensar\n(calibrado a 25 °C)")
    a2.set_ylim(-0.25, 0.25); a2.yaxis.set_major_formatter(virgula); a2.grid(alpha=0.25); a2.legend(fontsize=7.5, loc="lower right")
    a2.set_title("pH: o efeito é pequeno perto de 7", fontsize=10)
    fig.tight_layout()
    salvar(fig, "compensacao.png")


# ---------------------------------------------------------------- 12: banho de gelo
def banho_gelo():
    fig, (ax, a2) = plt.subplots(1, 2, figsize=(9.4, 4.0), gridspec_kw=dict(width_ratios=[1, 1.15]))
    ax.set_xlim(0, 7); ax.set_ylim(0, 6.2); ax.axis("off")
    ax.add_patch(Rectangle((1.2, 0.6), 3.4, 4.2, fc="white", ec=CINZA, lw=1.8, zorder=1))
    ax.add_patch(Rectangle((1.2, 0.6), 3.4, 3.8, fc="#cfe8f7", ec="none", zorder=1))
    rng = np.random.default_rng(7)
    for _ in range(46):
        x, y = rng.uniform(1.3, 4.2), rng.uniform(0.7, 4.05)
        ax.add_patch(Rectangle((x, y), 0.3, 0.26, angle=rng.uniform(-30, 30), fc="white", ec="#9ec9e8", lw=0.8, zorder=2))
    ax.add_patch(Rectangle((2.3, 2.0), 0.16, 1.1, fc="#bdbdbd", ec="#555", zorder=5)); fio(ax, [(2.38, 3.1), (2.38, 5.9)], cor="#111", lw=2.5, z=4)
    ax.add_patch(Rectangle((3.2, 2.0), 0.1, 3.6, fc="#f5f5f5", ec="#555", zorder=5)); ax.add_patch(Circle((3.25, 2.0), 0.1, fc=VERM, ec="#555", zorder=6))
    ax.text(2.0, 5.95, "DS18B20", fontsize=8, color=AZUL, ha="right"); ax.text(3.45, 5.95, "termômetro de referência\n(se houver)", fontsize=7.5, color=CINZA, va="top")
    seta(ax, (5.2, 2.5), (2.55, 2.5), cor=LARANJA, lw=1.1); ax.text(5.25, 2.5, "ponta no meio,\nsem encostar\nno vidro", fontsize=7.5, color=LARANJA, va="center")
    seta(ax, (5.2, 4.05), (4.3, 4.05), cor=AZUL, lw=1.1); ax.text(5.25, 4.05, "gelo picado até\na boca; água só\nnos vãos", fontsize=7.5, color=AZUL, va="center")
    seta(ax, (5.2, 1.0), (4.3, 1.0), cor=VERM, lw=1.1); ax.text(5.25, 1.0, "gelo flutuando\nsobre água:\nerrado", fontsize=7.5, color=VERM, va="center")
    ax.text(2.9, 0.2, "mistura de gelo e água em equilíbrio: 0,0 °C", ha="center", fontsize=8.5, color=AZUL, fontweight="bold")
    # ajuste
    t = np.linspace(0, 6, 200); lido = 0.31 + 24.0 * np.exp(-t / 0.7)
    a2.plot(t, lido, color=LARANJA, lw=2.2, label="leitura do sensor")
    a2.axhline(0, color=VERDE, lw=1.3); a2.text(5.95, -0.55, "0,0 °C (verdadeiro)", fontsize=8, color=VERDE, ha="right", va="top")
    a2.axhspan(-0.5, 0.5, color="#e3f2e4", zorder=0); a2.text(0.1, 0.62, "±0,5 °C: tolerância de fábrica", fontsize=7.5, color=VERDE)
    a2.annotate("parou em +0,31 °C\najuste = 0 − 0,31 = −0,31 °C", xy=(5.2, 0.31), xytext=(2.1, 3.2), fontsize=8.5, color=AZUL,
                arrowprops=dict(arrowstyle="-|>", color=AZUL, lw=1.2))
    a2.set_xlim(0, 6); a2.set_ylim(-1.5, 6); a2.set_xlabel("minutos depois de mergulhar"); a2.set_ylabel("temperatura (°C)")
    a2.yaxis.set_major_formatter(virgula); a2.grid(alpha=0.25); a2.legend(fontsize=8, loc="upper right")
    a2.set_title("Espere a leitura parar (exemplo)", fontsize=10)
    fig.tight_layout()
    salvar(fig, "banho_gelo.png")


if __name__ == "__main__":
    for f in (bancada_temp, pinagem, um_fio, sinais, endereco, resolucao, sem_bloquear, faixa_temp, oxigenio,
              estudo_cometti, compensacao, banho_gelo):
        f()
