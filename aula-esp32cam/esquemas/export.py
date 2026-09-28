"""Exporta todos os .fzz de uma pasta para PNG (via Fritzing --svg + LibreOffice)."""
import subprocess, sys, os, re, glob, time
import shutil
# Executaveis: Windows portatil / Linux (apt: fritzing, libreoffice). Sobrescreva com FRITZING_BIN e SOFFICE_BIN.
FRITZING = os.environ.get("FRITZING_BIN") or (r"C:\Ferramentas\Fritzing\Fritzing.exe" if os.name == "nt" else (shutil.which("fritzing") or "/usr/bin/fritzing"))
SOFFICE = os.environ.get("SOFFICE_BIN") or (r"C:\Program Files\LibreOffice\program\soffice.com" if os.name == "nt" else (shutil.which("soffice") or "/usr/bin/soffice"))
def export(folder, scale=4):
    folder = os.path.abspath(folder)
    for f in glob.glob(os.path.join(folder, "*_breadboard.svg")) + glob.glob(os.path.join(folder, "*.png")): os.remove(f)
    subprocess.run([FRITZING, "--svg", folder], cwd=os.path.dirname(FRITZING) or None, timeout=300)
    for svg in glob.glob(os.path.join(folder, "*_breadboard.svg")):
        x = open(svg, encoding="utf8").read()
        x = re.sub(r"width='([\d.]+)in' height='([\d.]+)in'", lambda m: f"width='{float(m.group(1))*scale}in' height='{float(m.group(2))*scale}in'", x, count=1)
        big = svg.replace("_breadboard.svg", ".svg"); open(big, "w", encoding="utf8").write(x)
        subprocess.run([SOFFICE, "--headless", "--convert-to", "png", "--outdir", folder, big], capture_output=True, timeout=180)
        os.remove(big)
    for f in glob.glob(os.path.join(folder, "*_pcb.svg")) + glob.glob(os.path.join(folder, "*_schematic.svg")): os.remove(f)
    return sorted(glob.glob(os.path.join(folder, "*.png")))
if __name__ == "__main__":
    for p in export(sys.argv[1]): print(p, os.path.getsize(p))
