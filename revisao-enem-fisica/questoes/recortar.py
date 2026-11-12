"""Recorta dos cadernos oficiais do INEP as questões do ENEM citadas na revisão e gera a lista para o LaTeX.

Uso (a partir de python-dados/):  uv run --with pymupdf python ../revisao-enem-fisica/questoes/recortar.py
Saída: questoes/recortes/ANO-NUM-k.pdf (recorte vetorial, sem alterar o conteúdo) e questoes/lista.tex.
As questões são reproduzidas como estão no caderno 7 (azul) do 2º dia; a numeração é a desse caderno.
"""
import json
import os
import re
import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
REC = os.path.join(AQUI, "recortes")
os.makedirs(REC, exist_ok=True)

# questões citadas no PDF de revisão (ano: números), na numeração do caderno azul
CITADAS = {
    2021: [92, 100, 107, 120, 128, 131],
    2022: [96, 100, 119, 128],
    2023: [100, 109, 111, 112, 114, 120, 124, 128, 135],
    2024: [99, 106, 119, 129, 131],
    2025: [94, 108, 114, 126, 130, 132, 135],
}
RESOLVIDAS = {(2023, 124), (2023, 100), (2022, 100), (2025, 108), (2021, 107), (2022, 128), (2025, 130), (2025, 94),
              (2021, 128), (2021, 131), (2021, 92), (2023, 135), (2023, 112)}
BASE = 743                     # faixa útil da página (sem cabeçalho e rodapé), em pontos


def cabecalhos(doc):
    """[(numero, pagina, x0, y0)] em ordem de leitura."""
    ach = {}
    for pn, pg in enumerate(doc):
        for b in pg.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                t = "".join(s["text"] for s in ln["spans"])
                m = re.match(r"\s*QUEST[ÃA]O\s+(\d{2,3})\s*$", t, re.I)
                if m and 91 <= int(m.group(1)) <= 135:
                    ach.setdefault(int(m.group(1)), (pn, ln["bbox"][0], ln["bbox"][1]))
    return ach


def geometria(doc, cab):
    """Colunas de cada página, a partir da posição dos títulos "QUESTÃO n" (a margem muda entre páginas pares e ímpares)."""
    por_pag = {}
    for pn, x, y in cab.values():
        lado = 0 if x < doc[pn].rect.width / 2 - 30 else 1
        por_pag.setdefault(pn, {})[lado] = x
    geo = {}
    for pn in range(len(doc)):
        v = dict(por_pag.get(pn, {}))
        for lado in (0, 1):
            if lado not in v:      # usa a página mais próxima de mesma paridade que tenha título nessa coluna
                cand = sorted((abs(p - pn), p) for p in por_pag if p % 2 == pn % 2 and lado in por_pag[p])
                v[lado] = por_pag[cand[0][1]][lado] if cand else (30 if lado == 0 else 289)
        xl, xr = v[0], v[1]
        geo[pn] = [(xl - 4, xr - 7), (xr - 4, xr + (xr - xl) - 7)]
    return geo


def justo(pg, clip):
    """Tira o branco de cima e de baixo do recorte, olhando os pixels."""
    pm = pg.get_pixmap(clip=clip, dpi=60, colorspace=pymupdf.csGRAY)
    linhas = [min(pm.samples[r * pm.stride:(r + 1) * pm.stride]) < 235 for r in range(pm.height)]
    if not any(linhas):
        return None
    k = clip.height / pm.height
    a, b = linhas.index(True), len(linhas) - 1 - linhas[::-1].index(True)
    return pymupdf.Rect(clip.x0, max(clip.y0, clip.y0 + a * k - 3), clip.x1, min(clip.y1, clip.y0 + (b + 1) * k + 3))


def base_pag(pg):
    """Limite de baixo da área útil: logo acima do fio do rodapé, se houver."""
    ys = [d["rect"].y0 for d in pg.get_drawings() if d["rect"].width > 400 and d["rect"].y0 > 700]
    return min(ys + [BASE]) - 2


def larga(pg, x_div, y0, y1):
    """A questão ocupa a largura toda da página? (linhas de texto que atravessam a divisa das colunas)"""
    n = 0
    for b in pg.get_text("dict", clip=pymupdf.Rect(0, y0, pg.rect.width, y1))["blocks"]:
        for ln in b.get("lines", []):
            x0, _, x1, _ = ln["bbox"]
            if x0 < x_div - 40 and x1 > x_div + 25:
                n += 1
    return n >= 2


def pedacos(doc, cab, num, geo, topo):
    pn, x, y = cab[num]
    prox = cab.get(num + 1)
    pg = doc[pn]
    col = 0 if x < pg.rect.width / 2 - 30 else 1
    y0 = y - 5
    out = []
    if col == 0:      # questão em largura total: um recorte só, do título até a próxima questão da página
        fim = prox[2] - 3 if (prox and prox[0] == pn and prox[2] > y0) else base_pag(pg)
        if larga(pg, geo[pn][1][0], y0, fim):
            r = justo(pg, pymupdf.Rect(geo[pn][0][0], y0, geo[pn][1][1], fim))
            return [(pn, r)]
    while True:
        pg = doc[pn]
        c0, c1 = geo[pn][col]
        fim = base_pag(pg)
        ultimo = False
        if prox and prox[0] == pn and (0 if prox[1] < pg.rect.width / 2 - 30 else 1) == col and prox[2] > y0:
            fim, ultimo = prox[2] - 3, True
        clip = pymupdf.Rect(c0, y0, c1, fim)
        r = justo(pg, clip)
        if r and r.height > 25:
            out.append((pn, r))
        if ultimo or prox is None:
            break
        col += 1
        if col > 1:
            col, pn = 0, pn + 1
        y0 = topo
        if pn >= len(doc):
            break
    return out


def main():
    todas = json.load(open(os.path.join(RAIZ, "analise", "fisica_todas.json"), encoding="utf8"))
    gab = json.load(open(os.path.join(RAIZ, "analise", "gabaritos.json"), encoding="utf8"))
    info = {(q["ano"], q["numero"]): q for q in todas}
    itens = []
    for ano, nums in CITADAS.items():
        arq = os.path.join(RAIZ, "provas", f"{ano}_PV_impresso_D2_CD7.pdf")
        doc = pymupdf.open(arq)
        cab = cabecalhos(doc)
        geo = geometria(doc, cab)
        topo = min(y for _, _, y in cab.values()) - 5
        for n in nums:
            ps = pedacos(doc, cab, n, geo, topo)
            arqs = []
            for k, (pn, r) in enumerate(ps, 1):
                novo = pymupdf.open()
                pag = novo.new_page(width=r.width, height=r.height)
                pag.show_pdf_page(pag.rect, doc, pn, clip=r)
                nome = f"{ano}-{n}-{k}.pdf"
                novo.save(os.path.join(REC, nome), garbage=4, deflate=True)
                arqs.append((nome, r.width, r.height))
            q = info[(ano, n)]
            itens.append(dict(ano=ano, numero=n, area=q["area"], assunto=q["assunto"], gabarito=gab[str(ano)][str(n)],
                              resolvida=(ano, n) in RESOLVIDAS, pedacos=arqs))
            print(ano, n, q["area"], "|", q["assunto"], "| gab", gab[str(ano)][str(n)], "|", [(a, round(h)) for a, w, h in arqs])
    json.dump(itens, open(os.path.join(AQUI, "questoes.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
