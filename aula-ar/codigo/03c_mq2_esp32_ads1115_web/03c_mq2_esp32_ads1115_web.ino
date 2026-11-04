/*
  03c - Modulo MQ-2 no ESP32 lido pelo ADS1115 (conversor A/D de 16 bits, I2C) + monitor Wi-Fi
  Placa: ESP32 Dev Module     Biblioteca: "Adafruit ADS1X15" (instala junto a Adafruit BusIO)
  Arquivos extras: monitor_wifi.h, pagina_web.h

  POR QUE: o ADC interno do ESP32 (12 bits) e nao linear, so e confiavel entre ~0,15 e 2,45 V e sofre com o ruido do
  Wi-Fi. Com o AO do MQ perto de 0,2 V em ar limpo (RL de 1 k), o sketch 03b ja avisa "fora da faixa". O ADS1115 tem
  16 bits, e linear, tem amplificador programavel (PGA) e manda o NUMERO pronto por I2C. E o conversor que o no
  horta/no1 da Rede de Telemetria do Espaco CRIA usa para pH, condutividade e pressao.

  COMO (versao simples, ADS1115 em 3,3 V - o I2C ja fica no nivel do ESP32, sem conversor de nivel):
    ADS1115  VDD -> 3V3   GND -> GND   SCL -> GPIO 22   SDA -> GPIO 21   ADDR -> GND (endereco 0x48)
    MQ-2     VCC -> VIN (5 V)   GND -> GND   AO -> 1 k -> A0 do ADS1115 -> 2 k -> GND   (divisor: as entradas do
             ADS1115 nao podem passar de VDD + 0,3 V; o AO chega a 5 V)
    DO       nao ligar.
  Com ganho 1 (+-4,096 V) cada nivel vale 0,125 mV no pino = 0,19 mV no AO: 25x melhor que o ADC do ESP32 na pratica.
  (No no da telemetria o ADS1115 e alimentado em 5 V, le o sinal direto com ganho 2/3 e um conversor de nivel logico
   protege o I2C do ESP32.)  Para ler tambem o AOT (0,4-2 V) do MH-Z19C, ligue-o direto no A1: cabe em 3,3 V.

  A conta de Rs e Rs/R0 e a mesma do 03b (o divisor fica em paralelo com o RL do modulo).
  Celular: rede "Ar-MQ2-ADS" (senha 12345678) -> http://192.168.4.1
*/
#include <Adafruit_ADS1X15.h>
#include "monitor_wifi.h"

const uint8_t CANAL_AO = 0;
const float VC = 5.0;                   // tensao do modulo (meca no VIN)
const float RL_KOHM = 1.0;              // resistor de carga do modulo ("102" = 1 k)
const float DIV_SUP_KOHM = 1.0, DIV_INF_KOHM = 2.0;
const float FATOR_DIVISOR = (DIV_SUP_KOHM + DIV_INF_KOHM) / DIV_INF_KOHM;   // 1,5
float R0_KOHM = 0.0;                    // 0 = medir ao ligar (apos o aquecimento); depois fixe o valor aqui
const unsigned long PREAQUECIMENTO_MS = 600000UL;
const float LIMIAR_GAS = 0.5;           // Rs/R0 abaixo disso = gas
Adafruit_ADS1115 ads;
bool adsPresente = false;
unsigned long ultima = 0, inicioR0 = 0; float somaR0 = 0; int nR0 = 0;

float tensaoAO() {                      // volts no AO do modulo (desfaz o divisor); NAN se o ADS1115 nao responder
  if (!adsPresente) return NAN;
  long soma = 0;
  for (int i = 0; i < 8; i++) {
    ads.startADCReading(MUX_BY_CHANNEL[CANAL_AO], false);
    unsigned long t0 = millis();
    while (!ads.conversionComplete()) { if (millis() - t0 > 25) return NAN; delay(1); }
    soma += ads.getLastConversionResults();
  }
  return ads.computeVolts((int16_t)(soma / 8)) * FATOR_DIVISOR;
}
float resistenciaRs(float vao) {        // carga real = RL em paralelo com o divisor (1 k + 2 k)
  float d = DIV_SUP_KOHM + DIV_INF_KOHM, carga = RL_KOHM * d / (RL_KOHM + d);
  if (vao < 0.01 || vao > VC - 0.01) return NAN;
  return carga * (VC - vao) / vao;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  Wire.begin(21, 22);
  adsPresente = ads.begin(0x48, &Wire);
  if (adsPresente) { ads.setGain(GAIN_ONE); ads.setDataRate(RATE_ADS1115_128SPS); Serial.println("ADS1115 em 0x48: ok (ganho 1: 0,125 mV/nivel)"); }
  else Serial.println("ERRO: ADS1115 nao responde em 0x48 - confira SDA/SCL/VDD e o ADDR no GND");
  monitorIniciar("Ar-MQ2-ADS");
}

void loop() {
  monitorAtender();
  if (millis() - ultima < 2000) return;
  ultima = millis();
  float vao = tensaoAO(), rs = resistenciaRs(vao);
  bool aquecido = millis() >= PREAQUECIMENTO_MS;
  if (isnan(vao)) { monitorPublicar(jsonMonitor("MQ-2 (ADS1115)", item("Falha", 1, ""), true, "ADS1115 nao responde")); return; }
  if (!aquecido) {
    Serial.printf("aquecendo: faltam %lu s   AO=%.4f V  Rs=%.2f k\n", (PREAQUECIMENTO_MS - millis()) / 1000, vao, rs);
    monitorPublicar(jsonMonitor("MQ-2 pelo ADS1115 - aquecendo", item("Faltam", (PREAQUECIMENTO_MS - millis()) / 1000, "s") + "," + item("AO", vao, "V"), false));
    return;
  }
  if (R0_KOHM == 0 && !isnan(rs)) {     // 30 s de media em ar limpo logo apos o aquecimento
    if (inicioR0 == 0) inicioR0 = millis();
    somaR0 += rs; nR0++;
    if (millis() - inicioR0 >= 30000) { R0_KOHM = somaR0 / nR0; Serial.printf("R0 medido: %.2f k  (escreva em R0_KOHM)\n", R0_KOHM); }
  }
  float razao = (R0_KOHM > 0 && !isnan(rs)) ? rs / R0_KOHM : NAN;
  bool gas = !isnan(razao) && razao < LIMIAR_GAS;
  Serial.printf("AO:%.4f V  Rs:%.2f k  Rs/R0:%.3f%s\n", vao, rs, razao, gas ? "  <<< GAS DETECTADO" : "");   // 4 casas: o ADS1115 enxerga 0,2 mV
  monitorPublicar(jsonMonitor("MQ-2 pelo ADS1115",
    item("Rs/R0", razao, "") + "," + item("AO", vao, "V") + "," + item("Rs", rs, "k") + "," + item("R0", R0_KOHM, "k"),
    gas, "gas detectado"));
}
