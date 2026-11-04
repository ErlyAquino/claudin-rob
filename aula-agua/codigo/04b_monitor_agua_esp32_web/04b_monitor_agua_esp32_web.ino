/*
  04b - PROJETO: Monitor de agua no ESP32 - pH + vazao + nivel + LED RGB + buzzer + pagina no celular
  Placa: ESP32 Dev Module     Sem biblioteca (Preferences)     Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes (protoboard 830; trilha + = VIN (5 V), trilha - = GND):
    pH-4502C        V+ -> VIN   G -> GND   Po -> 1 k -> GPIO 34 -> 2 k -> GND   (divisor)
    YF-S201         vermelho -> VIN   preto -> GND   amarelo -> 1 k -> GPIO 27 -> 2 k -> GND   (divisor)
    HX710B          VCC -> 3V3   OUT -> GPIO 18   SCK -> GPIO 19   GND -> GND   (sem divisor: alimentado em 3,3 V)
                    ATENCAO: em 3,3 V a ponte do sensor recebe 3,3 V (nao 5 V) e a sensibilidade cai ~1/3:
                    calibre o nivel (c0, c <cm>) NESTA montagem; a calibracao feita no Uno nao vale aqui.
    LED RGB         R -> 220 R -> GPIO 25   G -> 220 R -> GPIO 26   B -> 220 R -> GPIO 33   catodo -> GND
    Buzzer passivo  + -> GPIO 14   - -> GND
  Mesma logica do sketch 04 (Uno): LED de status, bipes do pH com histerese, sirene de vazamento/transbordo,
  aviso de consumo. Diferencas: o loop() nunca bloqueia (sons por etapas, com millis()) e tudo vai para o celular.
  Comandos no Serial (115200): c7 c4 c10 z b f<L> c0 c<cm> s.    Celular: rede "Agua-Monitor" -> http://192.168.4.1
*/
#include <Preferences.h>
#include "monitor_wifi.h"

const int PINO_PH = 34, PINO_VAZAO = 27, PINO_OUT = 18, PINO_SCK = 19, LED_R = 25, LED_G = 26, LED_B = 33, BUZZER = 14;
const float PH_MIN = 6.0, PH_MAX = 9.0, PH_ATENCAO = 0.5, HISTERESE = 0.2;
const unsigned long TEMPO_VAZAMENTO_S = 300;
const float LIMITE_DIA_L = 50.0, VAZAO_MINIMA = 0.3;
const float NIVEL_MIN_CM = 5.0, NIVEL_MAX_CM = 25.0;
const float V7_PADRAO = 1.667, INCL_PADRAO = -0.118, K_PADRAO = 7.5, SENS_PADRAO = 50000.0;
float V7 = V7_PADRAO, INCLINACAO = INCL_PADRAO, K = K_PADRAO, sens = SENS_PADRAO; long zero = 0;
bool silenciado = false;
Preferences prefs;

// ----------------------------------------------------------------- sensores
float lerTensao() {
  const int N = 30; int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINO_PH); delay(1); }
  for (int i = 0; i < N - 1; i++) for (int j = 0; j < N - 1 - i; j++) if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0; for (int i = 5; i < N - 5; i++) soma += v[i];
  return (soma / float(N - 10)) / 1000.0;
}
float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }

volatile unsigned long pulsos = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
void IRAM_ATTR contarPulso() { portENTER_CRITICAL_ISR(&mux); pulsos++; portEXIT_CRITICAL_ISR(&mux); }

long lerHX710B() {
  unsigned long t0 = millis();
  while (digitalRead(PINO_OUT) == HIGH) { if (millis() - t0 > 300) return 0x7FFFFFFF; yield(); }
  long v = 0;
  portDISABLE_INTERRUPTS();
  for (int i = 0; i < 24; i++) { digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); v = (v << 1) | digitalRead(PINO_OUT); digitalWrite(PINO_SCK, LOW); delayMicroseconds(1); }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); digitalWrite(PINO_SCK, LOW);
  portENABLE_INTERRUPTS();
  if (v & 0x800000L) v |= 0xFF000000L;
  return v;
}
float lerNivelCm() { long v = lerHX710B(); return v == 0x7FFFFFFF ? NAN : (v - zero) / sens; }   // 1 leitura/s: media feita pelo sensor (10 Hz)

// Calibracoes nos MESMOS namespaces dos sketches 01b ("ph"), 02b ("vazao") e 03b ("nivel"): se voce calibrou com eles
// neste ESP32, o monitor ja comeca calibrado.
void salvar() {
  prefs.begin("ph", false);    prefs.putFloat("v7", V7); prefs.putFloat("incl", INCLINACAO); prefs.end();
  prefs.begin("vazao", false); prefs.putFloat("k", K); prefs.end();
  prefs.begin("nivel", false); prefs.putLong("zero", zero); prefs.putFloat("sens", sens); prefs.end();
}
void carregar() {
  prefs.begin("ph", true);    V7 = prefs.getFloat("v7", V7); INCLINACAO = prefs.getFloat("incl", INCLINACAO); prefs.end();
  prefs.begin("vazao", true); K = prefs.getFloat("k", K); prefs.end();
  prefs.begin("nivel", true); zero = prefs.getLong("zero", 0); sens = prefs.getFloat("sens", sens); prefs.end();
  if (K < 3 || K > 15) K = K_PADRAO;
  if (sens < 100 || sens > 1e7) sens = SENS_PADRAO;
}

// ----------------------------------------------------------------- LED e buzzer sem bloquear
void cor(bool r, bool g, bool b) { digitalWrite(LED_R, r); digitalWrite(LED_G, g); digitalWrite(LED_B, b); }
int bipesPendentes = 0; unsigned long proximoBipe = 0; int bipeFreq = 2000, bipeMs = 80;
void bipes(int n, int freqHz, int ms) { if (silenciado) return; bipesPendentes = n; bipeFreq = freqHz; bipeMs = ms; proximoBipe = 0; }
bool sireneLigada = false; unsigned long ultimoPassoSirene = 0; int freqSirene = 600, passoSirene = 50;
void atenderSom() {
  unsigned long agora = millis();
  if (sireneLigada && !silenciado) {                           // varredura 600 -> 1500 -> 600 Hz, 20 ms por passo
    if (agora - ultimoPassoSirene >= 20) { ultimoPassoSirene = agora; tone(BUZZER, freqSirene, 25); freqSirene += passoSirene; if (freqSirene >= 1500 || freqSirene <= 600) passoSirene = -passoSirene; }
    return;
  }
  if (bipesPendentes > 0 && agora >= proximoBipe) { tone(BUZZER, bipeFreq, bipeMs); proximoBipe = agora + bipeMs + 60; bipesPendentes--; }
}

// ----------------------------------------------------------------- programa
float ph = 7, vazao = 0, volumeL = 0, nivel = NAN; int litrosAvisados = 0;
unsigned long correndoDesde = 0, ultimaLeitura = 0, pulsosCalibracao = 0;
bool calibrando = false, phForaDaFaixa = false, vazamento = false, transbordo = false, baixo = false, limiteAvisado = false, pisca = false;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  analogReadResolution(12); analogSetAttenuation(ADC_11db);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT); pinMode(BUZZER, OUTPUT);
  pinMode(PINO_VAZAO, INPUT);
  pinMode(PINO_OUT, INPUT); pinMode(PINO_SCK, OUTPUT); digitalWrite(PINO_SCK, LOW);
  attachInterrupt(digitalPinToInterrupt(PINO_VAZAO), contarPulso, RISING);
  carregar();
  cor(1, 1, 1); tone(BUZZER, 2000, 100); delay(200); cor(0, 0, 0);
  Serial.printf("Monitor de agua. V7=%.3f incl=%.4f K=%.3f zero=%ld sens=%.0f. Comandos: c7 c4 c10 z b f<L> c0 c<cm> s\n", V7, INCLINACAO, K, zero, sens);
  monitorIniciar("Agua-Monitor");
}

void loop() {
  monitorAtender();
  atenderSom();
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "c7") { V7 = lerTensao(); salvar(); Serial.println("V7 gravado"); }
    else if (cmd == "c4" || cmd == "c10") { INCLINACAO = (lerTensao() - V7) / ((cmd == "c4" ? 4.0 : 10.0) - 7.0); salvar(); Serial.printf("inclinacao %.4f\n", INCLINACAO); }
    else if (cmd == "z") { volumeL = 0; litrosAvisados = 0; limiteAvisado = false; Serial.println("volume zerado"); }
    else if (cmd == "b") { calibrando = true; pulsosCalibracao = 0; Serial.println("calibrando: encha o recipiente e digite f <litros>"); }
    else if (cmd.startsWith("f") && calibrando) {
      float litros = cmd.substring(1).toFloat();
      if (litros > 0 && pulsosCalibracao > 50) { K = (pulsosCalibracao / litros) / 60.0; salvar(); calibrando = false; Serial.printf("K = %.3f\n", K); }
    }
    else if (cmd == "c0") { long v = lerHX710B(); if (v != 0x7FFFFFFF) { zero = v; salvar(); Serial.printf("zero gravado: %ld\n", zero); } }
    else if (cmd.startsWith("c ")) {
      float cm = cmd.substring(2).toFloat(); long v = lerHX710B();
      if (cm > 0 && v != 0x7FFFFFFF && labs(v - zero) > 100) { sens = (v - zero) / cm; salvar(); Serial.printf("sens = %.1f\n", sens); }
    }
    else if (cmd == "s") { silenciado = !silenciado; sireneLigada = false; Serial.println(silenciado ? "buzzer silenciado" : "buzzer ligado"); }
  }

  if (millis() - ultimaLeitura < 1000) return;
  unsigned long agora = millis();
  float dt = (agora - ultimaLeitura) / 1000.0;
  ultimaLeitura = agora;

  portENTER_CRITICAL(&mux); unsigned long n = pulsos; pulsos = 0; portEXIT_CRITICAL(&mux);
  vazao = (n / dt) / K;
  volumeL += n / (K * 60.0);
  if (calibrando) pulsosCalibracao += n;
  bool correndo = vazao >= VAZAO_MINIMA;
  if (correndo && correndoDesde == 0) correndoDesde = agora;
  if (!correndo) correndoDesde = 0;
  vazamento = correndo && (agora - correndoDesde) / 1000 >= TEMPO_VAZAMENTO_S;

  ph = tensaoParaPH(lerTensao());
  bool foraAgora = phForaDaFaixa ? (ph < PH_MIN + HISTERESE || ph > PH_MAX - HISTERESE) : (ph < PH_MIN || ph > PH_MAX);
  if (foraAgora && !phForaDaFaixa) bipes(2, 2000, 80);
  phForaDaFaixa = foraAgora;
  bool atencao = !foraAgora && (ph < PH_MIN + PH_ATENCAO || ph > PH_MAX - PH_ATENCAO);

  nivel = lerNivelCm();
  transbordo = !isnan(nivel) && nivel > NIVEL_MAX_CM;
  baixo = !isnan(nivel) && nivel < NIVEL_MIN_CM;
  sireneLigada = vazamento || transbordo;

  if ((int)volumeL > litrosAvisados) { litrosAvisados = (int)volumeL; bipes(1, 1500, 40); }
  if (volumeL >= LIMITE_DIA_L && !limiteAvisado) { limiteAvisado = true; bipes(3, 2500, 150); }

  pisca = !pisca;
  if (vazamento)              cor(pisca, 0, 0);
  else if (transbordo)        cor(1, 0, 0);
  else if (phForaDaFaixa)     cor(1, 0, 0);
  else if (baixo || atencao)  cor(1, 1, 0);
  else if (correndo)          cor(0, 0, 1);
  else                        cor(0, 1, 0);

  bool semNivel = isnan(nivel);                              // HX710B nao respondeu: a pagina mostra -1 cm e avisa
  String msg = vazamento ? "VAZAMENTO: agua correndo ha " + String((agora - correndoDesde) / 60000) + " min"
             : transbordo ? "TRANSBORDANDO" : phForaDaFaixa ? "pH fora de 6,0-9,0" : baixo ? "reservatorio baixo"
             : semNivel ? "sensor de nivel (HX710B) nao responde" : limiteAvisado ? "consumo passou do limite" : "";
  Serial.printf("pH:%.2f Vazao_L_min:%.2f Volume_L:%.3f Nivel_cm:%.1f %s\n", ph, vazao, volumeL, nivel, msg.c_str());
  monitorPublicar(jsonMonitor("Monitor de agua - pH, vazao e nivel",
    item("pH", ph, "") + "," + item("Vazao", vazao, "L/min") + "," + item("Volume", volumeL, "L") + "," + item("Nivel", semNivel ? -1 : nivel, "cm") + "," + item("Correndo ha", correndo ? (agora - correndoDesde) / 1000 : 0, "s"),
    vazamento || transbordo || phForaDaFaixa || baixo || semNivel || limiteAvisado, msg));
}
