/*
  02 - Teste do DHT22 / AM2302 com 3 fios (temperatura e umidade do ar)
  Placa: Arduino Uno/Nano     Bibliotecas: "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"

  O seu sensor: caixinha branca com cabo de 3 fios.
     VERMELHO -> 5V        AMARELO (dados) -> pino 2        PRETO -> GND
  A versao com cabo (AM2302) ja tem o resistor de pull-up dentro. Se der muita "falha",
  coloque um resistor de 10 k entre o amarelo e o 5V.

  DHT22 x DHT11: faixa -40 a 80 C (+-0,5 C) e 0-100 % (+-2 a 5 %), resolucao 0,1.
  Le no maximo 1 vez a cada 2 s. Monitor Serial a 115200 baud (ou Plotter Serial).
*/
#include <DHT.h>

const int PINO_DHT = 2;
const unsigned long INTERVALO_MS = 2500;   // o DHT22 pede pelo menos 2 s entre leituras

DHT dht(PINO_DHT, DHT22);
unsigned long leituras = 0, falhas = 0;

// ponto de orvalho (aproximacao de Magnus): abaixo dessa temperatura a agua do ar condensa
float pontoDeOrvalho(float t, float ur) {
  const float a = 17.27, b = 237.7;
  float alfa = (a * t) / (b + t) + log(ur / 100.0);
  return (b * alfa) / (a - alfa);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println(F("# Teste do DHT22 (3 fios) - aguarde 2,5 s pela primeira leitura"));
}

void loop() {
  delay(INTERVALO_MS);
  float umidade = dht.readHumidity();
  float temperatura = dht.readTemperature();
  leituras++;

  if (isnan(umidade) || isnan(temperatura)) {
    falhas++;
    Serial.print(F("# FALHA ("));
    Serial.print(falhas); Serial.print(F(" de ")); Serial.print(leituras);
    Serial.println(F(") - amarelo no pino 2? vermelho no 5V? se persistir, 10 k entre amarelo e 5V"));
    return;
  }

  Serial.print(F("Temperatura_C:")); Serial.print(temperatura, 1);
  Serial.print(F(" Umidade_%:"));    Serial.print(umidade, 1);
  Serial.print(F(" Orvalho_C:"));    Serial.print(pontoDeOrvalho(temperatura, umidade), 1);
  Serial.print(F(" Falhas:"));       Serial.println(falhas);
}
