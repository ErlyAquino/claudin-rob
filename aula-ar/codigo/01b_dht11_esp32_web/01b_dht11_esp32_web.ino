/*
  01b - Modulo DHT11 (3 pinos) no ESP32, com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)    Biblioteca: DHT sensor library (Adafruit)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  Ligacoes:  + -> 3V3    DATA (meio) -> GPIO 4    - -> GND
  (o modulo funciona de 3,3 a 5,5 V; em 3V3 o sinal de dados ja sai no nivel certo do ESP32)

  Celular: conecte na rede "Ar-DHT11" (senha 12345678) e abra http://192.168.4.1
*/
#include <DHT.h>
#include "monitor_wifi.h"

const int PINO_DHT = 4;
const float UMIDADE_ALERTA = 70;      // % - acima disso, risco de mofo
const float TEMPERATURA_ALERTA = 30;  // C

DHT dht(PINO_DHT, DHT11);
unsigned long ultimaLeitura = 0, leituras = 0, falhas = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  monitorIniciar("Ar-DHT11");
}

void loop() {
  monitorAtender();                                  // atende o celular sem parar
  if (millis() - ultimaLeitura < 2000) return;       // DHT11: 1 leitura a cada 2 s
  ultimaLeitura = millis();

  float h = dht.readHumidity(), t = dht.readTemperature();
  leituras++;
  if (isnan(h) || isnan(t)) {
    falhas++;
    Serial.printf("FALHA %lu de %lu - confira o fio DATA no GPIO 4 e a ordem + / -\n", falhas, leituras);
    monitorPublicar(jsonMonitor("DHT11", item("Falhas", falhas, ""), true, "falha na leitura"));
    return;
  }
  float sensacao = dht.computeHeatIndex(t, h, false);
  bool alerta = h > UMIDADE_ALERTA || t > TEMPERATURA_ALERTA;
  Serial.printf("Temperatura_C:%.1f Umidade_%%:%.0f Sensacao_C:%.1f Falhas:%lu\n", t, h, sensacao, falhas);
  monitorPublicar(jsonMonitor("DHT11 - modulo 3 pinos",
    item("Temperatura", t, "C") + "," + item("Umidade", h, "%") + "," + item("Sensacao", sensacao, "C") + "," + item("Falhas", falhas, ""),
    alerta, h > UMIDADE_ALERTA ? "umidade alta: ventile" : "temperatura alta"));
}
