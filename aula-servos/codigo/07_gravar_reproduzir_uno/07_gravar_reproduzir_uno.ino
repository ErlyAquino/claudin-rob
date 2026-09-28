/*
  07 - (Opcional) Gravar e reproduzir poses no Arduino Uno, com EEPROM
  Versao simplificada do sketch 06 para quem ainda nao migrou para o ESP32.

  Ligacoes:
    servos: base->9, ombro->10, cotovelo->11, garra->6
    pots:   A0, A1, A2, A3 (entre 5V e GND)
    botoes: GRAVAR->2, PLAY->3 (INPUT_PULLUP, outro lado no GND)
  Alimente os servos com fonte externa 5 V (GND comum com o Arduino).
*/
#include <Servo.h>
#include <EEPROM.h>

const int N = 4;
const int PINO_SERVO[N] = {9, 10, 11, 6};
const int PINO_POT[N]   = {A0, A1, A2, A3};
const int ANG_MIN[N]    = {  0,  20,  10,  40 };
const int ANG_MAX[N]    = {180, 160, 170, 120 };
const int BTN_GRAVAR = 2, BTN_PLAY = 3;
const int MAX_POSES = 20;

Servo servos[N];
byte poses[MAX_POSES][N];
int numPoses = 0;
int anguloAtual[N];
bool modoPlay = false;

void salvar() { EEPROM.update(0, numPoses); for (int p = 0; p < numPoses; p++) for (int i = 0; i < N; i++) EEPROM.update(1 + p * N + i, poses[p][i]); }
void carregar() { numPoses = EEPROM.read(0); if (numPoses > MAX_POSES) numPoses = 0; for (int p = 0; p < numPoses; p++) for (int i = 0; i < N; i++) poses[p][i] = EEPROM.read(1 + p * N + i); }

void irPara(byte alvo[N]) {
  bool chegou = false;
  while (!chegou) {
    chegou = true;
    for (int i = 0; i < N; i++) {
      if (anguloAtual[i] < alvo[i]) { anguloAtual[i]++; chegou = false; }
      else if (anguloAtual[i] > alvo[i]) { anguloAtual[i]--; chegou = false; }
      servos[i].write(anguloAtual[i]);
    }
    delay(15);
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(BTN_GRAVAR, INPUT_PULLUP); pinMode(BTN_PLAY, INPUT_PULLUP);
  for (int i = 0; i < N; i++) { servos[i].attach(PINO_SERVO[i], 500, 2400); anguloAtual[i] = (ANG_MIN[i] + ANG_MAX[i]) / 2; servos[i].write(anguloAtual[i]); }
  carregar();
  Serial.print(numPoses); Serial.println(" pose(s) carregadas. Botao 2 = gravar, 3 = play/parar.");
}

void loop() {
  if (digitalRead(BTN_PLAY) == LOW) { modoPlay = !modoPlay; Serial.println(modoPlay ? "PLAY" : "PARADO"); delay(400); }
  if (digitalRead(BTN_GRAVAR) == LOW && numPoses < MAX_POSES) {
    for (int i = 0; i < N; i++) poses[numPoses][i] = anguloAtual[i];
    numPoses++; salvar();
    Serial.print("Pose "); Serial.print(numPoses); Serial.println(" gravada");
    delay(400);
  }
  if (modoPlay && numPoses > 0) {
    for (int p = 0; p < numPoses && modoPlay; p++) {
      irPara(poses[p]); delay(600);
      if (digitalRead(BTN_PLAY) == LOW) { modoPlay = false; delay(400); }
    }
  } else {
    for (int i = 0; i < N; i++) {
      int alvo = map(analogRead(PINO_POT[i]), 0, 1023, ANG_MIN[i], ANG_MAX[i]);
      if (alvo > anguloAtual[i]) anguloAtual[i]++; else if (alvo < anguloAtual[i]) anguloAtual[i]--;
      servos[i].write(anguloAtual[i]);
    }
    delay(10);
  }
}
