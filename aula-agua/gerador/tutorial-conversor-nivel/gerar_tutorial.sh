#!/usr/bin/env bash
# Tutorial do conversor de nivel logico 5 V <-> 3,3 V: figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh
# Fontes: tutorial.js (texto), figuras.py (diagramas proprios), sketch em ../../codigo/11_scanner_i2c_esp32
#         e esquema Fritzing em ../../esquemas/saida/11*.png  (regenerar so esse:  cd ../../esquemas && python esquemas.py --so 11).
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-conversor-nivel/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-Conversor-de-Nivel-Logico
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
