"""Gravador local (NVR caseiro) da camera Tapo: grava o RTSP em arquivos de N minutos e/ou so quando ha movimento.

Uso:
    python tapo_gravar.py rtsp://u:s@192.168.1.50:554/stream1 --pasta gravacoes --minutos 10        # continuo, 1 arquivo a cada 10 min
    python tapo_gravar.py rtsp://u:s@192.168.1.50:554/stream2 --movimento                          # so grava quando algo se move
    python tapo_gravar.py --webcam --movimento                                                     # teste sem camera
    (--dias 7 apaga arquivos com mais de 7 dias: "gravacao em loop", como o microSD faz)

Por que isso existe: o microSD da camera e a nuvem Tapo Care sao as opcoes "de fabrica"; gravar no PC por RTSP e a
terceira opcao, 100 % local, sem assinatura - e e o que um NVR/NAS faz. Formato AVI/MJPEG: simples e sem codec extra.
"""
import sys, os, time, glob, cv2, numpy as np

args = sys.argv[1:]
def opt(nome, padrao=None):
    return args[args.index(nome) + 1] if nome in args and args.index(nome) + 1 < len(args) else padrao
URL = args[0] if args and not args[0].startswith("--") else "--webcam"
PASTA = opt("--pasta", "gravacoes"); MINUTOS = float(opt("--minutos", "10")); DIAS = float(opt("--dias", "0"))
MOVIMENTO = "--movimento" in args; LIMIAR_MOV = 1.5   # % de pixels que mudaram
os.makedirs(PASTA, exist_ok=True)
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")

def abrir(): return cv2.VideoCapture(0) if URL == "--webcam" else cv2.VideoCapture(URL, cv2.CAP_FFMPEG)
def limpar_antigos():
    if DIAS <= 0: return
    for f in glob.glob(os.path.join(PASTA, "*.avi")):
        if time.time() - os.path.getmtime(f) > DIAS * 86400: os.remove(f); print("apagado (antigo):", f)

cap = abrir()
if not cap.isOpened(): print("nao abriu", URL); sys.exit(1)
w, h, fps = int(cap.get(3)), int(cap.get(4)), cap.get(5) or 15
print(f"{w}x{h} @ {fps:.0f} fps -> {PASTA}/  modo: {'movimento' if MOVIMENTO else f'continuo {MINUTOS:g} min/arquivo'}  (Ctrl+C para parar)")
gravador = None; inicio = 0; anterior = None; ultimo_mov = 0
try:
    while True:
        ok, q = cap.read()
        if not ok: time.sleep(1); cap.release(); cap = abrir(); continue
        agora = time.time()
        cv2.putText(q, time.strftime("%d/%m/%Y %H:%M:%S"), (10, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        gravar = True
        if MOVIMENTO:
            cinza = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(q, (320, 180)), cv2.COLOR_BGR2GRAY), (21, 21), 0)
            if anterior is not None:
                diff = cv2.threshold(cv2.absdiff(anterior, cinza), 25, 255, cv2.THRESH_BINARY)[1]
                pct = 100.0 * np.count_nonzero(diff) / diff.size
                if pct > LIMIAR_MOV: ultimo_mov = agora
            anterior = cinza
            gravar = agora - ultimo_mov < 8          # continua 8 s apos o ultimo movimento
        # abre/fecha arquivos
        if gravar and (gravador is None or (not MOVIMENTO and agora - inicio > MINUTOS * 60)):
            if gravador: gravador.release()
            nome = os.path.join(PASTA, time.strftime("%Y-%m-%d_%H-%M-%S") + ("_mov" if MOVIMENTO else "") + ".avi")
            gravador = cv2.VideoWriter(nome, cv2.VideoWriter_fourcc(*"MJPG"), fps, (w, h)); inicio = agora
            print("gravando", nome); limpar_antigos()
        if not gravar and gravador is not None: gravador.release(); gravador = None; print("movimento acabou; arquivo fechado")
        if gravador: gravador.write(q)
except KeyboardInterrupt: pass
if gravador: gravador.release()
cap.release(); print("fim")
