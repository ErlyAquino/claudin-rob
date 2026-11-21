#!/usr/bin/env bash
# Gera o PDF "ENEM 2026: Física resolvida passo a passo".
# 1) enunciados em LaTeX a partir de questoes/*.md (transcrição revisada)  2) pdflatex 2x  3) copia o PDF para a pasta base
set -e
cd "$(dirname "$0")"
PY="${PYTHON:-python}"
"$PY" -I ../ferramentas/md2tex_enunciado.py 91 92 94 95 96 99 104 111 113 114 118 121 128 130 133
cd tex
for i in 1 2; do
  pdflatex -interaction=nonstopmode -halt-on-error fisica-enem-2026-resolucao.tex > build.log 2>&1 || { tail -40 build.log; exit 1; }
done
cp fisica-enem-2026-resolucao.pdf ../../ENEM-2026-dia2-fisica-resolucao.pdf
grep -c "Overfull" build.log | sed 's/^/Overfull boxes: /' || true
pdfinfo ../../ENEM-2026-dia2-fisica-resolucao.pdf | grep Pages
