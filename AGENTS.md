# claudin-rob — kit de aulas de Arduino/ESP32/IoT (Espaço Cria)

Repositório com 5 sequências didáticas completas (sketches compilados, esquemas Fritzing, scripts Python e guias
Aluno/Professor em DOCX/ODT/PDF) e um gerador reproduzível para tudo isso. Este arquivo é a referência para
**instalar todas as dependências em outra máquina** (o alvo principal é **Linux Mint**; o Windows original está
documentado no README.md) e para saber como cada peça é regenerada.

> Atalho: em Linux Mint/Ubuntu rode `bash setup-linux-mint.sh` (instala tudo listado abaixo e baixa os modelos).
> Depois, `bash verificar.sh` compila todos os sketches e testa o Python para confirmar.

## 1. Estrutura

| Pasta | Conteúdo |
|---|---|
| `aula-servos/` | Servomotores SG90 → Servo Mini Arm (6 encontros) |
| `aula-leds/` | LEDs, botão, pot, RGB, semáforo, ESP32 + web (4 aulas) |
| `aula-distancia/` | HC-SR04, serial + Python ao vivo, buzzer, alarme de ré, ESP32 web, WhatsApp/e-mail (6 aulas) |
| `aula-sensores/` | DS18B20, DHT11, MQ-2, MQ-135, BME680, pH-4502C — Uno e ESP32 com monitor Wi-Fi (6 aulas) |
| `aula-esp32cam/` | ESP32-CAM OV3660: stream, PIR+SD, Drive/Telegram, OpenCV, MediaPipe gestos→LEDs (5 aulas) |
| `python-dados/` | Ambiente Python (uv) usado por TODOS os scripts Python das aulas (`pyproject.toml` + `uv.lock`) |
| `iot-stack/` | docker-compose InfluxDB 2 + Grafana + ponte MQTT→InfluxDB (opcional, laboratório) |
| `ferramentas/fritzing/user-parts/` | Peças Fritzing extras (ESP32 DevKit, ESP32-CAM, DHT11, BME680, módulo MQ, PIR) já corrigidas |
| `imagens/logos/` | Logos da capa dos guias (só na 1ª página) |

Cada `aula-*/` tem: `codigo/` (sketches `.ino`, um por pasta, + headers comuns), `esquemas/` (gerador Fritzing:
`esquemas.py`, `fzgen.py`, `fzparse.py`, `export.py` → `saida/*.fzz` e `*.png`), `gerador/` (guias: `guia-aluno.js`,
`guia-professor.js`, `lib.js`, `gerar.js`, `converter.sh`/`.ps1`) e `saida/` (Guia-do-Aluno-*.docx/odt/pdf e
Guia-do-Professor-*). `aula-distancia/python/` e `aula-esp32cam/python/` têm os scripts Python.

## 2. Dependências — lista completa

### 2.1 Sistema (apt no Linux Mint)
| Pacote | Para quê |
|---|---|
| `git`, `curl`, `unzip`, `build-essential` | base |
| `python3` (≥ 3.13 — usar o do `uv`, ver 2.3), `python3-venv` | scripts |
| `nodejs` (≥ 18; usamos 24) + `npm` | gerador dos guias (docx-js) |
| `libreoffice-writer`, `libreoffice-draw` | DOCX→ODT/PDF e SVG→PNG dos esquemas |
| `poppler-utils` (`pdftoppm`, `pdfinfo`, `pdftotext`) | conferência dos PDFs |
| `pandoc` | leitura de DOCX (opcional) |
| `fritzing` + `fritzing-parts` | exportar os esquemas (`fritzing --svg`); no Mint vem 0.9.3b (funciona) |
| `mosquitto`, `mosquitto-clients` | broker MQTT das aulas de IoT |
| `docker.io`/`docker-compose-plugin` (opcional) | InfluxDB + Grafana (`iot-stack/`) |
| `dialout` no grupo do usuário (`sudo usermod -aG dialout $USER`) | acesso às portas seriais `/dev/ttyUSB*` / `/dev/ttyACM*` |
| Opcionais GUI: `arduino-ide` (AppImage/flatpak), `thonny`, `putty`, `sqlitebrowser`, Node-RED (`npm i -g node-red`), Cursor, Codex (`npm i -g @anthropic-ai/Codex`) | ambiente completo do laboratório |

Drivers USB-serial: no Linux o CH340 e o CP210x já vêm no kernel (`ch341`, `cp210x`); só o grupo `dialout` é necessário.

### 2.2 Arduino CLI — cores e bibliotecas (obrigatório para compilar/gravar)
Instalar: `curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh` (fica em `~/bin`).
```
arduino-cli config init
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install arduino:avr        # 1.8.8  (Uno/Nano)
arduino-cli core install esp32:esp32        # 3.3.12 (ESP32 Dev Module, AI Thinker ESP32-CAM)
```
Bibliotecas (`arduino-cli lib install "<nome>"`), versões usadas na compilação de referência:

| Biblioteca | Versão | Aulas |
|---|---|---|
| ESP32Servo | 3.2.1 | servos (ESP32) |
| Servo (core AVR), EEPROM, Preferences, WiFi, WebServer, WiFiClientSecure, HTTPClient, SD_MMC, FS, esp_camera, esp_http_server | vêm com os cores | várias |
| OneWire | 2.3.8 | sensores (DS18B20) |
| DallasTemperature | 4.0.6 | sensores (DS18B20) |
| DHT sensor library | 1.4.7 | sensores (DHT11) |
| Adafruit Unified Sensor | 1.1.15 | DHT, BME680 |
| Adafruit BusIO | 1.17.4 | BME680 |
| Adafruit BME680 Library | 2.0.6 | sensores (BME680) |
| MQUnifiedsensor | 3.0.0 | sensores (MQ-2, MQ-135) |
| PubSubClient | 2.8 | desafios MQTT |
| ArduinoJson | 7.4.3 | desafios |
| LiquidCrystal I2C, Adafruit SSD1306, Adafruit GFX Library, NewPing | 1.1.2 / 2.5.17 / 1.12.6 / 1.9.7 | extras/desafios |
| ESP Mail Client (Mobizt) | 3.4.24 | opcional (o sketch de e-mail usa SMTP manual, sem lib) |

FQBNs usados: `arduino:avr:uno`, `esp32:esp32:esp32`, `esp32:esp32:esp32cam`.
Gravar: `arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 <pasta_do_sketch>`.

### 2.3 Python (todos os scripts) — pasta `python-dados/`, gerenciada por **uv**
Instalar uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`. Depois `cd python-dados && uv sync` (usa `uv.lock`;
baixa o Python 3.13 se preciso). Rodar scripts com `uv run python <script>` a partir de `python-dados/`
(ex.: `uv run python ../aula-distancia/python/plot_distancia.py --simular`).

Pacotes (em `pyproject.toml`): pyserial, matplotlib, numpy, pandas, scipy, scikit-learn, seaborn, plotly, jupyterlab,
ipywidgets, openpyxl, paho-mqtt, influxdb-client, streamlit, dash, fastapi, uvicorn[standard], requests,
**opencv-python (5.x)**, **mediapipe (≥ 1.0 — API `mediapipe.tasks`)**.
Sem uv: `pip install pyserial matplotlib numpy requests opencv-python mediapipe paho-mqtt influxdb-client streamlit`.

Arquivos de modelo (NÃO estão no git — o `setup-linux-mint.sh` baixa; ~17 MB) em `aula-esp32cam/python/modelos/`:
- `gesture_recognizer.task` — https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task
- `hand_landmarker.task` — https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
- `haarcascade_frontalface_default.xml` — https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml

### 2.4 Node (gerador dos guias)
Em cada `aula-*/gerador/`: `npm install docx@9` (único pacote; `package.json` já aponta `docx ^9.7`). Node 18+.

### 2.5 Fritzing (esquemas)
- App: `sudo apt install fritzing fritzing-parts` (0.9.3b) — ou a build portátil usada no Windows (GitHub fritzing-app,
  release CD-548). O gerador chama `fritzing --svg <pasta>`; caminho ajustável por `FRITZING_BIN`.
- Biblioteca core: `/usr/share/fritzing/parts` (apt) — ajustável por `FRITZING_PARTS` (precisa das subpastas `core/` e `svg/core/`).
- Peças extras do curso: copie `ferramentas/fritzing/user-parts/*` para `~/Documents/Fritzing/parts/` (cria `user/` e
  `svg/user/{breadboard,schematic,pcb,icon}`) — ou aponte `FRITZING_USER_PARTS`. Já incluem o patch de `id="breadboard"` do BME680.
- Conversão SVG→PNG: LibreOffice (`soffice`), ajustável por `SOFFICE_BIN`.

### 2.6 Serviços externos (só para as aulas que os usam; credenciais NUNCA no git)
CallMeBot (WhatsApp), Gmail com senha de app (SMTP), Google Apps Script (Drive), bot do Telegram, rede Wi-Fi com internet.
Preencha as constantes no topo dos sketches 05 (distância), 03 (esp32cam) na hora da aula.

### 2.7 Hardware por aula (resumo)
Arduino Uno/Nano, ESP32 Dev Module (DevKit V1, 30 pinos), ESP32-CAM AI-Thinker (OV3660/OV2640) + adaptador USB-serial 5 V
ou base ESP32-CAM-MB, microSD, SG90 (180°) ×4 + Servo Mini Arm impresso, potenciômetros 10k, botões, LEDs + RGB, buzzer
passivo MH-FMD, HC-SR04, HC-SR501 (PIR), DS18B20, DHT11, MQ-2, MQ-135, BME680, pH-4502C + sonda BNC + tampões, resistores
(220 Ω, 1 k, 2 k, 4,7 k, 10 k), capacitor 470 µF, fonte 5 V 2 A, protoboards e jumpers.

## 3. Como regenerar cada coisa
```
# compilar um sketch
arduino-cli compile --fqbn arduino:avr:uno aula-leds/codigo/02_semaforo
arduino-cli compile --fqbn esp32:esp32:esp32cam aula-esp32cam/codigo/01_cam_foto_stream

# esquemas Fritzing de uma aula  (gera .fzz, exporta SVG pelo Fritzing e converte para PNG)
cd aula-sensores/esquemas && python esquemas.py            # --sem-export para só gerar os .fzz

# guias de uma aula  (DOCX -> ODT + PDF)
cd aula-sensores/gerador && bash converter.sh               # Windows: powershell -File converter.ps1

# scripts Python
cd python-dados && uv run python ../aula-esp32cam/python/gestos_leds.py --webcam --sem-esp
```
Os sketches do ESP32 das aulas de sensores e ESP32-CAM precisam dos headers comuns (`monitor_wifi.h`, `pagina_web.h`,
`camera_aithinker.h`) **dentro da pasta de cada sketch** — já estão copiados; se editar o header, copie de novo.

## 4. Convenções e armadilhas conhecidas
- Guias: `lib.js` monta o sumário manualmente (o LibreOffice não atualiza campos TOC) e aplica quebras de página no
  título seguinte (`pageBreakBefore`), evitando páginas em branco. Figuras aceitam PNG e JPG. Logos só na capa.
- Fritzing: pinos de trilha da protoboard pulam as colunas 8, 14, 20, … (helper `rz()`); resistores ocupam 4 colunas
  (400 mil); peças só renderizam se o SVG tiver grupo `id="breadboard"`; SVG com unidade `px` = 72 dpi; alguns fzp usam
  `svgId ≠ connectorId` (mapeado em `fzparse.bbmap`).
- ESP32 core 3.x: PWM com `ledcAttach/ledcWrite` (não `ledcSetup`); `tone()` existe; ADC 12 bits; pot no 3V3; sinais
  de 5 V (HC-SR04 ECHO, MQ AO, pH Po) exigem divisor 1 k/2 k.
- ESP32-CAM: PSRAM necessária acima de VGA; SD em modo 1-bit libera GPIO 4/12/13; GPIO 0 ao GND só para gravar.
- Portas seriais: uma por programa (fechar o Monitor Serial antes do Python). No Linux: grupo `dialout`.
- Windows (máquina original): Fritzing portátil em `C:\Ferramentas\Fritzing`; detalhes de WSL2/Docker no README.md.
