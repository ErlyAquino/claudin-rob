"""Aula de visao computacional: o que um computador "ve" numa imagem, passo a passo.

Uso:
    python reconhecer_imagem.py foto.jpg              # analisa uma foto
    python reconhecer_imagem.py http://192.168.4.1/capture   # pega uma foto do ESP32-CAM
    python reconhecer_imagem.py --webcam               # usa a webcam do PC ao vivo
    python reconhecer_imagem.py --demo                 # gera uma imagem de teste (sem hardware)

Abre 5 janelas: original, tons de cinza, bordas (Canny), mascara de cor (vermelho) e rostos (Haar ou YuNet).
Cada uma e uma etapa classica: pixel -> cinza -> bordas -> regioes de cor -> padroes (cascata).
"""
import sys, cv2, numpy as np

def carregar(origem):
    if origem == "--demo":
        img = np.full((360, 480, 3), 230, np.uint8)
        cv2.circle(img, (120, 180), 60, (40, 40, 220), -1)          # circulo vermelho (BGR!)
        cv2.rectangle(img, (240, 100), (400, 260), (60, 180, 60), -1)  # retangulo verde
        cv2.putText(img, "demo", (300, 320), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        return img
    if origem.startswith("http"):
        import requests
        dados = requests.get(origem, timeout=5).content                     # bytes do JPEG
        return cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)  # bytes -> matriz
    return cv2.imread(origem)

# Deteccao de rostos. Duas opcoes, em ordem de preferencia:
#   1) Haar (classico, OpenCV <= 4 ou build com xobjdetect): modelos/haarcascade_frontalface_default.xml
#      https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml
#   2) YuNet (rede neural leve; unica opcao no OpenCV 5, que removeu cv2.CascadeClassifier):
#      modelos/face_detection_yunet_2023mar.onnx
#      https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
# Sem nenhum dos dois, a deteccao de rostos e pulada (o resto do script funciona).
import os
_modelos = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")
_xml = os.path.join(_modelos, "haarcascade_frontalface_default.xml")
_onnx = os.path.join(_modelos, "face_detection_yunet_2023mar.onnx")
cascata, yunet = None, None
if os.path.exists(_xml) and hasattr(cv2, "CascadeClassifier"):
    cascata = cv2.CascadeClassifier(_xml)
    if cascata.empty(): cascata = None
if cascata is None and os.path.exists(_onnx) and hasattr(cv2, "FaceDetectorYN"):
    yunet = cv2.FaceDetectorYN.create(_onnx, "", (320, 320), score_threshold=0.7)
if cascata is None and yunet is None:
    print("(sem modelo de rostos em modelos/ (haarcascade .xml ou yunet .onnx): deteccao de rostos desligada)")

def detectar_rostos(img, cinza):
    """Devolve lista de (x, y, w, h) com o Haar ou com o YuNet, conforme o que estiver disponivel."""
    if cascata is not None:
        return list(cascata.detectMultiScale(cinza, 1.2, 5, minSize=(40, 40)))
    if yunet is not None:
        h, w = img.shape[:2]
        yunet.setInputSize((w, h))
        _, res = yunet.detect(img)                                        # cada linha: x, y, w, h, 5 pontos, score
        return [tuple(int(v) for v in r[:4]) for r in (res if res is not None else [])]
    return []

def analisar(img):
    h, w = img.shape[:2]
    print(f"imagem {w}x{h}, {img.dtype}, pixel (0,0) BGR = {img[0,0]}")
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)                     # 3 numeros por pixel -> 1
    bordas = cv2.Canny(cinza, 80, 160)                                  # onde o brilho muda rapido
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)                          # matiz-saturacao-valor: cor "separada" do brilho
    mascara = cv2.inRange(hsv, (0, 120, 70), (10, 255, 255)) | cv2.inRange(hsv, (170, 120, 70), (180, 255, 255))  # vermelho
    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    saida = img.copy()
    for c in contornos:
        if cv2.contourArea(c) > 500:                                    # ignora manchinhas
            x, y, cw, ch = cv2.boundingRect(c)
            cv2.rectangle(saida, (x, y), (x + cw, y + ch), (0, 255, 255), 2)
            cv2.putText(saida, "vermelho", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    rostos = detectar_rostos(img, cinza)
    for (x, y, cw, ch) in rostos: cv2.rectangle(saida, (x, y), (x + cw, y + ch), (255, 0, 0), 2)
    print(f"objetos vermelhos: {sum(cv2.contourArea(c) > 500 for c in contornos)}   rostos: {len(rostos)}")
    return cinza, bordas, mascara, saida

if __name__ == "__main__":
    origem = sys.argv[1] if len(sys.argv) > 1 else "--demo"
    if origem == "--webcam":
        cap = cv2.VideoCapture(0)
        while True:
            ok, img = cap.read()
            if not ok: break
            cinza, bordas, mascara, saida = analisar(img)
            cv2.imshow("resultado", saida); cv2.imshow("bordas", bordas)
            if cv2.waitKey(1) & 0xFF == ord("q"): break
    else:
        img = carregar(origem)
        cinza, bordas, mascara, saida = analisar(img)
        for nome, im in [("original", img), ("cinza", cinza), ("bordas", bordas), ("mascara vermelho", mascara), ("resultado", saida)]:
            cv2.imshow(nome, im)
        if "--salvar" in sys.argv: cv2.imwrite("resultado.jpg", saida); cv2.imwrite("bordas.jpg", bordas); print("salvo resultado.jpg / bordas.jpg")
        else: cv2.waitKey(0)
    cv2.destroyAllWindows()
