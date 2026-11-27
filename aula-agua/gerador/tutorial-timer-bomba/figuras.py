"""Diagramas proprios do tutorial do timer da bomba (matplotlib; nada copiado da web).
  bancada_timer.png   a bancada NFT, a bomba e onde entra o timer
  ciclo_timer.png     o ciclo do timer em 24 h (dia 15/15; noite 15 min a cada 2 h) e o detalhe de 1 hora
  energia.png         fracao do tempo ligada e custo de energia por planta (Dalastra et al., 2020)
  rele_interno.png    o rele por dentro: bobina, COM, NA e NF, solto e acionado
  modulo_rele.png     os dois tipos de modulo: transistor (KY-019) e optoacoplado (IN, JD-VCC)
  potencia_12v.png    lado de potencia com bomba de 12 V (fusivel, contato NF, diodo)
  potencia_rede.png   lado de potencia com bomba de 127/220 V (DR, disjuntor, fase pelo rele, terra)
  millis_linha.png    a conta agora - inicioDaFase >= duracao numa linha do tempo
Uso (a partir de python-dados/):  uv run python ../aula-agua/gerador/tutorial-timer-bomba/figuras.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch, Polygon

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
AGUA = "#4fa3d9"
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
                                 connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0, zorder=5))


def fio(ax, pts, cor="black", lw=2.0, ls="-", z=2):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=cor, lw=lw, ls=ls, zorder=z, solid_capstyle="round", solid_joinstyle="round")


def ponto(ax, x, y, cor="black", r=0.07):
    ax.add_patch(Circle((x, y), r, fc=cor, ec=cor, zorder=6))


# ---------------------------------------------------------------- 1: bancada
def bancada_timer():
    fig, ax = plt.subplots(figsize=(9.4, 4.1))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.0); ax.axis("off")
    # canais inclinados (vista lateral)
    ax.add_patch(Polygon([(3.2, 4.6), (11.6, 4.0), (11.6, 3.7), (3.2, 4.3)], fc="#e8e8e8", ec=CINZA, lw=1.3, zorder=2))
    ax.add_patch(Polygon([(3.2, 4.36), (11.6, 3.76), (11.6, 3.7), (3.2, 4.3)], fc=AGUA, ec="none", zorder=3))
    for x in np.linspace(4.0, 10.8, 6):
        y = 4.6 - (x - 3.2) * 0.6 / 8.4
        ax.plot([x, x], [y, y + 0.35], color=VERDE, lw=2.5, zorder=4)
        ax.add_patch(Circle((x, y + 0.55), 0.32, fc="#66bb6a", ec=VERDE, zorder=4))
        ax.plot([x - 0.1, x - 0.18, x + 0.12], [y - 0.02, y - 0.22, y - 0.25], color="#8d6e63", lw=1, zorder=4)
    ax.text(7.4, 5.55, "canal de cultivo (perfil) com declive: a solução desce em filme fino pelas raízes", ha="center", fontsize=8.5, color=CINZA)
    seta(ax, (5.2, 3.75), (9.4, 3.45), cor=AGUA, lw=2)
    # reservatorio
    ax.add_patch(Rectangle((9.6, 0.4), 3.6, 1.9, fc="white", ec=CINZA, lw=1.5, zorder=2))
    ax.add_patch(Rectangle((9.6, 0.4), 3.6, 1.35, fc="#bfe0f5", ec="none", zorder=1))
    ax.text(11.2, 2.02, "reservatório", ha="center", fontsize=8.5, color=CINZA)
    caixa(ax, 10.0, 0.55, 1.3, 0.7, "BOMBA", cor="#ffe0b2", borda=LARANJA, negrito=True)
    # retorno
    fio(ax, [(11.6, 3.85), (12.4, 3.85), (12.4, 1.8)], cor=AGUA, lw=4)
    ax.text(12.55, 3.0, "retorno\n(a queda areja\na solução)", fontsize=8, color=AZUL, va="center")
    # recalque
    fio(ax, [(10.65, 1.25), (10.65, 2.75), (2.7, 2.75), (2.7, 4.5), (3.2, 4.5)], cor=AGUA, lw=4)
    ax.text(6.4, 2.38, "recalque: a bomba empurra a solução até o começo dos canais", ha="center", fontsize=8, color=AZUL)
    # timer
    caixa(ax, 0.3, 0.5, 2.6, 0.9, "Arduino / ESP32\n(o TIMER)", cor="#deeaf6", negrito=True)
    caixa(ax, 3.7, 0.5, 1.9, 0.9, "módulo\nRELÉ", cor="#fff4e5", borda=LARANJA, negrito=True)
    caixa(ax, 6.4, 0.5, 2.1, 0.9, "fonte da\nbomba", cor="#eeeeee", borda=CINZA)
    seta(ax, (2.95, 0.95), (3.65, 0.95), cor=AZUL); ax.text(3.3, 1.12, "sinal", ha="center", fontsize=7.5, color=AZUL)
    fio(ax, [(5.65, 0.95), (6.35, 0.95)], cor=VERM, lw=2.5); fio(ax, [(8.55, 0.95), (9.95, 0.95)], cor=VERM, lw=2.5)
    ax.text(7.45, 0.15, "a energia da bomba passa pelo contato do relé", ha="center", fontsize=8, color=VERM)
    salvar(fig, "bancada_timer.png")


# ---------------------------------------------------------------- 2: ciclo
def ligada_no_minuto(m):
    """Mesma regra do sketch 05d: dia 06:00-18:00 15/15; noite 15 min a cada 2 h, contando das 18:00."""
    dia = 360 <= m < 1080
    desde = m - 360 if dia else (m - 1080 + 1440) % 1440
    return desde % (30 if dia else 120) < 15


def ciclo_timer():
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(9.4, 4.4), gridspec_kw=dict(height_ratios=[1.25, 1], hspace=0.75))
    m = np.arange(1440)
    on = np.array([ligada_no_minuto(x) for x in m])
    a1.axvspan(0, 6, color="#e3e7f1"); a1.axvspan(18, 24, color="#e3e7f1"); a1.axvspan(6, 18, color="#fff8e1")
    a1.fill_between(m / 60, 0, on, step="post", color=VERDE, lw=0)
    a1.set_xlim(0, 24); a1.set_ylim(0, 1.45); a1.set_yticks([]); a1.set_xticks(range(0, 25, 2))
    a1.set_xticklabels([f"{h}h" for h in range(0, 25, 2)], fontsize=8)
    a1.text(3, 1.2, "noite: 15 min a cada 2 h", ha="center", fontsize=8.5, color=AZUL)
    a1.text(12, 1.2, "dia (6h às 18h): 15 min ligada / 15 min desligada", ha="center", fontsize=8.5, color=LARANJA)
    a1.text(21, 1.2, "noite", ha="center", fontsize=8.5, color=AZUL)
    a1.set_title(f"Um dia inteiro: a bomba trabalha {on.sum() / 60:.1f} h das 24 h".replace(".", ","), fontsize=9.5, loc="left", color=CINZA)
    for s in ("top", "right", "left"): a1.spines[s].set_visible(False)
    t = np.arange(0, 61)
    a2.fill_between(t, 0, [1 if (x % 30) < 15 else 0 for x in t], step="post", color=VERDE, lw=0)
    a2.set_xlim(0, 60); a2.set_ylim(0, 1.5); a2.set_yticks([]); a2.set_xticks(range(0, 61, 15))
    a2.set_xticklabels(["10:00", "10:15", "10:30", "10:45", "11:00"], fontsize=8)
    for x0, txt, cor in [(7.5, "LIGADA\nTEMPO_LIGADA", "white"), (22.5, "DESLIGADA\nTEMPO_DESLIGADA", CINZA), (37.5, "LIGADA", "white"), (52.5, "DESLIGADA", CINZA)]:
        a2.text(x0, 0.5, txt, ha="center", va="center", fontsize=8, color=cor, fontweight="bold")
    a2.annotate("", xy=(30, 1.2), xytext=(0, 1.2), arrowprops=dict(arrowstyle="<->", color=CINZA))
    a2.text(15, 1.27, "um ciclo = ligada + desligada", ha="center", fontsize=8, color=CINZA)
    a2.set_title("Detalhe de uma hora do dia", fontsize=9.5, loc="left", color=CINZA)
    for s in ("top", "right", "left"): a2.spines[s].set_visible(False)
    fig.subplots_adjust(left=0.04, right=0.97, top=0.92, bottom=0.08)
    salvar(fig, "ciclo_timer.png")


# ---------------------------------------------------------------- 3: energia (Dalastra et al., 2020)
def energia():
    nomes = ["15 min a cada\n75 min (15/60)", "15 / 30", "15 / 15", "contínuo"]
    fracao = [15 / 75 * 100, 15 / 45 * 100, 50, 100]
    custo = [0.03, 0.07, 0.13, 0.26]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.3))
    for ax, vals, titulo, fmt, cor in [(a1, fracao, "Tempo com a bomba ligada (%)", "{:.0f} %", AZUL),
                                        (a2, custo, "Custo de energia por planta (R$)", "R$ {:.2f}", LARANJA)]:
        b = ax.bar(nomes, vals, color=cor, width=0.6)
        for r, v in zip(b, vals):
            ax.text(r.get_x() + r.get_width() / 2, v + max(vals) * 0.02, fmt.format(v).replace(".", ","), ha="center", fontsize=8.5)
        ax.set_title(titulo, fontsize=9.5, color=CINZA); ax.set_yticks([]); ax.tick_params(axis="x", labelsize=8)
        ax.set_ylim(0, max(vals) * 1.18)
        for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    fig.tight_layout()
    salvar(fig, "energia.png")


# ---------------------------------------------------------------- 4: rele por dentro
def _rele(ax, x0, acionado, titulo):
    ax.text(x0 + 2.6, 5.75, titulo, ha="center", fontsize=10, fontweight="bold", color=VERM if acionado else AZUL)
    ax.add_patch(FancyBboxPatch((x0, 0.9), 5.2, 4.5, boxstyle="round,pad=0.02,rounding_size=0.15", fc="#f7f9fc", ec=CINZA, lw=1.2, zorder=1))
    # bobina
    ax.add_patch(Rectangle((x0 + 0.6, 1.5), 1.3, 2.0, fc="#ffe0b2", ec=LARANJA, lw=1.5, zorder=3))
    for y in np.linspace(1.65, 3.35, 9): ax.plot([x0 + 0.6, x0 + 1.9], [y, y], color=LARANJA, lw=1, zorder=4)
    ax.add_patch(Rectangle((x0 + 1.05, 3.5), 0.4, 0.25, fc="#9e9e9e", ec=CINZA, zorder=3))
    ax.text(x0 + 1.25, 4.75, "bobina (5 V)", ha="center", fontsize=8.5, color=LARANJA)
    fio(ax, [(x0 + 0.9, 1.5), (x0 + 0.9, 0.5)], cor=LARANJA); fio(ax, [(x0 + 1.6, 1.5), (x0 + 1.6, 0.5)], cor=LARANJA)
    ax.text(x0 + 1.25, 0.25, ("com corrente (~70 mA)" if acionado else "sem corrente"), ha="center", fontsize=8, color=VERM if acionado else CINZA)
    if acionado:
        for dx in (0.85, 1.25, 1.65): seta(ax, (x0 + dx, 3.8), (x0 + dx, 4.05), cor=VERM, lw=1)
        ax.text(x0 + 2.05, 3.95, "ímã", fontsize=7.5, color=VERM)
    # contatos: COM (pivo), NF em cima, NA embaixo
    px, py = x0 + 3.0, 3.2
    nf, na = (x0 + 4.2, 4.4), (x0 + 4.2, 2.0)
    alvo = na if acionado else nf
    fio(ax, [(px, py), (alvo[0] - 0.05, alvo[1] + (0.12 if acionado else -0.12))], cor="black", lw=3.5, z=5)
    ponto(ax, px, py, r=0.09)
    for (cx, cy), nome, lig in [(nf, "NF", not acionado), (na, "NA", acionado)]:
        ax.add_patch(Circle((cx, cy), 0.13, fc=VERDE if lig else "white", ec="black", lw=1.5, zorder=6))
        fio(ax, [(cx + 0.13, cy), (x0 + 5.6, cy)], cor=VERDE if lig else CINZA, lw=2.2)
        ax.text(x0 + 5.7, cy, f"{nome}\n" + ("fechado" if lig else "aberto"), fontsize=8.5, va="center", color=VERDE if lig else CINZA, fontweight="bold")
    fio(ax, [(px, py), (px, 0.5)], cor="black", lw=2.2); ax.text(px, 0.25, "COM", ha="center", fontsize=8.5, fontweight="bold")
    # mola / armadura
    ax.plot([x0 + 1.25, px], [3.75 if acionado else 4.0, py], color="#9e9e9e", lw=1.2, ls=":", zorder=2)


def rele_interno():
    fig, ax = plt.subplots(figsize=(9.4, 4.0))
    ax.set_xlim(0, 14.2); ax.set_ylim(0, 6.1); ax.axis("off")
    _rele(ax, 0.3, False, "SOLTO (bobina sem corrente)")
    _rele(ax, 7.5, True, "ACIONADO (bobina com corrente)")
    salvar(fig, "rele_interno.png")


# ---------------------------------------------------------------- 5: modulos
def modulo_rele():
    fig, ax = plt.subplots(figsize=(9.4, 4.6))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7.2); ax.axis("off"); fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    ax.text(0.2, 6.85, "A) Módulo simples de 1 canal (tipo KY‑019): 3 pinos, aciona em nível ALTO", fontsize=9.5, fontweight="bold", color=AZUL)
    caixa(ax, 0.3, 5.0, 1.6, 0.9, "pino da\nplaca", cor="#deeaf6")
    caixa(ax, 2.9, 5.0, 1.9, 0.9, "resistor +\ntransistor", cor="#fff4e5", borda=LARANJA)
    caixa(ax, 5.8, 5.0, 2.0, 0.9, "bobina 5 V\n+ diodo", cor="#ffe0b2", borda=LARANJA)
    caixa(ax, 8.8, 5.0, 2.2, 0.9, "contatos\nCOM · NA · NF", cor="#e8f5e9", borda=VERDE)
    caixa(ax, 11.8, 5.0, 1.9, 0.9, "bomba", cor="#eeeeee", borda=CINZA)
    seta(ax, (1.95, 5.45), (2.85, 5.45), cor=AZUL); ax.text(2.4, 5.62, "S", ha="center", fontsize=8, color=AZUL)
    seta(ax, (4.85, 5.45), (5.75, 5.45), cor=LARANJA)
    ax.plot([7.85, 8.75], [5.45, 5.45], color=CINZA, lw=1.5, ls=":"); ax.text(8.3, 5.62, "ímã", ha="center", fontsize=8, color=CINZA)
    fio(ax, [(11.05, 5.45), (11.75, 5.45)], cor=VERM, lw=2.5)
    ax.text(4.9, 4.55, "o pino só comanda o transistor (menos de 5 mA); a corrente da bobina (~70 mA) vem do 5 V", ha="center", fontsize=8, color=CINZA)

    ax.text(0.2, 3.75, "B) Módulo optoacoplado (IN, VCC, GND e jumper JD‑VCC): aciona em nível BAIXO", fontsize=9.5, fontweight="bold", color=AZUL)
    caixa(ax, 0.3, 1.9, 1.6, 0.9, "pino da\nplaca", cor="#deeaf6")
    caixa(ax, 2.7, 1.9, 2.3, 0.9, "LED + opto‑\nacoplador", cor="#f3e5f5", borda="#6a1b9a")
    caixa(ax, 5.8, 1.9, 2.0, 0.9, "transistor +\nbobina + diodo", cor="#ffe0b2", borda=LARANJA)
    caixa(ax, 8.8, 1.9, 2.2, 0.9, "contatos\nCOM · NA · NF", cor="#e8f5e9", borda=VERDE)
    caixa(ax, 11.8, 1.9, 1.9, 0.9, "bomba", cor="#eeeeee", borda=CINZA)
    seta(ax, (1.95, 2.35), (2.65, 2.35), cor=AZUL); ax.text(2.3, 2.52, "IN", ha="center", fontsize=8, color=AZUL)
    ax.plot([5.05, 5.75], [2.35, 2.35], color="#6a1b9a", lw=1.5, ls=":"); ax.text(5.4, 2.52, "luz", ha="center", fontsize=8, color="#6a1b9a")
    ax.plot([7.85, 8.75], [2.35, 2.35], color=CINZA, lw=1.5, ls=":"); ax.text(8.3, 2.52, "ímã", ha="center", fontsize=8, color=CINZA)
    fio(ax, [(11.05, 2.35), (11.75, 2.35)], cor=VERM, lw=2.5)
    ax.annotate("VCC alimenta o LED do opto", xy=(3.85, 1.9), xytext=(2.9, 1.15), ha="center", fontsize=8, color="#6a1b9a", arrowprops=dict(arrowstyle="-|>", color="#6a1b9a"))
    ax.annotate("JD‑VCC alimenta a bobina", xy=(6.8, 1.9), xytext=(8.0, 1.15), ha="center", fontsize=8, color=LARANJA, arrowprops=dict(arrowstyle="-|>", color=LARANJA))
    ax.plot([4.95, 6.05], [1.22, 1.22], color="black", lw=3); ax.text(5.5, 0.85, "jumper", ha="center", fontsize=8)
    ax.text(7.0, 0.3, "o LED do opto fica entre VCC e IN: ele acende (e o relé aciona) quando o pino vai a 0 V", ha="center", fontsize=8, color=CINZA)
    salvar(fig, "modulo_rele.png")


# ---------------------------------------------------------------- 6 e 7: lado de potencia
def _contato(ax, x, y, usar_nf=True):
    """Bornes do rele: COM em (x, y); NF em (x+1.6, y+0.6); NA em (x+1.6, y-0.6)."""
    ax.add_patch(FancyBboxPatch((x - 0.6, y - 1.3), 2.9, 2.6, boxstyle="round,pad=0.02,rounding_size=0.12", fc="#fff4e5", ec=LARANJA, lw=1.4, zorder=1))
    ax.text(x + 0.85, y + 1.5, "contatos do relé", ha="center", fontsize=8.5, color=LARANJA, fontweight="bold")
    nf, na = (x + 1.6, y + 0.6), (x + 1.6, y - 0.6)
    fio(ax, [(x, y), (nf[0] - 0.1, nf[1] - 0.1)], lw=3, z=5)
    for (cx, cy), n in [((x, y), "COM"), (nf, "NF"), (na, "NA")]:
        ax.add_patch(Circle((cx, cy), 0.1, fc="white", ec="black", lw=1.5, zorder=6))
        ax.text(cx, cy - 0.38 if n != "NF" else cy + 0.25, n + (" (vazio)" if n == "NA" else ""), ha="center", fontsize=8, fontweight="bold")
    return nf, na


def potencia_12v():
    fig, ax = plt.subplots(figsize=(9.4, 4.2))
    ax.set_xlim(0, 14); ax.set_ylim(0, 6.4); ax.axis("off")
    caixa(ax, 0.3, 2.2, 1.9, 2.0, "FONTE\n12 V CC\n\n+\n\n−", cor="#eeeeee", borda=CINZA, negrito=True)
    # positivo: fonte -> fusivel -> COM
    fio(ax, [(2.2, 3.5), (3.0, 3.5)], cor=VERM, lw=2.5)
    ax.add_patch(Rectangle((3.0, 3.3), 1.3, 0.4, fc="white", ec="black", lw=1.4, zorder=3)); ax.plot([3.1, 4.2], [3.5, 3.5], color="black", lw=1, zorder=4)
    ax.text(3.65, 3.9, "fusível", ha="center", fontsize=8.5); ax.text(3.65, 2.7, "≈ 1,5 × a corrente\nda bomba", ha="center", fontsize=7.5, color=CINZA)
    fio(ax, [(4.3, 3.5), (5.9, 3.5)], cor=VERM, lw=2.5)
    nf, na = _contato(ax, 6.0, 3.5)
    fio(ax, [(nf[0] + 0.1, nf[1]), (10.6, nf[1])], cor=VERM, lw=2.5)
    caixa(ax, 10.6, 2.6, 2.0, 2.0, "BOMBA\n12 V", cor="#bfe0f5", borda=AZUL, negrito=True)
    ax.text(10.75, 4.35, "+", fontsize=11, fontweight="bold", color=VERM); ax.text(10.75, 2.7, "−", fontsize=11, fontweight="bold")
    # negativo
    fio(ax, [(10.6, 2.9), (9.6, 2.9), (9.6, 1.0), (1.2, 1.0), (1.2, 2.2)], cor="black", lw=2.5)
    ax.text(5.5, 0.65, "negativo (−) direto da bomba para a fonte", ha="center", fontsize=8, color=CINZA)
    # diodo em paralelo com a bomba
    fio(ax, [(9.6, 4.1), (9.6, 5.4), (13.2, 5.4), (13.2, 3.6)], cor=CINZA, lw=1.5, z=1)
    fio(ax, [(13.2, 3.1), (13.2, 1.0), (9.6, 1.0)], cor=CINZA, lw=1.5, z=1)
    ax.add_patch(Polygon([(12.95, 3.1), (13.45, 3.1), (13.2, 3.55)], fc="black", zorder=5)); ax.plot([12.95, 13.45], [3.58, 3.58], color="black", lw=2.5, zorder=5)
    ponto(ax, 9.6, 4.1); ponto(ax, 9.6, 1.0)
    ax.text(13.3, 4.3, "diodo\n1N4007", fontsize=8, ha="left"); ax.text(11.4, 5.6, "faixa (catodo) do lado do +", ha="center", fontsize=8, color=CINZA)
    ax.text(7.0, 6.05, "Relé solto (placa desligada ou timer mandando ligar): COM encosta no NF e a bomba funciona", ha="center", fontsize=9, color=VERDE, fontweight="bold")
    salvar(fig, "potencia_12v.png")


def potencia_rede():
    fig, ax = plt.subplots(figsize=(9.4, 4.6))
    ax.set_xlim(0, 14); ax.set_ylim(0.3, 7.6); ax.axis("off")
    ax.text(0.15, 5.0, "FASE", fontsize=9, fontweight="bold", color=VERM)
    ax.text(0.15, 2.4, "NEUTRO", fontsize=9, fontweight="bold", color=AZUL)
    ax.text(0.15, 1.0, "TERRA", fontsize=9, fontweight="bold", color=VERDE)
    caixa(ax, 1.7, 1.9, 1.5, 3.6, "DR\n30 mA", cor="#e8f5e9", borda=VERDE, negrito=True)
    caixa(ax, 3.9, 4.45, 1.5, 0.9, "disjuntor\nou fusível", cor="white", borda="black", fs=8)
    fio(ax, [(0.9, 4.9), (1.7, 4.9)], cor=VERM, lw=2.5); fio(ax, [(3.2, 4.9), (3.9, 4.9)], cor=VERM, lw=2.5); fio(ax, [(5.4, 4.9), (6.4, 4.9)], cor=VERM, lw=2.5)
    nf, na = _contato(ax, 6.5, 4.9)
    fio(ax, [(nf[0] + 0.1, nf[1]), (10.8, nf[1])], cor=VERM, lw=2.5)
    caixa(ax, 10.8, 3.0, 2.2, 3.0, "BOMBA\n127 / 220 V", cor="#bfe0f5", borda=AZUL, negrito=True)
    fio(ax, [(1.5, 2.5), (1.7, 2.5)], cor=AZUL, lw=2.5); fio(ax, [(3.2, 2.5), (10.2, 2.5), (10.2, 3.5), (10.8, 3.5)], cor=AZUL, lw=2.5)
    fio(ax, [(1.1, 1.1), (11.9, 1.1), (11.9, 3.0)], cor=VERDE, lw=2.5, ls=(0, (4, 2)))
    ax.text(6.5, 0.72, "terra até a carcaça da bomba (bombas com plugue de 3 pinos)", ha="center", fontsize=8, color=VERDE)
    ax.text(6.6, 2.75, "o neutro NÃO passa pelo relé", ha="center", fontsize=8, color=AZUL)
    ax.add_patch(FancyBboxPatch((3.6, 3.2), 9.9, 3.65, boxstyle="round,pad=0.02,rounding_size=0.15", fc="none", ec=VERM, lw=1.3, ls="--", zorder=0))
    ax.text(7.0, 7.15, "tudo isto dentro de caixa isolante fechada, montada por adulto habilitado, com a tomada desligada", ha="center", fontsize=8.5, color=VERM, fontweight="bold")
    salvar(fig, "potencia_rede.png")


# ---------------------------------------------------------------- 8: millis
def millis_linha():
    fig, ax = plt.subplots(figsize=(9.4, 2.9))
    ax.set_xlim(0, 14); ax.set_ylim(0, 4.3); ax.axis("off")
    seta(ax, (0.4, 1.5), (13.7, 1.5), cor="black", lw=1.8)
    ax.text(13.7, 1.15, "millis()", ha="right", fontsize=9, style="italic")
    ax.add_patch(Rectangle((2.0, 1.5), 6.0, 0.55, fc="#c8e6c9", ec=VERDE, lw=1.2)); ax.text(5.0, 1.77, "fase LIGADA", ha="center", va="center", fontsize=8.5, color=VERDE, fontweight="bold")
    ax.add_patch(Rectangle((8.0, 1.5), 4.8, 0.55, fc="#eeeeee", ec=CINZA, lw=1.2)); ax.text(10.4, 1.77, "fase DESLIGADA", ha="center", va="center", fontsize=8.5, color=CINZA, fontweight="bold")
    for x, t, cor in [(2.0, "inicioDaFase", AZUL), (6.2, "agora", LARANJA), (8.0, "troca!", VERM)]:
        ax.plot([x, x], [1.15, 2.4], color=cor, lw=1.6); ax.text(x, 0.85, t, ha="center", fontsize=9, color=cor, fontweight="bold")
    ax.annotate("", xy=(6.2, 2.75), xytext=(2.0, 2.75), arrowprops=dict(arrowstyle="<->", color=LARANJA))
    ax.text(4.1, 2.87, "agora − inicioDaFase  (quanto já passou)", ha="center", fontsize=8.5, color=LARANJA)
    ax.annotate("", xy=(8.0, 3.5), xytext=(2.0, 3.5), arrowprops=dict(arrowstyle="<->", color=VERDE))
    ax.text(5.0, 3.62, "duracao = TEMPO_LIGADA", ha="center", fontsize=8.5, color=VERDE)
    ax.text(10.9, 3.2, "quando o que passou\nalcança a duração,\ntroca o estado e\ninicioDaFase = agora", ha="center", va="center", fontsize=8.5, color=VERM)
    salvar(fig, "millis_linha.png")


if __name__ == "__main__":
    bancada_timer(); ciclo_timer(); energia(); rele_interno(); modulo_rele(); potencia_12v(); potencia_rede(); millis_linha()
