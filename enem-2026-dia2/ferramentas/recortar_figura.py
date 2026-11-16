"""Recorta uma figura de um recorte de questão.

Uso:
  python -I recortar_figura.py <recorte.jpg> <saida.png> x0 y0 x1 y1

Coordenadas em pixels do ARQUIVO ORIGINAL do recorte (não da imagem exibida
reduzida). Imprime o tamanho do recorte de origem para conferência.
Saída: PNG com margem branca de 8 px.
"""
import sys
from PIL import Image, ImageOps

src, dst, *c = sys.argv[1:]
x0, y0, x1, y1 = map(int, c)
im = Image.open(src)
W, H = im.size
x0, y0 = max(0, x0), max(0, y0)
x1, y1 = min(W, x1), min(H, y1)
fig = im.crop((x0, y0, x1, y1)).convert("RGB")
fig = ImageOps.expand(fig, border=8, fill="white")
fig.save(dst, optimize=True)
print(f"origem {W}x{H}  ->  {dst}  ({x1-x0}x{y1-y0})")
