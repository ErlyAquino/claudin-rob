"""Cadastra o rosto de uma pessoa (varias fotos) no banco rostos_cadastrados.npz.

Uso:
    python cadastrar_rosto.py "Maria" rtsp://u:s@192.168.1.50:554/stream2
    python cadastrar_rosto.py "Maria" --webcam
    python cadastrar_rosto.py --listar          python cadastrar_rosto.py --apagar "Maria"
Na janela: fique de frente, boa luz; aperte ESPACO para cadastrar a pose atual (faca 5-8: frente, leve giro, sorrindo, oculos...). q sai.
Privacidade: o arquivo guarda so o NOME e 128 numeros por foto - nao guarda a imagem. Cadastre apenas quem consentiu.
"""
import sys, os, cv2
from rostos import Reconhecedor

args = sys.argv[1:]
r = Reconhecedor()
if "--listar" in args:
    from collections import Counter
    for n, c in Counter(r.nomes).items(): print(f"  {n}: {c} amostra(s)")
    sys.exit()
if "--apagar" in args:
    nome = args[args.index("--apagar") + 1]; keep = [i for i, n in enumerate(r.nomes) if n != nome]
    r.nomes = [r.nomes[i] for i in keep]; r.vetores = r.vetores[keep]; r.salvar(); print("apagado", nome); sys.exit()
nome, fonte = args[0], (args[1] if len(args) > 1 else "--webcam")
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
cap = cv2.VideoCapture(0) if fonte == "--webcam" else cv2.VideoCapture(fonte, cv2.CAP_FFMPEG)
n = 0
while True:
    ok, q = cap.read()
    if not ok: continue
    rostos = r.detectar(q)
    for f in rostos: r.desenhar(q, f, f"{nome}? ESPACO cadastra", (0, 200, 255))
    cv2.putText(q, f"amostras de {nome}: {n}   (ESPACO = cadastrar, q = sair)", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.imshow("cadastro", q)
    k = cv2.waitKey(1) & 0xFF
    if k == ord("q"): break
    if k == 32 and len(rostos) == 1: r.cadastrar(nome, q, rostos[0]); n += 1; print("cadastrada amostra", n)
    elif k == 32: print("precisa de exatamente 1 rosto na imagem")
cap.release(); cv2.destroyAllWindows(); print(f"{nome}: {n} amostras salvas em {os.path.basename(r.__module__)}")
