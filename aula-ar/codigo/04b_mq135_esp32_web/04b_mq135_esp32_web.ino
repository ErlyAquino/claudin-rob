/*
  04b - Modulo MQ-135 no ESP32, com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)    Bibliotecas: nenhuma extra
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  Ligacoes:
    VCC -> VIN (5 V da USB)   GND -> GND
    AO  -> resistor 1 k -> GPIO 34 -> resistor 2 k -> GND      (divisor: o pino recebe 2/3 de AO)
    DO  -> NAO LIGAR no ESP32: a saida digital do modulo sobe a 5 V e queimaria o GPIO.
  O aquecedor precisa de 5 V; o AO pode chegar perto de 5 V, por isso o divisor e obrigatorio.

  A conta e a mesma do projeto "ar" da telemetria-cria (firmware/no-ar):
    tensao no pino -> tensao em AO -> Rs (levando em conta que o divisor fica em paralelo com o RL)
    R0 = Rs em ar limpo, medido por este sketch apos o aquecimento -> publica Rs/R0.

  Celular: rede "Ar-MQ135" (senha 12345678) -> http://192.168.4.1
*/
#include "monitor_wifi.h"

const int PINO_AO = 34;                 // ADC1 (o ADC2 nao funciona com o Wi-Fi ligado)
const float VC = 5.0;                   // tensao do modulo (meca no VIN)
const float RL_KOHM = 1.0;              // resistor de carga do modulo ("102" = 1 k)
const float DIV_SUP_KOHM = 1.0, DIV_INF_KOHM = 2.0;   // divisor AO -> pino -> GND
float R0_KOHM = 0.0;                    // 0 = calibrar ao ligar; depois fixe o valor aqui
const unsigned long PREAQUECIMENTO_MS = 600000UL;    // 10 min: o R0 so vale com o sensor estabilizado
const float FATOR_AR_LIMPO = 3.6;
const float CURVA_A = 110.47, CURVA_B = -2.862;   // CO2 (folha de dados) - so ordem de grandeza
const float LIMIAR_RAZAO = 0.7;
// faixa em que o ADC do ESP32 (atenuacao 11 dB) mede com confianca
const uint32_t MENOR_MV = 150, MAIOR_MV = 2450;

enum Estado { AQUECENDO, CALIBRANDO, MEDINDO } estado = AQUECENDO;
unsigned long ultima = 0;
float somaR0 = 0; int nR0 = 0;

// tensao no pino em mV (media de 16 leituras: o ADC do ESP32 e ruidoso)
uint32_t milivoltsNoPino() {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(PINO_AO);
  return soma / 16;
}

// Rs em kOhm a partir da tensao no pino; NAN se fora da faixa confiavel do ADC
float resistenciaSensor(uint32_t mv, float &vAO) {
  vAO = mv / 1000.0 * (DIV_SUP_KOHM + DIV_INF_KOHM) / DIV_INF_KOHM;
  if (mv < MENOR_MV || mv > MAIOR_MV || vAO >= VC) return NAN;
  float divisor = DIV_SUP_KOHM + DIV_INF_KOHM;
  float carga = RL_KOHM * divisor / (RL_KOHM + divisor);   // RL em paralelo com o divisor
  return carga * (VC - vAO) / vAO;
}

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PINO_AO, ADC_11db);
  monitorIniciar("Ar-MQ135");
  if (R0_KOHM > 0) Serial.printf("R0 fixo no codigo: %.2f kOhm\n", R0_KOHM);
}

void loop() {
  monitorAtender();
  if (millis() - ultima < 1000) return;
  ultima = millis();

  uint32_t mv = milivoltsNoPino();
  float vAO, rs = resistenciaSensor(mv, vAO);

  if (estado == AQUECENDO) {
    unsigned long falta = millis() < PREAQUECIMENTO_MS ? (PREAQUECIMENTO_MS - millis()) / 1000 : 0;
    Serial.printf("aquecendo: faltam %lu s  (pino %lu mV, AO %.2f V)\n", falta, (unsigned long)mv, vAO);
    monitorPublicar(jsonMonitor("MQ-135 - pre-aquecimento", item("Faltam", falta, "s") + "," + item("AO", vAO, "V"), false, "aguarde o aquecimento"));
    if (falta == 0) estado = (R0_KOHM > 0) ? MEDINDO : CALIBRANDO;
    return;
  }
  if (estado == CALIBRANDO) {
    if (!isnan(rs)) { somaR0 += rs; nR0++; }
    else if (mv < MENOR_MV) {   // ar limpo dando menos de 150 mV no pino: a calibracao nunca terminaria
      Serial.printf("pino %lu mV: tensao baixa demais para o ADC. Meca o AO; com RL de 1 k, troque o RL do modulo por 10 k (e RL_KOHM).\n", (unsigned long)mv);
      monitorPublicar(jsonMonitor("MQ-135 - AO baixo demais", item("Pino", mv, "mV"), true, "troque o RL do modulo por 10 k"));
      return;
    }
    Serial.printf("calibrando R0 em ar limpo: %d/30  Rs = %.2f kOhm\n", nR0, rs);
    monitorPublicar(jsonMonitor("MQ-135 - calibrando R0 (ar limpo!)", item("Amostras", nR0, "/30") + "," + item("Rs", rs, "kOhm"), false, "mantenha em ar limpo"));
    if (nR0 >= 30) {
      R0_KOHM = somaR0 / nR0;
      Serial.printf(">>> R0 = %.2f kOhm  (escreva em R0_KOHM no codigo)\n", R0_KOHM);
      estado = MEDINDO;
    }
    return;
  }

  if (isnan(rs)) {
    bool saturado = mv > MAIOR_MV;
    Serial.printf("pino %lu mV fora da faixa do ADC: %s\n", (unsigned long)mv, saturado ? "gas MUITO alto (saturou)" : "sensor desligado? fio do AO? RL?");
    monitorPublicar(jsonMonitor("MQ-135", item("Pino", mv, "mV"), saturado, saturado ? "AR ALTERADO: ventile (saturou)" : "sem leitura"));
    return;
  }
  float razao = rs / R0_KOHM;
  float ppm = CURVA_A * pow(razao * FATOR_AR_LIMPO, CURVA_B) + 400;
  bool alerta = razao < LIMIAR_RAZAO;
  Serial.printf("AO_V:%.3f Rs_kOhm:%.2f Rs/R0:%.3f CO2_ppm:%.0f%s\n", vAO, rs, razao, ppm, alerta ? "  <<< AR ALTERADO: ventile" : "");
  monitorPublicar(jsonMonitor("MQ-135 - qualidade do ar",
    item("Rs/R0", razao, "") + "," + item("Rs", rs, "kOhm") + "," + item("AO", vAO, "V") + "," + item("R0", R0_KOHM, "kOhm") + "," + item("CO2 estim.", ppm, "ppm"),
    alerta, "AR ALTERADO: ventile"));
}
