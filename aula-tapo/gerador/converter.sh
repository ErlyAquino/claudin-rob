#!/usr/bin/env bash
# Gera os guias (DOCX via node/docx-js) e converte para ODT e PDF com LibreOffice. Linux/macOS.
set -e
cd "$(dirname "$0")"
[ -d node_modules/docx ] || npm install docx@9
node gerar.js
SOFFICE="${SOFFICE_BIN:-soffice}"
cd ../saida
for f in *.docx; do
  "$SOFFICE" --headless --convert-to odt "$f" >/dev/null
  "$SOFFICE" --headless --convert-to 'pdf:writer_pdf_Export' "$f" >/dev/null
done
ls -la *.pdf *.odt
