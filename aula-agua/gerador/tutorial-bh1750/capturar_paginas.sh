#!/usr/bin/env bash
# Capturas de tela do tutorial do sensor de luz BH1750, com o Edge/Chrome sem janela:
#   pagina_celular.png   a pagina do sketch 08b (simular_pagina.js), em dois momentos: de dia, na meta, e de noite, depois de um dia fraco
#   painel_telemetria.png  o painel da telemetria-cria (simular_painel.js) com o no teste/no8 do sketch 08c
# Uso (Git Bash no Windows):  bash capturar_paginas.sh
#   NAVEGADOR=/caminho/do/chrome   troca o navegador;   TELEMETRIA_DIR=/caminho/telemetria-cria   troca o repositorio
set -e
cd "$(dirname "$0")"
NAV="${NAVEGADOR:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
win() { cygpath -w "$1" 2>/dev/null || echo "$1"; }
foto() {   # foto <url> <arquivo> <largura,altura> <ms de espera>
  "$NAV" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size="$3" \
         --virtual-time-budget="$4" --screenshot="$(win "$PWD/$2")" "$1" 2>/dev/null
}

node simular_pagina.js 8771 13900 12.1 16 67 & P1=$!
node simular_pagina.js 8773 0 9.4 12.4 54 & P2=$!
sleep 1
foto "http://localhost:8771/" pagina_dia.png 460,1330 200000
foto "http://localhost:8773/" pagina_noite.png 460,1330 200000
kill $P1 $P2

if [ -d "${TELEMETRIA_DIR:-../../../../telemetria-cria}/servidor/node_modules/socket.io" ]; then
  node simular_painel.js 8772 & P3=$!
  sleep 1
  foto "http://localhost:8772/" painel_telemetria.png 1180,500 6000
  kill $P3
else
  echo "telemetria-cria/servidor/node_modules nao encontrado: painel_telemetria.png nao foi refeito"
fi

(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-bh1750/juntar_capturas.py)
rm -f pagina_dia.png pagina_noite.png
