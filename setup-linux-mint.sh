#!/usr/bin/env bash
# Instala TODAS as dependencias do kit de aulas em Linux Mint / Ubuntu (ver CLAUDE.md).
# Uso:  bash setup-linux-mint.sh          (pede sudo para o apt)
#       bash setup-linux-mint.sh --sem-gui  (pula IDE/Thonny/Node-RED/Docker)
set -euo pipefail
cd "$(dirname "$0")"
SEM_GUI=${1:-}

echo "=== 1/8 pacotes do sistema (apt) ==="
sudo apt update
sudo apt install -y git curl unzip build-essential python3 python3-venv nodejs npm \
  libreoffice-writer libreoffice-draw fonts-crosextra-carlito fonts-liberation poppler-utils pandoc fritzing fritzing-parts \
  mosquitto mosquitto-clients
sudo usermod -aG dialout "$USER" || true
if [ "$SEM_GUI" != "--sem-gui" ]; then
  sudo apt install -y thonny putty sqlitebrowser docker.io docker-compose-v2 || true
  sudo usermod -aG docker "$USER" || true
  sudo npm install -g node-red @anthropic-ai/claude-code || true
fi

echo "=== 2/8 Arduino CLI + cores ==="
if ! command -v arduino-cli >/dev/null; then
  curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR="$HOME/bin" sh
  export PATH="$HOME/bin:$PATH"
  grep -q 'HOME/bin' ~/.bashrc || echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
fi
arduino-cli config init --overwrite >/dev/null
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli core install esp32:esp32

echo "=== 3/8 bibliotecas Arduino ==="
for lib in "ESP32Servo" "OneWire" "DallasTemperature" "DHT sensor library" "Adafruit Unified Sensor" "Adafruit BusIO" \
           "Adafruit BME680 Library" "MQUnifiedsensor" "PubSubClient" "ArduinoJson" "LiquidCrystal I2C" \
           "Adafruit SSD1306" "Adafruit GFX Library" "NewPing" "Servo" "ESP Mail Client"; do
  arduino-cli lib install "$lib" || echo "  (falhou: $lib)"
done

echo "=== 4/8 uv + ambiente Python (python-dados) ==="
if ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
(cd python-dados && uv sync)

echo "=== 5/8 modelos de visao (MediaPipe / OpenCV) ==="
M=aula-esp32cam/python/modelos; mkdir -p "$M"
[ -f "$M/gesture_recognizer.task" ] || curl -L -o "$M/gesture_recognizer.task" https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task
[ -f "$M/hand_landmarker.task" ]    || curl -L -o "$M/hand_landmarker.task" https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
[ -f "$M/haarcascade_frontalface_default.xml" ] || curl -L -o "$M/haarcascade_frontalface_default.xml" https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml
[ -f "$M/face_detection_yunet_2023mar.onnx" ] || curl -L -o "$M/face_detection_yunet_2023mar.onnx" https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

echo "=== 6/8 Node: docx-js em cada gerador ==="
for d in aula-*/gerador; do (cd "$d" && { [ -f package-lock.json ] && npm ci --no-audit --no-fund >/dev/null || npm install --no-audit --no-fund docx@9 >/dev/null; } && echo "  $d ok"); done

echo "=== 7/8 pecas extras do Fritzing ==="
mkdir -p ~/Documents/Fritzing/parts
cp -r ferramentas/fritzing/user-parts/* ~/Documents/Fritzing/parts/
echo "  copiadas para ~/Documents/Fritzing/parts (user/ e svg/user/)"
# O Fritzing 1.0.x le as pecas de usuario na pasta XDG de documentos (em pt-BR: ~/Documentos) - copia tambem para la
XDG_DOCS=$(xdg-user-dir DOCUMENTS 2>/dev/null || echo "$HOME/Documents")
if [ "$XDG_DOCS" != "$HOME/Documents" ]; then
  mkdir -p "$XDG_DOCS/Fritzing/parts" && cp -r ferramentas/fritzing/user-parts/* "$XDG_DOCS/Fritzing/parts/"
  echo "  copiadas tambem para $XDG_DOCS/Fritzing/parts (pasta que o Fritzing usa neste sistema)"
fi

echo "=== 8/8 verificacao rapida ==="
bash verificar.sh || true
echo
echo "Pronto. Faca logout/login (grupo dialout/docker). Veja CLAUDE.md para os comandos de cada aula."
