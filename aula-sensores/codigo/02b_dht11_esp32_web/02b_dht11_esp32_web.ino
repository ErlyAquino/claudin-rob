/*
  02b - DHT11 no ESP32 com monitor Wi-Fi
  Placa: ESP32 Dev Module     Biblioteca: DHT sensor library (Adafruit)
  Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes: VCC -> 3V3 (o DHT11 funciona de 3 a 5,5 V)   GND -> GND   DATA/OUT/S -> GPIO 4
            (sensor de 4 pinos: resistor 10 k entre DATA e 3V3; modulos ja tem)
  Celular: rede "Sensor-DHT11" -> http://192.168.4.1
*/
#include <DHT.h>
#include "monitor_wifi.h"

const int PINO_DHT = 4;
DHT dht(PINO_DHT, DHT11);
unsigned long ultimaLeitura = 0;
const float UMID_ALERTA = 70, TEMP_ALERTA = 30;

void setup() {
  Serial.begin(115200);
  dht.begin();
  monitorIniciar("Sensor-DHT11");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura >= 2000) {          // limite do DHT11
    ultimaLeitura = millis();
    float h = dht.readHumidity(), t = dht.readTemperature();
    if (isnan(h) || isnan(t)) { monitorPublicar(jsonMonitor("DHT11", item("Temperatura", 0, "C"), true, "falha na leitura")); return; }
    float sensacao = dht.computeHeatIndex(t, h, false);
    // ponto de orvalho (aproximacao de Magnus): temperatura em que o ar satura
    float a = 17.27, b = 237.7, alpha = (a * t) / (b + t) + log(h / 100.0);
    float orvalho = (b * alpha) / (a - alpha);
    bool alerta = h > UMID_ALERTA || t > TEMP_ALERTA;
    Serial.printf("%.0f %%  %.1f C\n", h, t);
    monitorPublicar(jsonMonitor("DHT11 - temperatura e umidade",
      item("Temperatura", t, "C") + "," + item("Umidade", h, "%") + "," + item("Sensacao", sensacao, "C") + "," + item("Pto. orvalho", orvalho, "C"),
      alerta, h > UMID_ALERTA ? "umidade alta (mofo!)" : "temperatura alta"));
  }
}
