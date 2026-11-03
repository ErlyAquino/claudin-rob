/*
  02b - DHT22 / AM2302 (3 fios) no ESP32, com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)    Biblioteca: DHT sensor library (Adafruit)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  Ligacoes:  VERMELHO -> 3V3    AMARELO -> GPIO 4    PRETO -> GND
  (o DHT22 funciona de 3,3 a 6 V; o pull-up interno do AM2302 fica no 3V3, nivel seguro para o ESP32)

  Celular: rede "Ar-DHT22" (senha 12345678) -> http://192.168.4.1
*/
#include <DHT.h>
#include "monitor_wifi.h"

const int PINO_DHT = 4;
const float UMIDADE_ALERTA = 70, TEMPERATURA_ALERTA = 30;

DHT dht(PINO_DHT, DHT22);
unsigned long ultimaLeitura = 0, leituras = 0, falhas = 0;

float pontoDeOrvalho(float t, float ur) {
  const float a = 17.27, b = 237.7;
  float alfa = (a * t) / (b + t) + log(ur / 100.0);
  return (b * alfa) / (a - alfa);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  monitorIniciar("Ar-DHT22");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura < 2500) return;       // DHT22: no minimo 2 s entre leituras
  ultimaLeitura = millis();

  float h = dht.readHumidity(), t = dht.readTemperature();
  leituras++;
  if (isnan(h) || isnan(t)) {
    falhas++;
    Serial.printf("FALHA %lu de %lu - amarelo no GPIO 4? vermelho no 3V3?\n", falhas, leituras);
    monitorPublicar(jsonMonitor("DHT22", item("Falhas", falhas, ""), true, "falha na leitura"));
    return;
  }
  float orvalho = pontoDeOrvalho(t, h);
  bool alerta = h > UMIDADE_ALERTA || t > TEMPERATURA_ALERTA;
  Serial.printf("Temperatura_C:%.1f Umidade_%%:%.1f Orvalho_C:%.1f Falhas:%lu\n", t, h, orvalho, falhas);
  monitorPublicar(jsonMonitor("DHT22 - 3 fios",
    item("Temperatura", t, "C") + "," + item("Umidade", h, "%") + "," + item("Pto. orvalho", orvalho, "C") + "," + item("Falhas", falhas, ""),
    alerta, h > UMIDADE_ALERTA ? "umidade alta: ventile" : "temperatura alta"));
}
