/*
  05b - BME680 no ESP32 com monitor Wi-Fi (estacao meteorologica de bolso)
  Placa: ESP32 Dev Module     Bibliotecas: Adafruit BME680, Adafruit Unified Sensor, Adafruit BusIO
  Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes (I2C): VCC -> 3V3   GND -> GND   SDA -> GPIO 21   SCL -> GPIO 22
  Celular: rede "Sensor-BME680" -> http://192.168.4.1
*/
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include "monitor_wifi.h"

#define PRESSAO_NIVEL_MAR 1013.25
Adafruit_BME680 bme;
unsigned long ultimaLeitura = 0;
float gasLimpo = 0;                 // referencia de "ar limpo" para o indice

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!bme.begin(0x76) && !bme.begin(0x77)) { Serial.println("BME680 nao encontrado"); while (1) delay(100); }
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);
  monitorIniciar("Sensor-BME680");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura >= 3000) {
    ultimaLeitura = millis();
    if (!bme.performReading()) return;
    float t = bme.temperature, h = bme.humidity, p = bme.pressure / 100.0, gas = bme.gas_resistance / 1000.0;
    float alt = bme.readAltitude(PRESSAO_NIVEL_MAR);
    if (gas > gasLimpo) gasLimpo = gas;                       // o maior valor visto = ar mais limpo
    float indiceAr = gasLimpo > 0 ? 100.0 * gas / gasLimpo : 0; // 100 = igual ao melhor ar visto; menor = mais VOC
    bool alerta = indiceAr < 50;
    Serial.printf("%.1f C  %.0f %%  %.1f hPa  gas %.1f kOhm  indice %.0f\n", t, h, p, gas, indiceAr);
    monitorPublicar(jsonMonitor("BME680 - estacao meteorologica",
      item("Temperatura", t, "C") + "," + item("Umidade", h, "%") + "," + item("Pressao", p, "hPa") + "," + item("Gas (VOC)", gas, "kOhm") + "," + item("Indice ar", indiceAr, "%") + "," + item("Altitude", alt, "m"),
      alerta, "muitos compostos volateis no ar"));
  }
}
