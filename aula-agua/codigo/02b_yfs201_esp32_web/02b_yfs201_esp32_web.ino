/*
  02b - Sensor de vazao YF-S201 / ZJ-S201 no ESP32 com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module     Sem biblioteca (Preferences guarda o K)     Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes: vermelho -> VIN (5 V)    preto -> GND    amarelo -> 1 k -> GPIO 27 -> 2 k -> GND  (DIVISOR!)
  O sensor Hall e alimentado em 5 V e devolve pulsos de 5 V; o divisor 1k/2k os reduz a 3,3 V.
  (Alimentar o sensor em 3,3 V nao e garantido: a folha de dados pede no minimo 4,5 V.)
  Comandos pelo Serial (115200): z (zera volume), b / f <litros> (calibra o K), k, r.
  Celular: rede "Agua-Vazao" (senha 12345678) -> http://192.168.4.1
*/
#include <Preferences.h>
#include "monitor_wifi.h"

const int PINO_SENSOR = 27;
const float K_PADRAO = 7.5;                  // Hz por (L/min)
const float VAZAO_MAX_OK = 12.0;             // L/min: acima disso, "torneira escancarada" (alerta)
float K = K_PADRAO;

volatile unsigned long pulsos = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;   // "cadeado" para ler/zerar o contador com seguranca
unsigned long pulsosCalibracao = 0, ultimoCalculo = 0;
float volumeL = 0, vazao = 0, freq = 0;
bool calibrando = false;
Preferences prefs;

void IRAM_ATTR contarPulso() { portENTER_CRITICAL_ISR(&mux); pulsos++; portEXIT_CRITICAL_ISR(&mux); }

void salvar()   { prefs.begin("vazao", false); prefs.putFloat("k", K); prefs.end(); }
void carregar() { prefs.begin("vazao", true);  K = prefs.getFloat("k", K_PADRAO); prefs.end(); if (K < 3 || K > 15) K = K_PADRAO; }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  pinMode(PINO_SENSOR, INPUT);               // o divisor 2 k ja segura o pino em 0 V quando nao ha pulso
  attachInterrupt(digitalPinToInterrupt(PINO_SENSOR), contarPulso, RISING);
  carregar();
  Serial.printf("YF-S201: K = %.3f Hz/(L/min). Comandos: z, b, f <litros>, k, r\n", K);
  monitorIniciar("Agua-Vazao");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "z") { volumeL = 0; Serial.println("volume zerado"); }
    else if (cmd == "b") { calibrando = true; pulsosCalibracao = 0; Serial.println("calibrando: encha o recipiente e digite  f <litros>"); }
    else if (cmd.startsWith("f") && calibrando) {
      float litros = cmd.substring(1).toFloat();
      if (litros > 0 && pulsosCalibracao > 50) { K = (pulsosCalibracao / litros) / 60.0; salvar(); calibrando = false; Serial.printf("%lu pulsos em %.3f L -> K = %.3f gravado\n", pulsosCalibracao, litros, K); }
      else Serial.println("informe o volume (ex.: f 2.0) com pelo menos 50 pulsos");
    }
    else if (cmd == "k") Serial.printf("K = %.3f (%.0f pulsos/L)\n", K, K * 60);
    else if (cmd == "r") { K = K_PADRAO; salvar(); Serial.println("K padrao restaurado"); }
  }

  if (millis() - ultimoCalculo < 1000) return;
  unsigned long agora = millis();
  float dt = (agora - ultimoCalculo) / 1000.0;
  ultimoCalculo = agora;

  portENTER_CRITICAL(&mux);
  unsigned long n = pulsos; pulsos = 0;
  portEXIT_CRITICAL(&mux);

  freq = n / dt;
  vazao = freq / K;
  volumeL += n / (K * 60.0);
  if (calibrando) pulsosCalibracao += n;
  bool alerta = vazao > VAZAO_MAX_OK;
  Serial.printf("Vazao_L_min:%.2f Freq_Hz:%.1f Volume_L:%.3f%s\n", vazao, freq, volumeL, calibrando ? "  [calibrando]" : "");
  monitorPublicar(jsonMonitor("YF-S201 - vazao de agua",
    item("Vazao", vazao, "L/min") + "," + item("Volume", volumeL, "L") + "," + item("Frequencia", freq, "Hz") + "," + item("K", K, "Hz/(L/min)"),
    alerta, "vazao muito alta"));
}
