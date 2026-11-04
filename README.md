# claudin-rob — Stack de Ensino: Arduino, ESP32, Python, Dados e Painéis IoT

Ambiente instalado em 26/09/2026 (Windows 11).

## Camada 1 — Firmware (Arduino / ESP32)

| Ferramenta | Comando / Local | Uso |
|---|---|---|
| Arduino IDE 2 | menu Iniciar → *Arduino IDE* | Ensino clássico (Uno, Nano, Mega, ESP32) |
| Arduino CLI | `arduino-cli` | Compilar/gravar via terminal e Claude Code |
| PlatformIO Core | `pio` (+ extensão VS Code) | Projetos profissionais, multi-placa |
| esptool | `esptool` | Flash de firmware ESP32 (`esptool flash-id`) |
| mpremote | `mpremote` | MicroPython no ESP32 (`mpremote connect COMx repl`) |
| Thonny | menu Iniciar → *Thonny* | IDE simples para MicroPython |
| Wokwi | extensão VS Code | Simulador de ESP32/Arduino sem hardware |

Cores instalados: `arduino:avr`, `esp32:esp32`. Bibliotecas: DHT, Adafruit Unified Sensor,
ArduinoJson, PubSubClient (MQTT), LiquidCrystal I2C, Servo, OneWire, DallasTemperature,
Adafruit SSD1306/GFX. Reconfigurar com `setup-arduino-cli.ps1`.

```bash
arduino-cli board list                                  # placas conectadas
arduino-cli compile --fqbn esp32:esp32:esp32 ./sketch   # compilar ESP32
arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32 ./sketch
```

## Camada 2 — Python & Análise de Dados

Projeto `python-dados/` gerenciado com **uv** (Python 3.13):
JupyterLab, pandas, numpy, matplotlib, seaborn, plotly, scipy, scikit-learn,
pyserial, paho-mqtt, streamlit, dash, fastapi, uvicorn, ipywidgets, openpyxl.

```bash
cd python-dados
uv run jupyter lab              # notebooks
uv run streamlit run app.py     # painel web rápido
uv add <pacote>                 # adicionar biblioteca
```

## Camada 3 — Vibe Coding

- **Claude Code CLI** — `claude` (terminal) + extensão no VS Code
- **Cursor** — `cursor .`
- VS Code: Python, Pylance, Ruff, Jupyter, PlatformIO, Serial Monitor, C/C++,
  Live Server, Prettier, ESLint, Containers, Error Lens

## Camada 4 — Painéis web e IoT

| Ferramenta | Como usar |
|---|---|
| Mosquitto (broker MQTT) | serviço Windows já rodando em `localhost:1883` |
| MQTT Explorer | menu Iniciar — inspecionar tópicos |
| Node-RED | `node-red` → http://localhost:1880 (dashboards sem código) |
| Streamlit / Dash / FastAPI | em `python-dados/` |
| Node 24 + npm | `npm create vite@latest` para front-ends em JS |

Fluxo típico de aula: **ESP32 (PubSubClient) → Mosquitto → Node-RED / Python (paho-mqtt) → painel Streamlit**

## Camada 5 — Utilitários

PuTTY (terminal serial), DB Browser for SQLite, Git, GitHub CLI (`gh`).

## Camada 6 — Séries temporais (WSL2 + Docker + InfluxDB + Grafana)

Instalados: WSL 2.7.14 (Ubuntu), Docker Desktop 29.8. Stack em `iot-stack/`:

| Serviço | URL | Credenciais |
|---|---|---|
| InfluxDB 2 | http://localhost:8086 | admin / admin12345 · org `escola` · bucket `sensores` · token `token-aula-sensores-123` |
| Grafana | http://localhost:3000 | admin / admin (datasource InfluxDB já provisionado) |

```bash
cd iot-stack; docker compose up -d        # subir
cd python-dados; uv run python ../iot-stack/mqtt_para_influx.py   # ponte MQTT -> InfluxDB
```

Pipeline completo da aula: **ESP32 → MQTT (Mosquitto) → `mqtt_para_influx.py` → InfluxDB → Grafana**.

Teste sem hardware (no PowerShell as aspas do JSON são removidas da linha de comando — use um arquivo):
```powershell
'{"temp":25.3,"umid":60}' | Set-Content leitura.json
& 'C:\Program Files\mosquitto\mosquitto_pub.exe' -h localhost -t sensores/sala1 -f leitura.json
```

Ubuntu (WSL2): instalado sem usuário (entra como `root`). Para criar o seu, no Ubuntu (`wsl`):
`adduser SEU_NOME && usermod -aG sudo SEU_NOME` e depois, no PowerShell, `ubuntu config --default-user SEU_NOME`.

**Após reiniciar o Windows**, se o Docker não subir sozinho: `powershell -ExecutionPolicy Bypass -File D:\Projetos\claudin-rob\pos-reboot.ps1`
(limpa sockets órfãos em `%LOCALAPPDATA%\Docker\run`, inicia o Docker e sobe os containers).

### Problemas resolvidos na instalação (para referência)
- WSL2 dizia "virtualização não habilitada" mesmo com SVM ligado na BIOS: faltava `bcdedit /set hypervisorlaunchtype auto`
  **e** a feature `VirtualMachinePlatform` estava marcada como instalada sem os arquivos (`vmcompute.exe`).
  Correção: desabilitar/reabilitar a feature + reiniciar de verdade (Fast Startup foi desligado).
- Docker Desktop crashava com `rename ...sock ...stale`: sockets Unix órfãos em `%LOCALAPPDATA%\Docker\run` e
  `%LOCALAPPDATA%\docker-secrets-engine` que o Windows não apaga; renomear as pastas resolve.
  O autostart do Windows (`HKCU\...\Run\Docker Desktop`) foi trocado por `docker-start.ps1`, que faz essa limpeza
  antes de abrir o Docker a cada login. Para reverter: apontar a entrada de volta para `Docker Desktop.exe`.

## Aula: Servomotores (Arduino → ESP32 → Servo Mini Arm)

Pasta `aula-servos/`:

| Subpasta | Conteúdo |
|---|---|
| `codigo/01..07` | Sketches compilados (Uno: 01–03, 07; ESP32: 04–06) |
| `esquemas/` | Gerador de esquemas Fritzing (`python esquemas.py`) → `saida/*.fzz` (editáveis) e `*.png` |
| `gerador/` | Gerador dos guias (docx-js): `powershell -File converter.ps1` → DOCX, ODT, PDF |
| `saida/` | **Guia-do-Aluno-Servomotores** e **Guia-do-Professor-Servomotores** (.docx/.odt/.pdf) |

Logos da capa: `imagens/logos/*.png` (somente na primeira página). Fritzing portátil em `C:\Ferramentas\Fritzing`
(build CD-548 do GitHub; peça ESP32 DevKit V1 instalada em `Documents\Fritzing\parts\user`).

## Aula: LEDs (Arduino → ESP32 → semáforo + RGB pela web)

Pasta `aula-leds/` — mesma estrutura da aula de servos: `codigo/` (9 sketches compilados: 01, 01b, 02, 03, 03b, 04, 04b Uno; 05, 06 ESP32),
`esquemas/` (6 esquemas Fritzing), `gerador/` (guias) e `saida/` (**Guia-do-Aluno-LEDs** e **Guia-do-Professor-LEDs**).
4 aulas: LED + botão · semáforo (funções, millis, pedestre) · LED RGB + pot · ESP32 + página web (AP `Semaforo-ESP32`, http://192.168.4.1).

## Aula: Sensor de distância HC-SR04 (6 aulas)

Pasta `aula-distancia/`: `codigo/` (01, 01b, 02, 02b, 03 Uno; 04, 05 ESP32 — compilados), `python/` (`ler_serial.py`, `plot_distancia.py --simular`),
`esquemas/` (4 esquemas Fritzing + `grafico_python.png`), `gerador/`, `saida/` (**Guia-do-Aluno/Professor-Sensor-Distancia**).
Aulas: eco/regra de três + serial · Python ao vivo · buzzer/melodias (robsoncouto/arduino-songs) · alarme de ré · ESP32 + web (AP `Alarme-ESP32`) · WhatsApp (CallMeBot) + e-mail (SMTP manual).

## Aula: Sensores (DS18B20, DHT11, MQ-2, MQ-135, BME680, pH-4502C — 6 aulas)

Pasta `aula-sensores/`: `codigo/` (6 sketches Uno + 6 ESP32 com monitor Wi-Fi; `monitor_wifi.h`/`pagina_web.h` comuns — todos compilados),
`esquemas/` (12 esquemas Fritzing), `gerador/`, `saida/` (**Guia-do-Aluno/Professor-Sensores**).
Bibliotecas: OneWire, DallasTemperature, DHT sensor library, MQUnifiedsensor, Adafruit BME680 (+BusIO/Unified Sensor).
Peças Fritzing extras em `Documents\Fritzing\parts\user`: DHT11 e BME680 (Adafruit), módulo MQ (KAST-Tech).

## Aula: ESP32-CAM (5 aulas)

Pasta `aula-esp32cam/`: `codigo/` (01 foto/stream, 02 segurança PIR+SD, 03 Drive+Telegram, 04 gestos→LEDs; `camera_aithinker.h` comum;
`apps_script/Code.gs`) — compilados para `esp32:esp32:esp32cam`; `python/` (`ver_stream.py`, `reconhecer_imagem.py`, `gestos_leds.py`,
`modelos/` com gesture_recognizer.task, hand_landmarker.task, haarcascade); `esquemas/` (3 Fritzing + 2 figuras OpenCV); `saida/` (guias).
Python: opencv-python 5, mediapipe 1.0 (API `tasks`), requests — no ambiente `python-dados`.

## Aula: Câmera Tapo C200/TC70 (6 aulas)

Pasta `aula-tapo/`: instalação/posicionamento, app, microSD × Tapo Care × NVR local (`python/tapo_gravar.py`), RTSP/ONVIF (`tapo_ver.py`),
ESP32 atuador (`codigo/01_esp32_luzes_alerta`: relé, buzzer, RGB, botão, `luzes.local`), gestos + reconhecimento facial
(`rostos.py`, `cadastrar_rosto.py`, `tapo_gestos_faces.py`; modelos YuNet/SFace em `python/modelos`). Guias em `saida/`.

## Aula: Monitor de água — pH, vazão e nível (5 partes)

Pasta `aula-agua/`: pH-4502C (Nernst, calibração de 2 pontos), YF-S201/ZJ-S201 (efeito Hall, interrupções, calibração pelo balde),
HX710B + MPS20N0040D (Stevin, ponte de Wheatstone, protocolo de 24 bits → nível por tubo de bolha), ADS1115 (ADC de 16 bits, PGA, I2C;
por que o nó `horta/no1` da telemetria-cria o usa) e projeto com LED RGB + buzzer (alertas de pH, vazamento, consumo, transbordo).
Sketches `01..04` (Uno), `01b..04b` (ESP32 + monitor Wi-Fi) e `01c` (pH pelo ADS1115). Peças Fritzing novas por
`ferramentas/fritzing/gerar_pecas_agua.py`. Guias em `saida/`.

## Apresentação: Rede de Telemetria do Espaço CRIA (slides interativos)

Pasta `apresentacao-telemetria/`: deck de 29 slides (capa com logos e equipe, telemetria com o exemplo da F1, laboratórios de ar e
horta, hardware e sensores com imagens das peças Fritzing, coleta MQTT → InfluxDB → painel, critérios de aceitação, habilidades,
caso Tractian, IoT). Navegação por hyperlinks (roteiro e barra de rodapé). `gerador/gerar_tudo.sh` gera PPTX, PDF, ODP e a apostila
DOCX/ODT com as notas do apresentador. Dados da equipe e do orçamento vêm do `mythos-fomento` (relatório parcial ARC-0645).

## Pendências / manuais

- **Drivers USB-serial**: se a placa não aparecer em `arduino-cli board list`, instalar
  CP210x (Silicon Labs) ou CH340 (WCH) conforme o chip do seu ESP32.
- Abra um **terminal novo** para o PATH atualizado (`arduino-cli`, `pio`, `esptool`, `mpremote`).
