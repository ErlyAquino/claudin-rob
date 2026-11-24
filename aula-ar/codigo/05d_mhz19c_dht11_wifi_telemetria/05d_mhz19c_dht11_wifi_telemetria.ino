/*
  05d - MH-Z19C + DHT11 pelo WI-FI, direto para o servidor da telemetria-cria (sem cabo USB de dados)
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient, DHT sensor library

  Ligacoes (as mesmas do 05c):
    MH-Z19C                 Vin -> VIN (5 V)   GND -> GND   TX -> GPIO 16 (RX2)   RX -> GPIO 17 (TX2)
    DHT11 (modulo 3 pinos)  + -> 3V3           DATA (meio) -> GPIO 4              - -> GND
  Alimentacao: qualquer fonte USB de 5 V (carregador de celular ou power bank). O cabo so leva energia.

  O que ele faz: a cada 10 s le os dois sensores e publica no broker MQTT do servidor, nos topicos
     cria/teste/no19/co2               ppm   MH-Z19C (depois de 1 min de aquecimento)
     cria/teste/no19/temperatura       C     interna do MH-Z19C
     cria/teste/no19/umidade           %     DHT11
     cria/teste/no19/temperatura-ar    C     DHT11
     cria/teste/no19/sensacao-termica  C     indice de calor (DHT11)
  A biblioteca cuida do Wi-Fi, do broker, da hora certa e de guardar as leituras feitas sem rede.

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi de 2,4 GHz
      (o ESP32 nao enxerga rede de 5 GHz), IP do servidor, MQTT_USUARIO = "teste" e a senha do
      projeto teste. O credenciais.h nunca vai para o git.
   2. Feche o gateway USB: ele usa o mesmo no (no19) e os dois juntos duplicam as leituras.
*/
#include <CriaTelemetria.h>
#include <DHT.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h nesta pasta e preencha."
#endif

const char* PROJETO = "teste";       // projeto livre das oficinas (catalogo, secao 4.3)
const char* NO = "no19";             // o mesmo no do 05c: o historico do painel continua
const int PINO_RX2 = 16, PINO_TX2 = 17, PINO_DHT = 4;
const uint32_t INTERVALO_MS = 10000;
const uint32_t PREAQUECIMENTO_MS = 60000UL;   // MH-Z19C: 1 min

CriaNo no(PROJETO, NO);
DHT dht(PINO_DHT, DHT11);
unsigned long falhasCo2 = 0, falhasDht = 0;

// pede a leitura (0x86) ao MH-Z19C; devolve o CO2 em ppm (ou -1) e a temperatura interna
int lerCO2(int* tempInterna) {
  const uint8_t pedido[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  while (Serial2.available()) Serial2.read();
  Serial2.write(pedido, sizeof(pedido));
  uint8_t r[9];
  if (Serial2.readBytes(r, sizeof(r)) != sizeof(r) || r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  *tempInterna = (int)r[4] - 40;
  return r[2] * 256 + r[3];
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, PINO_RX2, PINO_TX2);
  Serial2.setTimeout(200);
  dht.begin();
  no.mostrarPublicacoes(true);          // com a USB no computador, mostra cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  no.manter();                          // Wi-Fi, broker, hora certa e fila: sem delay() longo!
  if (!no.aCada(INTERVALO_MS)) return;  // a cada 10 s, e so depois de acertar a hora

  // MH-Z19C
  int tInterna = 0;
  int ppm = lerCO2(&tInterna);
  if (ppm < 0) {
    falhasCo2++;
    Serial.printf("[05d] MH-Z19C sem resposta (%lu vezes) - confira Vin no VIN, TX no GPIO 16 e RX no GPIO 17\n", falhasCo2);
  } else if (millis() < PREAQUECIMENTO_MS) {
    Serial.printf("[05d] MH-Z19C aquecendo: %d ppm (ainda nao publicado)\n", ppm);
  } else {
    no.publicar("co2", ppm, "ppm");
    no.publicar("temperatura", tInterna, "C");
  }

  // DHT11: 0 % com checksum "certo" = bits zerados por mau contato (o DHT11 so mede de 20 % para cima)
  float umid = dht.readHumidity(), tAr = dht.readTemperature();
  if (isnan(umid) || isnan(tAr) || umid < 1) {
    falhasDht++;
    Serial.printf("[05d] DHT11 falha na leitura (%lu vezes) - confira DATA no GPIO 4 e + no 3V3\n", falhasDht);
  } else {
    no.publicar("umidade", umid, "%");
    no.publicar("temperatura-ar", tAr, "C");
    float sensacao = dht.computeHeatIndex(tAr, umid, false);          // indice de calor (NWS), em C
    no.publicar("sensacao-termica", round(sensacao * 10) / 10.0, "C");   // 1 casa decimal
  }
}
