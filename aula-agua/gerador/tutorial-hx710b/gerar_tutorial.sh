#!/usr/bin/env bash
# Tutorial do sensor de pressao HX710B + MPS20N0040D (nivel do reservatorio): figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh
# Fontes: tutorial.js (texto), figuras.py (diagramas proprios), pagina_celular.png e painel_telemetria.png
#         (capturar_paginas.sh, so quando a pagina ou o painel mudarem), sketches em ../../codigo/10*
#         e o esquema Fritzing ../../esquemas/saida/10_hx710b_esp32.png  (regenerar so ele:  cd ../../esquemas && python esquemas.py --so 10).
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-hx710b/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-Sensor-de-Pressao-HX710B-Nivel
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
