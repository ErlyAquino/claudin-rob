#!/usr/bin/env bash
# Tutorial do timer da bomba: figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh
# Fontes: tutorial.js (texto), figuras.py (diagramas proprios), pagina_celular.png (capturar_pagina.sh, so quando a pagina mudar),
#         sketches em ../../codigo/05*  e esquemas Fritzing em ../../esquemas/saida/05*.png
#         (regenerar so esses:  cd ../../esquemas && python esquemas.py --so 05).
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-timer-bomba/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-Timer-da-Bomba-da-Hidroponia
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
