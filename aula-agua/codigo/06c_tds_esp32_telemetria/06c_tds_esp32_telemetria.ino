/*
  06c - Condutividade da solucao na REDE DE TELEMETRIA DO ESPACO CRIA
        TDS Meter V1.0 + DS18B20 no ESP32
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient, OneWire
               e DallasTemperature

  O que ele faz: a cada 10 s le a temperatura e a condutividade e publica no broker da escola,
  nos topicos do catalogo (telemetria-cria/mqtt/catalogo-topicos.md):
     cria/<projeto>/<no>/temperatura     C       DS18B20 mergulhado na solucao
     cria/<projeto>/<no>/condutividade   uS/cm   referida a 25 C; so depois de calibrada
  O servidor grava no banco e o painel mostra o no sozinho, sem mudar nada no servidor.

  Ligacoes (as mesmas do sketch 06b):
    TDS Meter   -  -> GND      +  -> GPIO 32 (ligado so durante a medida)      A -> GPIO 34
    DS18B20     vermelho -> 3V3   preto -> GND   amarelo -> GPIO 4 (4,7 k do amarelo ao 3V3)

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da rede,
      IP do servidor, MQTT_USUARIO igual ao PROJETO abaixo e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Calibre pela USB, com o notebook:  py calibracao/calibrar.py --porta COM5 condutividade
      (pasta do repositorio telemetria-cria). Sem calibrar, a condutividade nao e publicada.
*/
#include <CriaTelemetria.h>
#include <DallasTemperature.h>
#include <OneWire.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h com esse nome e preencha."
#endif

// ----------------------------------------------------------------- ajustes
const char* PROJETO = "teste";    // "teste" = oficinas e ensaios (a bancada e o horta/no1)
const char* NO = "no7";           // troque por um numero livre no painel

// 1: o no inventa leituras, sem sensor ligado, para testar a rede e o painel. Volte para 0.
#define SIMULAR_SENSORES 0

const int PINO_TDS = 34;                       // saida A do sensor (ADC1: funciona com o Wi-Fi)
const int PINO_ALIMENTACAO_TDS = 32;           // pino + do sensor
const int PINO_DS18B20 = 4;
const bool DESLIGAR_TDS_ENTRE_LEITURAS = true; // o sensor ligado atrapalha a sonda de pH
const uint32_t ESPERA_TDS_LIGADO_MS = 800;
const double COEFICIENTE_DE_TEMPERATURA = 0.02;   // 2 % por grau, referido a 25 C
const double MENOR_TENSAO_V = 0.16;            // abaixo disto o ADC do ESP32 nao le
const double MAIOR_TENSAO_V = 2.25;            // fim da escala do modulo (saida ate 2,3 V)
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
// No modo simulado, a reta fica noutro espaco da memoria: nunca vale com o sensor de verdade.
CriaCalibracao calibracao(no, SIMULAR_SENSORES ? "cria-cal-sim" : "cria-cal");
OneWire umFio(PINO_DS18B20);
DallasTemperature ds18b20(&umFio);

double ultimaTemperatura = NAN;
uint32_t horaDaUltimaTemperatura = 0;

// ----------------------------------------------------------------- leituras brutas
// Temperatura do DS18B20, em C. NAN se o sensor falhar.
double temperaturaBruta() {
  horaDaUltimaTemperatura = millis();
#if SIMULAR_SENSORES
  ultimaTemperatura = 26.0 + random(-10, 11) / 100.0;
#else
  ds18b20.requestTemperatures();               // cerca de 750 ms
  float t = ds18b20.getTempCByIndex(0);
  // -127 C: sensor desconectado. 85 C: valor de partida, antes da primeira conversao.
  ultimaTemperatura = (t == DEVICE_DISCONNECTED_C || t == 85.0) ? NAN : t;
#endif
  return ultimaTemperatura;
}

// Tensao na saida do sensor, em volts: media de 30 leituras, sem as 5 menores e as 5 maiores.
double tensaoDoTds() {
#if SIMULAR_SENSORES
  return 1.36 + random(-4, 5) / 1000.0;
#else
  const int N = 30;
  int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINO_TDS); delay(5); }
  for (int i = 0; i < N - 1; i++)
    for (int j = 0; j < N - 1 - i; j++)
      if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0;
  for (int i = 5; i < N - 5; i++) soma += v[i];
  return soma / double(N - 10) / 1000.0;
#endif
}

// Condutividade a 25 C, em uS/cm, pela curva do fabricante: o "bruto" que a calibracao corrige.
// A ferramenta calibrar.py acha o fator que leva este valor ao da solucao de 1413 uS/cm.
double condutividadeSemCalibrar() {
  // Na calibracao a sonda acabou de entrar na solucao: a temperatura precisa ser a de agora.
  if (isnan(ultimaTemperatura) || millis() - horaDaUltimaTemperatura > 5000) temperaturaBruta();
  double temperatura = calibracao.converter("temperatura", ultimaTemperatura);
  if (isnan(temperatura)) return NAN;          // sem temperatura nao ha compensacao
  if (DESLIGAR_TDS_ENTRE_LEITURAS) {
    digitalWrite(PINO_ALIMENTACAO_TDS, HIGH);
    delay(ESPERA_TDS_LIGADO_MS);
  }
  double v = tensaoDoTds();
  if (DESLIGAR_TDS_ENTRE_LEITURAS) digitalWrite(PINO_ALIMENTACAO_TDS, LOW);
  if (v < MENOR_TENSAO_V || v > MAIOR_TENSAO_V) return NAN;   // sonda no ar ou fim da escala
  double ce = 133.42 * v * v * v - 255.86 * v * v + 857.39 * v;
  return ce / (1.0 + COEFICIENTE_DE_TEMPERATURA * (temperatura - 25.0));
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  pinMode(PINO_ALIMENTACAO_TDS, OUTPUT);
  digitalWrite(PINO_ALIMENTACAO_TDS, DESLIGAR_TDS_ENTRE_LEITURAS ? LOW : HIGH);
  analogSetPinAttenuation(PINO_TDS, ADC_11db);
  ds18b20.begin();
#if SIMULAR_SENSORES
  Serial.println("[ce] ATENCAO: SIMULAR_SENSORES esta ligado; as leituras sao inventadas.");
#endif

  // nome, unidade do bruto, funcao que le o bruto, reta inicial (inclinacao, deslocamento),
  // exige calibracao?
  calibracao.sensor("condutividade", "uS/cm", condutividadeSemCalibrar, 1.0, 0.0, true);
  calibracao.sensor("temperatura", "C", temperaturaBruta, 1.0, 0.0, false);
  calibracao.iniciar();

  no.mostrarPublicacoes(true);                 // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  calibracao.atender();                        // comandos da ferramenta de calibracao, pela USB
  no.manter();                                 // Wi-Fi, broker, hora certa e fila
  if (!no.aCada(10000)) return;                // a cada 10 s, e so depois de acertar a hora

  double temperatura = temperaturaBruta();
  if (isnan(temperatura)) Serial.println("[ce] DS18B20 sem leitura: confira os fios e o 4,7 k.");
  else no.publicar("temperatura", calibracao.converter("temperatura", temperatura), "C");

  if (calibracao.aguardandoCalibracao("condutividade")) {
    Serial.println("[ce] condutividade sem calibrar: nada publicado (rode o calibrar.py).");
    return;
  }
  double condutividade = calibracao.ler("condutividade");
  if (isnan(condutividade) || condutividade < 0 || condutividade > 3000) {
    Serial.println("[ce] condutividade com falha ou fora da faixa do sensor: nao publicada.");
    return;
  }
  no.publicar("condutividade", condutividade, "uS/cm");
}
