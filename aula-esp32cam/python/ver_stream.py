"""Ver o video do ESP32-CAM no PC com OpenCV (e salvar fotos/videos).

Uso:
    python ver_stream.py                       # stream padrao http://192.168.4.1:81/stream
    python ver_stream.py http://192.168.1.50:81/stream
Teclas na janela:  f = salvar foto   g = comecar/parar gravacao (.avi)   q = sair

Ideia: o stream MJPEG e "uma foto atras da outra"; cv2.VideoCapture entende esse formato
como se fosse uma webcam. Cada quadro e uma matriz numpy (altura x largura x 3 cores BGR).
"""
import sys, time, cv2

URL = sys.argv[1] if len(sys.argv) > 1 else "http://192.168.4.1:81/stream"

cap = cv2.VideoCapture(URL)
if not cap.isOpened():
    print("nao abriu o stream:", URL, "\nConectado na rede da camera? O ESP32 esta ligado?"); sys.exit(1)

gravador = None
t0, quadros = time.time(), 0
print("f = foto, g = gravar/parar, q = sair")
while True:
    ok, quadro = cap.read()                  # quadro: numpy array HxWx3
    if not ok: print("perdi o stream, tentando de novo..."); time.sleep(0.5); cap = cv2.VideoCapture(URL); continue
    quadros += 1
    fps = quadros / (time.time() - t0)
    h, w = quadro.shape[:2]
    cv2.putText(quadro, f"{w}x{h}  {fps:.1f} fps" + ("  REC" if gravador else ""), (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255) if gravador else (0, 255, 0), 2)
    if gravador: gravador.write(quadro)
    cv2.imshow("ESP32-CAM", quadro)
    k = cv2.waitKey(1) & 0xFF
    if k == ord("q"): break
    if k == ord("f"):
        nome = time.strftime("foto_%Y%m%d_%H%M%S.jpg"); cv2.imwrite(nome, quadro); print("salva", nome)
    if k == ord("g"):
        if gravador: gravador.release(); gravador = None; print("gravacao parada")
        else:
            nome = time.strftime("video_%Y%m%d_%H%M%S.avi")
            gravador = cv2.VideoWriter(nome, cv2.VideoWriter_fourcc(*"MJPG"), max(5, int(fps)), (w, h)); print("gravando", nome)
if gravador: gravador.release()
cap.release(); cv2.destroyAllWindows()
