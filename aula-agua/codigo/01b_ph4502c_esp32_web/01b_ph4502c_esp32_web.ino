/*
  01b - pH-4502C no ESP32 com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)    Sem biblioteca (Preferences guarda a calibracao)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  Ligacoes: V+ -> VIN (5 V: a placa de pH precisa de 5 V)   G -> GND   Po -> 1 k -> GPIO 34 -> 2 k -> GND (DIVISOR!)
  O Po vai de 0 a 5 V; o divisor 1k/2k entrega 0 a 3,33 V ao ESP32 (maximo do pino: 3,6 V).
  Calibre COM o divisor montado: a calibracao absorve o fator 2/3 e a nao linearidade do ADC do ESP32.
  Comandos pelo Monitor Serial (115200): c7, c4, c10, r - iguais ao sketch do Uno.
  Celular: rede "Agua-pH" (senha 12345678) -> http://192.168.4.1
*/
#include <Preferences.h>
#include "monitor_wifi.h"

const int PINO_PH = 34;                   // ADC1 (o ADC2 para de funcionar com o Wi-Fi ligado)
const int N_AMOSTRAS = 30;
const float V7_PADRAO = 1.667, INCL_PADRAO = -0.118;   // 2/3 de 2,5 V e de -0,177 V/pH (por causa do divisor)
const float PH_MIN_OK = 6.5, PH_MAX_OK = 8.5;
float V7 = V7_PADRAO, INCLINACAO = INCL_PADRAO;
Preferences prefs;
unsigned long ultimaLeitura = 0;

float lerTensao() {                       // media aparada, em volts, ja com a calibracao de fabrica do ADC
  int v[N_AMOSTRAS];
  for (int i = 0; i < N_AMOSTRAS; i++) { v[i] = analogReadMilliVolts(PINO_PH); delay(5); }
  for (int i = 0; i < N_AMOSTRAS - 1; i++)
    for (int j = 0; j < N_AMOSTRAS - 1 - i; j++)
      if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0;
  for (int i = 5; i < N_AMOSTRAS - 5; i++) soma += v[i];
  return (soma / float(N_AMOSTRAS - 10)) / 1000.0;
}
float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }
void salvar()   { prefs.begin("ph", false); prefs.putFloat("v7", V7); prefs.putFloat("incl", INCLINACAO); prefs.end(); }
void carregar() { prefs.begin("ph", true);  V7 = prefs.getFloat("v7", V7); INCLINACAO = prefs.getFloat("incl", INCLINACAO); prefs.end(); }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);         // ate ~3,1 V; confiavel entre 0,15 e 2,45 V
  carregar();
  Serial.printf("pH-4502C. V7 = %.3f V   inclinacao = %.4f V/pH   (c7, c4, c10, r)\n", V7, INCLINACAO);
  monitorIniciar("Agua-pH");
}

void loop() {
  monitorAtender();                       // atende o celular sem parar
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    float v = lerTensao();
    if (cmd == "c7") { V7 = v; salvar(); Serial.printf("V7 gravado: %.3f V\n", v); }
    else if (cmd == "c4" || cmd == "c10") {
      INCLINACAO = (v - V7) / ((cmd == "c4" ? 4.0 : 10.0) - 7.0); salvar();
      Serial.printf("inclinacao: %.4f V/pH (saude da sonda: %.0f %% da teorica)\n", INCLINACAO, 100.0 * INCLINACAO / INCL_PADRAO);
    }
    else if (cmd == "r") { V7 = V7_PADRAO; INCLINACAO = INCL_PADRAO; salvar(); Serial.println("padrao restaurado"); }
  }
  if (millis() - ultimaLeitura < 1000) return;
  ultimaLeitura = millis();
  float v = lerTensao(), ph = tensaoParaPH(v);
  const char* classe = ph < 6.5 ? "acido" : (ph > 7.5 ? "basico" : "neutro");
  bool alerta = ph < PH_MIN_OK || ph > PH_MAX_OK;
  Serial.printf("pH:%.2f V:%.3f  %s%s\n", ph, v, classe, alerta ? "  <<< fora da faixa" : "");
  monitorPublicar(jsonMonitor("pH-4502C - acidez da agua",
    item("pH", ph, "") + "," + item("Tensao no pino", v, "V") + "," + item("V7 (calib.)", V7, "V") + "," + item("Inclinacao", INCLINACAO * 1000, "mV/pH"),
    alerta, String("pH fora da faixa 6,5-8,5: ") + classe));
}
