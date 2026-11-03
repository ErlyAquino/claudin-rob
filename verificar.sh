#!/usr/bin/env bash
# Verifica o ambiente: compila TODOS os sketches e testa os scripts Python sem hardware.
cd "$(dirname "$0")"
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
falhas=0
compila() { # fqbn pasta
  # 2a tentativa: o arduino-cli 1.5.x as vezes nao acha uma biblioteca do core (ex.: SoftwareSerial) na 1a compilacao apos editar o sketch
  if arduino-cli compile --fqbn "$1" "$2" >/dev/null 2>&1 || arduino-cli compile --fqbn "$1" "$2" >/dev/null 2>&1; then echo "  OK   $2"; else echo "  FALHA $2"; falhas=$((falhas+1)); fi
}
echo "=== Arduino Uno ==="
for s in aula-servos/codigo/0{1,2,3,7,8}_* aula-leds/codigo/0{1,1b,2,3,3b,4,4b}_* aula-distancia/codigo/0{1,1b,2,2b,3}_* aula-sensores/codigo/0?_*_uno aula-ar/codigo/0?_*_uno; do [ -d "$s" ] && compila arduino:avr:uno "$s"; done
echo "=== ESP32 ==="
for s in aula-servos/codigo/0{4,5,6}_* aula-leds/codigo/0{5,6}_* aula-distancia/codigo/0{4,5}_* aula-sensores/codigo/0?b_*_web aula-ar/codigo/0?b_*_web aula-tapo/codigo/01_*; do [ -d "$s" ] && compila esp32:esp32:esp32 "$s"; done
# no da telemetria-cria: precisa da CriaTelemetria e de um credenciais.h (aqui, uma copia vazia do modelo)
tel=aula-ar/codigo/06b_monitor_ar_esp32_telemetria
if [ -d "$tel" ]; then tmp=$(mktemp -d); cp -r "$tel" "$tmp/"; cp "$tel/credenciais.exemplo.h" "$tmp/$(basename "$tel")/credenciais.h"
  if arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 "$tmp/$(basename "$tel")" >/dev/null 2>&1; then echo "  OK   $tel (CriaTelemetria)"; else echo "  FALHA $tel (instale a CriaTelemetria: veja CLAUDE.md, secao 2.2)"; falhas=$((falhas+1)); fi; rm -rf "$tmp"; fi
echo "=== ESP32-CAM ==="
for s in aula-esp32cam/codigo/0?_*; do [ -d "$s" ] && compila esp32:esp32:esp32cam "$s"; done
echo "=== Python ==="
(cd python-dados && uv run python -c "import serial, matplotlib, numpy, cv2, mediapipe, requests; print('  OK   imports: pyserial', serial.__version__, '| opencv', cv2.__version__, '| mediapipe', mediapipe.__version__)") || falhas=$((falhas+1))
(cd python-dados && MPLBACKEND=Agg uv run python ../aula-distancia/python/plot_distancia.py --simular --png /tmp/teste_plot.png >/dev/null 2>&1 && echo "  OK   plot_distancia --simular") || { echo "  FALHA plot_distancia"; falhas=$((falhas+1)); }
(cd python-dados && uv run python ../aula-esp32cam/python/reconhecer_imagem.py --demo --salvar >/dev/null 2>&1 && rm -f resultado.jpg bordas.jpg && echo "  OK   reconhecer_imagem --demo") || { echo "  FALHA reconhecer_imagem"; falhas=$((falhas+1)); }
(cd python-dados && uv run python -c "import sys; sys.path.insert(0,'../aula-tapo/python'); import numpy as np; from rostos import Reconhecedor; r=Reconhecedor(); r.detectar(np.full((240,320,3),200,np.uint8)); print('  OK   rostos (YuNet+SFace)')" 2>/dev/null) || { echo "  FALHA rostos (modelos onnx?)"; falhas=$((falhas+1)); }
echo "=== Ferramentas ==="
for t in arduino-cli uv node soffice pdftoppm fritzing mosquitto_pub; do command -v $t >/dev/null && echo "  OK   $t" || echo "  falta $t"; done
echo; [ $falhas -eq 0 ] && echo "TUDO OK" || echo "$falhas falha(s) — veja acima"
