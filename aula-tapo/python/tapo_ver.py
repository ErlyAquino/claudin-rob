"""Ver o video da camera Tapo C200/TC70 no PC por RTSP (OpenCV), salvar foto e gravar trecho.

Antes: no app Tapo -> camera -> Configuracoes -> Avancado -> Conta da camera -> crie usuario/senha.
Descubra o IP da camera no app (Informacoes do dispositivo) ou no roteador e, de preferencia, fixe-o (DHCP reservado).

Uso:
    python tapo_ver.py rtsp://usuario:senha@192.168.1.50:554/stream1     # 1080p
    python tapo_ver.py rtsp://usuario:senha@192.168.1.50:554/stream2     # 360p (leve, ideal para IA)
    python tapo_ver.py --webcam                                           # testa sem camera
Teclas: f = foto   g = gravar/parar (.avi)   q = sair
"""
import sys, time, os, cv2

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;5000000")   # TCP = sem "quadros picotados"
URL = sys.argv[1] if len(sys.argv) > 1 else "--webcam"
cap = cv2.VideoCapture(0 if URL == "--webcam" else URL, cv2.CAP_FFMPEG if URL != "--webcam" else cv2.CAP_ANY)
if not cap.isOpened():
    print("nao abriu:", URL, "\n- PC na mesma rede da camera?  - conta da camera criada?  - IP certo?  - outro programa usando o stream?"); sys.exit(1)
w, h, fps = int(cap.get(3)), int(cap.get(4)), cap.get(5) or 15
print(f"stream {w}x{h} @ {fps:.0f} fps  (f = foto, g = gravar, q = sair)")
gravador = None; t0 = time.time(); n = 0
while True:
    ok, q = cap.read()
    if not ok: print("quadro perdido; reconectando..."); time.sleep(1); cap.release(); cap = cv2.VideoCapture(URL, cv2.CAP_FFMPEG); continue
    n += 1
    cv2.putText(q, time.strftime("%d/%m/%Y %H:%M:%S") + (f"   {n/(time.time()-t0):.1f} fps" if n > 10 else "") + ("   REC" if gravador else ""),
                (10, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if gravador else (255, 255, 255), 2)
    if gravador: gravador.write(q)
    cv2.imshow("Tapo (q sai)", q)
    k = cv2.waitKey(1) & 0xFF
    if k == ord("q"): break
    if k == ord("f"): nome = time.strftime("tapo_%Y%m%d_%H%M%S.jpg"); cv2.imwrite(nome, q); print("foto", nome)
    if k == ord("g"):
        if gravador: gravador.release(); gravador = None; print("gravacao parada")
        else: nome = time.strftime("tapo_%Y%m%d_%H%M%S.avi"); gravador = cv2.VideoWriter(nome, cv2.VideoWriter_fourcc(*"MJPG"), fps, (w, h)); print("gravando", nome)
if gravador: gravador.release()
cap.release(); cv2.destroyAllWindows()
