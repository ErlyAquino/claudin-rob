"""Converte questoes/qNNN.md (transcrição revisada) em resolucao/tex/enun/qNNN.tex.

Uso:  python -I ferramentas/md2tex_enunciado.py 91 92 94 ...
Assim o enunciado do PDF de resoluções vem sempre do Markdown conferido contra o scan (nada é redigitado).
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
LARG = {  # largura máxima da figura do enunciado (fração da linha); padrão 0.55
    "q091_fig1": 0.24, "q095_fig1": 0.37, "q096_fig1": 0.28, "q099_fig1": 0.5, "q104_fig1": 0.27, "q111_fig1": 0.78,
    "q113_fig1": 0.4, "q114_fig1": 0.74, "q118_fig1": 0.28, "q121_fig1": 0.44, "q133_fig1": 0.5,
}
ALT_COLUNAS = {  # alternativas curtas ficam lado a lado: número de colunas por linha (sem entrada = uma por linha)
    92: 5, 94: 5, 95: 5, 96: 5, 113: 5, 114: 5, 118: 3, 121: 5, 133: 5,
}
FIG_AO_LADO = {113}  # questões em que a figura fica à esquerda do quadro que vem logo depois dela (largura: LARG)
# tipografia (só no .tex; o Markdown não muda): "7 000" e "60 cm" ganham espaço fino inseparável, como no resto do material
UNIDADES = r"(?:Btu/h|kWh|Wh|kW|MeV|Hz|cm|km|nm|mm|min|kg|W|V|K|J|m|s|h)"


def inline(t: str) -> str:
    """Markdown em linha -> LaTeX, preservando o que está entre $...$."""
    partes = re.split(r"(\$[^$]+\$)", t)
    out = []
    for p in partes:
        if p.startswith("$") and p.endswith("$") and len(p) > 1:
            out.append(p.replace(r"\ \text{", r"\,\text{"))
            continue
        p = p.replace("\\", r"\textbackslash{}")
        p = re.sub(r"([%&#_])", r"\\\1", p)
        p = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", p)
        p = re.sub(r"\*(.+?)\*", r"\\textit{\1}", p)
        p = p.replace("π", r"$\pi$").replace("“", "``").replace("”", "''")
        p = re.sub(r"(?<=\d) (?=\d{3}(?!\d))", r"\\,", p)                       # milhar: 7 000 -> 7\,000
        p = re.sub(r"(?<=\d) (?=" + UNIDADES + r"(?![\wÀ-ú]))", r"\\,", p)     # número + unidade: 60 cm -> 60\,cm
        out.append(p)
    return re.sub(r"(?<=\$) (?=" + UNIDADES + r"(?![\wÀ-ú]))", r"\\,", "".join(out))   # $5{,}0 \times 10^{-4}$ s -> ...$\,s


def tabela(linhas):
    celulas = [[c.strip() for c in l.strip().strip("|").split("|")] for l in linhas]
    cab, corpo = celulas[0], celulas[2:]
    n = len(cab)
    s = ["\\begin{center}\\renewcommand{\\arraystretch}{1.15}", "\\begin{tabular}{" + "c" * n + "}", "\\toprule"]
    s.append(" & ".join("\\textbf{%s}" % inline(c) for c in cab) + r"\\")
    s.append("\\midrule")
    s += [" & ".join(inline(c) for c in l) + r"\\" for l in corpo]
    s += ["\\bottomrule", "\\end{tabular}\\end{center}"]
    return "\n".join(s)


def converter(n: int) -> str:
    md = (BASE / "questoes" / f"q{n:03d}.md").read_text(encoding="utf-8")
    blocos = [b.strip() for b in re.split(r"\n\s*\n", md) if b.strip()]
    out, alts = [], []
    for b in blocos:
        if b.startswith("## "):
            continue
        m = re.match(r"\*\*([A-E])\)\*\*\s*(.*)$", b, re.S)
        if m:
            alts.append((m.group(1), m.group(2).strip()))
            continue
        m = re.match(r"!\[[^\]]*\]\(imagens/([^)]+)\)$", b, re.S)
        if m:
            nome = m.group(1)
            out.append("\\figq[%s\\linewidth]{%s}" % (LARG.get(Path(nome).stem, 0.55), nome))
            continue
        if b.startswith(">"):
            out.append("\\fonte{%s}" % inline(re.sub(r"^>\s?", "", b, flags=re.M).replace("\n", " ")))
            continue
        if b.startswith("|"):
            out.append(tabela(b.splitlines()))
            continue
        if b.startswith("$$") and b.endswith("$$"):
            out.append("\\[ %s \\]" % b.strip("$").strip())
            continue
        out.append(inline(b.replace("\n", " ")) + "\\par")
    if n in FIG_AO_LADO:  # figura | título do quadro + quadro
        i = next(k for k, t in enumerate(out) if t.startswith("\\figq"))
        j = next(k for k, t in enumerate(out) if k > i and "\\begin{tabular}" in t)
        m = re.match(r"\\figq\[([\d.]+)\\linewidth\]\{([^}]+)\}", out[i])
        out[i:j + 1] = ["\\begin{figlado}{%s}{%s}" % (m.group(1), m.group(2))] + out[i + 1:j + 1] + ["\\end{figlado}"]
    if alts and all(c.startswith("![") for _, c in alts):
        figs = [re.search(r"\(imagens/([^)]+)\)", c).group(1) for _, c in alts]
        out.append("\\begin{center}\n" + "\\hfill".join("\\altfig{%s}{%s}" % (l, f) for (l, _), f in zip(alts, figs)) + "\n\\end{center}")
    elif alts and n in ALT_COLUNAS:
        cols = ALT_COLUNAS[n]
        larg = "" if cols == 5 else "[%.3f]" % (0.975 / cols)
        itens = ["\\alth%s{%s}{%s}" % (larg, l, inline(c)) for l, c in alts]
        linhas = ["%\n".join(itens[k:k + cols]) for k in range(0, len(itens), cols)]
        out.append("\\begin{altlinha}\n" + "\\\\[1.5pt]\n".join(linhas) + "\n\\end{altlinha}")
    elif alts:
        out.append("\\begin{alternativas}\n" + "\n".join("  \\item %s" % inline(c) for _, c in alts) + "\n\\end{alternativas}")
    cab = f"% gerado por ferramentas/md2tex_enunciado.py a partir de questoes/q{n:03d}.md (não editar à mão)\n"
    return cab + "\n".join(out) + "\n"


if __name__ == "__main__":
    destino = BASE / "resolucao" / "tex" / "enun"
    destino.mkdir(parents=True, exist_ok=True)
    for a in sys.argv[1:]:
        n = int(a)
        (destino / f"q{n:03d}.tex").write_text(converter(n), encoding="utf-8")
    print(len(sys.argv) - 1, "enunciados ->", destino)
