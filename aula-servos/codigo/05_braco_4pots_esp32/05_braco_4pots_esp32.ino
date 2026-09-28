/*
  05 - Servo Mini Arm: 4 servos controlados por 4 potenciometros (modo "marionete")
  Placa: ESP32 Dev Module + biblioteca ESP32Servo
  Braco: Servo Mini Arm (LucaDilo, MakerWorld 1290483)
         base (giro), ombro, cotovelo, garra

  ALIMENTACAO: 4 servos SG90 podem puxar mais de 1 A ao mesmo tempo.
  NAO alimente pelo 3V3 nem pelo USB do ESP32. Use fonte externa de 5 V (>= 2 A)
  ligada aos fios vermelhos dos servos, com o GND da fonte unido ao GND do ESP32.
  Um capacitor eletrolitico de 470 a 1000 uF entre 5 V e GND ajuda a evitar resets.

  Ligacoes (sinal dos servos / pots):
    base    -> GPIO 13   pot base    -> GPIO 34
    ombro   -> GPIO 12   pot ombro   -> GPIO 35
    cotovelo-> GPIO 14   pot cotovelo-> GPIO 32
    garra   -> GPIO 27   pot garra   -> GPIO 33
    Todos os pots entre 3V3 e GND.
*/
#include <ESP32Servo.h>

const int N = 4;
const char* NOME[N]      = {"base", "ombro", "cotovelo", "garra"};
const int PINO_SERVO[N]  = {13, 12, 14, 27};
const int PINO_POT[N]    = {34, 35, 32, 33};

// Limites mecanicos de cada junta (ajuste apos montar o braco!).
// Evitam que o braco bata na base ou que a garra force alem do fechamento.
const int ANG_MIN[N] = {  0,  20,  10,  40 };
const int ANG_MAX[N] = {180, 160, 170, 120 };

Servo servos[N];
int anguloAtual[N];

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  for (int i = 0; i < N; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(PINO_SERVO[i], 500, 2400);
    anguloAtual[i] = (ANG_MIN[i] + ANG_MAX[i]) / 2;   // comeca no meio do curso
    servos[i].write(anguloAtual[i]);
  }
  delay(500);
}

void loop() {
  for (int i = 0; i < N; i++) {
    int leitura = analogRead(PINO_POT[i]);
    int alvo    = map(leitura, 0, 4095, ANG_MIN[i], ANG_MAX[i]);

    // Movimento suave: aproxima 1 grau por ciclo em vez de pular direto.
    // Isso reduz o pico de corrente e o "tranco" do braco.
    if (alvo > anguloAtual[i]) anguloAtual[i]++;
    else if (alvo < anguloAtual[i]) anguloAtual[i]--;
    servos[i].write(anguloAtual[i]);
  }

  static unsigned long ultimoPrint = 0;
  if (millis() - ultimoPrint > 250) {
    ultimoPrint = millis();
    for (int i = 0; i < N; i++) Serial.printf("%s=%3d  ", NOME[i], anguloAtual[i]);
    Serial.println();
  }
  delay(10);
}
