#!/usr/bin/env bash
# Captura a pagina do sketch 05e pelo simulador (simular_pagina.js) com o Edge/Chrome sem janela -> pagina_celular.png
# Uso (Git Bash no Windows):  bash capturar_pagina.sh      (NAVEGADOR=/caminho/do/chrome para trocar o navegador)
set -e
cd "$(dirname "$0")"
NAV="${NAVEGADOR:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
for par in "8765 :pagina_auto" "8766 desliga:pagina_manual"; do
  set -- $par; porta=$1; modo=${2%%:*}; nome=${2##*:}
  node simular_pagina.js "$porta" $modo & PID=$!
  sleep 1
  "$NAV" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=500,700 \
         --virtual-time-budget=2500 --screenshot="$(cygpath -w "$PWD/$nome.png" 2>/dev/null || echo "$PWD/$nome.png")" "http://localhost:$porta/" 2>/dev/null
  kill $PID
done
(cd ../../../python-dados && uv run python -c "
from PIL import Image
d='../aula-agua/gerador/tutorial-timer-bomba/'
a=Image.open(d+'pagina_auto.png').convert('RGB'); b=Image.open(d+'pagina_manual.png').convert('RGB')
m=Image.new('RGB',(a.width+b.width+60,a.height),'white'); m.paste(a,(0,0)); m.paste(b,(a.width+60,0)); m.save(d+'pagina_celular.png'); print('figura: pagina_celular.png', m.size)")
rm -f pagina_auto.png pagina_manual.png
