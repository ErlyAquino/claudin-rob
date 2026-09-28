/*
  04 - LED RGB: misturando cores com PWM
  Placa: Arduino Uno/Nano

  LED RGB de CATODO COMUM (4 pernas; a mais longa e o comum -> GND):
    R -> resistor 220 -> pino 9 (~)      G -> resistor 220 -> pino 10 (~)      B -> resistor 220 -> pino 11 (~)
  Os pinos com "~" fazem PWM: analogWrite(pino, 0..255) controla o BRILHO.
  Se o seu LED for de ANODO COMUM (comum no 5V), inverta: brilho = 255 - valor.

  O que aprender: PWM, funcoes com parametros, e que qualquer cor = mistura de R, G e B.
*/
const int PINO_R = 9, PINO_G = 10, PINO_B = 11;
const bool ANODO_COMUM = false;   // troque para true se o comum for ligado ao 5V

void cor(int r, int g, int b) {   // cada valor de 0 (apagado) a 255 (maximo)
  if (ANODO_COMUM) { r = 255 - r; g = 255 - g; b = 255 - b; }
  analogWrite(PINO_R, r);
  analogWrite(PINO_G, g);
  analogWrite(PINO_B, b);
}

void setup() {
  pinMode(PINO_R, OUTPUT); pinMode(PINO_G, OUTPUT); pinMode(PINO_B, OUTPUT);
}

void loop() {
  cor(255, 0, 0);    delay(1000);   // vermelho
  cor(0, 255, 0);    delay(1000);   // verde
  cor(0, 0, 255);    delay(1000);   // azul
  cor(255, 255, 0);  delay(1000);   // amarelo  (R + G)
  cor(0, 255, 255);  delay(1000);   // ciano    (G + B)
  cor(255, 0, 255);  delay(1000);   // magenta  (R + B)
  cor(255, 255, 255); delay(1000);  // branco
  cor(0, 0, 0);      delay(500);    // apagado

  // "respiracao": o vermelho sobe e desce devagar
  for (int i = 0; i <= 255; i += 5) { cor(i, 0, 0); delay(20); }
  for (int i = 255; i >= 0; i -= 5) { cor(i, 0, 0); delay(20); }
}
