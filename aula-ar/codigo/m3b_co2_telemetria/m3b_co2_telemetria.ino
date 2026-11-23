/*
  Guia de montagem do monitor de ar - Etapa 3B: MH-Z19C publicando na REDE DE TELEMETRIA
  DO ESPACO CRIA
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient

  O ESP32 entra na rede Wi-Fi da telemetria (modo estacao) e publica no broker MQTT:
     cria/<PROJETO>/<NO>/co2   {"valor":612,"unidade":"ppm","seq":12,"boot":3,"t":...}
  O servidor grava no InfluxDB e o painel mostra ao vivo:  http://IP_DO_SERVIDOR:3000

  Ligacoes: as MESMAS da Etapa 3A (m3a_co2_celular). Nao mude nada na protoboard.
    MH-Z19C Vin -> VIN (5 V)   GND -> GND   Tx -> GPIO 16 (RX2)   Rx -> GPIO 17 (TX2)

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha, ou copie o
      credenciais.h da Parte 1 (m1b). O credenciais.h nunca vai para o GitHub.
   2. PROJETO "teste" na bancada; "ar" so no monitor definitivo (no1).
   3. Escolha um NO livre (veja no painel). Dois nos com o mesmo nome se derrubam no broker.
   4. Faca o zero ao ar livre ANTES, na Etapa 3A: este sketch so le e publica.
*/
#include <CriaTelemetria.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h e preencha."
#endif

// ------------------------------------------------------------------ ajustes
const char* PROJETO = "teste";       // "teste" (bancada, oficinas) ou "ar" (definitivo)
const char* NO = "no7";              // um no livre do projeto
const int PINO_RX2 = 16, PINO_TX2 = 17;   // os mesmos do firmware/no-ar
const int FAIXA_PPM = 5000;          // faixa de fabrica; 5000 = fundo de escala, nao publica
const uint32_t PREAQUECIMENTO_MS = 3UL * 60 * 1000;   // pula os 500 ppm fixos da partida
const uint32_t INTERVALO_MS = 10000; // padrao do catalogo: uma leitura a cada 10 s
// ---------------------------------------------------------------------------

CriaNo no(PROJETO, NO);
bool aquecido = false;

// comando 0x86 da folha de dados; devolve -1 sem resposta ou com checksum errado
int lerCO2() {
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

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, PINO_RX2, PINO_TX2);
  Serial2.setTimeout(200);
  no.mostrarPublicacoes(true);       // cada leitura publicada aparece no Monitor Serial
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  Serial.printf("[co2] no cria/%s/%s | aquecimento de %lu s\n",
                PROJETO, NO, (unsigned long)(PREAQUECIMENTO_MS / 1000));
}

void loop() {
  no.manter();                       // Wi-Fi, broker, relogio e fila: tudo pela biblioteca
  if (!no.aCada(INTERVALO_MS)) return;   // so libera depois de acertar a hora

  int ppm = lerCO2();
  if (ppm <= 0) {
    Serial.println("[co2] sem resposta do MH-Z19C (Tx/Rx trocados? Vin?): nao publicado");
    return;
  }
  if (millis() >= PREAQUECIMENTO_MS) aquecido = true;   // fica verdadeiro para sempre
  if (!aquecido) {
    Serial.printf("[co2] aquecendo: faltam %lu s | %d ppm (ainda nao vale)\n",
                  (unsigned long)((PREAQUECIMENTO_MS - millis()) / 1000), ppm);
    return;
  }
  if (ppm >= FAIXA_PPM) {
    Serial.printf("[co2] %d ppm = fundo de escala (Vin no 3V3? zero errado?): nao publicado\n", ppm);
    return;
  }
  no.publicar("co2", ppm, "ppm");
}
