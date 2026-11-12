# Física no ENEM: revisão rápida

Material de revisão para alunos do ensino médio com pouca base, feito a partir da análise das provas do
2º dia do ENEM de 2021 a 2025 (Ciências da Natureza, questões 91 a 135, caderno 7 azul).

**PDF final:** `Fisica-no-ENEM-revisao-rapida.pdf` (23 páginas).

**Apresentação interativa:** `Fisica-no-ENEM-apresentacao.odp` (LibreOffice Impress; cópia em `.pptx`), 93 slides
com todo o conteúdo do PDF. No modo de apresentação (F5) são clicáveis: o menu, a barra de navegação de baixo,
os cartões das aberturas, os botões "Ver a resolução" das 12 questões reais e as alternativas das 6 questões de
treino (a errada abre um slide oculto de dica; a certa abre a resposta comentada).

## O que a análise mostrou

79 questões de Física em 5 anos (16, 16, 16, 16 e 15 por ano).

| Área | Questões | Parte |
|---|---|---|
| Mecânica | 23 | 29% |
| Eletricidade e magnetismo | 20 | 25% |
| Ondulatória | 15 | 19% |
| Termologia | 15 | 19% |
| Óptica | 3 | 4% |
| Física moderna | 3 | 4% |

As três áreas do material (mecânica, eletricidade e ondas) somam 73% das questões. O empate entre
ondulatória e termologia foi desfeito pelas aparições como assunto secundário (18 contra 16); o calor
entrou como bônus no resumo de bolso.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `provas/` | Provas e gabaritos oficiais do INEP (`ANO_PV_impresso_D2_CD7.pdf`, `ANO_GB_impresso_D2_CD7.pdf`) |
| `analise/` | Taxonomia usada (`INSTRUCOES_CLASSIFICADOR.md`), gabaritos e a classificação de cada questão (`fisica_ANO.json`, `fisica_todas.json`) |
| `tex/` | Fontes LaTeX: `revisao-enem-fisica.tex` (principal), `estilo.tex` (preâmbulo e caixas) e um arquivo por capítulo |
| `skills_github/` | Skills baixadas do GitHub usadas como referência (fora do git: licenças de terceiros) |

## Como gerar o PDF

```
cd tex
pdflatex -interaction=nonstopmode -halt-on-error revisao-enem-fisica.tex
pdflatex -interaction=nonstopmode -halt-on-error revisao-enem-fisica.tex
```

Duas passadas, por causa das referências de página. No Windows usamos MiKTeX; no Linux Mint:
`sudo apt install texlive-latex-extra texlive-fonts-extra texlive-pictures texlive-science texlive-lang-portuguese`.

## Como gerar a apresentação

```
cd apresentacao/gerador
bash gerar_tudo.sh        # PPTX (pptxgenjs) -> ODP e PDF de conferência em apresentacao/saida
```

Precisa de Node com `pptxgenjs`, `sharp`, `react`, `react-dom` e `react-icons` (o script reaproveita o
`node_modules` de `apresentacao-telemetria/gerador`) e do LibreOffice. As figuras em `apresentacao/figuras`
saem do próprio LaTeX: `cd tex && mkdir -p figs && pdflatex -jobname=figs/figs figs-extrair.tex` gera um PDF
com uma figura por página, e `pdftoppm -r 330 -f N -l N -png -singlefile figs/figs.pdf ../apresentacao/figuras/fNNN`
exporta a página N. Se o LaTeX mudar, a numeração das páginas pode mudar.

## Direitos autorais

As questões reais do ENEM aparecem resumidas com ano e número, sem transcrição do enunciado. As 6 questões
de treino são originais, inspiradas no estilo da prova.
