#!/usr/bin/env bash
# Guia de montagem do monitor de ar - Partes 1 (MQ-135), 2 (MQ-2), 3 (MH-Z19C), 4 (DHT22) e 5 (no completo): figuras de rede (HTML -> PNG), DOCX (docx-js) -> PDF (LibreOffice).
# Esquema Fritzing: cd ../../esquemas && python esquemas.py --monitor
# Uso: bash gerar.sh   (NAVEGADOR=caminho do Edge/Chrome; SOFFICE_BIN=caminho do soffice)
set -e
cd "$(dirname "$0")"
NAV="${NAVEGADOR:-$(command -v chromium || command -v google-chrome || echo '/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')}"
for f in rede-1a:1000,370 rede-1b:1000,470 rede-2a:1000,370 rede-2b:1000,470 rede-3a:1000,370 rede-3b:1000,470 rede-4a:1000,370 rede-4b:1000,470 rede-5a:1000,370 rede-5b:1000,470 tempo-5:1000,400; do
  n=${f%%:*}; s=${f#*:}
  "$NAV" --headless=new --disable-gpu --hide-scrollbars --run-all-compositor-stages-before-draw --virtual-time-budget=3000 --force-device-scale-factor=2 --window-size=$s \
    --screenshot="$(pwd -W 2>/dev/null || pwd)/figuras/$n.png" "file:///$(pwd -W 2>/dev/null || pwd)/figuras/$n.html" >/dev/null 2>&1
done
NODE_PATH=../node_modules node guia.js
NODE_PATH=../node_modules node guia2.js
NODE_PATH=../node_modules node guia3.js
NODE_PATH=../node_modules node guia4.js
NODE_PATH=../node_modules node guia5.js
cd ../../saida
for d in Guia-Montagem-Monitor-Ar-Parte1-MQ135 Guia-Montagem-Monitor-Ar-Parte2-MQ2 Guia-Montagem-Monitor-Ar-Parte3-MHZ19C Guia-Montagem-Monitor-Ar-Parte4-DHT22 Guia-Montagem-Monitor-Ar-Parte5-No-Completo; do
  "${SOFFICE_BIN:-soffice}" --headless --convert-to 'pdf:writer_pdf_Export' $d.docx >/dev/null 2>&1     || echo "AVISO: $d.pdf nao foi regravado (aberto em outro programa?)"
  ls -la $d.*
done
