import re, math, os, xml.etree.ElementTree as ET
PARTS = os.environ.get("FRITZING_PARTS") or next((p for p in ["C:/Ferramentas/Fritzing/fritzing-parts", "/usr/share/fritzing/parts", os.path.expanduser("~/fritzing-parts")] if os.path.isdir(p)), "C:/Ferramentas/Fritzing/fritzing-parts")
NS = {"svg": "http://www.w3.org/2000/svg"}

def fzp_info(fzp_path):
    x = open(fzp_path, encoding="utf8", errors="ignore").read()
    mid = re.search(r"""moduleId=["']([^"']+)""", x).group(1)
    m = re.search(r"""<layers image=["'](breadboard/[^"']+)["']>\s*<layer layerId=["']([^"']+)""", x)
    bb, layer = m.group(1), m.group(2)
    cons = []
    for m in re.finditer(r'<connector\b([^>]*)>', x):                 # aceita id/name em qualquer ordem
        a = m.group(1); i = re.search(r'\bid="([^"]+)"', a); n = re.search(r'\bname="([^"]*)"', a)
        if i: cons.append((i.group(1), n.group(1) if n else ""))
    legs = dict(re.findall(r'<connector[^>]*id="([^"]+)".*?<breadboardView>\s*<p [^>]*legId="([^"]+)"', x, re.S))
    # mapa svgId (na vista breadboard) -> connectorId, para pecas em que os ids nao coincidem
    bbmap = {}
    for m in re.finditer(r'<connector\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</connector>', x, re.S):
        p = re.search(r'<breadboardView>\s*<p\b[^>]*svgId="([^"]+)"', m.group(2))
        if p: bbmap[re.sub(r'pin$', '', p.group(1))] = m.group(1)
    norm = fzp_path.replace("\\", "/")
    base = os.path.dirname(os.path.dirname(norm))              # .../fritzing-parts  ou  .../Fritzing/parts
    sub = "user" if "/user/" in norm else "core"
    svg = f"{base}/svg/{sub}/{bb}"
    return dict(moduleId=mid, svg=svg, layer=layer, connectors=dict(cons), legs=legs, bbmap=bbmap)

def parse_transform(t):
    m = [1,0,0,1,0,0]
    if not t: return m
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', t):
        a = [float(v) for v in re.split(r'[ ,]+', args.strip()) if v]
        if name == "translate": n = [1,0,0,1,a[0],a[1] if len(a)>1 else 0]
        elif name == "scale": n = [a[0],0,0,a[1] if len(a)>1 else a[0],0,0]
        elif name == "matrix": n = a
        elif name == "rotate":
            r = math.radians(a[0]); c,s = math.cos(r), math.sin(r); n=[c,s,-s,c,0,0]
            if len(a)==3: n=[c,s,-s,c,a[1]-c*a[1]+s*a[2],a[2]-s*a[1]-c*a[2]]
        else: n = [1,0,0,1,0,0]
        m = mul(m, n)
    return m
def mul(a,b): return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]
def apply(m,x,y): return (m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5])

def path_points(d):
    """Percorre um path SVG (M L H V C S Q T A Z, abs/rel) e devolve os pontos-ancora."""
    toks = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    pts, cur, start, i, cmd = [], (0.0, 0.0), (0.0, 0.0), 0, None
    nargs = {"M":2,"L":2,"H":1,"V":1,"C":6,"S":4,"Q":4,"T":2,"A":7,"Z":0}
    while i < len(toks):
        t = toks[i]
        if t.isalpha(): cmd = t; i += 1
        if cmd is None: break
        C = cmd.upper(); n = nargs[C]
        if C == "Z":
            cur = start; pts.append(cur); continue
        args = [float(v) for v in toks[i:i+n]]
        if len(args) < n: break
        i += n
        rel = cmd.islower()
        if C in ("M","L","T"):
            x, y = args
            cur = (cur[0]+x, cur[1]+y) if rel else (x, y)
            if C == "M": start = cur; cmd = "l" if rel else "L"
        elif C == "H": cur = (cur[0]+args[0] if rel else args[0], cur[1])
        elif C == "V": cur = (cur[0], cur[1]+args[0] if rel else args[0])
        elif C in ("C","S","Q","A"):
            x, y = args[-2], args[-1]
            cur = (cur[0]+x, cur[1]+y) if rel else (x, y)
        pts.append(cur)
    return pts

def svg_connector_centers(svg_path):
    """centro de cada elemento id=connectorNpin / pinXX em px (90 dpi), no espaco do part"""
    tree = ET.parse(svg_path); root = tree.getroot()
    w = root.get("width",""); h = root.get("height","")
    vbs = root.get("viewBox")
    if vbs: vb = [float(v) for v in re.split(r'[ ,]+', vbs.strip())]
    else:   vb = [0, 0, float(re.sub(r'[a-z%]+$', '', w)), float(re.sub(r'[a-z%]+$', '', h))]   # sem viewBox: unidades = px
    def to_px(s):
        v = float(re.sub(r'[a-z%]+$','',s)); u = re.sub(r'^[\d.\-e]+','',s)
        # Fritzing: 'px' (Illustrator) = 72 dpi; sem unidade = 90 dpi
        return v*90 if u=="in" else v*90/25.4 if u=="mm" else v*90/72 if u in ("pt","px") else v*90/2.54 if u=="cm" else v
    W, H = to_px(w), to_px(h)
    sx, sy = W/vb[2], H/vb[3]
    out = {}
    def walk(el, m):
        m2 = mul(m, parse_transform(el.get("transform")))
        tag = el.tag.split("}")[-1]
        cid = el.get("id","")
        if re.match(r'^(connector\d+(?:pin)?|pin\d+[A-Z]|pin\d+[WXYZ])$', cid):
            c = bbox_center(el, tag)
            if c:
                x,y = apply(m2, *c)
                key = re.sub(r'pin$', '', cid) if cid.startswith("connector") else cid
                if key not in out or cid.endswith("pin"):          # 'connectorNpin' tem prioridade sobre 'connectorN'
                    out[key] = ((x-vb[0])*sx, (y-vb[1])*sy)
        elif re.match(r'^connector\d+leg$', cid) and tag == "line":
            # perna dobravel: o ponto de conexao e a ponta da perna (x2,y2)
            x,y = apply(m2, float(el.get("x2")), float(el.get("y2")))
            out[cid.replace("leg","")] = ((x-vb[0])*sx, (y-vb[1])*sy)
        for ch in el: walk(ch, m2)
    def bbox_center(el, tag):
        g = lambda k, d=0: float(el.get(k, d))
        if tag in ("rect","use","image"): return (g("x")+g("width")/2, g("y")+g("height")/2)
        if tag in ("circle","ellipse"): return (g("cx"), g("cy"))
        if tag == "line": return ((g("x1")+g("x2"))/2, (g("y1")+g("y2"))/2)
        if tag in ("polygon","polyline"):
            nums = [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', el.get("points") or "")]
            xs, ys = nums[0::2], nums[1::2]
            if xs and ys: return ((min(xs)+max(xs))/2, (min(ys)+max(ys))/2)
        if tag == "path":
            pts = path_points(el.get("d") or "")
            if pts:
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                return ((min(xs)+max(xs))/2, (min(ys)+max(ys))/2)
        if tag == "g":
            pts=[]
            for ch in el:
                c = bbox_center(ch, ch.tag.split("}")[-1])
                if c: pts.append(apply(parse_transform(ch.get("transform")), *c))
            if pts: return (sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts))
        return None
    walk(root, [1,0,0,1,0,0])
    return out, (W, H)

if __name__ == "__main__":
    import glob, sys
    fz = open(glob.glob("servo/*.fz")[0], encoding="utf8").read()
    # breadboard instance 1760946: which part?
    m = re.search(r'<instance moduleIdRef="([^"]+)" modelIndex="1760946" path="([^"]+)"', fz); print("breadboard part:", m.group(1), m.group(2))
    geo = re.search(r'modelIndex="1760946".*?<breadboardView[^>]*>\s*<geometry z="[^"]+" x="([^"]+)" y="([^"]+)"', fz, re.S); bx, by = float(geo.group(1)), float(geo.group(2)); print("bb pos", bx, by)
    fzp = glob.glob(PARTS + "/core/*.fzp")
    for f in fzp:
        if 'moduleId="13f88e58b86d08d73d112f0fb05e6968"' in open(f, encoding="utf8", errors="ignore").read(): print("fzp:", f); info = fz_info = fzp_info(f); break
    cen, size = svg_connector_centers(info["svg"]); print("svg size px", size, "n connectors", len(cen))
    for pin in ["pin21W","pin20A","pin19D"]:
        c = cen.get(pin); print(pin, "calc abs:", (bx+c[0], by+c[1]) if c else None)
    print("wire128 start (pin21W) real: 511.85 211.495 ; end (pin20A) real:", 511.85+5.65004, 211.495-36)
