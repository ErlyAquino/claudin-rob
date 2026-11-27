"""Figuras de hidroponia do tutorial do pH-4502C (diagramas proprios, matplotlib). Chamado por figuras.py."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon, Circle, Ellipse
from figuras import salvar, caixa, seta, AZUL, LARANJA, CINZA, VERDE, VERM


# ---------------------------------------------------------------- bancada NFT (esquema, fora de escala)
def bancada_nft():
    fig, ax = plt.subplots(figsize=(9.4, 5.9))
    ax.set_xlim(0, 20); ax.set_ylim(0, 12.6); ax.axis("off")
    # canal de cultivo inclinado (alto a esquerda)
    x0, y0, x1, y1 = 2.2, 9.6, 14.9, 8.6
    ax.add_patch(Polygon([(x0, y0), (x1, y1), (x1, y1 - 0.7), (x0, y0 - 0.7)], closed=True, fc="#eeeeee", ec="#555", lw=1.5))
    ax.add_patch(Polygon([(x0, y0 - 0.52), (x1, y1 - 0.52), (x1, y1 - 0.7), (x0, y0 - 0.7)], closed=True, fc="#64b5f6", ec="none"))
    for k in range(5):
        t = (k + 0.5) / 5; px = x0 + t * (x1 - x0); py = y0 + t * (y1 - y0)
        for dx, dy, w in ((-0.38, 0.5, 0.75), (0.38, 0.5, 0.75), (0, 0.75, 0.8)):
            ax.add_patch(Ellipse((px + dx, py + dy), w, 0.62, fc="#66bb6a", ec="#2e7d32", lw=0.8))
        ax.add_patch(Rectangle((px - 0.16, py - 0.42), 0.32, 0.5, fc="#8d6e63", ec="none"))
        for r in (-0.1, 0.0, 0.1):
            ax.plot([px + r, px + r * 2.2], [py - 0.42, py - 0.6], color="#f5f5f5", lw=0.8)
    ax.text(8.5, 12.1, "bancada NFT de 25 posições (alface)", ha="center", fontsize=9.5, fontweight="bold", color=VERDE)
    ax.text(8.5, 11.55, "canal de cultivo (perfil) com leve declive: a solução escorre em filme fino pelas raízes e volta ao reservatório",
            ha="center", fontsize=8.2, color=CINZA)
    # reservatorio
    rx, ry, rw, rh = 7.4, 0.5, 8.4, 3.9
    ax.add_patch(Rectangle((rx, ry), rw, rh, fc="white", ec="#444", lw=1.8))
    ax.add_patch(Rectangle((rx + 0.05, ry + 0.05), rw - 0.1, rh - 1.0, fc="#bbdefb", ec="none"))
    ax.text(rx + rw / 2, ry + 0.15, "reservatório da solução nutritiva", ha="center", fontsize=8.5, color=AZUL, style="italic")
    # retorno por gravidade
    ax.plot([x1 - 0.25, x1 - 0.25], [y1 - 0.7, ry + rh - 0.8], color="#64b5f6", lw=4, solid_capstyle="round")
    ax.text(x1 - 0.5, 6.9, "retorno por\ngravidade", fontsize=8, color=AZUL, va="center", ha="right")
    # bomba + recalque
    ax.add_patch(FancyBboxPatch((7.75, ry + 0.9), 1.2, 0.8, boxstyle="round,pad=0.02", fc="#455a64", ec="#222"))
    ax.text(8.35, ry + 1.3, "bomba\n12 V", ha="center", va="center", color="white", fontsize=7.5)
    ax.plot([8.35, 8.35, 1.0, 1.0, x0 + 0.25, x0 + 0.25], [ry + 1.7, 5.6, 5.6, 10.6, 10.6, y0],
            color="#1565c0", lw=3.5, solid_joinstyle="round")
    ax.text(0.75, 8.2, "recalque (a bomba empurra a solução)", fontsize=8, color=AZUL, rotation=90, va="center", ha="right")
    caixa(ax, 2.2, 5.15, 1.7, 0.9, "vazão\nYF‑S201", cor="#fff4e5", borda=LARANJA, fs=7.5)
    caixa(ax, 4.9, 5.15, 1.7, 0.9, "pressão", cor="#fff4e5", borda=LARANJA, fs=7.5)
    # sensores no reservatorio
    sens = [(9.7, "boia\n(nível)"), (11.0, "DS18B20\n(temperatura)"), (12.3, "sonda\nde pH"), (13.75, "sonda TDS\n(condutiv.)")]
    for sx, nome in sens:
        ph = "pH" in nome
        cor = VERM if ph else LARANJA
        ax.plot([sx, sx], [ry + 2.0, 5.0], color=cor, lw=2.8 if ph else 1.6)
        ax.add_patch(Circle((sx, ry + 1.9), 0.17, fc=cor, ec="none"))
        ax.text(sx, ry + 1.55, nome, ha="center", va="top", fontsize=7.2, color=cor, fontweight="bold" if ph else "normal", linespacing=1.0)
        ax.plot([sx, sx, 16.2], [5.0, 5.0 + 0.12 * (sens.index((sx, nome)) + 1), 5.0 + 0.12 * (sens.index((sx, nome)) + 1)], color=CINZA, lw=0.9)
    # caixa de protecao com a eletronica
    caixa(ax, 16.2, 4.6, 3.6, 3.6, "", cor="#f5f5f5", borda="#444")
    ax.text(18.0, 7.85, "caixa de proteção", ha="center", fontsize=8.5, fontweight="bold")
    caixa(ax, 16.35, 6.55, 1.6, 0.95, "ESP32\nhorta/no1", cor="#deeaf6", fs=7.3)
    caixa(ax, 18.05, 6.55, 1.6, 0.95, "ADS1115\n16 bits", cor="#deeaf6", fs=7.3)
    caixa(ax, 16.35, 5.45, 1.6, 0.95, "placa\npH‑4502C", cor="#fdecea", borda=VERM, fs=7.3)
    caixa(ax, 18.05, 5.45, 1.6, 0.95, "relé (NF)\nda bomba", cor="#deeaf6", fs=7.3)
    ax.text(18.0, 4.85, "acima do nível da água", ha="center", fontsize=7, color=CINZA, style="italic")
    ax.annotate("Wi‑Fi → MQTT →\npainel da telemetria", xy=(18.0, 8.25), xytext=(18.0, 10.2), fontsize=8, ha="center", va="center",
                arrowprops=dict(arrowstyle="<-", color=CINZA, lw=1.2, ls=":"))
    # o que o no publica
    ax.text(16.1, 3.9, "O nó publica a cada 10 s:", fontsize=8, fontweight="bold")
    ax.text(16.1, 3.5, "pH (só depois de calibrado)\ncondutividade (a 25 °C)\ntemperatura da solução\nvazão · pressão\nnível (boia) · bomba",
            fontsize=7.6, va="top", linespacing=1.4)
    ax.text(0.3, 3.4, "Proteção da bomba: se a solução fica\nabaixo da boia, o nó corta a bomba pelo\nrelé em cerca de 7 s e a religa 1 min\ndepois de o nível voltar, mesmo sem rede.",
            fontsize=7.8, color=CINZA, va="top", linespacing=1.35)
    ax.text(0.3, 0.55, "Esquema fora de escala.", fontsize=7.2, color=CINZA, style="italic")
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    salvar(fig, "bancada_nft.png")


# ---------------------------------------------------------------- ligacoes do no horta/no1
def no1_ligacao():
    fig, ax = plt.subplots(figsize=(9.4, 5.9))
    ax.set_xlim(0, 20); ax.set_ylim(-0.5, 12.2); ax.axis("off")
    V5, V3, GND, SIN, I2C = VERM, LARANJA, "#222", "#b8860b", AZUL
    caixa(ax, 0.4, 2.2, 3.6, 8.6, "", cor="#eceff1", borda="#333")
    ax.text(2.2, 10.35, "ESP32 DevKit V1", ha="center", fontsize=9, fontweight="bold")
    pinos = [("3V3", 9.4), ("GPIO 21 (SDA)", 8.5), ("GPIO 22 (SCL)", 7.8), ("GPIO 27", 7.0), ("GPIO 32", 6.1), ("GPIO 4", 5.3),
             ("GPIO 25", 4.5), ("GPIO 26", 3.7), ("GND", 2.8)]
    for nome, y in pinos:
        ax.text(3.85, y, nome, ha="right", va="center", fontsize=7.6)
        ax.plot(4.0, y, "s", color="#333", ms=4)
    # conversor de nivel
    caixa(ax, 5.6, 6.6, 2.5, 2.5, "conversor\nde nível\n4 canais\nLV 3,3 V | HV 5 V", cor="#fff4e5", borda=LARANJA, fs=7.6)
    for y in (8.5, 7.8, 7.0):
        ax.plot([4.0, 5.6], [y, y], color=I2C if y > 7.4 else SIN, lw=1.6)
    # ADS1115
    caixa(ax, 9.9, 6.9, 3.0, 3.6, "", cor="#deeaf6")
    ax.text(11.4, 10.1, "ADS1115", ha="center", fontsize=9, fontweight="bold", color=AZUL)
    ax.text(11.4, 9.6, "VDD = 5 V · 0x48\nganho 2/3 (±6,144 V)", ha="center", va="center", fontsize=7.2)
    ax.plot([8.1, 9.9], [8.5, 8.5], color=I2C, lw=1.6); ax.plot([8.1, 9.9], [7.8, 7.8], color=I2C, lw=1.6)
    ax.text(9.0, 8.62, "SDA", ha="center", fontsize=7, color=I2C); ax.text(9.0, 7.92, "SCL", ha="center", fontsize=7, color=I2C)
    ax.text(9.0, 7.35, "I2C em 5 V", ha="center", fontsize=7, color=CINZA)
    for nome, y in (("A0", 8.9), ("A1", 8.2), ("A2", 7.5)):
        ax.text(12.75, y, nome, ha="right", va="center", fontsize=8, fontweight="bold"); ax.plot(12.9, y, "s", color="#333", ms=4)
    # sensores analogicos
    caixa(ax, 15.0, 10.3, 4.6, 1.5, "pH‑4502C + sonda de vidro\nV+ = 5 V · Po direto (sem divisor)", cor="#fdecea", borda=VERM, fs=7.8, negrito=False)
    caixa(ax, 15.0, 8.3, 4.6, 1.4, "sensor TDS (condutividade)\nVCC no GPIO 32: ligado só na leitura", cor="#fff4e5", borda=LARANJA, fs=7.8)
    caixa(ax, 15.0, 6.4, 4.6, 1.3, "sensor de pressão 0 a 1,2 MPa\n5 V · saída 0,5 a 4,5 V", cor="#fff4e5", borda=LARANJA, fs=7.8)
    ax.plot([12.9, 13.9, 13.9, 15.0], [8.9, 8.9, 11.0, 11.0], color=VERM, lw=2.2)
    ax.text(13.75, 10.2, "Po", ha="right", fontsize=8, color=VERM, fontweight="bold")
    ax.plot([12.9, 14.3, 14.3, 15.0], [8.2, 8.2, 9.0, 9.0], color=SIN, lw=1.6)
    ax.plot([12.9, 14.3, 14.3, 15.0], [7.5, 7.5, 7.0, 7.0], color=SIN, lw=1.6)
    # alimentacao do TDS pelo GPIO 32
    ax.plot([4.0, 4.9, 4.9, 14.6, 14.6, 15.0], [6.1, 6.1, 5.85, 5.85, 8.6, 8.6], color=V3, lw=1.3, ls="--")
    ax.text(12.0, 5.93, "VCC do TDS", ha="center", va="bottom", fontsize=7.2, color=V3)
    # digitais
    caixa(ax, 5.6, 4.75, 3.6, 0.85, "DS18B20 (temp. da solução)", cor="#e8f5e9", borda=VERDE, fs=7.6)
    ax.plot([4.0, 5.6], [5.3, 5.3], color=SIN, lw=1.6); ax.text(9.35, 5.17, "pull‑up 4,7 kΩ ao 3V3", fontsize=7, color=CINZA, va="center")
    caixa(ax, 5.6, 3.75, 3.6, 0.8, "boia de nível (fecha ao GND)", cor="#e8f5e9", borda=VERDE, fs=7.6)
    ax.plot([4.0, 4.6, 4.6, 5.6], [4.5, 4.5, 4.15, 4.15], color=SIN, lw=1.6)
    caixa(ax, 5.6, 2.7, 3.6, 0.85, "módulo de relés: IN1", cor="#e8f5e9", borda=VERDE, fs=7.6)
    ax.plot([4.0, 4.8, 4.8, 5.6], [3.7, 3.7, 3.1, 3.1], color=SIN, lw=1.6)
    ax.text(9.35, 3.12, "bomba 12 V pelo contato NF", fontsize=7, color=CINZA, va="center")
    caixa(ax, 9.9, 3.9, 3.0, 1.0, "YF‑S201 (vazão)\n5 V · pulsos", cor="#e8f5e9", borda=VERDE, fs=7.6)
    ax.plot([8.1, 8.6, 8.6, 13.3, 13.3, 12.9], [7.0, 7.0, 6.35, 6.35, 4.4, 4.4], color=SIN, lw=1.6)
    caixa(ax, 5.6, 9.7, 2.5, 0.9, "RTC DS3231\n3,3 V · 0x68", cor="#e8f5e9", borda=VERDE, fs=7.6)
    ax.plot([4.8, 4.8, 5.6], [8.5, 10.0, 10.0], color=I2C, lw=1.2); ax.plot([5.1, 5.1, 5.6], [7.8, 10.3, 10.3], color=I2C, lw=1.2)
    # legenda
    ax.text(0.4, 1.45, "Alimentação: fonte de 5 V / 2 A para o ESP32 e os sensores; fonte de 12 V só para a bomba; todos os GND ligados entre si.",
            fontsize=7.8, color=CINZA)
    ax.text(0.4, 0.85, "Por que o conversor de nível: com o ADS1115 em 5 V, o I2C dele também fica em 5 V, que o ESP32 (3,3 V) não tolera.",
            fontsize=7.8, color=CINZA)
    ax.text(0.4, 0.25, "O GPIO 32 alimenta o sensor TDS só durante a leitura: ligado, ele injeta corrente na água e desvia a leitura do pH.",
            fontsize=7.8, color=CINZA)
    ax.text(0.4, -0.3, "Fonte: telemetria‑cria/firmware/horta‑no1 (README.md e horta‑no1.ino). Os fios de 5 V, 3,3 V e GND de cada módulo foram omitidos.",
            fontsize=7.2, color=CINZA, style="italic")
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    salvar(fig, "no1_ligacao.png")


# ---------------------------------------------------------------- pH x disponibilidade de nutrientes
# Diagrama QUALITATIVO para solucao nutritiva. Faixas (inicio da queda, fim) montadas a partir de:
# Trejo-Tellez & Gomez-Merino 2012 (especiacao e precipitacao), Cornell CEA/Mattson 2016 (ferro e quelatos),
# Embrapa Hortalicas Circ. Tec. 22 (P e micronutrientes acima de pH 7; Mo em meio acido), Penn State Extension (N).
NUTRIENTES = [  # nome, (some abaixo de, pleno a partir de), (pleno ate, some acima de), observacao
    ("Nitrogênio (N)", (4.0, 5.5), (8.0, 9.5), "amônio vira amônia (gás) acima de pH 7"),
    ("Fósforo (P)", (4.0, 5.0), (6.5, 7.8), "acima de 7 precipita com o cálcio"),
    ("Potássio (K)", (3.5, 4.5), (9.0, 9.8), "quase insensível ao pH"),
    ("Cálcio (Ca)", (4.0, 5.5), (7.0, 8.5), "fosfato acima de 7; carbonato acima de 8,3"),
    ("Magnésio (Mg)", (4.0, 5.5), (7.0, 8.5), "idem"),
    ("Enxofre (S)", (3.5, 4.5), (9.0, 9.8), "sulfato solúvel em toda a faixa"),
    ("Ferro (Fe)", (3.5, 4.0), (6.3, 7.3), "acima de 6,5 oxida e precipita"),
    ("Manganês (Mn)", (3.5, 4.5), (6.0, 7.0), "indisponível acima de 6,5"),
    ("Boro (B)", (3.5, 5.0), (6.3, 7.3), "indisponível acima de 6,5"),
    ("Cobre (Cu) e zinco (Zn)", (3.5, 4.5), (6.3, 7.3), "indisponíveis acima de 6,5"),
    ("Molibdênio (Mo)", (4.5, 6.0), (9.0, 9.8), "falta em meio ácido"),
]


def nutrientes():
    fig, ax = plt.subplots(figsize=(9.4, 4.9))
    x = np.linspace(4, 9, 500)
    n = len(NUTRIENTES)
    for i, (nome, (a0, a1), (b0, b1), obs) in enumerate(NUTRIENTES):
        y = n - 1 - i
        disp = np.clip((x - a0) / (a1 - a0), 0, 1) * np.clip((b1 - x) / (b1 - b0), 0, 1)
        meia = 0.06 + 0.36 * disp
        macro = i < 6
        ax.fill_between(x, y - meia, y + meia, color=AZUL if macro else LARANJA, alpha=0.85, lw=0)
        ax.text(3.93, y, nome, ha="right", va="center", fontsize=8.5)
        ax.text(9.07, y, obs, ha="left", va="center", fontsize=7.3, color=CINZA)
    ax.axvspan(5.5, 6.5, color=VERDE, alpha=0.16, zorder=0)
    ax.text(6.0, n - 0.35, "faixa de trabalho\nda hidroponia\n5,5 a 6,5", ha="center", va="bottom", fontsize=8.5, color=VERDE, fontweight="bold")
    ax.set_xlim(4, 9); ax.set_ylim(-0.7, n + 0.9)
    ax.set_xticks(np.arange(4, 9.1, 0.5)); ax.set_xticklabels([f"{t:.1f}".replace(".", ",") for t in np.arange(4, 9.1, 0.5)])
    ax.set_yticks([]); ax.set_xlabel("pH da solução nutritiva")
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.grid(axis="x", alpha=0.3)
    fig.subplots_adjust(left=0.2, right=0.7, top=0.97, bottom=0.11)
    salvar(fig, "nutrientes.png")


# ---------------------------------------------------------------- faixas por cultura
# pH e CE: Oklahoma State Extension HLA-6722 (OKS), Embrapa Hortalicas Circ. Tec. 22 (EMB),
# Cornell CEA (COR), Singapore Food Agency 2025 (SFA).
CULTURAS = [  # nome, pH min, pH max, CE min, CE max, fonte
    ("Alface", 5.5, 6.5, 1.2, 1.8, "COR, EMB, OKS"),
    ("Manjericão", 5.5, 6.0, 1.0, 1.6, "OKS"),
    ("Agrião", 5.5, 6.5, 1.5, 2.0, "SFA"),
    ("Salsa", 6.0, 6.5, 1.8, 2.2, "OKS"),
    ("Folhas asiáticas (pak choi, mostarda)", 5.5, 6.8, 2.0, 2.5, "SFA"),
    ("Pimentão", 5.5, 6.0, 0.8, 1.8, "OKS"),
    ("Pepino", 5.0, 5.5, 1.7, 2.0, "OKS"),
    ("Morango", 5.9, 6.1, 1.8, 2.2, "OKS"),
    ("Tomate", 6.0, 6.5, 2.0, 4.0, "OKS"),
]


def culturas():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.9), sharey=True)
    n = len(CULTURAS)
    for i, (nome, p0, p1, c0, c1, fonte) in enumerate(CULTURAS):
        y = n - 1 - i
        cor = VERDE if i < 5 else LARANJA
        a1.barh(y, p1 - p0, left=p0, height=0.55, color=cor, alpha=0.85)
        a1.text(p1 + 0.05, y, f"{p0:.1f} a {p1:.1f}".replace(".", ",") if p1 - p0 > 0.25 else "6,0", va="center", fontsize=7.5)
        a2.barh(y, c1 - c0, left=c0, height=0.55, color=cor, alpha=0.85)
        a2.text(c1 + 0.06, y, f"{c0:.1f} a {c1:.1f}".replace(".", ","), va="center", fontsize=7.5)
        a2.text(5.75, y, fonte, va="center", ha="right", fontsize=6.5, color=CINZA)
    a1.set_yticks(range(n)); a1.set_yticklabels([c[0] for c in CULTURAS][::-1], fontsize=8.5)
    a1.axvspan(5.5, 6.5, color=VERDE, alpha=0.1, zorder=0)
    a1.set_xlim(4.5, 7.5); a1.set_xlabel("pH da solução"); a1.grid(axis="x", alpha=0.3)
    a1.set_title("pH recomendado", fontsize=9.5)
    a2.set_xlim(0, 5.8); a2.set_xticks(range(0, 6)); a2.set_xlabel("condutividade elétrica (mS/cm)"); a2.grid(axis="x", alpha=0.3)
    a2.set_title("Condutividade elétrica recomendada", fontsize=9.5)
    for ax in (a1, a2):
        ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:g}".replace(".", ",")))
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
    fig.tight_layout(); salvar(fig, "culturas.png")


def tudo():
    bancada_nft(); no1_ligacao()
    for nome in ("nutrientes", "culturas", "deriva"):
        if nome in globals():
            globals()[nome]()
