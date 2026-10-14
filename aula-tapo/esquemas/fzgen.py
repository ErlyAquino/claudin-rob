"""Gera arquivos .fzz (Fritzing) programaticamente: pecas posicionadas + fios entre conectores.
Coordenadas em px a 90 dpi (unidade da vista breadboard do Fritzing)."""
import os, re, glob, math, zipfile, xml.sax.saxutils as sx
from fzparse import fzp_info, svg_connector_centers, apply, mul

# Biblioteca de pecas do Fritzing (core). Windows portatil: C:/Ferramentas/Fritzing/fritzing-parts ;
# Linux (apt install fritzing fritzing-parts): /usr/share/fritzing/parts. Sobrescreva com FRITZING_PARTS.
PARTS = os.environ.get("FRITZING_PARTS") or next((p for p in ["C:/Ferramentas/Fritzing/fritzing-parts", "/usr/share/fritzing/parts", os.path.expanduser("~/fritzing-parts")] if os.path.isdir(p)), "C:/Ferramentas/Fritzing/fritzing-parts")
_fzp_cache = {}

# Pecas extras do curso (ESP32 DevKit, ESP32-CAM, DHT11, BME680, MQ, PIR): copie ferramentas/fritzing/user-parts para
# ~/Documents/Fritzing/parts (todos os SOs) ou aponte FRITZING_USER_PARTS.
# No Linux o Fritzing usa a pasta XDG de documentos (ex.: ~/Documentos em pt-BR); o setup copia para as duas.
def _xdg_documents():
    try:
        import subprocess; return subprocess.run(["xdg-user-dir", "DOCUMENTS"], capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception: return ""
USER_PARTS = os.environ.get("FRITZING_USER_PARTS") or next((p for p in [os.path.expanduser("~/Documents/Fritzing/parts"), os.path.join(_xdg_documents() or "/nonexistent", "Fritzing/parts")] if os.path.isdir(os.path.join(p, "user"))), os.path.expanduser("~/Documents/Fritzing/parts"))

def find_fzp(module_id):
    if module_id in _fzp_cache: return _fzp_cache[module_id]
    for d in (f"{USER_PARTS}/user", f"{PARTS}/core", f"{PARTS}/contrib"):
        for f in glob.glob(f"{d}/*.fzp"):
            cab = open(f, encoding="utf8", errors="ignore").read(3000)
            if f'moduleId="{module_id}"' in cab or f"moduleId='{module_id}'" in cab:
                _fzp_cache[module_id] = f; return f
    raise KeyError(module_id)

def rot_matrix(deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    return [c, s, -s, c, 0, 0]

class Part:
    def __init__(self, module_id, title, x, y, rot=0, model_index=None, props=None):
        self.module_id, self.title, self.x, self.y, self.rot = module_id, title, x, y, rot
        self.fzp = find_fzp(module_id)
        self.info = fzp_info(self.fzp)
        self.cen, (self.w, self.h) = svg_connector_centers(self.info["svg"])
        bbmap = self.info.get("bbmap") or {}
        if any(k not in self.cen for k in self.info["connectors"]) and bbmap:   # ids do svg != ids do fzp
            self.cen = {bbmap.get(k, k): v for k, v in self.cen.items()}
        self.mi = model_index
        self.props = props or {}
        # transform como o Fritzing: rotacao em torno do centro do item
        if rot:
            m = rot_matrix(rot); cx, cy = self.w / 2, self.h / 2
            tx, ty = apply(m, cx, cy); m[4], m[5] = cx - tx, cy - ty
            self.T = m
        else: self.T = None
    def pin(self, cid):
        c = self.cen[cid]
        lx, ly = apply(self.T, *c) if self.T else c
        return (self.x + lx, self.y + ly)
    def by_name(self, name):
        for cid, n in self.info["connectors"].items():
            if n == name: return cid
        raise KeyError(f"{self.title}: conector '{name}' nao existe; opcoes: {list(self.info['connectors'].values())[:60]}")

class Sketch:
    def __init__(self):
        self.parts, self.wires, self.next_mi = [], [], 5000
    def add(self, part):
        part.mi = self.next_mi; self.next_mi += 1
        part.connects = {}   # cid -> [(mi, cid, layer)]
        self.parts.append(part); return part
    def mount(self, part, cid, bb, pin, others=()):
        """Posiciona `part` de modo que seu conector `cid` caia no furo `pin` da protoboard `bb`
        e registra as conexoes eletricas (inclusive `others`: [(cid, pin), ...])."""
        cid = cid if cid in part.cen else part.by_name(cid)
        tx, ty = bb.pin(pin)
        lx, ly = apply(part.T, *part.cen[cid]) if part.T else part.cen[cid]
        part.x, part.y = tx - lx, ty - ly
        for c, p in [(cid, pin)] + [(c if c in part.cen else part.by_name(c), p) for c, p in others]:
            part.connects.setdefault(c, []).append((bb.mi, p, bb.info["layer"]))
            bb.connects.setdefault(p, []).append((part.mi, c, part.info["layer"]))
        return part

    def wire(self, a, pa, b, pb, color="#404040", width=22.2222, bend=None):
        """a,b: Part; pa,pb: nome do conector (ex.: 'GND', 'D9 PWM', 'pin5A') ou id (connectorN)"""
        ca = pa if pa in a.cen else a.by_name(pa)
        cb = pb if pb in b.cen else b.by_name(pb)
        (x1, y1), (x2, y2) = a.pin(ca), b.pin(cb)
        w = dict(mi=self.next_mi, x=x1, y=y1, dx=x2 - x1, dy=y2 - y1, color=color, width=width, a=(a, ca), b=(b, cb), bend=bend)
        self.next_mi += 1
        self.wires.append(w)
        a.connects.setdefault(ca, []).append((w["mi"], "connector0", "breadboardWire"))
        b.connects.setdefault(cb, []).append((w["mi"], "connector1", "breadboardWire"))
        return w

    def to_fz(self, title="sketch"):
        out = [f'<?xml version="1.0" encoding="UTF-8"?>\n<module fritzingVersion="0.9.4b" icon="{title}.png">\n'
               '  <views>\n    <view name="breadboardView" backgroundColor="#ffffff" gridSize="0.1in" showGrid="0" alignToGrid="0" viewFromBelow="0"/>\n'
               '    <view name="schematicView" backgroundColor="#ffffff" gridSize="0.3in" showGrid="1" alignToGrid="1" viewFromBelow="0"/>\n'
               '    <view name="pcbView" backgroundColor="#333333" gridSize="0.05in" showGrid="1" alignToGrid="1" viewFromBelow="0"/>\n  </views>\n  <instances>\n']
        for p in self.parts:
            layer = p.info["layer"]
            out.append(f'    <instance moduleIdRef="{sx.escape(p.module_id)}" modelIndex="{p.mi}" path="{p.fzp}">\n      <title>{sx.escape(p.title)}</title>\n')
            for k, v in p.props.items(): out.append(f'      <property name="{k}" value="{sx.escape(v)}"/>\n')
            out.append(f'      <views>\n        <breadboardView layer="{layer}">\n          <geometry z="{2.5 + len(out)*1e-5:.5f}" x="{p.x:.4f}" y="{p.y:.4f}">\n')
            if p.T: out.append(f'            <transform m11="{p.T[0]:.6f}" m12="{p.T[1]:.6f}" m13="0" m21="{p.T[2]:.6f}" m22="{p.T[3]:.6f}" m23="0" m31="{p.T[4]:.6f}" m32="{p.T[5]:.6f}" m33="1"/>\n')
            out.append('          </geometry>\n')
            if p.connects:
                out.append('          <connectors>\n')
                for cid, lst in p.connects.items():
                    out.append(f'            <connector connectorId="{cid}" layer="{layer}">\n              <geometry x="0" y="0"/>\n              <connects>\n')
                    for (mi, c2, l2) in lst: out.append(f'                <connect connectorId="{c2}" modelIndex="{mi}" layer="{l2}"/>\n')
                    out.append('              </connects>\n            </connector>\n')
                out.append('          </connectors>\n')
            out.append('        </breadboardView>\n      </views>\n    </instance>\n')
        for w in self.wires:
            (a, ca), (b, cb) = w["a"], w["b"]
            out.append(f'    <instance moduleIdRef="WireModuleID" modelIndex="{w["mi"]}" path=":/resources/parts/core/wire.fzp">\n      <title>Wire{w["mi"]}</title>\n      <views>\n'
                       f'        <breadboardView layer="breadboardWire">\n          <geometry z="4.5" x="{w["x"]:.4f}" y="{w["y"]:.4f}" x1="0" y1="0" x2="{w["dx"]:.4f}" y2="{w["dy"]:.4f}" wireFlags="64"/>\n'
                       f'          <wireExtras mils="{w["width"]}" color="{w["color"]}" opacity="1" banded="0"')
            if w["bend"]:
                (c0x, c0y), (c1x, c1y) = w["bend"]
                out.append(f'>\n            <bezier>\n              <cp0 x="{c0x:.3f}" y="{c0y:.3f}"/>\n              <cp1 x="{c1x:.3f}" y="{c1y:.3f}"/>\n            </bezier>\n          </wireExtras>\n')
            else: out.append('/>\n')
            out.append(f'          <connectors>\n            <connector connectorId="connector0" layer="breadboardWire">\n              <geometry x="0" y="0"/>\n              <connects>\n                <connect connectorId="{ca}" modelIndex="{a.mi}" layer="{a.info["layer"]}"/>\n              </connects>\n            </connector>\n'
                       f'            <connector connectorId="connector1" layer="breadboardWire">\n              <geometry x="0" y="0"/>\n              <connects>\n                <connect connectorId="{cb}" modelIndex="{b.mi}" layer="{b.info["layer"]}"/>\n              </connects>\n            </connector>\n          </connectors>\n        </breadboardView>\n      </views>\n    </instance>\n')
        out.append('  </instances>\n</module>\n')
        return "".join(out)

    def save(self, folder, name):
        os.makedirs(folder, exist_ok=True)
        fz = self.to_fz(name)
        with zipfile.ZipFile(os.path.join(folder, name + ".fzz"), "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(name + ".fz", fz)
        return os.path.join(folder, name + ".fzz")

# cores padrao de fios
VERMELHO, PRETO, MARROM, LARANJA, AMARELO, VERDE, AZUL, BRANCO, CINZA = "#cc1414", "#404040", "#8c3b00", "#ff7033", "#ffe24d", "#25cc35", "#418dd9", "#ffffff", "#999999"
