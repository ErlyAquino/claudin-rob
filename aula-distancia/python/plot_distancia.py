"""Grafico AO VIVO de distancia x tempo lendo a porta serial do Arduino (sketch 01b).

Uso:
    python plot_distancia.py                 # usa PORTA_PADRAO (COM4)
    python plot_distancia.py COM3            # outra porta (9600 baud)
    python plot_distancia.py --simular       # sem Arduino: gera dados falsos para testar
    python plot_distancia.py COM3 --salvar leituras.csv   # tambem grava um CSV

Cada linha que o Arduino manda tem o formato:  tempo_ms,distancia_cm
Bibliotecas: pyserial, matplotlib   (pip install pyserial matplotlib)
"""
import sys, time, math, random, collections
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

JANELA_S = 30          # quantos segundos aparecem na tela
LIMITE_CM = 40         # linha vermelha de alarme (so visual)
PORTA_PADRAO = "COM4"  # usada quando nenhuma porta e passada na linha de comando

# ---------- fonte de dados: serial real ou simulador ----------
class Serial_Arduino:
    def __init__(self, porta, baud=9600):
        import serial                       # pyserial
        self.ser = serial.Serial(porta, baud, timeout=1)
        time.sleep(2)                       # o Arduino reinicia ao abrir a porta
        self.ser.reset_input_buffer()
    def ler(self):
        """devolve (tempo_ms, distancia_cm) ou None"""
        linha = self.ser.readline().decode("ascii", errors="ignore").strip()
        if not linha or linha.startswith("tempo"):   # vazio ou cabecalho
            return None
        try:
            t, d = linha.split(",")
            return int(t), float(d)
        except ValueError:                  # linha incompleta/corrompida
            return None

class Simulador:
    """finge um objeto que se aproxima e se afasta, com ruido e um eco perdido de vez em quando"""
    def __init__(self):
        self.t0 = time.time()
    def ler(self):
        time.sleep(0.1)
        t = time.time() - self.t0
        d = 80 + 60 * math.sin(t / 4) + random.gauss(0, 1.5)
        if random.random() < 0.03: d = -1              # "fora de alcance"
        return int(t * 1000), round(d, 1)

# ---------- programa ----------
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    simular = "--simular" in sys.argv
    salvar = sys.argv[sys.argv.index("--salvar") + 1] if "--salvar" in sys.argv else None
    fonte = Simulador() if simular else Serial_Arduino(args[0] if args else PORTA_PADRAO)
    arquivo = open(salvar, "w", encoding="utf8") if salvar else None
    if arquivo: arquivo.write("tempo_s,distancia_cm\n")

    tempos = collections.deque()
    dists = collections.deque()
    t_inicio = None

    fig, ax = plt.subplots(figsize=(9, 4.5))
    fig.canvas.manager.set_window_title("Distancia x tempo - HC-SR04")
    linha, = ax.plot([], [], lw=2, color="#1f77b4", label="distância")
    ax.axhline(LIMITE_CM, color="red", ls="--", label=f"limite {LIMITE_CM} cm")
    texto = ax.text(0.01, 0.95, "", transform=ax.transAxes, fontsize=14, va="top")
    ax.set_xlabel("tempo (s)"); ax.set_ylabel("distância (cm)")
    ax.set_ylim(0, 200); ax.grid(alpha=0.3); ax.legend(loc="upper right")

    def atualiza(_frame):
        nonlocal t_inicio
        # le tudo o que chegou desde o ultimo quadro
        for _ in range(20):
            leitura = fonte.ler()
            if leitura is None: break
            t_ms, d = leitura
            if t_inicio is None: t_inicio = t_ms
            t_s = (t_ms - t_inicio) / 1000
            tempos.append(t_s); dists.append(d if d >= 0 else float("nan"))   # nan = buraco no grafico
            if arquivo: arquivo.write(f"{t_s:.2f},{d}\n")
        while tempos and tempos[-1] - tempos[0] > JANELA_S:
            tempos.popleft(); dists.popleft()
        if tempos:
            linha.set_data(tempos, dists)
            ax.set_xlim(max(0, tempos[-1] - JANELA_S), max(JANELA_S, tempos[-1]))
            ultimo = dists[-1]
            texto.set_text("fora de alcance" if ultimo != ultimo else f"{ultimo:.0f} cm")   # nan != nan
            texto.set_color("red" if ultimo == ultimo and ultimo < LIMITE_CM else "black")
        return linha, texto

    anim = FuncAnimation(fig, atualiza, interval=100, cache_frame_data=False)
    if "--png" in sys.argv:                                  # modo de teste: roda 8 s e salva imagem
        matplotlib.use("Agg")
        for i in range(80): atualiza(i)
        fig.savefig(sys.argv[sys.argv.index("--png") + 1], dpi=130, bbox_inches="tight")
        print("imagem salva")
        return
    plt.tight_layout(); plt.show()
    if arquivo: arquivo.close()

if __name__ == "__main__":
    main()
