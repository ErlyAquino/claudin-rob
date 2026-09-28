"""Projeto: gestos com a mao (MediaPipe) acendem cores no LED RGB do ESP32-CAM.

Uso:
    python gestos_leds.py                                  # camera: ESP32-CAM em 192.168.4.1
    python gestos_leds.py --esp 192.168.1.50               # outro IP
    python gestos_leds.py --webcam                         # testa com a webcam do PC (sem ESP32)
    python gestos_leds.py --webcam --sem-esp               # so reconhece, nao manda nada
Tecla q sai.

Gestos que o modelo do Google reconhece -> cor enviada ao ESP32 (rota /led?cor=...):
    Open_Palm (mao aberta) -> verde      Closed_Fist (punho) -> vermelho   Pointing_Up (dedo p/ cima) -> azul
    Victory (V) -> amarelo               Thumb_Up (joinha) -> roxo         ILoveYou -> ciano
    Thumb_Down (joinha p/ baixo) -> apaga
Bibliotecas: opencv-python, mediapipe, requests.  Modelo: modelos/gesture_recognizer.task
"""
import sys, os, time, threading, cv2, numpy as np, requests
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

ESP = "192.168.4.1"
if "--esp" in sys.argv: ESP = sys.argv[sys.argv.index("--esp") + 1]
USAR_WEBCAM = "--webcam" in sys.argv
ENVIAR = "--sem-esp" not in sys.argv
MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos", "gesture_recognizer.task")
CORES = {"Open_Palm": "verde", "Closed_Fist": "vermelho", "Pointing_Up": "azul", "Victory": "amarelo",
         "Thumb_Up": "roxo", "ILoveYou": "ciano", "Thumb_Down": "off"}
CORES_BGR = {"verde": (0, 255, 0), "vermelho": (0, 0, 255), "azul": (255, 0, 0), "amarelo": (0, 200, 255), "roxo": (255, 0, 160), "ciano": (255, 255, 0), "off": (80, 80, 80)}

# ---------- fonte de video ----------
class FonteESP:
    """le fotos /capture em sequencia (mais robusto que o stream quando o Wi-Fi oscila)"""
    def __init__(self, ip): self.url = f"http://{ip}/capture"
    def ler(self):
        try:
            dados = requests.get(self.url, timeout=3).content
            return cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)
        except requests.RequestException: return None
class FonteWebcam:
    def __init__(self): self.cap = cv2.VideoCapture(0)
    def ler(self):
        ok, q = self.cap.read(); return q if ok else None

# ---------- envio ao ESP32 em segundo plano (nao trava o video) ----------
ultimaCorEnviada = None
def enviar(cor):
    global ultimaCorEnviada
    if not ENVIAR or cor == ultimaCorEnviada: return
    ultimaCorEnviada = cor
    def _go():
        try: requests.get(f"http://{ESP}/led", params={"cor": cor}, timeout=2)
        except requests.RequestException: print("(ESP32 nao respondeu)")
    threading.Thread(target=_go, daemon=True).start()

# ---------- reconhecedor ----------
opcoes = vision.GestureRecognizerOptions(base_options=BaseOptions(model_asset_path=MODELO), num_hands=1,
                                         min_hand_detection_confidence=0.5, min_tracking_confidence=0.5)
reconhecedor = vision.GestureRecognizer.create_from_options(opcoes)

def main():
    fonte = FonteWebcam() if USAR_WEBCAM else FonteESP(ESP)
    print("fonte:", "webcam" if USAR_WEBCAM else f"ESP32-CAM {ESP}", "| envio:", "sim" if ENVIAR else "nao")
    historico = []                                        # os ultimos N gestos: so aceita se for estavel
    while True:
        quadro = fonte.ler()
        if quadro is None: time.sleep(0.3); continue
        rgb = cv2.cvtColor(quadro, cv2.COLOR_BGR2RGB)     # MediaPipe usa RGB; OpenCV usa BGR
        res = reconhecedor.recognize(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        gesto, conf = "None", 0.0
        if res.gestures:
            g = res.gestures[0][0]; gesto, conf = g.category_name, g.score
            for lm in res.hand_landmarks[0]:              # desenha os 21 pontos da mao
                cv2.circle(quadro, (int(lm.x * quadro.shape[1]), int(lm.y * quadro.shape[0])), 4, (0, 255, 255), -1)
        historico.append(gesto); historico = historico[-5:]
        estavel = historico.count(gesto) >= 4             # 4 de 5 quadros iguais = gesto firme
        cor = CORES.get(gesto, None)
        if estavel and cor: enviar(cor)
        cv2.rectangle(quadro, (0, 0), (quadro.shape[1], 40), CORES_BGR.get(cor, (40, 40, 40)), -1)
        cv2.putText(quadro, f"{gesto} ({conf:.2f}) -> {cor or '-'}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.imshow("gestos -> LEDs (q sai)", quadro)
        if cv2.waitKey(1) & 0xFF == ord("q"): break
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
