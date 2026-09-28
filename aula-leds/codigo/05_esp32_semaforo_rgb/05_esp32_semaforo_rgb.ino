/*
  05 - Semaforo + LED RGB no ESP32 (sem Wi-Fi ainda)
  Placa: ESP32 Dev Module (core esp32 3.x)

  Ligacoes (resistor de 220 ohms em serie com cada LED; catodos/comum no GND):
    Semaforo: GPIO 25 -> vermelho   GPIO 26 -> amarelo   GPIO 27 -> verde
    RGB:      GPIO 14 -> R          GPIO 12 -> G         GPIO 13 -> B
    Botao:    GPIO 4 <-> GND (INPUT_PULLUP)  -> avanca o semaforo na mao
    Pot 10k:  pontas em 3V3 e GND, meio em GPIO 34 -> escolhe a cor do RGB

  O que muda em relacao ao Arduino Uno:
    1. Os pinos sao 3,3 V (o LED acende um pouco mais fraco; 220 ohms continua bom).
    2. analogWrite() existe no core 3.x, mas o "jeito ESP32" e o LEDC:
         ledcAttach(pino, frequencia, resolucao) e ledcWrite(pino, valor).
       Qualquer GPIO de saida pode fazer PWM (no Uno so os pinos com "~").
    3. Nada de delay(): usamos millis() para o semaforo, pois no sketch 06 o Wi-Fi
       precisa do loop() livre.
*/
const int VERMELHO = 25, AMARELO = 26, VERDE = 27;
const int PINO_R = 14, PINO_G = 12, PINO_B = 13;
const int BOTAO = 4, PINO_POT = 34;

const int FASE_PINO[] = { VERDE, AMARELO, VERMELHO };
const unsigned long FASE_MS[] = { 4000, 1500, 4000 };
int faseAtual = 0;
unsigned long inicioFase = 0;
bool botaoAntes = HIGH;

void proximaFase() {
  faseAtual = (faseAtual + 1) % 3;
  mostrar(FASE_PINO[faseAtual]);
  inicioFase = millis();
}

void mostrar(int corSemaforo) {
  digitalWrite(VERMELHO, corSemaforo == VERMELHO);
  digitalWrite(AMARELO,  corSemaforo == AMARELO);
  digitalWrite(VERDE,    corSemaforo == VERDE);
}

void cor(int r, int g, int b) {
  ledcWrite(PINO_R, r);
  ledcWrite(PINO_G, g);
  ledcWrite(PINO_B, b);
}

void corPorMatiz(int h) {            // 0..767: vermelho -> verde -> azul -> vermelho
  h = h % 768;
  if (h < 256)       cor(255 - h, h, 0);
  else if (h < 512)  cor(0, 511 - h, h - 256);
  else               cor(h - 512, 0, 767 - h);
}

void setup() {
  Serial.begin(115200);
  pinMode(VERMELHO, OUTPUT); pinMode(AMARELO, OUTPUT); pinMode(VERDE, OUTPUT);
  pinMode(BOTAO, INPUT_PULLUP);
  analogReadResolution(12);        // pot: 0..4095
  ledcAttach(PINO_R, 5000, 8);     // 5 kHz, 8 bits (0..255) - igual ao analogWrite do Uno
  ledcAttach(PINO_G, 5000, 8);
  ledcAttach(PINO_B, 5000, 8);
  mostrar(FASE_PINO[0]);
  inicioFase = millis();
}

void loop() {
  // semaforo por millis() - ou pelo botao
  if (millis() - inicioFase >= FASE_MS[faseAtual]) proximaFase();
  bool botaoAgora = digitalRead(BOTAO);
  if (botaoAntes == HIGH && botaoAgora == LOW) { proximaFase(); delay(50); }
  botaoAntes = botaoAgora;

  // RGB: o potenciometro escolhe a cor (matiz)
  corPorMatiz(map(analogRead(PINO_POT), 0, 4095, 0, 767));
}
