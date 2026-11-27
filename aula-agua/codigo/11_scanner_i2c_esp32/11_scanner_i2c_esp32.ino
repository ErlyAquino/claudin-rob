// 11_scanner_i2c_esp32 — procura os módulos ligados ao barramento I2C do ESP32.
// Serve para conferir a montagem do conversor de nível lógico: se o módulo de 5 V
// (do outro lado do conversor) responde, o endereço dele aparece na lista.
//
// Montagem (ESP32 DevKit V1): SDA no GPIO 21 e SCL no GPIO 22, pelo conversor.
//   Conversor: LV no 3V3, HV no 5 V (VIN), GND comum.
//   Canal 1: LV1 <- GPIO 21 (SDA) | HV1 -> SDA do módulo de 5 V
//   Canal 2: LV2 <- GPIO 22 (SCL) | HV2 -> SCL do módulo de 5 V
// Monitor Serial a 115200 baud. Não precisa de biblioteca além da Wire, que vem com o core.

#include <Wire.h>

const uint8_t PINO_SDA = 21;
const uint8_t PINO_SCL = 22;
const uint32_t FREQUENCIA_HZ = 100000;  // 100 kHz: o modo padrão, folgado para o conversor

// Endereços dos módulos usados no Espaço CRIA, para o programa dizer quem respondeu.
const char* nomeDoEndereco(uint8_t e) {
  switch (e) {
    case 0x23: case 0x5C: return "BH1750 (luz)";
    case 0x27: case 0x3F: return "LCD com PCF8574";
    case 0x3C: case 0x3D: return "display OLED SSD1306";
    case 0x48: case 0x49: case 0x4A: case 0x4B: return "ADS1115 (conversor A/D)";
    case 0x57: return "memoria AT24C32 do modulo do DS3231";
    case 0x68: return "DS3231 (relogio)";
    case 0x76: case 0x77: return "BME680 / BME280";
    default: return "nao esta na lista deste programa";
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin(PINO_SDA, PINO_SCL, FREQUENCIA_HZ);
  Wire.setTimeOut(50);  // ms: uma linha presa em nivel baixo nao trava a busca
  Serial.println();
  Serial.println("Scanner I2C - SDA no GPIO 21, SCL no GPIO 22, 100 kHz");
}

void loop() {
  uint8_t achados = 0;
  for (uint8_t e = 0x08; e <= 0x77; e++) {
    Wire.beginTransmission(e);
    if (Wire.endTransmission() == 0) {  // 0 = o modulo respondeu (ACK)
      Serial.printf("  0x%02X  %s\n", e, nomeDoEndereco(e));
      achados++;
    }
  }
  if (achados == 0) {
    Serial.println("  Nenhum modulo respondeu. Confira: HV no 5 V, LV no 3V3, GND comum,");
    Serial.println("  SDA e SCL no mesmo canal dos dois lados e nao trocados entre si.");
  } else {
    Serial.printf("  %u modulo(s) no barramento.\n", achados);
  }
  Serial.println();
  delay(3000);
}
