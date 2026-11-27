#!/usr/bin/env bash
# Capturas de tela do tutorial do sensor de vazao YF-S201, com o Edge/Chrome sem janela:
#   pagina_celular.png   a pagina do sketch 09b (simular_pagina.js), em dois momentos: vazao na faixa e alerta de sem vazao
#   painel_telemetria.png  o painel da telemetria-cria (simular_painel.js) com o no teste/no9 do sketch 09c
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

node simular_pagina.js 8771 7.4 & P1=$!
node simular_pagina.js 8773 0 & P2=$!
sleep 1
foto "http://localhost:8771/" pagina_ok.png 460,1330 200000
foto "http://localhost:8773/" pagina_alerta.png 460,1330 200000
kill $P1 $P2

if [ -d "${TELEMETRIA_DIR:-../../../../telemetria-cria}/servidor/node_modules/socket.io" ]; then
  node simular_painel.js 8772 & P3=$!
  sleep 1
  foto "http://localhost:8772/" painel_telemetria.png 1180,500 6000
  kill $P3
else
  echo "telemetria-cria/servidor/node_modules nao encontrado: painel_telemetria.png nao foi refeito"
fi

(cd ../../../python-dados && uv run python ../aula-agua/gerador/tutorial-yfs201/juntar_capturas.py)
rm -f pagina_ok.png pagina_alerta.png
