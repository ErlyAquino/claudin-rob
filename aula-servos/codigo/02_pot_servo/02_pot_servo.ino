/*
  02 - Controlando o servo com um potenciometro de 10k
  Placa: Arduino Uno/Nano

  Ligacoes:
    Potenciometro 10k: pino da esquerda -> GND, pino do meio -> A0, pino da direita -> 5V
    SG90: marrom -> GND, vermelho -> 5V, laranja -> pino 9

  O que aprender: analogRead (0..1023) e a funcao map() para converter
  a leitura em angulo. O Monitor Serial mostra o que esta acontecendo.
*/
#include <Servo.h>

const int PINO_SERVO = 9;
const int PINO_POT   = A0;
Servo servo;

void setup() {
  Serial.begin(9600);
  servo.attach(PINO_SERVO, 500, 2400);
}

void loop() {
  int leitura = analogRead(PINO_POT);            // 0..1023
  int angulo  = map(leitura, 0, 1023, 0, 180);   // converte para 0..180
  servo.write(angulo);

  Serial.print("pot = ");
  Serial.print(leitura);
  Serial.print("  ->  angulo = ");
  Serial.println(angulo);
  delay(20);   // o servo precisa de tempo entre comandos (periodo de 20 ms)
}
