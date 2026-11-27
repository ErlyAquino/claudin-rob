#!/usr/bin/env python3
"""Gera as figuras e as tabelas do relatorio do ensaio de 24 h.

  cd python-dados && uv run python ../teste-24h/relatorio/gerar_graficos.py

Le ../amostras.jsonl (uma amostra por minuto) e escreve, nesta pasta:
  figuras/*.pdf            graficos usados pelo relatorio.tex (numerados na ordem do texto)
  tabela_horaria.tex       estatisticas por hora (tabela completa)
  numeros.tex              macros com os numeros citados no texto
"""
import json, os, statistics as st
from datetime import datetime, timedelta, timezone

import matplotlib
matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

AQUI = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(AQUI, "figuras")
os.makedirs(FIG, exist_ok=True)

FUSO = timezone(timedelta(hours=-3))          # hora de Recife, fixa (nao depende da maquina)
INICIO = datetime(2026, 11, 25, 17, 47)
FIM = INICIO + timedelta(hours=24)
# Sala em uso, inferido pelos sensores: 07:45 (umidade e temperatura comecam a cair, sinal de
# ar-condicionado ligado) ate 16:30 (o CO2 fica de vez abaixo de 1000 ppm).
USO_INI = datetime(2026, 11, 26, 7, 45)
USO_FIM = datetime(2026, 11, 26, 16, 30)
NOITE_INI = datetime(2026, 11, 25, 20, 0)
NOITE_FIM = datetime(2026, 11, 26, 6, 0)

AZUL, AZUL_CLARO, AZUL_ESCURO, LARANJA = "#257de0", "#84b9f3", "#0e3d7e", "#f47230"
TINTA, TINTA2, GRADE, REF = "#191919", "#555555", "#e3e3e3", "#444444"
FAIXA = "#efefef"

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 9, "text.color": TINTA,
    "axes.edgecolor": GRADE, "axes.labelcolor": TINTA2, "axes.titlesize": 10,
    "axes.titleweight": "bold", "axes.titlelocation": "left",
    "xtick.color": TINTA2, "ytick.color": TINTA2, "axes.grid": True, "grid.color": GRADE,
    "grid.linewidth": 0.6, "axes.spines.top": False, "axes.spines.right": False,
    "axes.axisbelow": True, "figure.dpi": 150, "savefig.bbox": "tight", "pdf.fonttype": 42,
})


def num(x, casas=0):
    """Numero no formato brasileiro, arredondando o meio para cima (62,5 -> 63)."""
    fator = 10 ** casas
    x = int(abs(x) * fator + 0.5 + 1e-9) / fator * (1 if x >= 0 else -1)
    s = f"{x:,.{casas}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def br(x, casas=0):
    """Como num(), mas com o sinal de menos em modo matematico (para o LaTeX)."""
    return num(x, casas).replace("-", "$-$")


def eixo_br(ax, casas=0, eixo="y"):
    f = FuncFormatter(lambda v, _: num(v, casas).replace("-", "−"))
    (ax.yaxis if eixo == "y" else ax.xaxis).set_major_formatter(f)


# ---------------------------------------------------------------- dados
am = [json.loads(l) for l in open(os.path.join(AQUI, "..", "amostras.jsonl")) if l.strip()]
linhas = []
for a in am:
    t = datetime.fromtimestamp(a["t"], FUSO).replace(tzinfo=None)
    if not (INICIO <= t <= FIM):
        continue
    n = a["nos"]

    def g(no, grandeza):
        v = n.get(no, {}).get("g", {}).get(grandeza)
        return v[0] if v and v[1] <= 60 else None      # so leituras frescas (ate 60 s)
    linhas.append({
        "t": t, "co2": g("no7", "co2"), "mq2": g("no6", "mq2"),
        "temp": g("no8", "temperatura"), "umid": g("no8", "umidade"),
        "perda": {k: (n[k]["perda"]["esperadas"] - n[k]["perda"]["recebidas"]) if n.get(k, {}).get("perda") else None
                  for k in ("no6", "no7", "no8", "no10")},
    })


def serie(k):
    return [(l["t"], l[k]) for l in linhas if l[k] is not None]


def em_uso(t):
    return USO_INI <= t < USO_FIM


def noite(t):
    return NOITE_INI <= t < NOITE_FIM


def eixo_hora(ax, intervalo=2):
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=intervalo))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Hh"))


def faixa_uso(ax, rotulo=False):
    ax.axvspan(USO_INI, USO_FIM, color=FAIXA, zorder=0, lw=0)
    if rotulo:
        ax.text(USO_INI + (USO_FIM - USO_INI) / 2, 1.02, "sala em uso (07:45 às 16:30)",
                transform=ax.get_xaxis_transform(), ha="center", va="bottom", fontsize=8, color=TINTA2)


def linha_ref(ax, y, txt, x, ha="left", va="bottom"):
    ax.axhline(y, color=REF, lw=0.9, ls=(0, (4, 3)))
    ax.text(x, y, txt, va=va, ha=ha, fontsize=7.5, color=TINTA2,
            bbox=dict(facecolor="white", edgecolor="none", pad=1.2, alpha=0.85))


horas = []
h = INICIO.replace(minute=0)
while h < FIM:
    horas.append(h)
    h += timedelta(hours=1)
ROT_HORAS = [f"{hh:%H}h" for hh in horas]


def eixo_barras(ax):
    ax.set_xticks(range(len(horas)))
    ax.set_xticklabels(ROT_HORAS, fontsize=7.5)
    meia = next(i for i, hh in enumerate(horas) if hh.hour == 0)
    ax.axvline(meia - 0.5, color=REF, lw=0.7, ls=(0, (2, 2)))
    ax.text(meia - 0.62, -0.19, "25/11", transform=ax.get_xaxis_transform(), ha="right", fontsize=7.5, color=TINTA2)
    ax.text(meia - 0.38, -0.19, "26/11", transform=ax.get_xaxis_transform(), ha="left", fontsize=7.5, color=TINTA2)
    ax.grid(axis="x", visible=False)


# ---------------------------------------------------------------- figura 1: as quatro grandezas
ESQ = INICIO + timedelta(minutes=25)
paineis = [
    ("co2", "CO₂ (ppm) — sensor MH-Z19C, no7", 0, [(1000, "1.000 ppm (alvo de renovação do ar)")]),
    ("mq2", "MQ-2, razão Rs/R0 (menor = mais gases e vapores) — no6", 1, []),
    ("temp", "Temperatura (°C) — sensor DHT22, no8", 0, [(26, "26 °C (teto da faixa de referência)")]),
    ("umid", "Umidade relativa (%) — sensor DHT22, no8", 0,
     [(65, "65 % (teto da faixa de referência)"), (35, "35 % (piso da faixa de referência)")]),
]
fig, axs = plt.subplots(4, 1, figsize=(7.4, 9.0), sharex=True)
for i, (ax, (k, titulo, casas, refs)) in enumerate(zip(axs, paineis)):
    s = serie(k)
    faixa_uso(ax, rotulo=(i == 0))
    ax.plot([p[0] for p in s], [p[1] for p in s], color=AZUL, lw=1.4)
    ax.set_title(titulo, pad=14 if i == 0 else 6)
    for y, txt in refs:
        linha_ref(ax, y, txt, USO_INI + timedelta(minutes=20) if y == 65 else ESQ)
    ax.axvline(datetime(2026, 11, 26), color=REF, lw=0.7, ls=(0, (2, 2)))
    ax.margins(x=0)
    eixo_br(ax, casas)
axs[0].set_ylim(0, 4600)
axs[1].set_ylim(0, 0.75)
axs[2].set_ylim(25.5, 30.5)
axs[3].set_ylim(30, 80)
axs[1].text(datetime(2026, 11, 26) - timedelta(minutes=8), 0.03, "25/11", ha="right", fontsize=7.5, color=TINTA2)
axs[1].text(datetime(2026, 11, 26) + timedelta(minutes=8), 0.03, "26/11", ha="left", fontsize=7.5, color=TINTA2)
eixo_hora(axs[-1])
axs[-1].set_xlabel("hora local")
fig.tight_layout(h_pad=1.2)
fig.savefig(os.path.join(FIG, "fig1_grandezas_24h.pdf"))
plt.close(fig)

# ---------------------------------------------------------------- figura 2: CO2 no dia de uso
s = [p for p in serie("co2") if datetime(2026, 11, 26, 6, 30) <= p[0] <= FIM]
fig, ax = plt.subplots(figsize=(7.4, 3.7))
faixa_uso(ax, rotulo=True)
ax.plot([p[0] for p in s], [p[1] for p in s], color=AZUL, lw=1.6)
DIR = FIM - timedelta(minutes=6)
linha_ref(ax, 1000, "1.000 ppm: alvo", datetime(2026, 11, 26, 6, 36))
linha_ref(ax, 2000, "2.000 ppm: o dobro do alvo", DIR, ha="right")
linha_ref(ax, 3900, "3.900 ppm: limite ocupacional (média da jornada de adultos)", datetime(2026, 11, 26, 6, 36))
pico = max(s, key=lambda p: p[1])
ax.plot([pico[0]], [pico[1]], "o", ms=5, color=AZUL, mec="white", mew=1.2)
ax.annotate(f"leitura isolada de {num(pico[1])} ppm às {pico[0]:%H:%M}", pico, xytext=(8, 0),
            textcoords="offset points", fontsize=8, va="center",
            bbox=dict(facecolor="white", edgecolor="none", pad=1.2, alpha=0.85))
ax.set_ylim(0, 4700)
ax.margins(x=0)
ax.set_title("CO₂ na sala em 26/11/2026", pad=14)
ax.set_ylabel("CO₂ (ppm)")
ax.set_xlabel("hora local")
eixo_hora(ax, 1)
eixo_br(ax)
ax.grid(axis="x", visible=False)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig2_co2_dia.pdf"))
plt.close(fig)

# ---------------------------------------------------------------- figura 3: tempo em cada faixa de CO2, por hora
classes = [("até 1.000 ppm", AZUL_CLARO), ("de 1.000 a 2.000 ppm", AZUL), ("acima de 2.000 ppm", AZUL_ESCURO)]
cont = {hh: [0, 0, 0] for hh in horas}
for t, v in serie("co2"):
    cont[t.replace(minute=0, second=0, microsecond=0)][0 if v <= 1000 else 1 if v <= 2000 else 2] += 1
fig, ax = plt.subplots(figsize=(7.4, 3.2))
base = [0] * len(horas)
for i, (nome, cor) in enumerate(classes):
    vals = [cont[hh][i] for hh in horas]
    ax.bar(range(len(horas)), vals, bottom=base, color=cor, width=0.78, label=nome, edgecolor="white", linewidth=1)
    base = [b + v for b, v in zip(base, vals)]
eixo_barras(ax)
ax.set_ylabel("minutos na hora")
ax.set_title("Minutos de cada hora em cada faixa de CO₂")
ax.legend(frameon=False, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.24), fontsize=8)
ax.set_ylim(0, 62)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig3_co2_faixas_hora.pdf"))
plt.close(fig)

# ---------------------------------------------------------------- figura 4: CO2 x MQ-2
pares = [(l["co2"], l["mq2"], "uso" if em_uso(l["t"]) else "noite" if noite(l["t"]) else "outros")
         for l in linhas if l["co2"] is not None and l["mq2"] is not None]
fig, ax = plt.subplots(figsize=(5.4, 3.9))
for grupo, cor, marca, nome in (("outros", "#9a9a9a", "s", "demais horários"),
                                ("noite", AZUL, "o", "noite, sala vazia (20h às 6h)"),
                                ("uso", LARANJA, "^", "sala em uso (07:45 às 16:30)")):
    ax.scatter([p[0] for p in pares if p[2] == grupo], [p[1] for p in pares if p[2] == grupo],
               s=11, color=cor, marker=marca, alpha=0.6, lw=0, label=nome)
ax.set_xlabel("CO₂ (ppm)")
ax.set_ylabel("MQ-2, razão Rs/R0")
ax.set_title("Quando o CO₂ sobe, a razão do MQ-2 cai")
ax.legend(frameon=False, markerscale=1.8, fontsize=8, loc="upper right")
ax.set_ylim(0, 0.75)
eixo_br(ax, 1)
eixo_br(ax, 0, "x")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig4_co2_mq2.pdf"))
plt.close(fig)


def pearson(xs, ys):
    mx, my = st.mean(xs), st.mean(ys)
    n_ = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return n_ / (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5


r_uso = pearson([p[0] for p in pares if p[2] == "uso"], [p[1] for p in pares if p[2] == "uso"])
r_tudo = pearson([p[0] for p in pares], [p[1] for p in pares])

# ---------------------------------------------------------------- figura 5: leituras perdidas por hora
perdas = {hh: {"no6": 0, "outros": 0} for hh in horas}
for a, b in zip(linhas, linhas[1:]):
    hh = b["t"].replace(minute=0, second=0, microsecond=0)
    for no in ("no6", "no7", "no8", "no10"):
        if a["perda"][no] is not None and b["perda"][no] is not None and b["perda"][no] > a["perda"][no]:
            perdas[hh]["no6" if no == "no6" else "outros"] += b["perda"][no] - a["perda"][no]
fig, ax = plt.subplots(figsize=(7.4, 3.0))
v6 = [perdas[hh]["no6"] for hh in horas]
vo = [perdas[hh]["outros"] for hh in horas]
ax.bar(range(len(horas)), v6, color=AZUL, width=0.78, label="no6 (MQ-2)", edgecolor="white", linewidth=1)
ax.bar(range(len(horas)), vo, bottom=v6, color="#4a4a4a", width=0.78, label="no7 e no8", edgecolor="white",
       linewidth=1, hatch="///")
for i, (a6, ao) in enumerate(zip(v6, vo)):
    if a6 + ao:
        ax.text(i, a6 + ao + 0.6, str(a6 + ao), ha="center", fontsize=7.5, color=TINTA)
i7 = next(i for i, hh in enumerate(horas) if hh.day == 26 and hh.hour == 7)
ax.annotate("episódio do no6\n(07:17 às 08:07)", (i7 - 0.45, v6[i7] * 0.8), xytext=(i7 - 5.2, v6[i7] * 0.72),
            fontsize=8, color=TINTA2, arrowprops=dict(arrowstyle="-", color=TINTA2, lw=0.7), va="center")
eixo_barras(ax)
ax.set_ylabel("leituras perdidas")
ax.set_title("Leituras perdidas em cada hora (de cerca de 1.450 esperadas por hora)")
ax.legend(frameon=False, fontsize=8, loc="upper left")
ax.set_ylim(0, max(a + b for a, b in zip(v6, vo)) * 1.18)
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig5_perdas_hora.pdf"))
plt.close(fig)

# ---------------------------------------------------------------- tabela por hora
CABECA = r"""{\small
\begin{longtable}{@{}lrrrrrrrr@{}}
\toprule
 & \multicolumn{2}{c}{\textbf{\cod{} (ppm)}} & \multicolumn{2}{c}{\textbf{MQ-2 (Rs/R0)}} & \multicolumn{2}{c}{\textbf{Temp. (\textdegree C)}} & \multicolumn{2}{c}{\textbf{Umidade (\%)}} \\
\cmidrule(lr){2-3}\cmidrule(lr){4-5}\cmidrule(lr){6-7}\cmidrule(l){8-9}
\textbf{Hora} & média & máx. & média & mín. & média & máx. & média & máx. \\
\midrule
\endhead
"""
with open(os.path.join(AQUI, "tabela_horaria.tex"), "w") as f:
    f.write(CABECA)
    for hh in horas:
        bloco = [l for l in linhas if l["t"].replace(minute=0, second=0, microsecond=0) == hh]
        if not bloco:
            continue

        def e(k, casas):
            v = [l[k] for l in bloco if l[k] is not None]
            return f"{br(st.mean(v), casas)} & {br(max(v), casas)}" if v else "-- & --"
        vmq = [l["mq2"] for l in bloco if l["mq2"] is not None]
        mq = f"{br(st.mean(vmq), 2)} & {br(min(vmq), 2)}"
        cinza = r"\rowcolor{uso}" if (USO_INI.replace(minute=0) <= hh < USO_FIM) else ""
        f.write(f"{cinza}{hh:%d/%m} {hh:%H}h & {e('co2', 0)} & {mq} & {e('temp', 1)} & {e('umid', 0)} \\\\\n")
    f.write(r"""\bottomrule
\caption{Estatísticas de cada hora do ensaio. As linhas em cinza são as horas que têm algum trecho do período de uso (07:45 às 16:30). A primeira e a última linha cobrem só parte da hora, porque o ensaio começou e terminou às 17:47.}\label{tab:horas}
\end{longtable}
}
""")


# ---------------------------------------------------------------- numeros citados no texto
def stats(k, filtro):
    v = [l[k] for l in linhas if l[k] is not None and filtro(l["t"])]
    return min(v), st.mean(v), st.median(v), max(v)


def acima(lim, filtro=lambda t: True):
    return sum(1 for l in linhas if l["co2"] is not None and l["co2"] > lim and filtro(l["t"]))


macros = {}
for nome, filtro in (("Uso", em_uso), ("Noite", noite), ("Tudo", lambda t: True)):
    for k, casas in (("co2", 0), ("mq2", 2), ("temp", 1), ("umid", 0)):
        mn, me, md, mx = stats(k, filtro)
        K = {"co2": "Co", "mq2": "Mq", "temp": "Te", "umid": "Um"}[k]
        macros[f"{K}{nome}Min"] = br(mn, casas)
        macros[f"{K}{nome}Med"] = br(me, casas)
        macros[f"{K}{nome}Max"] = br(mx, casas)
min_uso = sum(1 for l in linhas if em_uso(l["t"]))
for lim, nome in ((1000, "Mil"), (1500, "MilQuinhentos"), (2000, "DoisMil"), (3000, "TresMil")):
    m, mu = acima(lim), acima(lim, em_uso)
    macros[f"MinAcima{nome}"] = br(m)
    macros[f"MinUsoAcima{nome}"] = br(mu)
    macros[f"HorasUsoAcima{nome}"] = br(mu / 60, 1)
    macros[f"PctUsoAcima{nome}"] = br(100 * mu / min_uso)
macros["MinUso"] = br(min_uso)
macros["HorasUso"] = br(min_uso / 60, 2).rstrip("0").rstrip(",")
macros["PicoCo"] = br(pico[1])
macros["PicoCoHora"] = f"{pico[0]:%H:%M}"
macros["RUso"] = br(r_uso, 2)
macros["RTudo"] = br(r_tudo, 2)
macros["UmidAcimaSessentaCinco"] = br(100 * sum(1 for l in linhas if l["umid"] and l["umid"] > 65) / len(linhas))
macros["UmidUsoAcimaSessentaCinco"] = br(100 * sum(1 for l in linhas if l["umid"] and l["umid"] > 65 and em_uso(l["t"])) / min_uso)
macros["TempAteVinteSeis"] = str(sum(1 for l in linhas if l["temp"] is not None and l["temp"] <= 26))
macros["PerdasNoSeisManha"] = str(sum(perdas[hh]["no6"] for hh in horas if hh.day == 26 and hh.hour in (7, 8)))
medias_mq = [st.mean([l["mq2"] for l in linhas if l["mq2"] is not None and l["t"].replace(minute=0, second=0, microsecond=0) == hh]) for hh in horas]
macros["MqMenorMediaHora"] = br(min(medias_mq), 2)
macros["MqPctMenorMediaHora"] = br(100 * min(medias_mq) / stats("mq2", noite)[1])
for ger, nome in ((15, "Quinze"), (19, "Dezenove")):
    # vazao de ar externo por pessoa (m3/h) que sustenta 3.500 ppm com o ar externo em 430 ppm,
    # para uma geracao de `ger` litros de CO2 por hora por pessoa
    macros[f"Vazao{nome}"] = br(ger / 1000 / ((3500 - 430) * 1e-6), 0)
with open(os.path.join(AQUI, "numeros.tex"), "w") as f:
    for k, v in macros.items():
        f.write(f"\\newcommand{{\\{k}}}{{{v}}}\n")
for k, v in macros.items():
    print(k, v)
