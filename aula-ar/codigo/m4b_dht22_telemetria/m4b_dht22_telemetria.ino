/*
  Guia de montagem do monitor de ar - Etapa 4B: DHT22 / AM2302 publicando na REDE DE TELEMETRIA
  DO ESPACO CRIA
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient e
               DHT sensor library (Adafruit)

  O ESP32 entra na rede Wi-Fi da telemetria (modo estacao) e publica no broker MQTT:
     cria/<PROJETO>/<NO>/temperatura   {"valor":28.4,"unidade":"C","seq":1,"boot":3,"t":...}
     cria/<PROJETO>/<NO>/umidade       {"valor":62,"unidade":"%","seq":2,"boot":3,"t":...}
  O servidor grava no InfluxDB e o painel mostra ao vivo:  http://IP_DO_SERVIDOR:3000

  Ligacoes: as MESMAS da Etapa 4A (m4a_dht22_celular). Nao mude nada na protoboard.
    DHT22 (3 fios): vermelho -> 3V3   amarelo -> GPIO 4   preto -> GND

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha, ou copie o
      credenciais.h da Parte 1 (m1b). O credenciais.h nunca vai para o GitHub.
   2. PROJETO "teste" na bancada; "ar" so no monitor definitivo (no1).
   3. Escolha um NO livre (veja no painel). Dois nos com o mesmo nome se derrubam no broker.
   4. Escreva as correcoes de calibracao achadas na Etapa 4A (ou deixe 0 / 1 / 0).
*/
#include <CriaTelemetria.h>
#include <DHT.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h e preencha."
#endif

// ------------------------------------------------------------------ ajustes
const char* PROJETO = "teste";       // "teste" (bancada, oficinas) ou "ar" (definitivo)
const char* NO = "no8";              // um no livre do projeto
const int PINO_DHT = 4;              // o mesmo do firmware/no-ar
const float CORR_TEMP_C = 0.0;       // os mesmos valores da Etapa 4A
const float UR_A = 1.0, UR_B = 0.0;
const uint32_t INTERVALO_MS = 10000; // padrao do catalogo: uma leitura a cada 10 s
// ---------------------------------------------------------------------------

CriaNo no(PROJETO, NO);
DHT dht(PINO_DHT, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  no.mostrarPublicacoes(true);       // cada leitura publicada aparece no Monitor Serial
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  Serial.printf("[dht22] no cria/%s/%s | correcoes: T %+.1f C | UR x %.3f %+.1f\n",
                PROJETO, NO, CORR_TEMP_C, UR_A, UR_B);
}

void loop() {
  no.manter();                       // Wi-Fi, broker, relogio e fila: tudo pela biblioteca
  if (!no.aCada(INTERVALO_MS)) return;   // so libera depois de acertar a hora

  float urLida = dht.readHumidity(), tLida = dht.readTemperature();
  // Falha: NaN (sem resposta ou checksum errado) ou leitura impossivel (bits zerados por mau
  // contato). Leitura com falha nao e publicada e nao recebe seq.
  bool falha = isnan(urLida) || isnan(tLida) || urLida < 1.0 || urLida > 100.0 ||
               tLida < -40.0 || tLida > 80.0;
  if (falha) {
    Serial.println("[dht22] sem resposta do sensor (dado no GPIO 4? 3V3? GND?): nao publicado");
    return;
  }
  float t = tLida + CORR_TEMP_C;
  float ur = constrain(UR_A * urLida + UR_B, 0, 100);
  // uma casa decimal, como a resolucao do sensor
  no.publicar("temperatura", round(t * 10) / 10.0, "C");
  no.publicar("umidade", round(ur * 10) / 10.0, "%");
}
