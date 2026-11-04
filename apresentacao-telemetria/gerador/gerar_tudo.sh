#!/usr/bin/env bash
# Gera a apresentação completa: PPTX (pptxgenjs) -> PDF + ODP (LibreOffice) -> imagens dos slides -> apostila DOCX (+ ODT).
# Requisitos: node (npm install nesta pasta), LibreOffice (soffice), poppler (pdftoppm) e a skill pptx do Claude (apply_theme.js):
#   export PPTX_SKILL_DIR=/caminho/da/skill/pptx     (ou deixe vazio: o tema fica com as cores padrão do Office)
cd "$(dirname "$0")"
export NODE_PATH="$PWD/node_modules"
SOFFICE="${SOFFICE_BIN:-$( [ -x "/c/Program Files/LibreOffice/program/soffice.com" ] && echo "/c/Program Files/LibreOffice/program/soffice.com" || echo soffice )}"
SAIDA="$PWD/../saida"; TMP="$SAIDA/tmp_slides"; mkdir -p "$TMP"
node gerar_slides.js || exit 1
"$SOFFICE" --headless --convert-to pdf --outdir "$SAIDA" "$SAIDA/Telemetria-CRIA-Apresentacao.pptx" >/dev/null 2>&1
"$SOFFICE" --headless --convert-to odp --outdir "$SAIDA" "$SAIDA/Telemetria-CRIA-Apresentacao.pptx" >/dev/null 2>&1
rm -f "${TMP:?}"/slide-*.png
pdftoppm -png -r 110 "$SAIDA/Telemetria-CRIA-Apresentacao.pdf" "$TMP/slide"
node gerar_docx.js "$TMP" || exit 1
"$SOFFICE" --headless --convert-to odt --outdir "$SAIDA" "$SAIDA/Telemetria-CRIA-Apresentacao-Apostila.docx" >/dev/null 2>&1
rm -rf "${TMP:?}"
ls -la "$SAIDA"
