/*
  01 - Teste do MODULO DHT11 de 3 pinos (temperatura e umidade do ar)
  Placa: Arduino Uno/Nano     Bibliotecas: "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"

  O seu modulo: placa com 3 pinos, LED de energia e resistor de pull-up ja soldado.
  Pinagem mais comum:   +  (VCC)  |  DATA / S / OUT  (MEIO)  |  -  (GND)
  CONFIRA A SERIGRAFIA: ha modulos com a ordem trocada. Nao precisa de resistor externo.

  Ligacoes:  + -> 5V    DATA (meio) -> pino 2    - -> GND
  Monitor Serial a 115200 baud. Tambem funciona no Plotter Serial (formato nome:valor).

  O que o teste confere:
   - o LED do modulo acende (energia chegando);
   - as leituras nao dao "falha" (fio de dados ok);
   - os valores sao plausiveis: sala tipica 24-32 C e 40-80 % (DHT11: +-2 C, +-5 %).
*/
#include <DHT.h>

const int PINO_DHT = 2;
const unsigned long INTERVALO_MS = 2000;   // o DHT11 so aceita 1 leitura a cada 1-2 s

DHT dht(PINO_DHT, DHT11);
unsigned long leituras = 0, falhas = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println(F("# Teste do DHT11 (modulo 3 pinos) - aguarde 2 s pela primeira leitura"));
}

void loop() {
  delay(INTERVALO_MS);
  float umidade = dht.readHumidity();
  float temperatura = dht.readTemperature();       // graus Celsius
  leituras++;

  if (isnan(umidade) || isnan(temperatura)) {      // NaN = a leitura nao fechou
    falhas++;
    Serial.print(F("# FALHA na leitura ("));
    Serial.print(falhas); Serial.print(F(" de ")); Serial.print(leituras);
    Serial.println(F(") - confira: fio DATA no pino 2? VCC e GND na ordem da placa? LED aceso?"));
    return;
  }

  float sensacao = dht.computeHeatIndex(temperatura, umidade, false);   // indice de calor
  Serial.print(F("Temperatura_C:")); Serial.print(temperatura, 1);
  Serial.print(F(" Umidade_%:"));    Serial.print(umidade, 0);
  Serial.print(F(" Sensacao_C:"));   Serial.print(sensacao, 1);
  Serial.print(F(" Falhas:"));       Serial.println(falhas);
}
