# ENEM 2026 — 2º dia — Caderno 5 Amarelo

Transcrição do caderno escaneado (Ciências da Natureza, 91–135, e Matemática, 136–180) e materiais derivados.
Origem: PDF de 31 páginas escaneadas, sem camada de texto ("ENEM 2 dia - Prova Amarela Anglo Resolve.pdf").

## Entregas

| Arquivo | O que é |
|---|---|
| `ENEM-2026-dia2-amarelo.md` | Prova completa em Markdown (90 questões, fórmulas em LaTeX, figuras em `imagens/`) |
| `ENEM-2026-dia2-amarelo-slides.pdf` | Slides 16:9, uma questão ampliada por slide (134 slides) |
| `ENEM-2026-dia2-fisica.md` | As 15 questões de Ciências da Natureza que envolvem Física, com a numeração original |
| `ENEM-2026-dia2-fisica-slides.pdf` | Slides só das questões de Física (24 slides) |
| `ENEM-2026-dia2-fisica-resolucao.pdf` | Análise da prova (quantidade, assuntos, porcentagens) e resolução passo a passo das 15 questões de Física |

O gabarito da resolução sai das próprias resoluções; conferir com o gabarito oficial do Inep.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `questoes/` | Uma questão por arquivo (`q091.md` … `q180.md`): é a fonte de tudo; corrija aqui |
| `imagens/` | Figuras recortadas da prova (`qNNN_figK.png`, `qNNN_altX.png`) |
| `paginas/`, `recortes/`, `ocr/` | Páginas do scan, recorte de cada questão (`indice.json`) e rascunho do Tesseract, usados na transcrição e na revisão |
| `gerador/` | `gerar.js` (Markdown completo + HTML dos slides; perfis `completo` e `fisica`) e `gerar_pdf.sh` (Edge/Chrome headless) |
| `resolucao/` | Fontes LaTeX da resolução de Física (`tex/`) e `compilar.sh` |
| `ferramentas/` | `recortar_figura.py`, `md2tex_enunciado.py` (enunciado em LaTeX a partir do Markdown) e os roteiros usados pelos agentes de transcrição e revisão |

## Como regenerar

```
cd gerador && npm install          # marked + katex (uma vez)
bash gerador/gerar_pdf.sh          # prova completa: Markdown + slides
bash gerador/gerar_pdf.sh fisica   # só Física
bash resolucao/compilar.sh         # resolução de Física (pdflatex 2x; mesmo estilo de revisao-enem-fisica/tex)
```

Dependências: Node 18+, Edge ou Chrome/Chromium, Python 3 com Pillow, pdfLaTeX (MiKTeX ou TeX Live com FiraSans, newtxsf,
tcolorbox, pgfplots, circuitikz, fontawesome5) e poppler-utils.
