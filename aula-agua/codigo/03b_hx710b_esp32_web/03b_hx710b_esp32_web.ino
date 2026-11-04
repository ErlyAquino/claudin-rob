/*
  03b - Sensor de pressao HX710B + MPS20N0040D no ESP32 com monitor Wi-Fi: nivel do reservatorio no celular
  Placa: ESP32 Dev Module     Sem biblioteca (Preferences)     Arquivos extras: monitor_wifi.h, pagina_web.h

  Modulo: VCC -> 3V3 (o HX710B aceita 2,6-5,5 V; em 3,3 V o OUT ja sai no nivel do ESP32: SEM divisor)
          OUT -> GPIO 18    SCK -> GPIO 19    GND -> GND
  Em 3,3 V a ponte do MPS20N0040D e excitada com 3,3 V (nao 5 V): a sensibilidade cai ~1/3 em relacao ao Uno.
  Calibre (c0, c <cm>) NESTA montagem - zero e sens do sketch 03 (Uno, 5 V) nao valem aqui.
  Comandos (Serial 115200): c0 (zero com o tubo fora da agua), c <cm> (tubo a <cm> de profundidade), r.
  Celular: rede "Agua-Nivel" (senha 12345678) -> http://192.168.4.1
*/
#include <Preferences.h>
#include "monitor_wifi.h"

const int PINO_OUT = 18, PINO_SCK = 19;
const float SENS_PADRAO = 50000.0;           // contagens/cm (ordem de grandeza; CALIBRE)
const float NIVEL_MIN_CM = 5.0, NIVEL_MAX_CM = 25.0;   // alertas: reservatorio vazio / transbordando (ajuste ao seu recipiente)
long zero = 0; float sens = SENS_PADRAO;
Preferences prefs;
unsigned long ultimaLeitura = 0;

long lerHX710B() {
  unsigned long t0 = millis();
  while (digitalRead(PINO_OUT) == HIGH) { if (millis() - t0 > 300) return 0x7FFFFFFF; yield(); }
  long v = 0;
  portDISABLE_INTERRUPTS();                  // o Wi-Fi nao pode interromper os pulsos (SCK alto > 60 us = power-down)
  for (int i = 0; i < 24; i++) {
    digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);
    v = (v << 1) | digitalRead(PINO_OUT);
    digitalWrite(PINO_SCK, LOW);  delayMicroseconds(1);
  }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); digitalWrite(PINO_SCK, LOW);
  portENABLE_INTERRUPTS();
  if (v & 0x800000L) v |= 0xFF000000L;
  return v;
}
float lerMedia(int n = 4) { float soma = 0; int ok = 0; for (int i = 0; i < n; i++) { long v = lerHX710B(); if (v != 0x7FFFFFFF) { soma += v; ok++; } } return ok ? soma / ok : NAN; }
void salvar()   { prefs.begin("nivel", false); prefs.putLong("zero", zero); prefs.putFloat("sens", sens); prefs.end(); }
void carregar() { prefs.begin("nivel", true); zero = prefs.getLong("zero", 0); sens = prefs.getFloat("sens", SENS_PADRAO); prefs.end(); if (sens < 100 || sens > 1e7) sens = SENS_PADRAO; }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  pinMode(PINO_OUT, INPUT); pinMode(PINO_SCK, OUTPUT); digitalWrite(PINO_SCK, LOW);
  carregar();
  Serial.printf("HX710B. zero = %ld  sens = %.0f contagens/cm. Comandos: c0, c <cm>, r\n", zero, sens);
  monitorIniciar("Agua-Nivel");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "c0") { float m = lerMedia(8); if (!isnan(m)) { zero = (long)m; salvar(); Serial.printf("zero gravado: %ld\n", zero); } }
    else if (cmd.startsWith("c ")) {
      float cm = cmd.substring(2).toFloat(); float m = lerMedia(8);
      if (cm > 0 && !isnan(m) && fabs(m - zero) > 100) { sens = (m - zero) / cm; salvar(); Serial.printf("sensibilidade: %.1f contagens/cm\n", sens); }
      else Serial.println("use c <cm> com o tubo mergulhado (e o zero ja gravado)");
    }
    else if (cmd == "r") { zero = 0; sens = SENS_PADRAO; salvar(); Serial.println("padrao restaurado"); }
  }
  if (millis() - ultimaLeitura < 1000) return;
  ultimaLeitura = millis();
  float m = lerMedia();
  if (isnan(m)) { Serial.println("HX710B nao responde"); monitorPublicar(jsonMonitor("HX710B", item("Falha", 1, ""), true, "sensor nao responde")); return; }
  float nivel = (m - zero) / sens, pressao = nivel * 98.1;
  bool alerta = nivel < NIVEL_MIN_CM || nivel > NIVEL_MAX_CM;
  Serial.printf("Contagem:%ld Pressao_Pa:%.0f Nivel_cm:%.1f%s\n", (long)m, pressao, nivel, alerta ? "  <<< nivel fora da faixa" : "");
  monitorPublicar(jsonMonitor("HX710B - nivel do reservatorio",
    item("Nivel", nivel, "cm") + "," + item("Pressao", pressao, "Pa") + "," + item("Contagem", m, "") + "," + item("Zero", zero, ""),
    alerta, nivel < NIVEL_MIN_CM ? "reservatorio quase vazio" : "transbordando!"));
}
