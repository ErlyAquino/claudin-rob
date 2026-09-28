/*
  01b - DS18B20 no ESP32 com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module     Bibliotecas: OneWire, DallasTemperature
  Arquivos extras na pasta do sketch: monitor_wifi.h, pagina_web.h

  Ligacoes: VERMELHO -> 3V3 (o DS18B20 aceita 3,0-5,5 V)   PRETO -> GND   AMARELO -> GPIO 4
            resistor 4,7 kOhm entre GPIO 4 e 3V3
  O que muda do Uno: so o pino e a alimentacao em 3,3 V. A biblioteca e a mesma.
  Celular: rede "Sensor-DS18B20" (senha 12345678) -> http://192.168.4.1
*/
#include <OneWire.h>
#include <DallasTemperature.h>
#include "monitor_wifi.h"

const int PINO_DADOS = 4;
const float LIMITE_ALERTA = 30.0;      // C
OneWire oneWire(PINO_DADOS);
DallasTemperature sensores(&oneWire);
unsigned long ultimaLeitura = 0;
float tMax = -100, tMin = 200;

void setup() {
  Serial.begin(115200);
  sensores.begin();
  sensores.setResolution(12);
  sensores.setWaitForConversion(false);   // nao trava o loop (o Wi-Fi precisa dele livre)
  sensores.requestTemperatures();
  monitorIniciar("Sensor-DS18B20");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura >= 1000) {
    ultimaLeitura = millis();
    float t = sensores.getTempCByIndex(0);      // resultado da conversao pedida ha 1 s
    sensores.requestTemperatures();             // pede a proxima
    if (t == DEVICE_DISCONNECTED_C) { monitorPublicar(jsonMonitor("DS18B20", item("Temperatura", 0, "C"), true, "sensor desconectado")); return; }
    if (t > tMax) tMax = t;
    if (t < tMin) tMin = t;
    bool alerta = t > LIMITE_ALERTA;
    Serial.printf("%.2f C\n", t);
    monitorPublicar(jsonMonitor("DS18B20 - temperatura",
      item("Temperatura", t, "C") + "," + item("Maxima", tMax, "C") + "," + item("Minima", tMin, "C") + "," + item("Limite", LIMITE_ALERTA, "C"),
      alerta, "temperatura acima de " + String(LIMITE_ALERTA, 0) + " C"));
  }
}
