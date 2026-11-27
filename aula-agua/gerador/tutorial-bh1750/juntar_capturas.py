"""Junta as duas capturas da pagina do celular (capturar_paginas.sh) numa figura so: pagina_celular.png."""
import os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
a = Image.open(os.path.join(AQUI, "pagina_dia.png")).convert("RGB")
b = Image.open(os.path.join(AQUI, "pagina_noite.png")).convert("RGB")
m = Image.new("RGB", (a.width + b.width + 60, max(a.height, b.height)), "white")
m.paste(a, (0, 0))
m.paste(b, (a.width + 60, 0))
m.save(os.path.join(AQUI, "pagina_celular.png"))
print("figura: pagina_celular.png", m.size)
