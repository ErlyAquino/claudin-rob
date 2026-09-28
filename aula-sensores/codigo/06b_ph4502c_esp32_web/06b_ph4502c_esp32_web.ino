/*
  06b - pH-4502C no ESP32 com monitor Wi-Fi
  Placa: ESP32 Dev Module     Sem biblioteca (Preferences para guardar a calibracao)
  Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes: V+ -> VIN (5 V; a placa precisa de 5 V)   G -> GND   Po -> 1k -> GPIO 34 -> 2k -> GND (divisor!)
  A saida Po vai de 0 a 5 V; o divisor entrega 0 a 3,33 V ao ESP32. Calibre com o divisor ja montado
  (a calibracao absorve o fator do divisor e a nao linearidade do ADC do ESP32).
  Comandos pelo Serial (115200): c7, c4, c10, r  - iguais ao sketch do Uno.
  Celular: rede "Sensor-pH" -> http://192.168.4.1
*/
#include <Preferences.h>
#include "monitor_wifi.h"

const int PINO_PH = 34;
const int N_AMOSTRAS = 30;
float V7 = 1.667, INCLINACAO = -0.118;    // valores padrao ja com o divisor (2/3 de 2,5 V e de -0,177)
Preferences prefs;
unsigned long ultimaLeitura = 0;

float lerTensao() {
  int v[N_AMOSTRAS];
  for (int i = 0; i < N_AMOSTRAS; i++) { v[i] = analogRead(PINO_PH); delay(5); }
  for (int i = 0; i < N_AMOSTRAS - 1; i++) for (int j = 0; j < N_AMOSTRAS - 1 - i; j++)
    if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0; for (int i = 5; i < N_AMOSTRAS - 5; i++) soma += v[i];
  return (soma / float(N_AMOSTRAS - 10)) * 3.3 / 4095.0;
}
float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }
void salvar() { prefs.begin("ph", false); prefs.putFloat("v7", V7); prefs.putFloat("incl", INCLINACAO); prefs.end(); }
void carregar() { prefs.begin("ph", true); V7 = prefs.getFloat("v7", V7); INCLINACAO = prefs.getFloat("incl", INCLINACAO); prefs.end(); }

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  carregar();
  Serial.printf("V7 = %.3f V   inclinacao = %.4f V/pH\n", V7, INCLINACAO);
  monitorIniciar("Sensor-pH");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    float v = lerTensao();
    if (cmd == "c7") { V7 = v; salvar(); Serial.printf("V7 gravado: %.3f\n", v); }
    else if (cmd == "c4" || cmd == "c10") { INCLINACAO = (v - V7) / ((cmd == "c4" ? 4.0 : 10.0) - 7.0); salvar(); Serial.printf("inclinacao: %.4f\n", INCLINACAO); }
    else if (cmd == "r") { V7 = 1.667; INCLINACAO = -0.118; salvar(); Serial.println("padrao restaurado"); }
  }
  if (millis() - ultimaLeitura >= 1000) {
    ultimaLeitura = millis();
    float v = lerTensao(), ph = tensaoParaPH(v);
    const char* classe = ph < 6.5 ? "acido" : ph > 7.5 ? "basico" : "neutro";
    bool alerta = ph < 6.0 || ph > 8.5;                       // faixa de agua de aquario/piscina, por exemplo
    Serial.printf("%.3f V  pH %.2f (%s)\n", v, ph, classe);
    monitorPublicar(jsonMonitor("pH-4502C - acidez",
      item("pH", ph, "") + "," + item("Tensao", v, "V") + "," + item("V7 (calib.)", V7, "V"),
      alerta, String("pH fora da faixa: ") + classe));
  }
}
