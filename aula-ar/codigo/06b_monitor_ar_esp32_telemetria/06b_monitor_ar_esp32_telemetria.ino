/*
  06b - PROJETO: Monitor de qualidade do ar no ESP32, publicando na REDE DE TELEMETRIA DO ESPACO CRIA
  Placa: ESP32 Dev Module / DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient, DHT sensor library

  O que ele faz: le os 5 sensores a cada 10 s e publica no broker MQTT da escola, nos topicos do
  catalogo (telemetria-cria/mqtt/catalogo-topicos.md, secao 4.1):
     cria/ar/<no>/temperatura   C       DHT22
     cria/ar/<no>/umidade       %       DHT22
     cria/ar/<no>/co2           ppm     MH-Z19B (depois de 3 min de aquecimento)
     cria/ar/<no>/mq2           Rs/R0   MQ-2   (depois do aquecimento e com R0 medido)
     cria/ar/<no>/mq135         Rs/R0   MQ-135 (idem)
  O servidor grava no InfluxDB e o painel web mostra tudo ao vivo, sem mudar nada no servidor.
  O DHT11 fica so no Monitor Serial, comparado com o DHT22 (o catalogo nao aceita duas
  "temperatura" no mesmo no).

  Ligacoes (iguais as do firmware/no-ar, mais o DHT11 e o LED):
    DHT22 (3 fios)          vermelho -> 3V3   amarelo -> GPIO 4    preto -> GND
    DHT11 (modulo 3 pinos)  + -> 3V3          DATA (meio) -> GPIO 13   - -> GND
    MQ-2                    VCC -> VIN (5 V)  GND -> GND   AO -> 1 k -> GPIO 34 -> 2 k -> GND
    MQ-135                  VCC -> VIN (5 V)  GND -> GND   AO -> 1 k -> GPIO 35 -> 2 k -> GND
    MH-Z19B                 Vin -> VIN (5 V)  GND -> GND   TX -> GPIO 16 (RX2)   RX -> GPIO 17 (TX2)
    LED RGB catodo comum    R -> 220 R -> GPIO 25   G -> 220 R -> GPIO 26   B -> 220 R -> GPIO 27
  GPIO 21 e 22 ficam livres para o I2C, como manda o projeto. GPIO 34/35 sao do ADC1 (o ADC2 nao
  funciona com o Wi-Fi ligado).
  ALIMENTACAO: mais de 0,6 A no total -> fonte 5 V / 2 A no VIN, GND comum a todos.

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da telemetria,
      IP do servidor, MQTT_USUARIO = o PROJETO abaixo ("ar" ou "teste") e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Meca o R0 dos MQ (sketches 03b e 04b, em ar limpo) e escreva abaixo. Com 0, o MQ nao e publicado.
*/
#include <CriaTelemetria.h>
#include <DHT.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h nesta pasta e preencha."
#endif

// ----------------------------------------------------------------- ajustes
const char* PROJETO = "ar";       // "ar" = monitor de qualidade do ar; "teste" = oficinas
const char* NO = "no2";           // o no1 do projeto "ar" e o monitor fixo da sala do Espaco CRIA

const int PINO_DHT22 = 4, PINO_DHT11 = 13;
const int PINO_MQ2 = 34, PINO_MQ135 = 35;
const int PINO_CO2_RX = 16, PINO_CO2_TX = 17;
const int LED_R = 25, LED_G = 26, LED_B = 27;

const float DIVISOR_SUPERIOR_KOHM = 1.0;   // da saida AO ate o pino (o no-ar usa 100 k / 200 k: e so trocar)
const float DIVISOR_INFERIOR_KOHM = 2.0;   // do pino ate o GND
const float TENSAO_DOS_MQ = 5.0;           // meca no VIN
const float RL_MQ2_KOHM = 1.0, RL_MQ135_KOHM = 1.0;   // resistor de carga do modulo ("102" = 1 k)
const float R0_MQ2_KOHM = 0.0, R0_MQ135_KOHM = 0.0;   // ar limpo, medido por voce (registre a data)
const float LIMIAR_GAS_MQ2 = 0.5;

const int FAIXA_CO2_PPM = 5000;
const uint32_t PREAQUECIMENTO_CO2_MS = 3UL * 60 * 1000;
const uint32_t PREAQUECIMENTO_MQ_MS = 10UL * 60 * 1000;
const uint32_t MENOR_MV = 150, MAIOR_MV = 2450;      // faixa confiavel do ADC (11 dB)
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
DHT dht22(PINO_DHT22, DHT22);
DHT dht11(PINO_DHT11, DHT11);

bool co2Aquecido = false, mqAquecidos = false, gasDetectado = false;
int ultimoCO2 = -1;
uint32_t ultimoPisca = 0;
bool piscaAceso = false;

// ----------------------------------------------------------------- sensores
// Rs do MQ (kOhm) pela tensao no pino; NAN fora da faixa confiavel. Mesma conta do no-ar.
// saturado = tensao acima da faixa do ADC: gas MUITO alto (nao publica, mas e alarme).
float resistenciaDoMq(int pino, float rlKohm, bool* saturado = nullptr) {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(pino);
  uint32_t mv = soma / 16;
  if (saturado) *saturado = mv > MAIOR_MV;
  if (mv < MENOR_MV || mv > MAIOR_MV) return NAN;
  float fator = (DIVISOR_SUPERIOR_KOHM + DIVISOR_INFERIOR_KOHM) / DIVISOR_INFERIOR_KOHM;
  float tensaoNoSensor = mv / 1000.0 * fator;
  if (tensaoNoSensor >= TENSAO_DOS_MQ) return NAN;
  float cargaDoDivisor = DIVISOR_SUPERIOR_KOHM + DIVISOR_INFERIOR_KOHM;
  float carga = rlKohm * cargaDoDivisor / (rlKohm + cargaDoDivisor);   // RL em paralelo com o divisor
  return carga * (TENSAO_DOS_MQ - tensaoNoSensor) / tensaoNoSensor;
}

int lerCO2() {
  const uint8_t pedido[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  while (Serial2.available()) Serial2.read();
  Serial2.write(pedido, sizeof(pedido));
  uint8_t r[9];
  if (Serial2.readBytes(r, sizeof(r)) != sizeof(r) || r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  return r[2] * 256 + r[3];
}

// publica Rs/R0 ou, sem R0, mostra o Rs para voce calibrar
void publicarMq(const char* grandeza, const char* nome, float rs, float r0) {
  if (isnan(rs))   Serial.printf("[ar] %s: tensao fora da faixa do ADC, nao publicado\n", nome);
  else if (r0 > 0) no.publicar(grandeza, rs / r0, "Rs/R0");
  else             Serial.printf("[ar] %s: Rs = %.2f kOhm (R0 ainda nao calibrado: nada publicado)\n", nome, rs);
}

// ----------------------------------------------------------------- LED
void cor(bool r, bool g, bool b) { digitalWrite(LED_R, r); digitalWrite(LED_G, g); digitalWrite(LED_B, b); }

void atualizarLed() {
  if (millis() - ultimoPisca < 300) return;
  ultimoPisca = millis();
  piscaAceso = !piscaAceso;
  if (gasDetectado)        cor(piscaAceso, 0, 0);       // gas: vermelho piscando
  else if (!no.conectado()) cor(piscaAceso, 0, piscaAceso);   // sem broker: roxo piscando (leituras vao para a fila)
  else if (!co2Aquecido)   cor(0, 0, 1);                // aquecendo: azul
  else if (ultimoCO2 < 0)  cor(0, 0, piscaAceso);       // MH-Z19B sem resposta: azul piscando
  else if (ultimoCO2 <= 800)  cor(0, 1, 0);
  else if (ultimoCO2 <= 1000) cor(1, 1, 0);
  else                        cor(1, 0, 0);
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);
  cor(1, 1, 1); delay(300); cor(0, 0, 0);
  analogSetPinAttenuation(PINO_MQ2, ADC_11db);
  analogSetPinAttenuation(PINO_MQ135, ADC_11db);
  Serial2.begin(9600, SERIAL_8N1, PINO_CO2_RX, PINO_CO2_TX);
  Serial2.setTimeout(200);
  dht22.begin();
  dht11.begin();
  no.mostrarPublicacoes(true);          // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  no.manter();                          // Wi-Fi, broker, hora certa e fila: sem delay() longo!
  atualizarLed();
  if (!no.aCada(10000)) return;         // a cada 10 s, e so depois de acertar a hora

  if (millis() >= PREAQUECIMENTO_CO2_MS) co2Aquecido = true;
  if (millis() >= PREAQUECIMENTO_MQ_MS) mqAquecidos = true;

  // DHT22 -> telemetria (NaN e recusado pela biblioteca: leitura com falha nao e publicada)
  float t22 = dht22.readTemperature(), h22 = dht22.readHumidity();
  no.publicar("temperatura", t22, "C");
  no.publicar("umidade", h22, "%");

  // DHT11 -> so comparacao
  float t11 = dht11.readTemperature(), h11 = dht11.readHumidity();
  Serial.printf("[ar] DHT11 %.1f C %.0f %%  x  DHT22 %.1f C %.1f %%  (diferenca %.1f C, %.0f %%)\n",
                t11, h11, t22, h22, t11 - t22, h11 - h22);

  if (co2Aquecido) {
    int co2 = lerCO2();
    if (co2 > 0 && co2 <= FAIXA_CO2_PPM) { ultimoCO2 = co2; no.publicar("co2", co2, "ppm"); }
    else { ultimoCO2 = -1; Serial.printf("[ar] MH-Z19B sem resposta ou fora da faixa (%d)\n", co2); }
  }

  if (mqAquecidos) {
    bool saturado = false;
    float rs2 = resistenciaDoMq(PINO_MQ2, RL_MQ2_KOHM, &saturado);
    gasDetectado = saturado || (R0_MQ2_KOHM > 0 && !isnan(rs2) && rs2 / R0_MQ2_KOHM < LIMIAR_GAS_MQ2);
    publicarMq("mq2", "MQ-2", rs2, R0_MQ2_KOHM);
    publicarMq("mq135", "MQ-135", resistenciaDoMq(PINO_MQ135, RL_MQ135_KOHM), R0_MQ135_KOHM);
  } else {
    Serial.printf("[ar] pre-aquecendo os MQ: faltam %lu s\n", (unsigned long)((PREAQUECIMENTO_MQ_MS - millis()) / 1000));
  }
}
