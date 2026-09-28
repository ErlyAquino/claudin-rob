# Configura o Arduino CLI com os cores AVR (Arduino Uno/Nano/Mega) e ESP32
# Uso: powershell -ExecutionPolicy Bypass -File .\setup-arduino-cli.ps1

$ErrorActionPreference = 'Continue'
$cli = Get-Command arduino-cli -ErrorAction SilentlyContinue
if (-not $cli) {
    $cand = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter arduino-cli.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cand) { $env:Path += ";$($cand.DirectoryName)"; $cli = $cand.FullName } else { throw "arduino-cli nao encontrado" }
}

arduino-cli version
arduino-cli config init --overwrite | Out-Null
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli core install esp32:esp32

# Bibliotecas comuns em aulas de sensores / IoT
$libs = 'DHT sensor library', 'Adafruit Unified Sensor', 'ArduinoJson', 'PubSubClient', 'LiquidCrystal I2C', 'Servo', 'OneWire', 'DallasTemperature', 'Adafruit SSD1306', 'Adafruit GFX Library'
foreach ($l in $libs) { arduino-cli lib install "$l" }

Write-Host "`n=== Cores instalados ==="
arduino-cli core list
Write-Host "`n=== Placas conectadas ==="
arduino-cli board list
