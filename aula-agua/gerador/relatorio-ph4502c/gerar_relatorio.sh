#!/usr/bin/env bash
# Relatorio de calibracao do pH-4502C: graficos (matplotlib) -> DOCX (docx-js) -> PDF (LibreOffice).
# Uso: bash gerar_relatorio.sh [minutos]
#   com [minutos], busca de novo as leituras da bancada no servidor da telemetria-cria (cria/teste/no5);
#   sem argumento, usa o bancada.json salvo.
set -e
cd "$(dirname "$0")"
(cd ../../../python-dados && uv run python ../aula-agua/gerador/relatorio-ph4502c/graficos.py ${1:+--baixar "$1"})
node relatorio.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Relatorio-Calibracao-pH-4502C.docx >/dev/null
ls -la Relatorio-Calibracao-pH-4502C.*
