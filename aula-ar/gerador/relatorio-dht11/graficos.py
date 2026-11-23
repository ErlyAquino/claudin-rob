"""Graficos e tabelas do relatorio do DHT11.

Uso (a partir de python-dados/):
  uv run python ../aula-ar/gerador/relatorio-dht11/graficos.py            # usa o monitor em localhost:8019
  uv run python ../aula-ar/gerador/relatorio-dht11/graficos.py --sem-monitor

Gera: protocolo.png, sensacao.png, leituras.png (se houver dados) e dados.json (tabelas + resumo do ensaio).
O indice de calor e calculado com o MESMO algoritmo da DHT sensor library (Adafruit) - funcao heat_index().
"""
import argparse, json, math, os, time, urllib.request
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

AQUI = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--monitor", default="http://127.0.0.1:8019")
ap.add_argument("--sem-monitor", action="store_true")
a = ap.parse_args()


# ---------- algoritmo da biblioteca (DHT.cpp, computeHeatIndex) ----------
def c2f(c): return c * 1.8 + 32
def f2c(f): return (f - 32) * 0.55555


def heat_index(t_c, rh):
    T = c2f(t_c)
    hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (rh * 0.094))   # formula simples de Steadman
    if hi > 79:                                                  # regressao de Rothfusz (NWS)
        hi = (-42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh
              - 0.00683783 * T ** 2 - 0.05481717 * rh ** 2 + 0.00122874 * T ** 2 * rh
              + 0.00085282 * T * rh ** 2 - 0.00000199 * T ** 2 * rh ** 2)
        if rh < 13 and 80 <= T <= 112:
            hi -= ((13 - rh) * 0.25) * math.sqrt((17 - abs(T - 95)) * 0.05882)
        elif rh > 85 and 80 <= T <= 87:
            hi += ((rh - 85) * 0.1) * ((87 - T) * 0.2)
    return f2c(hi)


def orvalho(t, rh):  # Magnus (Sonntag 1990: 6,112 hPa; 17,62; 243,12 C)
    g = math.log(rh / 100) + 17.62 * t / (243.12 + t)
    return 243.12 * g / (17.62 - g)


def p_sat(t): return 6.112 * math.exp(17.62 * t / (243.12 + t))  # hPa


def faixa(hi):
    return ("normal" if hi < 27 else "cautela" if hi < 32 else "cautela extrema" if hi < 41
            else "perigo" if hi < 54 else "perigo extremo")


dados = {}
TS = [26, 28, 30, 32, 34, 36]
URS = [40, 50, 60, 70, 80]
dados["tabela_hi"] = [[t] + [round(heat_index(t, u), 1) for u in URS] for t in TS]
dados["exemplos"] = [
    {"t": t, "ur": u, "hi": round(heat_index(t, u), 1), "orv": round(orvalho(t, u), 1),
     "e": round(u / 100 * p_sat(t), 1), "faixa": faixa(heat_index(t, u))}
    for t, u in [(25, 50), (28, 60), (30, 65), (31, 70), (32, 75), (33, 60), (34, 55), (29.5, 47)]]
# erro de umidade causado por 1 C de erro na temperatura do sensor (mesma agua no ar)
dados["sens_temp"] = round(100 * (1 - p_sat(25) / p_sat(26)), 1)

# ---------- figura 1: protocolo de 1 fio ----------
fig, ax = plt.subplots(figsize=(9, 2.9))
seg = [(-20, 0, 1), (0, 70, 0), (70, 95, 1), (95, 175, 0), (175, 255, 1),   # inicio + resposta
       (255, 305, 0), (305, 332, 1), (332, 382, 0), (382, 452, 1), (452, 502, 0), (502, 530, 1)]
xs, ys = [], []
for x0, x1, nv in seg:
    xs += [x0, x1]; ys += [nv, nv]
ax.plot(xs, ys, color="#1f4e79", lw=2)
ax.axvspan(0, 95, color="#c55a11", alpha=0.08); ax.axvspan(95, 255, color="#2e7d32", alpha=0.08)
ax.text(47, 1.42, "ESP32 (biblioteca)", ha="center", fontsize=8.5, color="#c55a11", weight="bold")
ax.text(175, 1.42, "resposta do DHT11", ha="center", fontsize=8.5, color="#2e7d32", weight="bold")
ax.text(392, 1.42, "dados: 40 bits (5 bytes)", ha="center", fontsize=8.5, color="#1f4e79", weight="bold")
for x, t in [(35, "0 por ≥ 18 ms\n(usa 20 ms)"), (135, "0 por 80 µs"), (280, "50 µs"), (357, "50 µs"), (477, "50 µs")]:
    ax.text(x, -0.3, t, ha="center", va="top", fontsize=7.5)
for x, t in [(82, "solta\n~55 µs"), (215, "1 por 80 µs"), (318, "26–28 µs\n= bit 0"), (417, "70 µs\n= bit 1")]:
    ax.text(x, 1.1, t, ha="center", va="bottom", fontsize=7.5)
ax.set_ylim(-0.75, 1.6); ax.set_xlim(-22, 535)
ax.set_yticks([0, 1]); ax.set_yticklabels(["0 V", "3,3 V"]); ax.set_xticks([])
ax.set_title("Linha DATA durante uma leitura (fora de escala: o início dura milissegundos, os bits microssegundos)", fontsize=9.5)
for s_ in ("top", "right", "bottom"): ax.spines[s_].set_visible(False)
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "protocolo.png"), dpi=200); plt.close(fig)

# ---------- figura 2: indice de calor ----------
fig, ax = plt.subplots(figsize=(9, 4.6))
ax.axhspan(27, 32, color="#fff59d", alpha=0.55, label="cautela (27–32 °C)")
ax.axhspan(32, 41, color="#ffcc80", alpha=0.55, label="cautela extrema (32–41 °C)")
ax.axhspan(41, 50, color="#ef9a9a", alpha=0.55, label="perigo (41–54 °C)")
tt = [24 + i * 0.1 for i in range(121)]
cores = ["#90caf9", "#42a5f5", "#1e88e5", "#1565c0", "#0d47a1"]
for u, c in zip(URS, cores):
    ax.plot(tt, [heat_index(t, u) for t in tt], color=c, lw=2, label=f"UR {u} %")
ax.plot(tt, tt, color="#757575", lw=1, ls="--", label="sensação = temperatura")
ax.axvspan(28, 32, color="#2e7d32", alpha=0.07)
ax.text(30, 25.2, "sala de aula com\nventiladores, dia quente", ha="center", fontsize=8, color="#2e7d32")
ax.annotate("degrau: a biblioteca troca de fórmula\nquando o resultado passa de 79 °F (26,1 °C)", xy=(25.6, 26.4), xytext=(26.6, 23.6+1.3),
            fontsize=7.5, color="#595959", arrowprops=dict(arrowstyle="->", color="#595959"))
ax.set_xlabel("temperatura do ar (°C)"); ax.set_ylabel("índice de calor (°C)")
ax.set_xlim(24, 36); ax.set_ylim(24, 50); ax.grid(alpha=0.3)
ax.legend(fontsize=7.5, ncol=2, loc="upper left")
ax.set_title("Sensação térmica (índice de calor) calculada por dht.computeHeatIndex()", fontsize=10)
fig.tight_layout(); fig.savefig(os.path.join(AQUI, "sensacao.png"), dpi=200); plt.close(fig)

# ---------- figura 3: leituras reais do monitor ----------
if not a.sem_monitor:
    evs = []
    try:
        with urllib.request.urlopen(a.monitor + "/eventos", timeout=5) as r:
            fim = time.time() + 4
            while time.time() < fim:
                ln = r.readline().decode(errors="replace").strip()
                if ln.startswith("data:"):
                    evs.append(json.loads(ln[5:]))
    except Exception as e:  # timeout no fim do historico e esperado
        print("monitor:", e)
    todas = [e for e in evs if e.get("tipo") == "dht"]
    dht = [e for e in todas if e["umid"] >= 1]           # 0 % = bits zerados por mau contato (checksum passa)
    zeradas = len(todas) - len(dht)
    falhas = sum(1 for e in evs if e.get("tipo") == "dhtfalha")
    if dht:
        t = [datetime.fromtimestamp(e["t"] / 1000) for e in dht]
        tc = [e["temp"] for e in dht]; ur = [e["umid"] for e in dht]
        hi = [heat_index(x, y) for x, y in zip(tc, ur)]
        fig, (a1, a2) = plt.subplots(2, 1, figsize=(9, 4.8), sharex=True)
        a1.plot(t, tc, color="#c55a11", lw=1.4, label="temperatura (DHT11)")
        a1.plot(t, hi, color="#7b1fa2", lw=1.4, ls="--", label="sensação térmica (calculada)")
        a1.set_ylabel("°C"); a1.grid(alpha=0.3); a1.legend(fontsize=8)
        a2.step(t, ur, where="post", color="#1f4e79", lw=1.6, label="umidade relativa (DHT11)")
        a2.axhspan(40, 60, color="#2e7d32", alpha=0.08, label="faixa recomendada 40–60 %")
        pico = max(range(len(ur)), key=lambda k: ur[k])
        if ur[pico] - min(ur) >= 10:
            a2.annotate("provável sopro\n(ar expirado: úmido e quente)", xy=(t[pico], ur[pico]), xytext=(25, -18),
                        textcoords="offset points", fontsize=8, color="#595959", arrowprops=dict(arrowstyle="->", color="#595959"))
        a2.set_ylabel("%"); a2.grid(alpha=0.3); a2.legend(fontsize=8)
        a2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        a1.set_title("DHT11 da bancada (GPIO 4, leitura a cada 2 s) — monitor_mhz19c.py", fontsize=10)
        fig.tight_layout(); fig.savefig(os.path.join(AQUI, "leituras.png"), dpi=200); plt.close(fig)
        med = lambda v: sum(v) / len(v)
        dados["ensaio"] = {
            "data": t[0].strftime("%d/%m/%Y"), "inicio": t[0].strftime("%H:%M"), "fim": t[-1].strftime("%H:%M"),
            "n": len(dht), "falhas": falhas, "zeradas": zeradas, "tmin": min(tc), "tmax": max(tc), "tmed": round(med(tc), 1),
            "urmin": min(ur), "urmax": max(ur), "urmed": round(med(ur), 1),
            "himed": round(heat_index(med(tc), med(ur)), 1), "orvmed": round(orvalho(med(tc), med(ur)), 1),
            "passo_t": round(min((abs(x - y) for x, y in zip(tc, tc[1:]) if x != y), default=0), 1)}

json.dump(dados, open(os.path.join(AQUI, "dados.json"), "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in dados.items() if k != "tabela_hi"}, ensure_ascii=False, indent=1))
