/*
  02 - Buzzer: fazendo som com o Arduino
  Placa: Arduino Uno/Nano

  Modulo MH-FMD (buzzer PASSIVO, 3 pinos):   S -> pino 8    + (VCC) -> 5V    - (GND) -> GND
  (Buzzer passivo sem modulo: uma perna no pino 8, outra no GND.)

  Fisica: som e vibracao do ar. O buzzer passivo tem um disco piezoeletrico que
  se deforma quando recebe tensao. Se ligarmos e desligarmos 440 vezes por segundo,
  ele vibra a 440 Hz = a nota LA. A funcao tone(pino, frequencia) faz exatamente isso.
  Um buzzer ATIVO ja tem o oscilador dentro: so liga/desliga (digitalWrite) e faz um
  unico apito fixo - nao serve para melodias.
*/
const int BUZZER = 8;

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  // 1) tres bipes iguais
  for (int i = 0; i < 3; i++) {
    tone(BUZZER, 1000);      // 1000 Hz
    delay(150);
    noTone(BUZZER);
    delay(150);
  }
  delay(700);

  // 2) sirene: a frequencia sobe e desce
  for (int f = 400; f < 1200; f += 10) { tone(BUZZER, f); delay(5); }
  for (int f = 1200; f > 400; f -= 10) { tone(BUZZER, f); delay(5); }
  noTone(BUZZER);
  delay(700);

  // 3) escala: do (262) re (294) mi (330) fa (349) sol (392) la (440) si (494) do (523)
  int notas[] = { 262, 294, 330, 349, 392, 440, 494, 523 };
  for (int i = 0; i < 8; i++) { tone(BUZZER, notas[i], 200); delay(250); }   // tone com duracao
  delay(1500);
}
