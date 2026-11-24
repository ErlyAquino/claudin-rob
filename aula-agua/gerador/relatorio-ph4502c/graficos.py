"""Graficos do relatorio de calibracao do pH-4502C.
  curva_calibracao.png  reta tensao x pH (Uno e ESP32 com divisor) e os pontos dos tampoes
  erros.png             erro de pH: so offset (1 ponto) x 2 pontos, e efeito da temperatura
  bancada.png           leituras da bancada (telemetria-cria, cria/teste/no5) + resumo_bancada.json
Uso (a partir de python-dados/):
  uv run python ../aula-agua/gerador/relatorio-ph4502c/graficos.py            # usa bancada.json salvo
  uv run python ../aula-agua/gerador/relatorio-ph4502c/graficos.py --baixar 120   # busca os ultimos 120 min no servidor
"""
import json, os, sys, statistics as st
from datetime import datetime
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

AQUI = os.path.dirname(os.path.abspath(__file__))
AZUL, LARANJA, CINZA, VERDE, VERM = "#1f4e79", "#c55a11", "#595959", "#2e7d32", "#c0392b"
ARQ = os.path.join(AQUI, "bancada.json")

if "--baixar" in sys.argv:
    import requests
    minutos = int(sys.argv[sys.argv.index("--baixar") + 1])
    dados = {g: requests.get("http://127.0.0.1:3000/api/historico", timeout=10,
                             params=dict(projeto="teste", no="no5", grandeza=g, minutos=minutos)).json() for g in ("tensao", "ph")}
    json.dump(dados, open(ARQ, "w"))

# ---------- 1: reta de calibracao ----------
ph = np.linspace(0, 14, 100)
fig, ax = plt.subplots(figsize=(8.6, 4.4))
ax.plot(ph, 2.5 - 0.1775 * (ph - 7), color=AZUL, lw=2, label="Po no Uno — ideal: 2,500 V em pH 7; −0,177 V/pH")
ax.plot(ph, (2.5 - 0.1775 * (ph - 7)) * 2 / 3, color=LARANJA, lw=2, label="GPIO 34 do ESP32 (divisor 2/3) — ideal: 1,667 V; −0,118 V/pH")
v7, incl = 2.56, -0.160                      # exemplo de sonda real: offset +60 mV, inclinacao 90 %
ax.plot(ph, v7 + incl * (ph - 7), color=AZUL, lw=1.3, ls="--", label="exemplo de sonda usada (Uno): V7 = 2,56 V; −0,160 V/pH (90 %)")
for p, nome in ((4.01, "tampão 4,01"), (7.00, "tampão 7,00"), (10.01, "tampão 10,01")):
    y = v7 + incl * (p - 7)
    ax.plot(p, y, "o", color=AZUL, ms=7); ax.annotate(nome, (p, y), xytext=(6, 8), textcoords="offset points", fontsize=8)
for p in (4.01, 7.00, 10.01):
    ax.plot(p, (2.5 - 0.1775 * (p - 7)) * 2 / 3, "o", color=LARANJA, ms=6)
ax.axvline(7, color=CINZA, lw=0.8, ls=":")
ax.set_xlabel("pH"); ax.set_ylabel("tensão no pino (V)"); ax.set_xlim(0, 14); ax.set_ylim(0, 4)
ax.set_title("A reta de calibração: tensão × pH", fontsize=10); ax.grid(alpha=0.3); ax.legend(fontsize=8, loc="upper right")
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "curva_calibracao.png"), dpi=200); plt.close(fig)

# ---------- 2: erros ----------
fig, (a1, a2) = plt.subplots(1, 2, figsize=(9, 3.8))
for frac, cor in ((1.0, VERDE), (0.95, AZUL), (0.90, LARANJA), (0.85, VERM)):
    # calibrou so o pH 7 e deixou a inclinacao teorica: pH indicado = 7 + frac*(pH-7)
    a1.plot(ph, (7 + frac * (ph - 7)) - ph, color=cor, lw=1.6, label=f"sonda com {frac*100:.0f} % da inclinação")
a1.axhspan(-0.1, 0.1, color=VERDE, alpha=0.1)
a1.set_title("Só 1 ponto (pH 7), inclinação teórica", fontsize=9); a1.set_xlabel("pH real"); a1.set_ylabel("erro (pH indicado − real)")
a1.set_xlim(0, 14); a1.grid(alpha=0.3); a1.legend(fontsize=7.5)
for T, cor in ((5, AZUL), (15, "#5b9bd5"), (35, LARANJA), (45, VERM)):
    k = (273.15 + T) / 298.15                # inclinacao real / inclinacao calibrada a 25 C
    a2.plot(ph, (7 + k * (ph - 7)) - ph, color=cor, lw=1.6, label=f"amostra a {T} °C")
a2.axhspan(-0.1, 0.1, color=VERDE, alpha=0.1)
a2.set_title("Calibrado em 2 pontos a 25 °C, medindo em outra temperatura", fontsize=9); a2.set_xlabel("pH real")
a2.set_xlim(0, 14); a2.set_ylim(*a1.get_ylim()); a2.grid(alpha=0.3); a2.legend(fontsize=7.5)
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "erros.png"), dpi=200); plt.close(fig)

# ---------- 3: bancada ----------
d = json.load(open(ARQ))
T = lambda p: datetime.fromtimestamp(p["t"] / 1000)
tv, vv = [T(p) for p in d["tensao"]], [p["valor"] for p in d["tensao"]]
tp, pv = [T(p) for p in d["ph"]], [p["valor"] for p in d["ph"]]
fig, (a1, a2) = plt.subplots(2, 1, figsize=(9, 5), sharex=True)
a1.plot(tv, vv, color=AZUL, lw=1.2, label="tensão no GPIO 34 (média aparada de 30 leituras)")
a1.axhline(1.667, color=VERDE, ls="--", lw=1.2, label="esperado em pH 7 com o divisor (1,667 V)")
a1.axhline(2.45, color=VERM, ls=":", lw=1.2, label="limite da faixa confiável do ADC (2,45 V)")
a1.set_ylabel("V"); a1.grid(alpha=0.3); a1.legend(fontsize=7.5, loc="lower right"); a1.set_ylim(1.5, max(3.0, max(vv) + 0.1))
a1.set_title(f"Bancada, {tv[0]:%d/%m/%Y}: sketch 01b no ESP32, sem calibração — cria/teste/no5", fontsize=10)
a2.plot(tp, pv, color=LARANJA, lw=1.2, label="pH indicado (calibração padrão do sketch)")
a2.axhspan(6.5, 8.5, color=VERDE, alpha=0.1, label="faixa “normal” do sketch (6,5–8,5)")
a2.set_ylabel("pH"); a2.grid(alpha=0.3); a2.legend(fontsize=7.5, loc="center right")
a2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "bancada.png"), dpi=200); plt.close(fig)

n = len(vv); k = max(1, n // 10)
res = {"data": f"{tv[0]:%d/%m/%Y}", "inicio": f"{tv[0]:%H:%M}", "fim": f"{tv[-1]:%H:%M}", "n": n,
       "minutos": round((tv[-1] - tv[0]).total_seconds() / 60),
       "v_min": min(vv), "v_max": max(vv), "v_med": round(st.mean(vv), 3), "v_dp": round(st.pstdev(vv), 3),
       "v_ini": round(st.mean(vv[:k]), 3), "v_fim": round(st.mean(vv[-k:]), 3),
       "ph_min": min(pv), "ph_max": max(pv), "ph_ini": round(st.mean(pv[:k]), 2), "ph_fim": round(st.mean(pv[-k:]), 2),
       "acima_245": sum(v > 2.45 for v in vv)}
json.dump(res, open(os.path.join(AQUI, "resumo_bancada.json"), "w"), indent=1)
print(res)
