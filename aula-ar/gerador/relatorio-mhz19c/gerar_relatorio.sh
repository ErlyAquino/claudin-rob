#!/usr/bin/env bash
# Relatorio de calibracao do MH-Z19C: grafico da telemetria-cria -> DOCX (docx-js) -> PDF (LibreOffice).
# Uso: bash gerar_relatorio.sh [minutos]   (o servidor da telemetria-cria precisa estar no ar para o grafico)
set -e
cd "$(dirname "$0")"
if [ -n "$1" ]; then (cd ../../../python-dados && uv run python ../aula-ar/gerador/relatorio-mhz19c/grafico_telemetria.py --minutos "$1"); fi
node relatorio.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Relatorio-Calibracao-MH-Z19C.docx >/dev/null
ls -la Relatorio-Calibracao-MH-Z19C.*
