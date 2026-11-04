/*
  04 - PROJETO: Monitor de agua no Arduino Uno - pH + vazao + nivel + LED RGB + buzzer
  Placa: Arduino Uno     Sem biblioteca (EEPROM para as calibracoes)

  Ligacoes (protoboard; trilha + = 5 V do Uno, trilha - = GND):
    pH-4502C        V+ -> 5V   G -> GND   Po -> A0
    YF-S201         vermelho -> 5V   preto -> GND   amarelo -> D2 (INT0)
    HX710B          VCC -> 5V   OUT -> D3   SCK -> D4   GND -> GND   (mangueira ate o tubo no reservatorio)
    LED RGB (catodo comum)  R -> 220 R -> D9   G -> 220 R -> D6   B -> 220 R -> D5   catodo -> GND
    Buzzer passivo  + -> D8   - -> GND

  O que o monitor faz (uma leitura por segundo):
    - mede pH, vazao (acumulando o volume) e o nivel do reservatorio
    - LED:   VERDE = tudo bem | AZUL = agua passando | AMARELO = pH perto do limite ou reservatorio baixo |
             VERMELHO = pH fora de 6,0-9,0 ou transbordando | VERMELHO PISCANDO = VAZAMENTO (agua correndo ha mais de TEMPO_VAZAMENTO)
    - buzzer: 2 bipes quando o pH sai da faixa (uma vez, com HISTERESE de 0,2) | sirene no vazamento e no transbordo |
              1 bipe a cada litro que passa | 3 bipes ao passar o LIMITE_DIA
  Comandos no Serial (115200): c7 c4 c10 (pH)  z (zera volume)  b / f <litros> (K)  c0 / c <cm> (nivel)  s (silencia)
  As calibracoes ficam na EEPROM nos MESMOS enderecos dos sketches 01, 02 e 03: se voce calibrou com eles
  nesta placa, o monitor ja comeca calibrado.
*/
#include <EEPROM.h>

// ----------------------------------------------------------------- pinos e ajustes
const int PINO_PH = A0, PINO_VAZAO = 2, PINO_OUT = 3, PINO_SCK = 4, LED_R = 9, LED_G = 6, LED_B = 5, BUZZER = 8;
const float VREF = 5.0;
const float PH_MIN = 6.0, PH_MAX = 9.0, PH_ATENCAO = 0.5, HISTERESE = 0.2;
const unsigned long TEMPO_VAZAMENTO_S = 300;     // agua correndo sem parar por 5 min = vazamento (para testar: 20)
const float LIMITE_DIA_L = 50.0;                 // consumo que dispara o aviso
const float VAZAO_MINIMA = 0.3;                  // L/min abaixo disso = "parado"
const float NIVEL_MIN_CM = 5.0, NIVEL_MAX_CM = 25.0;   // reservatorio da aula (ajuste)
bool silenciado = false;

// ----------------------------------------------------------------- pH (sketch 01)
float V7 = 2.50, INCLINACAO = -0.177;
float lerTensao() {
  const int N = 30; int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogRead(PINO_PH); delay(2); }
  for (int i = 0; i < N - 1; i++) for (int j = 0; j < N - 1 - i; j++) if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0; for (int i = 5; i < N - 5; i++) soma += v[i];
  return (soma / float(N - 10)) * VREF / 1023.0;
}
float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }

// ----------------------------------------------------------------- vazao (sketch 02)
float K = 7.5;
volatile unsigned long pulsos = 0;
void contarPulso() { pulsos++; }
unsigned long pulsosCalibracao = 0; bool calibrando = false;
float volumeL = 0, vazao = 0; int litrosAvisados = 0;
unsigned long correndoDesde = 0;

// ----------------------------------------------------------------- nivel (sketch 03)
long zero = 0; float sens = 50000.0;
long lerHX710B() {
  unsigned long t0 = millis();
  while (digitalRead(PINO_OUT) == HIGH) { if (millis() - t0 > 300) return 0x7FFFFFFF; }
  long v = 0;
  noInterrupts();
  for (int i = 0; i < 24; i++) { digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); v = (v << 1) | digitalRead(PINO_OUT); digitalWrite(PINO_SCK, LOW); delayMicroseconds(1); }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); digitalWrite(PINO_SCK, LOW);
  interrupts();
  if (v & 0x800000L) v |= 0xFF000000L;
  return v;
}
float lerNivelCm() {                             // 3 leituras (~0,3 s); NAN se o modulo nao responder
  float soma = 0; int ok = 0;
  for (int i = 0; i < 3; i++) { long v = lerHX710B(); if (v != 0x7FFFFFFF) { soma += v; ok++; } }
  return ok ? (soma / ok - zero) / sens : NAN;
}

// ----------------------------------------------------------------- EEPROM: 0 V7 | 4 incl | 8 K | 12 zero | 16 sens
void salvar()   { EEPROM.put(0, V7); EEPROM.put(4, INCLINACAO); EEPROM.put(8, K); EEPROM.put(12, zero); EEPROM.put(16, sens); }
void carregar() {
  float a, b, k, s; long z; EEPROM.get(0, a); EEPROM.get(4, b); EEPROM.get(8, k); EEPROM.get(12, z); EEPROM.get(16, s);
  if (!isnan(a) && a > 1 && a < 4) V7 = a;
  if (!isnan(b) && b < -0.05 && b > -0.5) INCLINACAO = b;
  if (!isnan(k) && k > 3 && k < 15) K = k;
  if (z != -1 && z > -8000000L && z < 8000000L) zero = z;   // -1 = EEPROM virgem (0xFFFFFFFF)
  if (!isnan(s) && s > 100 && s < 1e7) sens = s;
}

// ----------------------------------------------------------------- LED e buzzer
void cor(bool r, bool g, bool b) { digitalWrite(LED_R, r); digitalWrite(LED_G, g); digitalWrite(LED_B, b); }
void bipes(int n, int freqHz, int ms) {
  if (silenciado) return;
  for (int i = 0; i < n; i++) { tone(BUZZER, freqHz, ms); delay(ms + 60); }
}
void sirene() {                                  // ~0,7 s de sirene a cada leitura enquanto durar o alarme
  if (silenciado) return;
  for (int f = 600; f < 1500; f += 50) { tone(BUZZER, f, 20); delay(20); }
  for (int f = 1500; f > 600; f -= 50) { tone(BUZZER, f, 20); delay(20); }
}

// ----------------------------------------------------------------- programa
bool phForaDaFaixa = false, vazamento = false, limiteAvisado = false, pisca = false;
unsigned long ultimaLeitura = 0;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT); pinMode(BUZZER, OUTPUT);
  pinMode(PINO_VAZAO, INPUT_PULLUP);
  pinMode(PINO_OUT, INPUT); pinMode(PINO_SCK, OUTPUT); digitalWrite(PINO_SCK, LOW);
  attachInterrupt(digitalPinToInterrupt(PINO_VAZAO), contarPulso, RISING);
  carregar();
  cor(1, 1, 1); bipes(1, 2000, 80); delay(200); cor(0, 0, 0);
  Serial.println(F("Monitor de agua: pH + vazao + nivel. Comandos: c7 c4 c10 z b f<L> c0 c<cm> s"));
  Serial.print(F("V7=")); Serial.print(V7, 3); Serial.print(F(" incl=")); Serial.print(INCLINACAO, 4);
  Serial.print(F(" K=")); Serial.print(K, 3); Serial.print(F(" zero=")); Serial.print(zero); Serial.print(F(" sens=")); Serial.println(sens, 0);
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "c7") { V7 = lerTensao(); salvar(); Serial.println(F("V7 gravado")); }
    else if (cmd == "c4" || cmd == "c10") { INCLINACAO = (lerTensao() - V7) / ((cmd == "c4" ? 4.0 : 10.0) - 7.0); salvar(); Serial.print(F("inclinacao ")); Serial.println(INCLINACAO, 4); }
    else if (cmd == "z") { volumeL = 0; litrosAvisados = 0; limiteAvisado = false; Serial.println(F("volume zerado")); }
    else if (cmd == "b") { calibrando = true; pulsosCalibracao = 0; Serial.println(F("calibrando: encha o recipiente e digite f <litros>")); }
    else if (cmd.startsWith("f") && calibrando) {
      float litros = cmd.substring(1).toFloat();
      if (litros > 0 && pulsosCalibracao > 50) { K = (pulsosCalibracao / litros) / 60.0; salvar(); calibrando = false; Serial.print(F("K = ")); Serial.println(K, 3); }
    }
    else if (cmd == "c0") { long v = lerHX710B(); if (v != 0x7FFFFFFF) { zero = v; salvar(); Serial.print(F("zero gravado: ")); Serial.println(zero); } }
    else if (cmd.startsWith("c ")) {
      float cm = cmd.substring(2).toFloat(); long v = lerHX710B();
      if (cm > 0 && v != 0x7FFFFFFF && labs(v - zero) > 100) { sens = (v - zero) / cm; salvar(); Serial.print(F("sens = ")); Serial.println(sens, 1); }
    }
    else if (cmd == "s") { silenciado = !silenciado; Serial.println(silenciado ? F("buzzer silenciado") : F("buzzer ligado")); }
  }

  if (millis() - ultimaLeitura < 1000) return;
  unsigned long agora = millis();
  float dt = (agora - ultimaLeitura) / 1000.0;
  ultimaLeitura = agora;

  // --- vazao e volume
  noInterrupts(); unsigned long n = pulsos; pulsos = 0; interrupts();
  vazao = (n / dt) / K;
  volumeL += n / (K * 60.0);
  if (calibrando) pulsosCalibracao += n;
  bool correndo = vazao >= VAZAO_MINIMA;
  if (correndo && correndoDesde == 0) correndoDesde = agora;
  if (!correndo) correndoDesde = 0;
  vazamento = correndo && (agora - correndoDesde) / 1000 >= TEMPO_VAZAMENTO_S;

  // --- pH com histerese
  float ph = tensaoParaPH(lerTensao());
  bool foraAgora = phForaDaFaixa ? (ph < PH_MIN + HISTERESE || ph > PH_MAX - HISTERESE) : (ph < PH_MIN || ph > PH_MAX);
  if (foraAgora && !phForaDaFaixa) bipes(2, 2000, 80);
  phForaDaFaixa = foraAgora;
  bool atencao = !foraAgora && (ph < PH_MIN + PH_ATENCAO || ph > PH_MAX - PH_ATENCAO);

  // --- nivel
  float nivel = lerNivelCm();
  bool transbordo = !isnan(nivel) && nivel > NIVEL_MAX_CM;
  bool baixo = !isnan(nivel) && nivel < NIVEL_MIN_CM;

  // --- consumo
  if ((int)volumeL > litrosAvisados) { litrosAvisados = (int)volumeL; bipes(1, 1500, 40); }
  if (volumeL >= LIMITE_DIA_L && !limiteAvisado) { limiteAvisado = true; bipes(3, 2500, 150); }

  // --- LED (prioridade: vazamento > transbordo > pH ruim > nivel baixo / atencao > agua passando > ok)
  pisca = !pisca;
  if (vazamento)               { cor(pisca, 0, 0); sirene(); }
  else if (transbordo)         { cor(1, 0, 0); sirene(); }
  else if (phForaDaFaixa)      cor(1, 0, 0);
  else if (baixo || atencao)   cor(1, 1, 0);
  else if (correndo)           cor(0, 0, 1);
  else                         cor(0, 1, 0);

  // --- tabela
  Serial.print(F("pH:")); Serial.print(ph, 2);
  Serial.print(F(" Vazao_L_min:")); Serial.print(vazao, 2);
  Serial.print(F(" Volume_L:")); Serial.print(volumeL, 3);
  Serial.print(F(" Nivel_cm:")); if (isnan(nivel)) Serial.print(F("--")); else Serial.print(nivel, 1);
  if (correndo) { Serial.print(F(" correndo_s:")); Serial.print((agora - correndoDesde) / 1000); }
  if (vazamento) Serial.print(F("  <<< VAZAMENTO"));
  if (transbordo) Serial.print(F("  <<< TRANSBORDANDO"));
  if (baixo) Serial.print(F("  <<< reservatorio baixo"));
  if (phForaDaFaixa) Serial.print(F("  <<< pH fora de 6,0-9,0"));
  if (calibrando) { Serial.print(F("  [calibrando: ")); Serial.print(pulsosCalibracao); Serial.print(F("]")); }
  Serial.println();
}
