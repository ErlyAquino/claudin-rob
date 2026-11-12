"""Monta questoes/lista.tex (questões por área e assunto) a partir de questoes.json, gerado por recortar.py.
Uso: python montar.py   (não precisa de bibliotecas)."""
import json
import os
from collections import Counter

AQUI = os.path.dirname(os.path.abspath(__file__))
itens = json.load(open(os.path.join(AQUI, "questoes.json"), encoding="utf8"))
AREAS = [("Mecânica", "corA", "Mecânica", "Movimento, forças e energia."),
         ("Eletricidade e magnetismo", "corB", "Eletricidade", "Circuitos, pilhas, potência e energia elétrica."),
         ("Ondulatória", "corC", "Ondas", "Som, luz e fenômenos ondulatórios.")]
LARG_TEXTO, ALT_MAX = 483.0, 575.0     # pontos


def bloco(q, cor, secao=None, alt_max=ALT_MAX):
    """Uma questão: título do assunto (se mudou), cabeçalho, recortes e gabarito, sem deixar título órfão."""
    out = []
    n = len(q["pedacos"])
    for k, (nome, w, h) in enumerate(q["pedacos"]):
        esc = min(1.3, LARG_TEXTO / w, alt_max / h)
        precisa = h * esc + (40 if k == 0 else 8) + (34 if k == n - 1 else 0) + (45 if (k == 0 and secao) else 0)
        out.append(f"\\Needspace{{{min(precisa, 690):.0f}pt}}")
        if k == 0 and secao:
            out.append(f"\\secao{{{secao}}}")
        if k == 0:
            out.append(f"\\cabq{{{cor}}}{{{q['ano']}}}{{{q['numero']}}}{{{q['assunto']}}}")
        out.append(f"\\recorte{{{nome}}}{{{w * esc:.1f}pt}}")
    out.append(f"\\gabq{{{cor}}}{{{q['gabarito']}}}{{{1 if q['resolvida'] else 0}}}")
    return "\n".join(out) + "\n"


tex = []
anuladas = [q for q in itens if q["gabarito"] == "Anulado"]
validas = [q for q in itens if q["gabarito"] != "Anulado"]
for area, cor, curto, frase in AREAS:
    qs = [q for q in validas if q["area"] == area]
    cont = Counter(q["assunto"] for q in qs)
    ordem = sorted(cont, key=lambda a: (-cont[a], a))
    qs.sort(key=lambda q: (ordem.index(q["assunto"]), q["ano"], q["numero"]))
    tex.append(f"\\assunto{{{cor}}}{{{curto}}}{{{len(qs)} questões citadas na revisão. {frase}}}{{{curto}}}")
    tex.append("{\\small Assuntos: " + "; ".join(f"{a} ({cont[a]})" for a in ordem) + ".\\par}\\medskip")
    atual = None
    for i, q in enumerate(qs):
        nova = q["assunto"] != atual
        atual = q["assunto"]
        # a primeira questão da área divide a página com a faixa de abertura: limite de altura menor
        tex.append(bloco(q, cor, secao=atual if nova else None, alt_max=455 if i == 0 else ALT_MAX))
if anuladas:
    tex.append("\\clearpage\\titulo{Anuladas}{Questões anuladas citadas na análise}")
    tex.append("{\\small O INEP anulou estas duas questões. Elas aparecem na contagem da análise, por isso estão aqui. Não há gabarito.\\par}\\medskip")
    for q in sorted(anuladas, key=lambda q: (q["ano"], q["numero"])):
        tex.append(bloco(q, "cinza"))
# tabela de gabaritos
tex.append("\\clearpage\\titulo{Gabarito}{Gabarito oficial (caderno azul)}\\label{pg:gab}")
tex.append("{\\small Fonte: gabaritos oficiais do INEP para o caderno 7 (azul) do 2º dia de cada ano.\\par}\\medskip")
tex.append("\\begin{tcbraster}[fileira=3,raster column skip=3mm]")
for area, cor, curto, _ in AREAS:
    qs = sorted([q for q in validas if q["area"] == area], key=lambda q: (q["ano"], q["numero"]))
    linhas = "\\\\\n".join(f"{q['ano']} & questão {q['numero']} & \\textbf{{{q['gabarito']}}}" for q in qs)
    tex.append(f"\\begin{{bolso}}{{{cor}}}{{{curto}}}\n\\centering\\renewcommand{{\\arraystretch}}{{1.25}}"
               f"\\begin{{tabular}}{{@{{}}l@{{\\quad}}l@{{\\quad}}c@{{}}}}\n{linhas}\n\\end{{tabular}}\n\\end{{bolso}}")
tex.append("\\end{tcbraster}")
open(os.path.join(AQUI, "lista.tex"), "w", encoding="utf8").write("\n".join(tex) + "\n")
print(len(itens), "questões;", sum(len(q["pedacos"]) for q in itens), "recortes")
