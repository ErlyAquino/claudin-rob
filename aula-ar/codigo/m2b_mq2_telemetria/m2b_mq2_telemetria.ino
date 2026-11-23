/*
  Guia de montagem do monitor de ar - Etapa 2B: MQ-2 publicando na REDE DE TELEMETRIA
  DO ESPACO CRIA
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient

  O ESP32 entra na rede Wi-Fi da telemetria (modo estacao) e publica no broker MQTT:
     cria/<PROJETO>/<NO>/mq2   {"valor":0.97,"unidade":"Rs/R0","seq":12,"boot":3,"t":...}
  O servidor grava no InfluxDB e o painel mostra ao vivo:  http://IP_DO_SERVIDOR:3000
  (em qualquer computador ou celular ligado na mesma rede).

  Ligacoes: as MESMAS da Etapa 2A (m2a_mq2_celular). Nao mude nada na protoboard.
    MQ-2   VCC -> VIN (5 V)   GND -> GND
           AO -> 100 k -> GPIO 34 -> 200 k -> GND   (100 nF do GPIO 34 ao GND)

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: rede Wi-Fi
      da telemetria, IP do servidor (MQTT_HOST), MQTT_USUARIO = o PROJETO abaixo e a senha
      desse projeto. O credenciais.h esta no .gitignore e nunca vai para o GitHub.
   2. PROJETO "teste" nas oficinas e na bancada; "ar" so no monitor definitivo
      (no1 = monitor fixo da sala).
   3. Escolha um NO livre (veja no painel quais ja existem). Dois nos com o mesmo nome
      se derrubam no broker.
   4. Escreva o R0 medido na Etapa 2A. Com 0, o no NAO publica: so mostra o Rs no Serial.
*/
#include <CriaTelemetria.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h e preencha."
#endif

// ------------------------------------------------------------------ ajustes
const char* PROJETO = "teste";       // "teste" (bancada, oficinas) ou "ar" (definitivo)
const char* NO = "no6";              // um no livre do projeto
const int PINO_AO = 34;              // o mesmo do firmware/no-ar
const float VC = 5.0;                // tensao no VIN, medida com o multimetro
const float RL_KOHM = 1.0;           // o mesmo da Etapa 2A
const float DIV_SUP_KOHM = 100.0, DIV_INF_KOHM = 200.0;
const float R0_KOHM = 0.0;           // <<< o R0 da Etapa 2A (kOhm)
const uint32_t PREAQUECIMENTO_MS = 10UL * 60 * 1000;
const uint32_t INTERVALO_MS = 10000; // padrao do catalogo: uma leitura a cada 10 s
const uint32_t MENOR_MV = 150, MAIOR_MV = 2450;
// ---------------------------------------------------------------------------

CriaNo no(PROJETO, NO);
bool aquecido = false;

// mesma conta da Etapa 2A e do firmware/no-ar
float resistenciaSensor(uint32_t &mv, float &vAO) {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(PINO_AO);
  mv = soma / 16;
  vAO = mv / 1000.0 * (DIV_SUP_KOHM + DIV_INF_KOHM) / DIV_INF_KOHM;
  if (mv < MENOR_MV || mv > MAIOR_MV || vAO >= VC) return NAN;
  float divisor = DIV_SUP_KOHM + DIV_INF_KOHM;
  float carga = RL_KOHM * divisor / (RL_KOHM + divisor);
  return carga * (VC - vAO) / vAO;
}

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PINO_AO, ADC_11db);
  no.mostrarPublicacoes(true);       // cada leitura publicada aparece no Monitor Serial
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  Serial.printf("[mq2] no cria/%s/%s | R0 = %.2f k | aquecimento de %lu s\n",
                PROJETO, NO, R0_KOHM, (unsigned long)(PREAQUECIMENTO_MS / 1000));
}

void loop() {
  no.manter();                       // Wi-Fi, broker, relogio e fila: tudo pela biblioteca
  if (!no.aCada(INTERVALO_MS)) return;   // so libera depois de acertar a hora

  uint32_t mv; float vAO;
  float rs = resistenciaSensor(mv, vAO);

  if (millis() >= PREAQUECIMENTO_MS) aquecido = true;   // fica verdadeiro para sempre
  if (!aquecido) {
    Serial.printf("[mq2] aquecendo: faltam %lu s | pino %lu mV | AO %.3f V\n",
                  (unsigned long)((PREAQUECIMENTO_MS - millis()) / 1000), (unsigned long)mv, vAO);
    return;
  }
  if (isnan(rs)) {
    Serial.printf("[mq2] pino %lu mV fora da faixa do ADC (%s): nao publicado\n",
                  (unsigned long)mv, mv > MAIOR_MV ? "gas muito alto" : "fio solto, divisor ou RL");
    return;
  }
  if (R0_KOHM <= 0) {
    Serial.printf("[mq2] Rs = %.2f kOhm | R0 ainda nao escrito no codigo: nada publicado\n", rs);
    return;
  }
  Serial.printf("[mq2] Rs = %.2f k | AO = %.3f V | Rs/R0 = %.3f\n", rs, vAO, rs / R0_KOHM);
  no.publicar("mq2", rs / R0_KOHM, "Rs/R0");
}
