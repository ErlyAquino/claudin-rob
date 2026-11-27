#!/usr/bin/env bash
# Tutorial do sensor de condutividade (TDS Meter V1.0): figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh
# Fontes: tutorial.js (texto), figuras.py (diagramas proprios), pagina_celular.png e painel_telemetria.png
#         (capturar_paginas.sh, so quando a pagina ou o painel mudarem), sketches em ../../codigo/06*
#         e esquemas Fritzing em ../../esquemas/saida/06*.png  (regenerar so esses:  cd ../../esquemas && python esquemas.py --so 06).
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-tds/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-Sensor-de-Condutividade-TDS
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
