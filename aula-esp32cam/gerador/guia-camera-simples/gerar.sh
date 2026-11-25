#!/usr/bin/env bash
# Guia da ESP32-CAM simples (camera ao vivo no navegador): DOCX (docx-js) -> PDF (LibreOffice).
set -e
cd "$(dirname "$0")"
NODE_PATH=../../../aula-ar/gerador/node_modules node guia.js
cd ../../saida
"${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' Guia-ESP32-CAM-Camera-Simples.docx 2>&1 | grep -i error && echo "PDF nao atualizado: feche o PDF aberto no leitor e rode de novo" || true
ls -la Guia-ESP32-CAM-Camera-Simples.*
