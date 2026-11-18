#!/usr/bin/env bash
# Tutorial MH-Z19C + DHT11: DOCX (docx-js) -> PDF (LibreOffice).
# Esquemas: ../../esquemas/saida/*.png (python esquemas.py). Resultado do teste: serial.log + teste.json nesta pasta.
# Uso: bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Tutorial-MH-Z19C-DHT11-Ligacao-e-Teste.docx >/dev/null
ls -la Tutorial-MH-Z19C-DHT11-Ligacao-e-Teste.*
