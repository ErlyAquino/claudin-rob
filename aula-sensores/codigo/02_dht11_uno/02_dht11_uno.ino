/*
  02 - DHT11: temperatura e umidade do ar
  Placa: Arduino Uno/Nano     Biblioteca: "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"

  O DHT11 aparece de 3 jeitos - CONFIRA A SERIGRAFIA da sua peca antes de ligar:
    a) sensor "pelado" azul, 4 pinos:  VCC | DATA | (nao ligado) | GND   -> precisa de resistor 10k entre DATA e VCC
    b) modulo 3 pinos "VCC GND OUT" (ou "+ - OUT"):  ja tem o resistor na placa
    c) modulo 3 pinos "S  -  (meio)" tipo KY-015: S = dados, "-" = GND e o pino do MEIO (sem nome) = VCC
       Nos modulos, a ORDEM muda de fabricante para fabricante: leia a placa, nao decore a posicao!
  Neste sketch: DATA/OUT/S -> pino 2, VCC -> 5V, GND -> GND.

  Fisica: a umidade e medida por um POLIMERO que absorve agua e muda sua CAPACITANCIA; a
  temperatura, por um TERMISTOR NTC (resistencia cai com o calor). Um chip converte os dois em
  numeros e manda pelo unico fio de dados, 40 bits por leitura. Limite: 1 leitura a cada 2 s.
*/
#include <DHT.h>

const int PINO_DHT = 2;
DHT dht(PINO_DHT, DHT11);          // troque DHT11 por DHT22 se usar o branco (mais preciso)

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("umidade_%,temperatura_C,sensacao_C");
}

void loop() {
  delay(2000);                                   // o DHT11 nao aguenta ler mais rapido
  float h = dht.readHumidity();
  float t = dht.readTemperature();               // Celsius
  if (isnan(h) || isnan(t)) {                    // NaN = "not a number": leitura falhou
    Serial.println("falha na leitura (fio de dados? pull-up? pino?)");
    return;
  }
  float sensacao = dht.computeHeatIndex(t, h, false);   // indice de calor (como o corpo sente)
  Serial.print(h, 0); Serial.print(",");
  Serial.print(t, 1); Serial.print(",");
  Serial.println(sensacao, 1);
}
