"""Reconhecimento facial com OpenCV (YuNet detecta, SFace reconhece) - modulo usado por cadastrar_rosto.py e tapo_gestos_faces.py.

Como funciona:
  1. YuNet (rede neural leve) encontra rostos na imagem e 5 pontos (olhos, nariz, boca).
  2. SFace alinha o rosto por esses pontos e gera um "vetor de caracteristicas" de 128 numeros (embedding).
  3. Reconhecer = comparar o vetor do rosto novo com os vetores cadastrados (similaridade de cosseno).
     > 0,363 = mesma pessoa (limiar recomendado pelo OpenCV). Nenhuma imagem e guardada: so os vetores.
Modelos (python/modelos/): face_detection_yunet_2023mar.onnx  e  face_recognition_sface_2021dec.onnx
"""
import os, cv2, numpy as np

PASTA = os.path.dirname(os.path.abspath(__file__))
MODELOS = os.path.join(PASTA, "modelos")
BANCO = os.path.join(PASTA, "rostos_cadastrados.npz")
LIMIAR_COS = 0.363

class Reconhecedor:
    def __init__(self, tamanho=(320, 320)):
        self.det = cv2.FaceDetectorYN.create(os.path.join(MODELOS, "face_detection_yunet_2023mar.onnx"), "", tamanho, 0.8, 0.3, 5000)
        self.rec = cv2.FaceRecognizerSF.create(os.path.join(MODELOS, "face_recognition_sface_2021dec.onnx"), "")
        self.nomes, self.vetores = [], np.zeros((0, 128), np.float32)
        self.carregar()
    def carregar(self):
        if os.path.exists(BANCO):
            d = np.load(BANCO, allow_pickle=True); self.nomes = list(d["nomes"]); self.vetores = d["vetores"].astype(np.float32)
    def salvar(self): np.savez(BANCO, nomes=np.array(self.nomes), vetores=self.vetores)
    def detectar(self, img):
        """devolve lista de rostos: cada um e um vetor [x, y, w, h, 5 pontos..., confianca]"""
        self.det.setInputSize((img.shape[1], img.shape[0]))
        _, rostos = self.det.detect(img)
        return [] if rostos is None else rostos
    def vetor(self, img, rosto):
        alinhado = self.rec.alignCrop(img, rosto)
        return self.rec.feature(alinhado)[0]
    def cadastrar(self, nome, img, rosto):
        self.nomes.append(nome); self.vetores = np.vstack([self.vetores, self.vetor(img, rosto)[None, :]]); self.salvar()
    def quem(self, img, rosto):
        """devolve (nome ou 'desconhecido', similaridade)"""
        if len(self.nomes) == 0: return "desconhecido", 0.0
        v = self.vetor(img, rosto)
        v = v / (np.linalg.norm(v) + 1e-9); base = self.vetores / (np.linalg.norm(self.vetores, axis=1, keepdims=True) + 1e-9)
        sims = base @ v; i = int(np.argmax(sims))
        return (self.nomes[i], float(sims[i])) if sims[i] > LIMIAR_COS else ("desconhecido", float(sims[i]))
    def desenhar(self, img, rosto, texto, cor):
        x, y, w, h = [int(v) for v in rosto[:4]]
        cv2.rectangle(img, (x, y), (x + w, y + h), cor, 2)
        cv2.putText(img, texto, (x, max(20, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, cor, 2)
