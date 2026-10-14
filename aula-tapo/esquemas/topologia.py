"""Desenha a figura da topologia de rede da aula (camera Tapo, roteador, celular, PC, ESP32, nuvem). -> saida/topologia_rede.png"""
import os, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

def caixa(ax, x, y, w, h, titulo, sub, cor):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.15", fc=cor, ec="#333", lw=1.5))
    ax.text(x + w / 2, y + h * 0.68, titulo, ha="center", va="center", fontsize=9.5, weight="bold")
    ax.text(x + w / 2, y + h * 0.3, sub, ha="center", va="center", fontsize=8.5, color="#333")
def seta(ax, a, b, texto="", cor="#555", estilo="-", bi=True):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle="<->" if bi else "->", mutation_scale=14, color=cor, lw=1.8, linestyle=estilo))
    if texto: ax.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.18, texto, ha="center", fontsize=8.5, color=cor, bbox=dict(fc="white", ec="none", pad=1))

fig, ax = plt.subplots(figsize=(11, 6.2)); ax.set_xlim(0, 11); ax.set_ylim(0, 6.2); ax.axis("off")
ax.add_patch(FancyBboxPatch((0.3, 0.4), 7.4, 5.0, boxstyle="round,pad=0.05", fc="#f3f6fa", ec="#9ab", lw=1, ls="--"))
ax.text(0.5, 5.15, "REDE LOCAL (Wi-Fi 2,4 GHz, 192.168.x.x)", fontsize=10, color="#468", weight="bold")
caixa(ax, 3.1, 2.4, 1.9, 1.1, "Roteador", "Wi-Fi + NAT\nIP privado", "#dde7f2")
caixa(ax, 0.6, 3.9, 2.0, 1.1, "Câmera Tapo C200/TC70", "RTSP :554  ONVIF :2020\nmicroSD", "#ffe8cc")
caixa(ax, 0.6, 0.8, 2.0, 1.1, "ESP32 (luzes/alerta)", "HTTP :80  luzes.local\nrelé + buzzer + RGB", "#e2f0d9")
caixa(ax, 5.5, 3.9, 2.0, 1.1, "Celular (app Tapo)", "ao vivo, notificações\nplayback, presets", "#fff2b3")
caixa(ax, 5.5, 0.8, 2.0, 1.1, "PC (Python)", "OpenCV + MediaPipe\ngestos e rostos", "#e6e0f8")
caixa(ax, 8.6, 2.4, 2.1, 1.1, "Nuvem TP-Link", "Tapo Care (clipes)\nacesso remoto (P2P)", "#f8dede")
seta(ax, (2.6, 4.45), (3.6, 3.5), "vídeo (Wi-Fi)")
seta(ax, (5.5, 4.45), (4.6, 3.5), "ao vivo local")
seta(ax, (2.6, 1.35), (3.6, 2.4), "HTTP")
seta(ax, (5.5, 1.35), (4.6, 2.4), "RTSP + HTTP")
seta(ax, (5.0, 2.95), (8.6, 2.95), "internet (NAT)", "#a33", "--")
seta(ax, (6.5, 3.9), (8.9, 3.5), "fora de casa: via nuvem", "#a33", "--", False)
ax.text(5.5, 0.45, "PC lê RTSP (/stream2) → reconhece gesto/rosto → GET http://luzes.local/luz?on=1", fontsize=9, ha="center", style="italic", color="#444")
saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida"); os.makedirs(saida, exist_ok=True)
fig.savefig(os.path.join(saida, "topologia_rede.png"), dpi=150, bbox_inches="tight"); print("ok topologia_rede.png")
