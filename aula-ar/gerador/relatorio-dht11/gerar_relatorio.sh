#!/usr/bin/env bash
# Relatorio do DHT11: graficos (graficos.py, le o monitor em localhost:8019) -> DOCX (docx-js) -> PDF (LibreOffice).
# Uso: bash gerar_relatorio.sh [--graficos]
set -e
cd "$(dirname "$0")"
if [ "$1" = "--graficos" ]; then (cd ../../../python-dados && uv run python ../aula-ar/gerador/relatorio-dht11/graficos.py >/dev/null); fi
NODE_PATH=../node_modules node relatorio.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Relatorio-DHT11-Calibracao-Sensacao-Termica.docx >/dev/null
ls -la Relatorio-DHT11-Calibracao-Sensacao-Termica.*
