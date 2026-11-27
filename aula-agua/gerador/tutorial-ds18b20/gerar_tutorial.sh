#!/usr/bin/env bash
# Tutorial do sensor de temperatura DS18B20: figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh
# Fontes: tutorial.js (texto), figuras.py (diagramas proprios), pagina_celular.png e painel_telemetria.png
#         (capturar_paginas.sh, so quando a pagina ou o painel mudarem), sketches em ../../codigo/07*
#         e esquemas Fritzing em ../../esquemas/saida/07*.png  (regenerar so esses:  cd ../../esquemas && python esquemas.py --so 07).
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-ds18b20/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-Sensor-de-Temperatura-DS18B20
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
