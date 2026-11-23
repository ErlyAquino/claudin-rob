/*
  sensores_ar.h - leitura dos sensores do monitor de qualidade do ar (Parte 5 do guia de montagem)
  Usado por m5a_monitor_celular e m5b_monitor_telemetria: o MESMO arquivo nas duas pastas.
  Se editar aqui (sensores usados, calibracao), copie para a outra pasta.

  Ligacoes (as mesmas do firmware/no-ar da telemetria-cria e das Partes 1 a 4):
    MQ-2     VCC -> trilha + (5 V)   AO -> 100 k -> GPIO 34 -> 200 k -> GND   (100 nF no GPIO 34)
    MQ-135   VCC -> trilha + (5 V)   AO -> 100 k -> GPIO 35 -> 200 k -> GND   (100 nF no GPIO 35)
    MH-Z19C  Vin -> trilha + (5 V)   Tx -> GPIO 16 (RX2)   Rx -> GPIO 17 (TX2)
    DHT22    vermelho -> 3V3 (direto no pino, NUNCA na trilha +)   amarelo -> GPIO 4   preto -> GND
    Fonte de 5 V / 2 A nas trilhas + e -; VIN do ESP32 na trilha +; GND comum a todos.
*/
#pragma once
#include <Arduino.h>

// ---------------------------------------------------------------- sensores desta placa
// UM ESP32 com os quatro sensores (recomendado): os quatro em 1.
// DOIS ESP32 (plano B): placa A = MQ-2 + MQ-135 (CO2 e DHT22 em 0);
//                       placa B = MH-Z19C + DHT22 (MQ2 e MQ135 em 0). Um NO diferente em cada.
#define USAR_MQ2    1
#define USAR_MQ135  1
#define USAR_CO2    1
#define USAR_DHT22  1

// DHT22: 0 = leitura propria, com limite de tempo em cada pulso (recomendado no no completo);
//        1 = pela "DHT sensor library" da Adafruit, como na Parte 4 (use para comparar).
#define DHT22_PELA_BIBLIOTECA 0

// ---------------------------------------------------------------- pinos
const int PINO_MQ2 = 34, PINO_MQ135 = 35;      // ADC1 (o ADC2 nao funciona com o Wi-Fi)
const int PINO_CO2_RX = 16, PINO_CO2_TX = 17;  // UART2
const int PINO_DHT = 4;

// ---------------------------------------------------------------- calibracao
// MQ: meca de novo NESTA montagem, com a fonte definitiva (o R0 so vale onde foi medido).
const float TENSAO_DOS_MQ = 5.0;               // V na trilha +, medida com tudo ligado
const float DIV_SUP_KOHM = 100.0, DIV_INF_KOHM = 200.0;
// RL de cada modulo: 1.0 de fabrica ("102"); 10.0 se voce trocou o resistor (Partes 1 e 2)
const float RL_MQ2_KOHM = 1.0, RL_MQ135_KOHM = 1.0;
const float R0_MQ2_KOHM = 0.0, R0_MQ135_KOHM = 0.0;    // 0 = ainda nao medido
// DHT22: as correcoes da Parte 4 (0 / 1 / 0 = sem correcao)
const float CORR_TEMP_C = 0.0, UR_A = 1.0, UR_B = 0.0;
// MH-Z19C: faixa de fabrica (5000 = fundo de escala, tratado como saturacao)
const int FAIXA_CO2_PPM = 5000;

// ---------------------------------------------------------------- tempos
const uint32_t PREAQUECIMENTO_MQ_MS = 10UL * 60 * 1000;
const uint32_t PREAQUECIMENTO_CO2_MS = 3UL * 60 * 1000;
const uint32_t MENOR_MV = 150, MAIOR_MV = 2450;        // faixa confiavel do ADC (11 dB)

// Uma rodada de leituras. NAN ou -1 = leitura com falha (nao mostrar como medida, nao publicar).
struct LeituraAr {
  float rsMq2 = NAN, rsMq135 = NAN;     // kOhm; NAN = tensao fora da faixa do ADC
  uint32_t mvMq2 = 0, mvMq135 = 0;      // tensao no pino, em mV
  int co2 = -1;                         // ppm; -1 = sem resposta ou checksum errado
  float temperatura = NAN, umidade = NAN;   // ja com as correcoes da calibracao
  uint32_t duracaoMs = 0;               // quanto tempo a rodada inteira levou
};

// ================================================================ DHT22
#if USAR_DHT22
#if DHT22_PELA_BIBLIOTECA
#include <DHT.h>
static DHT _dht(PINO_DHT, DHT22);
inline void _dhtIniciar() { _dht.begin(); }
inline bool lerDHT22(float &t, float &ur) {
  ur = _dht.readHumidity();
  t = _dht.readTemperature();
  return !isnan(ur) && !isnan(t);
}
#else
// Leitura propria do DHT22 (protocolo na Parte 4, secao 2.5). Cada espera tem limite de tempo:
// se o sensor nao responder, ou parar no meio dos 40 bits, a leitura e abandonada em menos de
// 1 ms. Na biblioteca DHT, cada espera pode durar cerca de 0,1 s com as interrupcoes desligadas,
// e uma leitura interrompida no meio (mau contato) faz o watchdog reiniciar o ESP32 inteiro:
// num no com quatro sensores, isso tambem zera o aquecimento dos MQ e do MH-Z19C.
inline void _dhtIniciar() { pinMode(PINO_DHT, INPUT_PULLUP); }

// espera o fio de dados chegar ao nivel pedido; false se passar do limite, em microssegundos
static inline bool _dhtEspera(int nivel, uint32_t limiteUs) {
  uint32_t inicio = micros();
  while (digitalRead(PINO_DHT) != nivel)
    if (micros() - inicio > limiteUs) return false;
  return true;
}

inline bool lerDHT22(float &t, float &ur) {
  uint8_t d[5] = {0, 0, 0, 0, 0};
  pinMode(PINO_DHT, OUTPUT);
  digitalWrite(PINO_DHT, LOW);          // pedido: fio em 0 V por 1,1 ms
  delayMicroseconds(1100);
  pinMode(PINO_DHT, INPUT_PULLUP);      // libera o fio; o sensor responde em 20 a 40 us
  noInterrupts();                       // tempos de dezenas de us: no maximo ~5 ms assim
  // resposta do sensor: 80 us em 0 V, 80 us em nivel alto, e comeca o primeiro bit (0 V)
  bool ok = _dhtEspera(LOW, 300) && _dhtEspera(HIGH, 300) && _dhtEspera(LOW, 300);
  for (int i = 0; ok && i < 40; i++) {
    ok = _dhtEspera(HIGH, 200);         // cada bit comeca com ~50 us em 0 V
    uint32_t inicio = micros();
    ok = ok && _dhtEspera(LOW, 200);    // nivel alto: ~27 us = bit 0; ~70 us = bit 1
    if (ok && micros() - inicio > 48) d[i / 8] |= 0x80 >> (i % 8);
  }
  interrupts();
  if (!ok) return false;                                    // sem resposta ou leitura incompleta
  if (((d[0] + d[1] + d[2] + d[3]) & 0xFF) != d[4]) return false;   // checksum
  ur = ((d[0] << 8) | d[1]) * 0.1;
  t = (((d[2] & 0x7F) << 8) | d[3]) * 0.1;
  if (d[2] & 0x80) t = -t;                                  // bit mais alto = temperatura negativa
  return true;
}
#endif
#endif

// ================================================================ partida e aquecimento
inline void sensoresIniciar() {
#if USAR_MQ2
  analogSetPinAttenuation(PINO_MQ2, ADC_11db);
#endif
#if USAR_MQ135
  analogSetPinAttenuation(PINO_MQ135, ADC_11db);
#endif
#if USAR_CO2
  Serial2.begin(9600, SERIAL_8N1, PINO_CO2_RX, PINO_CO2_TX);
  Serial2.setTimeout(200);              // pior caso por rodada: sensor sem resposta = 200 ms
#endif
#if USAR_DHT22
  _dhtIniciar();
#endif
}

// Marcas de aquecimento: ficam verdadeiras para sempre (mesmo quando o millis() der a volta).
inline bool mqAquecidos() {
  static bool ok = false;
  if (millis() >= PREAQUECIMENTO_MQ_MS) ok = true;
  return ok;
}
inline bool co2Aquecido() {
  static bool ok = false;
  if (millis() >= PREAQUECIMENTO_CO2_MS) ok = true;
  return ok;
}

// ================================================================ MQ e MH-Z19C
// Rs do MQ (kOhm) pela tensao no pino. Media de 16 leituras; o divisor fica em paralelo com o RL.
inline float lerMq(int pino, float rlKohm, uint32_t &mv) {
  uint32_t soma = 0;
  for (int i = 0; i < 16; i++) soma += analogReadMilliVolts(pino);
  mv = soma / 16;
  float vAO = mv / 1000.0 * (DIV_SUP_KOHM + DIV_INF_KOHM) / DIV_INF_KOHM;
  if (mv < MENOR_MV || mv > MAIOR_MV || vAO >= TENSAO_DOS_MQ) return NAN;
  float divisor = DIV_SUP_KOHM + DIV_INF_KOHM;
  float carga = rlKohm * divisor / (rlKohm + divisor);
  return carga * (TENSAO_DOS_MQ - vAO) / vAO;
}

#if USAR_CO2
// Comando 0x86 do MH-Z19C; -1 sem resposta ou com checksum errado.
inline int lerCO2() {
  const uint8_t pedido[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  while (Serial2.available()) Serial2.read();
  Serial2.write(pedido, 9);
  uint8_t r[9];
  if (Serial2.readBytes(r, 9) != 9 || r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  return r[2] * 256 + r[3];
}
#endif

// ================================================================ a rodada
// Le todos os sensores desta placa, um depois do outro, e mede o tempo gasto.
// Ordem: serial (CO2), analogicos (MQ) e, por ultimo, o DHT22, que desliga as interrupcoes
// do seu nucleo por cerca de 5 ms (o Wi-Fi roda no outro nucleo e nao e afetado).
inline LeituraAr lerSensores() {
  LeituraAr l;
  uint32_t inicio = millis();
#if USAR_CO2
  l.co2 = lerCO2();
#endif
#if USAR_MQ2
  l.rsMq2 = lerMq(PINO_MQ2, RL_MQ2_KOHM, l.mvMq2);
#endif
#if USAR_MQ135
  l.rsMq135 = lerMq(PINO_MQ135, RL_MQ135_KOHM, l.mvMq135);
#endif
#if USAR_DHT22
  float t, ur;
  // leitura impossivel = bits zerados por mau contato, com checksum "certo" (Parte 4)
  if (lerDHT22(t, ur) && ur >= 1.0 && ur <= 100.0 && t >= -40.0 && t <= 80.0) {
    l.temperatura = t + CORR_TEMP_C;
    l.umidade = constrain(UR_A * ur + UR_B, 0, 100);
  }
#endif
  l.duracaoMs = millis() - inicio;
  return l;
}

// Motivo da ultima partida do ESP32, em palavras (para descobrir por que o no reiniciou).
#include <esp_system.h>
inline const char* motivoDaPartida() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:  return "ligou na energia (ou botao EN / Monitor Serial)";
    case ESP_RST_SW:       return "reinicio pedido pelo programa (ou gravacao)";
    case ESP_RST_PANIC:    return "ERRO do programa (panico)";
    case ESP_RST_INT_WDT:  return "TRAVOU com as interrupcoes desligadas (watchdog)";
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT:      return "TRAVOU (watchdog)";
    case ESP_RST_BROWNOUT: return "SUBTENSAO: alimentacao fraca";
    default:               return "outro motivo";
  }
}
