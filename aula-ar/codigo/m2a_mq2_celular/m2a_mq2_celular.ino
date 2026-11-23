/*
  Guia de montagem do monitor de ar - Etapa 2A: MQ-2 no ESP32, resultado no celular
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)    Bibliotecas: nenhuma extra
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  MQ-2: gases inflamaveis (GLP, propano, metano, hidrogenio), alcool e fumaca.
  NAO e detector de gas certificado: em seguranca de verdade, use detector certificado.

  O ESP32 cria a propria rede Wi-Fi (modo ponto de acesso). Sem roteador e sem servidor:
     celular -> Wi-Fi "Ar-MQ2" (senha 12345678) -> navegador -> http://192.168.4.1
     dados brutos em JSON:                                  http://192.168.4.1/dados

  Ligacoes (as MESMAS do no da Rede de Telemetria, firmware/no-ar, para o R0 valer
  nas duas etapas):
    MQ-2   VCC -> VIN (5 V)    GND -> GND
           AO  -> 100 k -> GPIO 34 -> 200 k (ou 2 x 100 k em serie) -> GND
                  capacitor de 100 nF do GPIO 34 ao GND (estabiliza a leitura do ADC)
           DO  -> NAO LIGAR: a saida digital do modulo sobe a 5 V e queimaria o GPIO.
  O divisor entrega ao pino 2/3 da tensao do AO (5 V -> 3,33 V; o pino aguenta 3,6 V).
  Resistores altos (300 k no total) quase nao desviam corrente do RL do modulo.
  (No no completo, o GPIO 35 e do MQ-135.)

  Sequencia ao ligar:
    1. AQUECENDO  (10 min) o aquecedor leva o SnO2 a temperatura de trabalho.
    2. CALIBRANDO (5 min)  R0 = media do Rs em AR LIMPO (perto da janela aberta).
                           Pulada se R0_KOHM ja estiver escrito abaixo.
    3. MEDINDO             Rs/R0 a cada segundo. Ar limpo ~1,0; mais gas, MENOR a razao.
  Anote o R0 do Monitor Serial (115200) e escreva em R0_KOHM, aqui e no m2b.
*/
#include "monitor_wifi.h"

// ------------------------------------------------------------------ ajustes
const int PINO_AO = 34;              // ADC1 (o ADC2 nao funciona com o Wi-Fi ligado)
const float VC = 5.0;                // tensao no VIN, medida com o multimetro
const float RL_KOHM = 1.0;           // RL do modulo: "102" = 1 k, "103" = 10 k
const float DIV_SUP_KOHM = 100.0;    // do AO ate o pino
const float DIV_INF_KOHM = 200.0;    // do pino ate o GND
float R0_KOHM = 0.0;                 // 0 = calibrar ao ligar; depois escreva o valor medido
const unsigned long PREAQUECIMENTO_MS = 10UL * 60 * 1000;
const int AMOSTRAS_R0 = 300;         // uma por segundo = 5 min em ar limpo
const float LIMIAR_ATENCAO = 0.80;   // Rs/R0: referencia do curso (nao e norma)
const float LIMIAR_ALERTA = 0.50;
const uint32_t MENOR_MV = 150;       // faixa em que o ADC do ESP32 (11 dB) mede bem
const uint32_t MAIOR_MV = 2450;
const uint32_t MV_RESOLUCAO = 300;   // abaixo disso em ar limpo: aumente o RL (como no no-ar)
// ---------------------------------------------------------------------------

enum Estado { AQUECENDO, CALIBRANDO, MEDINDO } estado = AQUECENDO;
unsigned long ultima = 0;
double somaR0 = 0, somaMvR0 = 0;
int nR0 = 0;

// tensao no pino em mV (media de 16 leituras: o ADC do ESP32 e ruidoso)
uint32_t milivoltsNoPino() {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(PINO_AO);
  return soma / 16;
}

// Rs (kOhm) pela tensao no pino; NAN fora da faixa confiavel do ADC.
// O divisor (DIV_SUP + DIV_INF) fica em paralelo com o RL: a carga real e a dos dois juntos.
float resistenciaSensor(uint32_t mv, float &vAO) {
  vAO = mv / 1000.0 * (DIV_SUP_KOHM + DIV_INF_KOHM) / DIV_INF_KOHM;
  if (mv < MENOR_MV || mv > MAIOR_MV || vAO >= VC) return NAN;
  float divisor = DIV_SUP_KOHM + DIV_INF_KOHM;
  float carga = RL_KOHM * divisor / (RL_KOHM + divisor);
  return carga * (VC - vAO) / vAO;
}

const char* classe(float razao) {
  if (razao >= LIMIAR_ATENCAO) return "ar limpo";
  if (razao >= LIMIAR_ALERTA) return "gas ou fumaca por perto: verifique";
  return "GAS DETECTADO: ventile e verifique";
}

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PINO_AO, ADC_11db);
  monitorIniciar("Ar-MQ2");
  Serial.printf("MQ-2 | RL = %.1f k | divisor %.0f k / %.0f k | VC = %.2f V\n",
                RL_KOHM, DIV_SUP_KOHM, DIV_INF_KOHM, VC);
  if (R0_KOHM > 0) Serial.printf("R0 fixo no codigo: %.2f kOhm (calibracao pulada)\n", R0_KOHM);
}

void loop() {
  monitorAtender();
  if (millis() - ultima < 1000) return;
  ultima = millis();

  uint32_t mv = milivoltsNoPino();
  float vAO, rs = resistenciaSensor(mv, vAO);

  // 1. aquecimento: o numero existe, mas ainda nao e medida
  if (estado == AQUECENDO) {
    unsigned long falta = millis() < PREAQUECIMENTO_MS ? (PREAQUECIMENTO_MS - millis()) / 1000 : 0;
    Serial.printf("aquecendo: faltam %lu s | pino %lu mV | AO %.3f V | Rs %.1f k\n",
                  falta, (unsigned long)mv, vAO, rs);
    monitorPublicar(jsonMonitor("MQ-2 - aquecendo",
      item("Faltam", falta, "s") + "," + item("Pino", mv, "mV") + "," + item("AO", vAO, "V"),
      false, "aguarde o aquecimento"));
    if (falta == 0) estado = (R0_KOHM > 0) ? MEDINDO : CALIBRANDO;
    return;
  }

  // 2. calibracao do R0 em ar limpo
  if (estado == CALIBRANDO) {
    if (isnan(rs)) {
      const char* causa = mv < MENOR_MV
        ? "tensao baixa demais: confira o divisor e aumente o RL do modulo"
        : "tensao alta demais: ha gas no ar? leve o sensor para perto da janela";
      Serial.printf("pino %lu mV fora da faixa: %s\n", (unsigned long)mv, causa);
      monitorPublicar(jsonMonitor("MQ-2 - calibracao parada",
        item("Pino", mv, "mV") + "," + item("AO", vAO, "V"), true, causa));
      return;
    }
    somaR0 += rs; somaMvR0 += mv; nR0++;
    Serial.printf("calibrando R0 (ar limpo): %d/%d | Rs = %.2f k | media = %.2f k\n",
                  nR0, AMOSTRAS_R0, rs, somaR0 / nR0);
    monitorPublicar(jsonMonitor("MQ-2 - calibrando R0 (ar limpo)",
      item("Rs", rs, "kOhm") + "," + item("Media", somaR0 / nR0, "kOhm") + "," +
      item("Amostras", nR0, ""), false, "mantenha o sensor em ar limpo"));
    if (nR0 >= AMOSTRAS_R0) {
      R0_KOHM = somaR0 / nR0;
      Serial.printf("\n>>> R0 = %.2f kOhm. Escreva  R0_KOHM = %.2f  neste sketch e no m2b.\n",
                    R0_KOHM, R0_KOHM);
      if (somaMvR0 / nR0 < MV_RESOLUCAO)
        Serial.printf(">>> pino em ar limpo = %.0f mV (< %lu): aumente o RL do modulo.\n",
                      somaMvR0 / nR0, (unsigned long)MV_RESOLUCAO);
      Serial.println();
      estado = MEDINDO;
    }
    return;
  }

  // 3. medicao
  if (isnan(rs)) {
    bool saturado = mv > MAIOR_MV;
    Serial.printf("pino %lu mV fora da faixa: %s\n", (unsigned long)mv,
                  saturado ? "gas MUITO alto (saturou)" : "sensor desligado? fio do AO? RL?");
    monitorPublicar(jsonMonitor("MQ-2", item("Pino", mv, "mV"), saturado,
      saturado ? "GAS DETECTADO: ventile (saturou)" : "sem leitura: confira a fiacao"));
    return;
  }
  float razao = rs / R0_KOHM;
  bool alerta = razao < LIMIAR_ALERTA;
  // linha "nome:valor" separada por espacos: o Plotter Serial da Arduino IDE desenha cada uma
  Serial.printf("Rs/R0:%.3f Rs_kOhm:%.2f AO_V:%.3f Pino_mV:%lu\n", razao, rs, vAO, (unsigned long)mv);
  Serial.println(classe(razao));   // linha so de texto: o Plotter ignora
  monitorPublicar(jsonMonitor("MQ-2 - qualidade do ar",
    item("Rs/R0", razao, "") + "," + item("Rs", rs, "kOhm") + "," + item("AO", vAO, "V") + "," +
    item("Pino", mv, "mV") + "," + item("R0", R0_KOHM, "kOhm"),
    alerta, classe(razao)));
}
