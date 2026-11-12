#!/usr/bin/env bash
# Gera a apresentação interativa: PPTX (pptxgenjs) -> ODP (LibreOffice Impress) + PDF de conferência.
# Requisitos: node com pptxgenjs, sharp, react, react-dom e react-icons (npm install nesta pasta, ou
# NODE_PATH apontando para apresentacao-telemetria/gerador/node_modules), LibreOffice (soffice) e as
# figuras em ../figuras (extraídas do LaTeX: ver tex/figs-extrair.tex).
cd "$(dirname "$0")"
[ -d node_modules ] && export NODE_PATH="$PWD/node_modules" || export NODE_PATH="${NODE_PATH:-$PWD/../../../apresentacao-telemetria/gerador/node_modules}"
SOFFICE="${SOFFICE_BIN:-$( [ -x "/c/Program Files/LibreOffice/program/soffice.com" ] && echo "/c/Program Files/LibreOffice/program/soffice.com" || echo soffice )}"
SAIDA="$PWD/../saida"; NOME="Fisica-no-ENEM-apresentacao"
node gerar_slides.js || exit 1
"$SOFFICE" --headless --convert-to odp --outdir "$SAIDA" "$SAIDA/$NOME.pptx" >/dev/null 2>&1
"$SOFFICE" --headless --convert-to pdf --outdir "$SAIDA" "$SAIDA/$NOME.pptx" >/dev/null 2>&1
ls -la "$SAIDA"
