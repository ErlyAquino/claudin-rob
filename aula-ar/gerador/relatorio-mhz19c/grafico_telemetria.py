"""Le a serie do MH-Z19C gravada na telemetria-cria (/api/historico) e gera os graficos do relatorio.

Uso (a partir de python-dados/):
  uv run python ../aula-ar/gerador/relatorio-mhz19c/grafico_telemetria.py --minutos 30
"""
import argparse, json, os, urllib.request
from datetime import datetime, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

AQUI = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--servidor", default="http://127.0.0.1:3000")
ap.add_argument("--projeto", default="teste")
ap.add_argument("--no", default="no19")
ap.add_argument("--minutos", type=int, default=30)
ap.add_argument("--marcas", default="", help='eventos "HH:MM:SS=texto;HH:MM:SS=texto" (dia de hoje)')
a = ap.parse_args()


def serie(grandeza):
    url = f"{a.servidor}/api/historico?projeto={a.projeto}&no={a.no}&grandeza={grandeza}&minutos={a.minutos}"
    with urllib.request.urlopen(url, timeout=10) as r:
        dados = json.load(r)
    pts = dados.get("pontos", dados) if isinstance(dados, dict) else dados
    t, v = [], []
    for p in pts:
        tt = p.get("t") or p.get("tempo") or p.get("_time")
        t.append(datetime.fromtimestamp(tt / 1000) if isinstance(tt, (int, float)) else datetime.fromisoformat(str(tt).replace("Z", "+00:00")).astimezone().replace(tzinfo=None))
        v.append(p.get("valor", p.get("v")))
    return t, v


def lacunas(sr, seg=25):
    """insere NaN onde faltam leituras (> seg s), para a linha nao atravessar o periodo sem dados"""
    t, v = sr
    tt, vv = [], []
    for i, (a_, b_) in enumerate(zip(t, v)):
        if i and (a_ - t[i - 1]).total_seconds() > seg:
            tt.append(t[i - 1] + timedelta(seconds=10)); vv.append(float("nan"))
        tt.append(a_); vv.append(b_)
    return tt, vv


co2 = serie("co2")
temp = serie("temperatura")
rein = serie("reinicios")
falh = serie("falhas")
json.dump({"co2": len(co2[0]), "temperatura": len(temp[0]), "reinicios": len(rein[0]), "falhas_max": max(falh[1]) if falh[1] else None,
           "co2_valores": sorted(set(co2[1])), "reinicios_max": max(rein[1]) if rein[1] else None,
           "inicio": str(co2[0][0]) if co2[0] else None, "fim": str(co2[0][-1]) if co2[0] else None},
          open(os.path.join(AQUI, "resumo_telemetria.json"), "w"), indent=1)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 5.6), sharex=True, gridspec_kw={"height_ratios": [2.2, 1]})
ax1.axhspan(400, 1000, color="#2e7d32", alpha=0.08, label="faixa saudável (≤ 1000 ppm)")
ax1.axhline(1000, color="#c55a11", lw=1, ls="--")
g = lacunas(co2)
ax1.step(g[0], g[1], where="post", color="#1f4e79", lw=1.8, marker="o", ms=3, label="CO₂ lido (0x86)")
ax1.set_ylabel("CO₂ (ppm)")
ax1.set_ylim(0, 5600)
ax1.annotate("500 ppm = valor fixo do pré-aquecimento", xy=(0.72, 0.115), xycoords="axes fraction", fontsize=8, color="#595959")
ax1.annotate("5000 ppm = fundo de escala (saturado)", xy=(0.01, 0.91), xycoords="axes fraction", fontsize=8, color="#595959")
ax1.legend(loc="center right", fontsize=8)
ax1.grid(alpha=0.3)
ax1.set_title(f"MH-Z19C na telemetria-cria — cria/{a.projeto}/{a.no}", fontsize=11)
ax2.step(rein[0], rein[1], where="post", color="#c55a11", lw=1.8, label="reinícios detectados")
if falh[0]:
    ax2.step(falh[0], falh[1], where="post", color="#8e24aa", lw=1.4, ls="--", label="respostas inválidas (0x86)")
ax2.set_ylabel("contagem")
ax2b = ax2.twinx()
g = lacunas(temp)
ax2b.plot(g[0], g[1], color="#595959", lw=1, ls=":", label="temperatura interna (°C)")
ax2b.set_ylabel("°C")
ax2b.set_ylim(10, 35)
ax2.legend(loc="upper left", fontsize=8); ax2b.legend(loc="lower right", fontsize=8)
ax2.grid(alpha=0.3)
hoje = datetime.now().date()
for k, m in enumerate(x for x in a.marcas.split(";") if "=" in x):
    hora, texto = m.split("=", 1)
    tx = datetime.combine(hoje, datetime.strptime(hora.strip(), "%H:%M:%S").time())
    for ax in (ax1, ax2):
        ax.axvline(tx, color="#b71c1c", lw=1, ls="-.")
    ax1.annotate(texto, xy=(tx, 2600 - 500 * k), xytext=(4, 0), textcoords="offset points", fontsize=8, color="#b71c1c")
ax2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
ax2.set_xlabel("hora")
fig.tight_layout()
fig.savefig(os.path.join(AQUI, "grafico_telemetria.png"), dpi=200)
print(open(os.path.join(AQUI, "resumo_telemetria.json")).read())
