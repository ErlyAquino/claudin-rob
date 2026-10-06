"""Exporta todos os .fzz de uma pasta para PNG (via Fritzing --svg + LibreOffice)."""
import subprocess, sys, os, re, glob, time
import shutil
# Executaveis: Windows portatil / Linux (apt: fritzing, libreoffice). Sobrescreva com FRITZING_BIN e SOFFICE_BIN.
FRITZING = os.environ.get("FRITZING_BIN") or (r"C:\Ferramentas\Fritzing\Fritzing.exe" if os.name == "nt" else (shutil.which("fritzing") or "/usr/bin/fritzing"))
SOFFICE = os.environ.get("SOFFICE_BIN") or (r"C:\Program Files\LibreOffice\program\soffice.com" if os.name == "nt" else (shutil.which("soffice") or "/usr/bin/soffice"))
def _sem_watermark(x):
    """Remove o grupo <g id="watermark"> (logo do Fritzing 1.0.x) contando a profundidade dos <g>...</g>."""
    m = re.search(r'<g\s+id="watermark"\s*>', x)
    if not m: return x
    depth, pos = 0, m.start()
    for t in re.finditer(r"<g\b[^>]*?(?<!/)>|</g\s*>", x[m.start():]):
        depth += 1 if t.group().startswith("<g") else -1
        if depth == 0: pos = m.start() + t.end(); break
    return x[:m.start()] + x[pos:]
def export(folder, scale=4):
    folder = os.path.abspath(folder)
    for f in glob.glob(os.path.join(folder, "*_breadboard.svg")) + glob.glob(os.path.join(folder, "*.png")): os.remove(f)
    subprocess.run([FRITZING, "--svg", folder], cwd=os.path.dirname(FRITZING) or None, timeout=300)
    for svg in glob.glob(os.path.join(folder, "*_breadboard.svg")):
        x = open(svg, encoding="utf8").read()
        # Fritzing 0.9.x escreve width='Xin' height='Yin' (aspas simples, juntos); o 1.0.x escreve width="Xin" ... height="Yin"
        # (aspas duplas, separados) e acrescenta um grupo <g id="watermark"> com o logo - removido para manter os PNGs limpos.
        x = _sem_watermark(x)
        x = re.sub(r"\b(width|height)=(['\"])([\d.]+)in\2", lambda m: f"{m.group(1)}={m.group(2)}{float(m.group(3))*scale}in{m.group(2)}", x, count=2)
        big = svg.replace("_breadboard.svg", ".svg"); open(big, "w", encoding="utf8").write(x)
        subprocess.run([SOFFICE, "--headless", "--convert-to", "png", "--outdir", folder, big], capture_output=True, timeout=180)
        os.remove(big)
    for f in glob.glob(os.path.join(folder, "*_pcb.svg")) + glob.glob(os.path.join(folder, "*_schematic.svg")): os.remove(f)
    return sorted(glob.glob(os.path.join(folder, "*.png")))
if __name__ == "__main__":
    for p in export(sys.argv[1]): print(p, os.path.getsize(p))
