#!/usr/bin/env bash
# Tutorial do pH-4502C: figuras (matplotlib) -> DOCX (docx-js) -> ODT e PDF (LibreOffice).
# Uso: bash gerar_tutorial.sh [minutos]
#   com [minutos], busca de novo as leituras da bancada no servidor da telemetria-cria (cria/teste/no5);
#   sem argumento, usa o bancada.json salvo.
# Fontes: tutorial.js (texto geral), hidroponia.js (secoes 11 a 13), graficos.py (curva, erros, bancada),
#         figuras.py e figuras_hidroponia.py (diagramas proprios). Esquemas Fritzing: ../../esquemas/saida/01*.png.
# No Windows (Git Bash): SOFFICE_BIN="/c/Program Files/LibreOffice/program/soffice.com" bash gerar_tutorial.sh
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-ph4502c/graficos.py ${1:+--baixar "$1"} \
                          && uv run python ../aula-agua/gerador/tutorial-ph4502c/figuras.py)
NODE_PATH=../node_modules node tutorial.js
cd ../../saida
NOME=Tutorial-pH-4502C-Instalacao-e-Calibracao
"${SOFFICE_BIN:-soffice}" --headless --convert-to odt "$NOME.docx" >/dev/null
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' "$NOME.docx" >/dev/null
ls -la "$NOME".*
