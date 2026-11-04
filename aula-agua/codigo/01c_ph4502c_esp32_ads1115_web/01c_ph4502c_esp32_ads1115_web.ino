/*
  01c - pH-4502C no ESP32 lido pelo ADS1115 (conversor A/D de 16 bits, I2C) + monitor Wi-Fi
  Placa: ESP32 Dev Module     Biblioteca: "Adafruit ADS1X15" (instala junto a Adafruit BusIO)
  Arquivos extras: monitor_wifi.h, pagina_web.h

  Por que um A/D externo? O ADC interno do ESP32 tem 12 bits, e nao linear, so e confiavel entre ~0,15 e 2,45 V
  e sofre com o ruido do Wi-Fi. O ADS1115 tem 16 bits (65 536 niveis, 15 bits + sinal), e linear, tem um
  amplificador de ganho programavel (PGA) e conversa por I2C: a leitura chega como NUMERO, nao como tensao
  sujeita a ruido no fio. E o conversor que os nos da Rede de Telemetria do Espaco CRIA usam para o pH e a
  condutividade (no horta/no1).

  Ligacoes (ADS1115 alimentado em 3,3 V, como o ESP32 -> I2C ja no nivel certo, sem conversor de nivel):
    ADS1115   VDD -> 3V3   GND -> GND   SCL -> GPIO 22   SDA -> GPIO 21   ADDR -> GND (endereco 0x48)
    pH-4502C  V+ -> VIN (5 V)   G -> GND   Po -> 1 k -> A0 do ADS1115 -> 2 k -> GND  (divisor: as entradas do
              ADS1115 nao podem passar de VDD + 0,3 V = 3,6 V; o Po vai ate 5 V)
  O sketch desfaz o divisor (x 1,5) e mostra a tensao REAL do Po: pH 7 = ~2,5 V, igual ao Uno.
  (No no horta/no1 da telemetria o ADS1115 e alimentado em 5 V, le o Po direto, e um conversor de nivel
   logico protege o I2C do ESP32 - veja o guia.)
  Comandos (Serial 115200): c7, c4, c10, r.   Celular: rede "Agua-pH-ADS" -> http://192.168.4.1
*/
#include <Adafruit_ADS1X15.h>
#include <Preferences.h>
#include "monitor_wifi.h"

const uint8_t CANAL_PH = 0;
const float FATOR_DIVISOR = 1.5;          // (1 k + 2 k) / 2 k
const float V7_PADRAO = 2.50, INCL_PADRAO = -0.177;
const float PH_MIN_OK = 6.5, PH_MAX_OK = 8.5;
float V7 = V7_PADRAO, INCLINACAO = INCL_PADRAO;
Adafruit_ADS1115 ads;
bool adsPresente = false;
Preferences prefs;
unsigned long ultimaLeitura = 0;

float lerTensao() {                       // media de 8 conversoes (8 ms cada a 128 SPS); NAN se o ADS1115 nao responder
  if (!adsPresente) return NAN;
  long soma = 0;
  for (int i = 0; i < 8; i++) {
    ads.startADCReading(MUX_BY_CHANNEL[CANAL_PH], false);
    unsigned long t0 = millis();
    while (!ads.conversionComplete()) { if (millis() - t0 > 25) return NAN; delay(1); }   // fio solto nao trava o loop
    soma += ads.getLastConversionResults();
  }
  return ads.computeVolts((int16_t)(soma / 8)) * FATOR_DIVISOR;
}
float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }
void salvar()   { prefs.begin("phads", false); prefs.putFloat("v7", V7); prefs.putFloat("incl", INCLINACAO); prefs.end(); }
void carregar() { prefs.begin("phads", true);  V7 = prefs.getFloat("v7", V7); INCLINACAO = prefs.getFloat("incl", INCLINACAO); prefs.end(); }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  Wire.begin(21, 22);
  adsPresente = ads.begin(0x48, &Wire);
  if (adsPresente) {
    ads.setGain(GAIN_ONE);                // +-4,096 V de fundo de escala: 1 LSB = 0,125 mV (o pino chega a 3,33 V)
    ads.setDataRate(RATE_ADS1115_128SPS);
    Serial.println("ADS1115 em 0x48: ok  (ganho 1: 0,125 mV por nivel)");
  } else Serial.println("ERRO: ADS1115 nao responde em 0x48 - confira SDA/SCL/VDD e o ADDR no GND");
  carregar();
  Serial.printf("V7 = %.3f V   inclinacao = %.4f V/pH   (c7, c4, c10, r)\n", V7, INCLINACAO);
  monitorIniciar("Agua-pH-ADS");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    float v = lerTensao();
    if (isnan(v)) Serial.println("sem leitura do ADS1115");
    else if (cmd == "c7") { V7 = v; salvar(); Serial.printf("V7 gravado: %.3f V\n", v); }
    else if (cmd == "c4" || cmd == "c10") { INCLINACAO = (v - V7) / ((cmd == "c4" ? 4.0 : 10.0) - 7.0); salvar(); Serial.printf("inclinacao: %.4f V/pH (%.0f %% da teorica)\n", INCLINACAO, 100.0 * INCLINACAO / INCL_PADRAO); }
    else if (cmd == "r") { V7 = V7_PADRAO; INCLINACAO = INCL_PADRAO; salvar(); Serial.println("padrao restaurado"); }
  }
  if (millis() - ultimaLeitura < 1000) return;
  ultimaLeitura = millis();
  float v = lerTensao();
  if (isnan(v)) { monitorPublicar(jsonMonitor("pH (ADS1115)", item("Falha", 1, ""), true, "ADS1115 nao responde")); return; }
  float ph = tensaoParaPH(v);
  bool alerta = ph < PH_MIN_OK || ph > PH_MAX_OK;
  Serial.printf("pH:%.3f V_Po:%.4f V\n", ph, v);           // repare nas 4 casas: resolucao de 0,19 mV no Po
  monitorPublicar(jsonMonitor("pH-4502C pelo ADS1115",
    item("pH", ph, "") + "," + item("Tensao do Po", v, "V") + "," + item("V7 (calib.)", V7, "V") + "," + item("Inclinacao", INCLINACAO * 1000, "mV/pH"),
    alerta, "pH fora da faixa 6,5-8,5"));
}
