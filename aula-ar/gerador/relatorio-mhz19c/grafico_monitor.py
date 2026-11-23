"""Grafico da sessao com o monitor direto (monitor_mhz19c.py) depois de religar os fios, 09/11/2026 13:39-13:59.
Le monitor_1339.json (eventos do /eventos salvos) e gera grafico_monitor.png + resumo_monitor.json.
Uso (a partir de python-dados/): uv run python ../aula-ar/gerador/relatorio-mhz19c/grafico_monitor.py
"""
import json, os
from datetime import datetime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

AQUI = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(AQUI, "monitor_1339.json")))
T = lambda e: datetime.fromtimestamp(e["t"] / 1000)
co = [e for e in ev if e["tipo"] == "co2"]
dht = [e for e in ev if e["tipo"] == "dht"]
al = [e for e in ev if e["tipo"] == "alerta" and T(e) >= T(co[0])]
fal = [e for e in ev if e["tipo"] == "falha"]

fig, (a1, a2) = plt.subplots(2, 1, figsize=(9, 5.2), sharex=True, gridspec_kw={"height_ratios": [2.2, 1]})
a1.axhspan(400, 1000, color="#2e7d32", alpha=0.08, label="faixa saudável (≤ 1000 ppm)")
a1.axhline(430, color="#595959", lw=1, ls=":", label="ar externo (~430 ppm)")
a1.plot([T(e) for e in co], [e["ppm"] for e in co], color="#1f4e79", lw=1.6, label="CO₂ (0x86, a cada 2 s)")
for e in al:
    a1.axvline(T(e), color="#c55a11", lw=1, ls="--")
a1.annotate("falso \"reinício\":\nCO₂ real passando por 500", xy=(T(al[0]), 505), xytext=(30, 60),
            textcoords="offset points", fontsize=8, color="#c55a11", arrowprops=dict(arrowstyle="->", color="#c55a11"))
pico = max(co, key=lambda e: e["ppm"])
a1.annotate(f"sopro: {pico['ppm']} ppm", xy=(T(pico), pico["ppm"]), xytext=(-110, -10), textcoords="offset points",
            fontsize=8, arrowprops=dict(arrowstyle="->"))
a1.set_ylabel("CO₂ (ppm)"); a1.set_ylim(350, max(1100, pico["ppm"] * 1.1)); a1.grid(alpha=0.3); a1.legend(fontsize=8, loc="upper left")
a1.set_title("MH‑Z19C com os fios refeitos — monitor direto, 09/11/2026", fontsize=10)
a2.plot([T(e) for e in dht], [e["temp"] for e in dht], color="#c55a11", lw=1.2, label="temperatura do ar (DHT11, °C)")
a2.plot([T(e) for e in co], [e["temp"] for e in co], color="#595959", lw=1.2, ls="--", label="temperatura interna do MH‑Z19C (°C)")
a2b = a2.twinx()
a2b.plot([T(e) for e in dht], [e["umid"] for e in dht], color="#1f4e79", lw=1, alpha=0.7, label="umidade (DHT11, %)")
a2.set_ylabel("°C"); a2b.set_ylabel("%"); a2.grid(alpha=0.3)
a2.set_ylim(25, 31.5); a2.legend(fontsize=7.5, loc="upper left", ncol=2); a2b.legend(fontsize=7.5, loc="upper right")
a2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "grafico_monitor.png"), dpi=200)

base = [e["ppm"] for e in co if T(e) < T(pico).replace(minute=54, second=59)]
res = {"inicio": T(co[0]).strftime("%H:%M:%S"), "fim": T(co[-1]).strftime("%H:%M"), "n": len(co),
       "falhas_antes": len(fal), "base_min": min(base), "base_max": max(base), "base_med": round(sum(base) / len(base)),
       "pico": pico["ppm"], "pico_t": T(pico).strftime("%H:%M:%S"), "final": co[-1]["ppm"],
       "temp_sensor": sorted({e["temp"] for e in co}), "alertas": [T(e).strftime("%H:%M:%S") for e in al],
       "dht_t": [min(e["temp"] for e in dht), max(e["temp"] for e in dht)], "dht_u": [min(e["umid"] for e in dht), max(e["umid"] for e in dht)]}
json.dump(res, open(os.path.join(AQUI, "resumo_monitor.json"), "w"), indent=1)
print(res)
