/*
  01 - Primeiro LED: piscar (blink)
  Placa: Arduino Uno/Nano

  Ligacoes (na protoboard):
    pino 8 -> resistor 220 ohms -> perna LONGA do LED (anodo, +)
    perna CURTA do LED (catodo, -) -> GND

  O que aprender: pinMode define o pino como SAIDA; digitalWrite liga (HIGH = 5 V)
  ou desliga (LOW = 0 V); delay espera em milissegundos. O loop repete para sempre.
*/
const int PINO_LED = 8;

void setup() {
  pinMode(PINO_LED, OUTPUT);   // roda uma vez: o pino 8 vai ser uma saida
}

void loop() {                  // roda para sempre
  digitalWrite(PINO_LED, HIGH); // liga o LED
  delay(1000);                  // espera 1000 ms = 1 segundo
  digitalWrite(PINO_LED, LOW);  // desliga o LED
  delay(1000);
}
