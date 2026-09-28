/*
  06 - Linha de producao: gravar poses e reproduzir automaticamente
  Placa: ESP32 Dev Module + ESP32Servo + Preferences (memoria flash)

  Ideia (igual a um robo industrial em modo "teach"):
    1. MODO MANUAL: voce posiciona o braco com os 4 potenciometros.
    2. Aperta o botao GRAVAR: a pose atual (4 angulos) entra na lista.
    3. Repete para cada etapa do ciclo (pegar, levantar, girar, soltar, voltar...).
    4. Aperta PLAY: o braco repete a sequencia sozinho, em loop, como numa esteira.
    5. As poses ficam salvas na flash: sobrevivem a desligar o ESP32.

  Botoes (com INPUT_PULLUP: um lado no GPIO, outro no GND):
    GRAVAR -> GPIO 25     PLAY/PARAR -> GPIO 26     APAGAR TUDO -> segurar GRAVAR 3 s

  Comandos pelo Monitor Serial (115200) tambem funcionam:
    g = gravar pose   p = play/parar   l = listar   x = apagar tudo

  Servos e pots: mesmas ligacoes do sketch 05.
*/
#include <ESP32Servo.h>
#include <Preferences.h>

const int N = 4;
const int PINO_SERVO[N] = {13, 12, 14, 27};
const int PINO_POT[N]   = {34, 35, 32, 33};
const int ANG_MIN[N]    = {  0,  20,  10,  40 };
const int ANG_MAX[N]    = {180, 160, 170, 120 };
const int PINO_BTN_GRAVAR = 25;
const int PINO_BTN_PLAY   = 26;

const int MAX_POSES = 20;
struct Pose { uint8_t ang[N]; };
Pose poses[MAX_POSES];
int numPoses = 0;

// Parametros do ciclo automatico (mexa aqui para mudar o "ritmo da linha")
const int PASSO_MS       = 15;    // ms por grau ao interpolar: menor = mais rapido
const int PAUSA_POSE_MS  = 600;   // tempo parado em cada pose (ex.: fechar a garra)

Servo servos[N];
int anguloAtual[N];
bool modoPlay = false;
Preferences prefs;

// ---------- persistencia ----------
void salvar() {
  prefs.begin("braco", false);
  prefs.putInt("n", numPoses);
  prefs.putBytes("poses", poses, sizeof(Pose) * numPoses);
  prefs.end();
}
void carregar() {
  prefs.begin("braco", true);
  numPoses = prefs.getInt("n", 0);
  if (numPoses > MAX_POSES) numPoses = 0;
  if (numPoses > 0) prefs.getBytes("poses", poses, sizeof(Pose) * numPoses);
  prefs.end();
}

// ---------- movimento ----------
void irPara(const uint8_t alvo[N]) {          // interpola todas as juntas juntas
  bool chegou = false;
  while (!chegou) {
    chegou = true;
    for (int i = 0; i < N; i++) {
      if (anguloAtual[i] < alvo[i])      { anguloAtual[i]++; chegou = false; }
      else if (anguloAtual[i] > alvo[i]) { anguloAtual[i]--; chegou = false; }
      servos[i].write(anguloAtual[i]);
    }
    delay(PASSO_MS);
  }
}

void lerPots() {
  for (int i = 0; i < N; i++) {
    int alvo = map(analogRead(PINO_POT[i]), 0, 4095, ANG_MIN[i], ANG_MAX[i]);
    if (alvo > anguloAtual[i]) anguloAtual[i]++;
    else if (alvo < anguloAtual[i]) anguloAtual[i]--;
    servos[i].write(anguloAtual[i]);
  }
}

// ---------- acoes ----------
void gravarPose() {
  if (numPoses >= MAX_POSES) { Serial.println("Lista cheia!"); return; }
  for (int i = 0; i < N; i++) poses[numPoses].ang[i] = anguloAtual[i];
  numPoses++;
  salvar();
  Serial.printf("Pose %d gravada: ", numPoses);
  for (int i = 0; i < N; i++) Serial.printf("%d ", anguloAtual[i]);
  Serial.println();
}
void listar() {
  Serial.printf("%d pose(s):\n", numPoses);
  for (int p = 0; p < numPoses; p++) {
    Serial.printf("  #%2d  base=%3d ombro=%3d cotovelo=%3d garra=%3d\n", p + 1,
                  poses[p].ang[0], poses[p].ang[1], poses[p].ang[2], poses[p].ang[3]);
  }
}
void apagarTudo() { numPoses = 0; salvar(); Serial.println("Poses apagadas."); }

// ---------- botoes com debounce simples ----------
bool apertou(int pino) {
  static unsigned long ultimo[40] = {0};
  if (digitalRead(pino) == LOW && millis() - ultimo[pino] > 300) {
    ultimo[pino] = millis();
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_BTN_GRAVAR, INPUT_PULLUP);
  pinMode(PINO_BTN_PLAY,   INPUT_PULLUP);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  for (int i = 0; i < N; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(PINO_SERVO[i], 500, 2400);
    anguloAtual[i] = (ANG_MIN[i] + ANG_MAX[i]) / 2;
    servos[i].write(anguloAtual[i]);
  }
  carregar();
  Serial.println("g=gravar  p=play/parar  l=listar  x=apagar");
  listar();
}

void loop() {
  // --- comandos serial ---
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'g') gravarPose();
    if (c == 'p') modoPlay = !modoPlay;
    if (c == 'l') listar();
    if (c == 'x') apagarTudo();
  }
  // --- botoes ---
  if (apertou(PINO_BTN_PLAY)) { modoPlay = !modoPlay; Serial.println(modoPlay ? "PLAY" : "PARADO"); }
  if (digitalRead(PINO_BTN_GRAVAR) == LOW) {
    unsigned long t0 = millis();
    while (digitalRead(PINO_BTN_GRAVAR) == LOW) {
      if (millis() - t0 > 3000) { apagarTudo(); while (digitalRead(PINO_BTN_GRAVAR) == LOW); return; }
    }
    gravarPose();
  }

  if (modoPlay && numPoses > 0) {
    for (int p = 0; p < numPoses && modoPlay; p++) {
      irPara(poses[p].ang);
      delay(PAUSA_POSE_MS);
      if (apertou(PINO_BTN_PLAY) || (Serial.available() && Serial.read() == 'p')) {
        modoPlay = false; Serial.println("PARADO");
      }
    }
  } else {
    lerPots();          // modo manual: segue os potenciometros
    delay(10);
  }
}
