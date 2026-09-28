/*
  01 - Primeiro movimento: varredura (sweep)
  Placa: Arduino Uno/Nano
  Servo: Tower Pro SG90 (micro servo 9g)

  Ligacoes do SG90:
    fio MARROM  -> GND
    fio VERMELHO-> 5V
    fio LARANJA -> pino digital 9 (sinal)

  O que aprender: a biblioteca Servo gera o pulso de controle (50 Hz);
  write(angulo) recebe 0..180 graus.
*/
#include <Servo.h>

const int PINO_SERVO = 9;
Servo servo;

void setup() {
  // 500 e 2400 sao os pulsos (em microssegundos) para 0 e 180 graus do SG90.
  // O padrao da biblioteca (544..2400) tambem funciona, mas nao usa todo o curso.
  servo.attach(PINO_SERVO, 500, 2400);
}

void loop() {
  for (int ang = 0; ang <= 180; ang++) {   // vai de 0 a 180
    servo.write(ang);
    delay(15);                              // 15 ms por grau = ~2,7 s de curso
  }
  for (int ang = 180; ang >= 0; ang--) {   // volta de 180 a 0
    servo.write(ang);
    delay(15);
  }
}
