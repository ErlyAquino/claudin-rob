#!/usr/bin/env bash
# Gera o Markdown, o HTML e o PDF de slides (Edge/Chrome headless).
# Uso: bash gerar_pdf.sh            -> prova completa (ENEM-2026-dia2-amarelo-slides.pdf)
#      bash gerar_pdf.sh fisica     -> só Física      (ENEM-2026-dia2-fisica-slides.pdf)
set -e
cd "$(dirname "$0")"
PERFIL="${1:-completo}"
node gerar.js "$PERFIL"
case "$PERFIL" in
  completo) HTML=slides.html; PDF=ENEM-2026-dia2-amarelo-slides.pdf ;;
  fisica)   HTML=slides-fisica.html; PDF=ENEM-2026-dia2-fisica-slides.pdf ;;
esac
BASE="$(cd .. && pwd)"
BROWSER="${BROWSER_BIN:-}"
for c in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
         "$(command -v chromium 2>/dev/null)" "$(command -v google-chrome 2>/dev/null)" "$(command -v chromium-browser 2>/dev/null)"; do
  [ -z "$BROWSER" ] && [ -n "$c" ] && [ -x "$c" ] && BROWSER="$c"
done
URL="file:///$(cygpath -m "$BASE/$HTML" 2>/dev/null || echo "$BASE/$HTML")"
OUT="$(cygpath -w "$BASE/$PDF" 2>/dev/null || echo "$BASE/$PDF")"
"$BROWSER" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
  --virtual-time-budget=60000 --run-all-compositor-stages-before-draw --print-to-pdf="$OUT" "$URL"
pdfinfo "$BASE/$PDF" | grep -E "Pages|Page size"
