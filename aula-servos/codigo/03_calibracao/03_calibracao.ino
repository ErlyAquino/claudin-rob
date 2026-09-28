/*
  03 - Calibrando o servo: descobrindo os pulsos reais de 0 e 180 graus
  Placa: Arduino Uno/Nano

  Cada SG90 e um pouco diferente. Em vez de "write(angulo)", aqui usamos
  writeMicroseconds(pulso) e o potenciometro varre de 400 a 2600 us.
  Anote no Monitor Serial:
    - o menor pulso em que o servo PARA de se mover no inicio do curso (limite 0 graus)
    - o maior pulso em que ele PARA no fim do curso (limite 180 graus)
  Cuidado: se o servo "vibrar" ou "roncar" forcando o batente, volte o pot
  imediatamente. Forcar o fim de curso danifica as engrenagens.

  Ligacoes: iguais ao sketch 02.
*/
#include <Servo.h>

const int PINO_SERVO = 9;
const int PINO_POT   = A0;
const int PULSO_MIN_TESTE = 400;    // abaixo do minimo tipico (500)
const int PULSO_MAX_TESTE = 2600;   // acima do maximo tipico (2400)
Servo servo;

void setup() {
  Serial.begin(9600);
  servo.attach(PINO_SERVO, PULSO_MIN_TESTE, PULSO_MAX_TESTE);
  Serial.println("Gire o pot devagar. Anote o pulso onde o servo para em cada extremo.");
}

void loop() {
  int leitura = analogRead(PINO_POT);
  int pulso   = map(leitura, 0, 1023, PULSO_MIN_TESTE, PULSO_MAX_TESTE);
  servo.writeMicroseconds(pulso);

  Serial.print("pulso = ");
  Serial.print(pulso);
  Serial.println(" us");
  delay(50);
}

/*
  Depois de anotar, use os valores no attach() dos proximos sketches:
     servo.attach(9, PULSO_0_GRAUS, PULSO_180_GRAUS);
  Exemplo tipico de um SG90 real: attach(9, 560, 2350)
*/
