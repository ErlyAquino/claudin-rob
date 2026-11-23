/*
  Guia de montagem do monitor de ar - Etapa 5B: o no completo na REDE DE TELEMETRIA DO ESPACO CRIA
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient
  Arquivos extras na mesma pasta: sensores_ar.h (o mesmo do m5a) e credenciais.h

  A cada 10 s, uma rodada le todos os sensores e publica uma mensagem por grandeza:
     cria/<PROJETO>/<NO>/temperatura  C       DHT22
     cria/<PROJETO>/<NO>/umidade      %       DHT22
     cria/<PROJETO>/<NO>/co2          ppm     MH-Z19C (depois de 3 min; sem falha e sem saturacao)
     cria/<PROJETO>/<NO>/mq2          Rs/R0   MQ-2    (depois de 10 min e com o R0 medido)
     cria/<PROJETO>/<NO>/mq135        Rs/R0   MQ-135  (idem)
  Leitura com falha nao e publicada e nao recebe seq (catalogo de topicos, secao 2).

  So no projeto "teste", o no publica tambem, uma vez por minuto, quatro grandezas de
  diagnostico, usadas no teste de viabilidade (um ESP32 da conta dos quatro sensores?):
     ciclo        ms     maior duracao de uma rodada (leituras + publicacoes) no minuto
     volta        ms     maior intervalo entre duas voltas do loop() no minuto
     falhas-co2   vezes  rodadas sem resposta do MH-Z19C desde a partida
     falhas-dht   vezes  rodadas sem leitura do DHT22 desde a partida

  ANTES DE COMPILAR:
   1. sensores_ar.h: quais sensores esta placa tem, RL, tensao e R0 dos MQ, correcoes do DHT22.
   2. credenciais.h: copie de credenciais.exemplo.h (ou da Parte 1) e preencha.
   3. PROJETO "teste" na bancada. No monitor definitivo: PROJETO "ar" e NO "no1".
      Plano B, com dois ESP32: placa A (MQ-2 + MQ-135) e placa B (MH-Z19C + DHT22), cada uma
      com o seu NO; o segundo no do projeto "ar" precisa entrar antes no catalogo de topicos.
*/
#include <CriaTelemetria.h>
#include "sensores_ar.h"

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h e preencha."
#endif

// ------------------------------------------------------------------ ajustes
const char* PROJETO = "teste";       // "teste" (bancada) ou "ar" (definitivo)
const char* NO = "no9";              // "no1" no monitor definitivo
const uint32_t INTERVALO_MS = 10000; // padrao do catalogo: uma rodada a cada 10 s
const int RODADAS_POR_RELATORIO = 6; // 6 x 10 s = 1 min
// ---------------------------------------------------------------------------

CriaNo no(PROJETO, NO);
bool diagnostico = false;            // publica as grandezas de diagnostico (so no projeto teste)
uint32_t cicloMaxMs = 0, cicloSomaMs = 0, voltaMaxMs = 0, voltaAnterior = 0;
uint32_t rodadas = 0, falhasCO2 = 0, saturadoCO2 = 0, falhasDHT = 0, foraDaFaixaMQ = 0;
int rodadasNoRelatorio = 0;

#if USAR_MQ2 || USAR_MQ135
// publica Rs/R0, ou explica no Monitor Serial por que nao publicou
void publicarMq(const char* grandeza, float rs, uint32_t mv, float r0) {
  if (isnan(rs)) {
    foraDaFaixaMQ++;
    Serial.printf("[ar] %s: pino em %lu mV, fora da faixa do ADC: nao publicado\n",
                  grandeza, (unsigned long)mv);
  } else if (r0 <= 0) {
    Serial.printf("[ar] %s: Rs = %.2f kOhm (R0 ainda nao medido): nao publicado\n", grandeza, rs);
  } else {
    no.publicar(grandeza, rs / r0, "Rs/R0");
  }
}
#endif

void setup() {
  Serial.begin(115200);
  sensoresIniciar();
  diagnostico = strcmp(PROJETO, "teste") == 0;
  no.mostrarPublicacoes(true);       // cada leitura publicada aparece no Monitor Serial
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  Serial.printf("[ar] no cria/%s/%s | MQ-2 %d | MQ-135 %d | MH-Z19C %d | DHT22 %d\n",
                PROJETO, NO, USAR_MQ2, USAR_MQ135, USAR_CO2, USAR_DHT22);
  Serial.printf("[ar] partida: %s\n", motivoDaPartida());
}

void loop() {
  // maior intervalo entre duas voltas do loop: mostra travas em qualquer ponto do programa,
  // inclusive dentro de no.manter() (por exemplo, tentando reconectar ao broker)
  uint32_t agora = millis();
  if (voltaAnterior && agora - voltaAnterior > voltaMaxMs) voltaMaxMs = agora - voltaAnterior;
  voltaAnterior = agora;

  no.manter();                       // Wi-Fi, broker, relogio e fila: tudo pela biblioteca
  if (!no.aCada(INTERVALO_MS)) return;   // so libera depois de acertar a hora

  uint32_t inicio = millis();
  LeituraAr l = lerSensores();       // todos os sensores, um depois do outro
  rodadas++;

#if USAR_DHT22
  if (isnan(l.temperatura)) {
    falhasDHT++;
    Serial.println("[ar] DHT22 sem leitura: nao publicado");
  } else {
    no.publicar("temperatura", round(l.temperatura * 10) / 10.0, "C");
    no.publicar("umidade", round(l.umidade * 10) / 10.0, "%");
  }
#endif
#if USAR_CO2
  if (l.co2 <= 0) {
    falhasCO2++;
    Serial.println("[ar] MH-Z19C sem resposta: nao publicado");
  } else if (!co2Aquecido()) {
    Serial.printf("[ar] MH-Z19C aquecendo: %d ppm (ainda nao vale)\n", l.co2);
  } else if (l.co2 >= FAIXA_CO2_PPM) {
    saturadoCO2++;
    Serial.printf("[ar] MH-Z19C em %d ppm, fundo de escala: nao publicado\n", l.co2);
  } else {
    no.publicar("co2", l.co2, "ppm");
  }
#endif
#if USAR_MQ2 || USAR_MQ135
  if (!mqAquecidos()) {
    Serial.printf("[ar] MQ aquecendo: faltam %lu s\n",
                  (unsigned long)((PREAQUECIMENTO_MQ_MS - millis()) / 1000));
  } else {
#if USAR_MQ2
    publicarMq("mq2", l.rsMq2, l.mvMq2, R0_MQ2_KOHM);
#endif
#if USAR_MQ135
    publicarMq("mq135", l.rsMq135, l.mvMq135, R0_MQ135_KOHM);
#endif
  }
#endif

  // diagnostico: duracao da rodada inteira (leituras + publicacoes), uma vez por minuto
  uint32_t ciclo = millis() - inicio;
  cicloSomaMs += ciclo;
  if (ciclo > cicloMaxMs) cicloMaxMs = ciclo;
  if (++rodadasNoRelatorio >= RODADAS_POR_RELATORIO) {
    Serial.printf("[diag] ciclo medio %lu ms, maximo %lu ms | maior volta do loop %lu ms"
                  " | memoria minima %lu B | Wi-Fi %d dBm | fila %lu | boot %lu\n",
                  (unsigned long)(cicloSomaMs / rodadasNoRelatorio), (unsigned long)cicloMaxMs,
                  (unsigned long)voltaMaxMs, (unsigned long)ESP.getMinFreeHeap(), WiFi.RSSI(),
                  (unsigned long)no.leiturasNaFila(), (unsigned long)no.boot());
    Serial.printf("[diag] em %lu rodadas: MH-Z19C sem resposta %lu, saturado %lu"
                  " | DHT22 sem leitura %lu | MQ fora da faixa %lu\n",
                  (unsigned long)rodadas, (unsigned long)falhasCO2, (unsigned long)saturadoCO2,
                  (unsigned long)falhasDHT, (unsigned long)foraDaFaixaMQ);
    if (diagnostico) {               // ficam no painel e no CSV: nao dependem do Monitor Serial
      no.publicar("ciclo", cicloMaxMs, "ms");
      no.publicar("volta", voltaMaxMs, "ms");
      no.publicar("falhas-co2", falhasCO2, "vezes");
      no.publicar("falhas-dht", falhasDHT, "vezes");
    }
    cicloMaxMs = cicloSomaMs = voltaMaxMs = 0;
    rodadasNoRelatorio = 0;
  }
}
