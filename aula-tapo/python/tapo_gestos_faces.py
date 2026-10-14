"""Projeto final: a camera Tapo ve -> o PC reconhece gestos (MediaPipe) e rostos (OpenCV SFace) -> o ESP32 age.

Uso:
    python tapo_gestos_faces.py rtsp://u:s@192.168.1.50:554/stream2 --esp luzes.local
    python tapo_gestos_faces.py --webcam --esp 192.168.1.80
    python tapo_gestos_faces.py --webcam --sem-esp            # so reconhece
Regras (mude em REGRAS):
    gesto Open_Palm  -> liga a luz        Closed_Fist -> desliga        Thumb_Up -> LED verde       Victory -> LED azul
    rosto CONHECIDO  -> "bemvindo" (2 bipes + verde) uma vez a cada 60 s por pessoa
    rosto DESCONHECIDO por 3 s seguidos -> alerta "intruso" (sirene + vermelho) e foto salva em alertas/
    ninguem -> nada.  Tecla q sai.
Modelos: modelos/gesture_recognizer.task (copie da aula ESP32-CAM) + modelos/*.onnx (rostos).
"""
import sys, os, time, threading, cv2, numpy as np, requests
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from rostos import Reconhecedor

args = sys.argv[1:]
FONTE = args[0] if args and not args[0].startswith("--") else "--webcam"
ESP = args[args.index("--esp") + 1] if "--esp" in args else "luzes.local"
ENVIAR = "--sem-esp" not in args
PASTA = os.path.dirname(os.path.abspath(__file__))
MODELO_GESTOS = os.path.join(PASTA, "modelos", "gesture_recognizer.task")
REGRAS = {"Open_Palm": "/luz?on=1", "Closed_Fist": "/luz?on=0", "Thumb_Up": "/led?cor=verde", "Victory": "/led?cor=azul", "Thumb_Down": "/alerta?tipo=off"}
TEMPO_INTRUSO = 3.0; COOLDOWN_BEMVINDO = 60; COOLDOWN_INTRUSO = 30
os.makedirs(os.path.join(PASTA, "alertas"), exist_ok=True)

def enviar(rota):
    if not ENVIAR: return
    def _go():
        try: requests.get(f"http://{ESP}{rota}", timeout=2); print("ESP32 <-", rota)
        except requests.RequestException: print("(ESP32 nao respondeu em", ESP, ")")
    threading.Thread(target=_go, daemon=True).start()

gestos = vision.GestureRecognizer.create_from_options(vision.GestureRecognizerOptions(base_options=BaseOptions(model_asset_path=MODELO_GESTOS), num_hands=1))
rec = Reconhecedor()
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
cap = cv2.VideoCapture(0) if FONTE == "--webcam" else cv2.VideoCapture(FONTE, cv2.CAP_FFMPEG)
if not cap.isOpened(): print("nao abriu", FONTE); sys.exit(1)
print(f"fonte {FONTE} | ESP32 {ESP} | pessoas cadastradas: {sorted(set(rec.nomes))}")

hist_gesto, ultimo_gesto_enviado = [], None
desconhecido_desde = None; ultimo_bemvindo = {}; ultimo_intruso = 0
while True:
    ok, q = cap.read()
    if not ok: time.sleep(0.5); continue
    agora = time.time()
    # ---- gestos ----
    res = gestos.recognize(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(q, cv2.COLOR_BGR2RGB)))
    gesto = res.gestures[0][0].category_name if res.gestures else "None"
    hist_gesto = (hist_gesto + [gesto])[-5:]
    if hist_gesto.count(gesto) >= 4 and gesto in REGRAS and gesto != ultimo_gesto_enviado:
        enviar(REGRAS[gesto]); ultimo_gesto_enviado = gesto
    if gesto == "None": ultimo_gesto_enviado = None
    # ---- rostos ----
    rostos = rec.detectar(q); ha_desconhecido = False
    for f in rostos:
        nome, sim = rec.quem(q, f)
        if nome == "desconhecido":
            ha_desconhecido = True; rec.desenhar(q, f, f"desconhecido ({sim:.2f})", (0, 0, 255))
        else:
            rec.desenhar(q, f, f"{nome} ({sim:.2f})", (0, 255, 0))
            if agora - ultimo_bemvindo.get(nome, 0) > COOLDOWN_BEMVINDO: ultimo_bemvindo[nome] = agora; enviar("/alerta?tipo=bemvindo"); enviar("/luz?on=1")
    if ha_desconhecido:
        desconhecido_desde = desconhecido_desde or agora
        if agora - desconhecido_desde > TEMPO_INTRUSO and agora - ultimo_intruso > COOLDOWN_INTRUSO:
            ultimo_intruso = agora; enviar("/alerta?tipo=intruso")
            foto = os.path.join(PASTA, "alertas", time.strftime("intruso_%Y%m%d_%H%M%S.jpg")); cv2.imwrite(foto, q); print("foto salva", foto)
    else: desconhecido_desde = None
    cv2.putText(q, f"gesto: {gesto}   rostos: {len(rostos)}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
    cv2.imshow("Tapo + ESP32 (q sai)", q)
    if cv2.waitKey(1) & 0xFF == ord("q"): break
cap.release(); cv2.destroyAllWindows()
