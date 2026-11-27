/*
  09c - Vazao da solucao na REDE DE TELEMETRIA DO ESPACO CRIA: YF-S201 no ESP32
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient

  O que ele faz: conta os pulsos do sensor e, a cada 10 s, publica no broker da escola,
  nos topicos do catalogo (telemetria-cria/mqtt/catalogo-topicos.md):
     cria/<projeto>/<no>/vazao        L/min    media dos ultimos 10 s
     cria/<projeto>/<no>/volume       L        o que passou desde que o no ligou
     cria/<projeto>/<no>/circulacao   estado   1 = normal; 0 = sem vazao ha tempo demais
  O servidor grava no banco e o painel mostra o no sozinho, sem mudar nada no servidor.
  O LED azul da placa (GPIO 2) pisca enquanto a circulacao esta em 0.

  Ligacoes (as mesmas do sketch 09b):
    YF-S201   vermelho -> VIN (5 V)   preto -> GND
              amarelo  -> resistor de 1 k -> GPIO 27 -> resistor de 2 k -> GND   (divisor)
    Opcional  fio-espia do rele da bomba -> GPIO 33 (veja PINO_ESPIA_BOMBA)

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da rede,
      IP do servidor, MQTT_USUARIO igual ao PROJETO abaixo e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Calibre pela USB, com o notebook:  py calibracao/calibrar.py --porta COM5 vazao
      (pasta do repositorio telemetria-cria). Sem calibrar, vale o fator da folha de dados.
*/
#include <CriaTelemetria.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h com esse nome e preencha."
#endif

// ----------------------------------------------------------------- ajustes
const char* PROJETO = "teste";    // "teste" = oficinas e ensaios (a bancada e o horta/no1)
const char* NO = "no9";           // troque por um numero livre no painel

// 1: o no inventa leituras, sem sensor ligado, para testar a rede e o painel. Volte para 0.
#define SIMULAR_SENSORES 0

const int PINO_VAZAO = 27;                     // fio amarelo, depois do divisor
const int PINO_LED = 2;                        // LED azul da placa
const double PULSOS_POR_LITRO = 450;           // folha de dados: f (Hz) = 7,5 x vazao (L/min)
const double MINUTOS_DO_ALERTA = 20;           // sem vazao por mais que isto: circulacao = 0

// Fio-espia (opcional): um fio do pino que comanda o rele da bomba (GPIO 26 do sketch 05e)
// ate este pino, com os GND ligados. Com ele, o alerta so conta o tempo em que a bomba
// deveria estar ligada, e MINUTOS_DO_ALERTA pode baixar para 1. Com -1, conta todo o tempo.
const int PINO_ESPIA_BOMBA = -1;               // -1 = sem o fio; 33 = fio no GPIO 33
const int NIVEL_COM_BOMBA_LIGADA = LOW;        // sketch 05e, bomba no contato NF: LOW = ligada
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
// No modo simulado, a reta fica noutro espaco da memoria: nunca vale com o sensor de verdade.
CriaCalibracao calibracao(no, SIMULAR_SENSORES ? "cria-cal-sim" : "cria-cal");

// ----------------------------------------------------------------- pulsos
volatile uint32_t pulsos = 0;
volatile uint32_t ultimoPulsoUs = 0;

void IRAM_ATTR contarPulso() {
  uint32_t agora = micros();
  if (agora - ultimoPulsoUs < 1500) return;    // ruido: a 30 L/min ha um pulso a cada 4,4 ms
  ultimoPulsoUs = agora;
  pulsos = pulsos + 1;
}

uint32_t pulsosNoInicioDaJanela = 0, inicioDaJanela = 0;
uint32_t pulsosNaUltimaPublicacao = 0, horaDaUltimaPublicacao = 0;
double frequenciaDaUltimaJanela = NAN;         // Hz no ultimo segundo: o "bruto" da calibracao
double volume = 0;                             // litros desde que o no ligou
uint32_t semVazaoDesde = 0;

// A cada segundo: frequencia do ultimo segundo, que a ferramenta de calibracao pede pela USB.
void atualizarVazao() {
  uint32_t agora = millis();
  if (agora - inicioDaJanela < 1000) return;
#if SIMULAR_SENSORES
  frequenciaDaUltimaJanela = 55.0 + random(-10, 11) / 10.0;
  pulsos = pulsos + (uint32_t)(frequenciaDaUltimaJanela * (agora - inicioDaJanela) / 1000.0);
#else
  uint32_t total = pulsos;
  uint32_t novos = total - pulsosNoInicioDaJanela;
  frequenciaDaUltimaJanela = novos * 1000.0 / (agora - inicioDaJanela);
  pulsosNoInicioDaJanela = total;
#endif
  inicioDaJanela = agora;
}

double frequenciaDaVazao() { return frequenciaDaUltimaJanela; }

bool bombaDeveriaEstarLigada() {
  if (PINO_ESPIA_BOMBA < 0) return true;       // sem o fio-espia: supoe que sim
  return digitalRead(PINO_ESPIA_BOMBA) == NIVEL_COM_BOMBA_LIGADA;
}

bool circulacaoNormal() {
  return MINUTOS_DO_ALERTA <= 0 || millis() - semVazaoDesde < MINUTOS_DO_ALERTA * 60000.0;
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  pinMode(PINO_LED, OUTPUT);
  pinMode(PINO_VAZAO, INPUT);                  // o 2 k do divisor segura o pino em 0 V
  if (PINO_ESPIA_BOMBA >= 0) pinMode(PINO_ESPIA_BOMBA, INPUT);
#if SIMULAR_SENSORES
  Serial.println("[vazao] ATENCAO: SIMULAR_SENSORES esta ligado; as leituras sao inventadas.");
#else
  attachInterrupt(digitalPinToInterrupt(PINO_VAZAO), contarPulso, FALLING);
#endif

  // nome, unidade do bruto, funcao que le o bruto, reta inicial (inclinacao, deslocamento),
  // exige calibracao?  A reta converte hertz em L/min: inclinacao = 60 / pulsos por litro.
  calibracao.sensor("vazao", "Hz", frequenciaDaVazao, 60.0 / PULSOS_POR_LITRO, 0.0, false);
  calibracao.iniciar();

  no.mostrarPublicacoes(true);                 // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  inicioDaJanela = horaDaUltimaPublicacao = semVazaoDesde = millis();
}

void loop() {
  calibracao.atender();                        // comandos da ferramenta de calibracao, pela USB
  no.manter();                                 // Wi-Fi, broker, hora certa e fila
  atualizarVazao();
  digitalWrite(PINO_LED, !circulacaoNormal() && (millis() / 300) % 2);   // pisca no alerta
  if (!no.aCada(10000)) return;                // a cada 10 s, e so depois de acertar a hora

  // Vazao media desde a ultima publicacao: todos os pulsos do intervalo entram na conta.
  uint32_t agora = millis();
  uint32_t total = pulsos;
  uint32_t novos = total - pulsosNaUltimaPublicacao;
  double segundos = (agora - horaDaUltimaPublicacao) / 1000.0;
  double frequenciaMedia = novos / segundos;
  pulsosNaUltimaPublicacao = total;
  horaDaUltimaPublicacao = agora;

  double vazao = calibracao.converter("vazao", frequenciaMedia);       // L/min
  if (isnan(vazao) || vazao < 0 || vazao > 100) {
    Serial.println("[vazao] leitura fora da faixa do sensor: nao publicada.");
    return;
  }
  volume += vazao * segundos / 60.0;                                   // L/min x minutos
  if (novos > 0 || !bombaDeveriaEstarLigada()) semVazaoDesde = agora;
  if (vazao > 0 && vazao < 1.0)
    Serial.println("[vazao] abaixo de 1 L/min: fora da faixa garantida do sensor.");
  if (!circulacaoNormal())
    Serial.printf("[vazao] ALERTA: sem vazao ha %.0f min.\n", (agora - semVazaoDesde) / 60e3);

  no.publicar("vazao", vazao, "L/min");
  no.publicar("volume", volume, "L");
  no.publicar("circulacao", circulacaoNormal() ? 1 : 0, "estado");
}
