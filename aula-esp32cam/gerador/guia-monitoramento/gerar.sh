#!/usr/bin/env bash
# Guia rapido da camera de monitoramento com ESP32-CAM: DOCX (docx-js) -> PDF (LibreOffice).
# Esquema Fritzing: cd ../../esquemas && python esquemas.py --monitoramento
set -e
cd "$(dirname "$0")"
NODE_PATH=../../../aula-ar/gerador/node_modules node guia.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Guia-Montagem-Camera-Monitoramento-ESP32-CAM.docx >/dev/null 2>&1
ls -la Guia-Montagem-Camera-Monitoramento-ESP32-CAM.*
