/*
  10c - Nivel do reservatorio na REDE DE TELEMETRIA DO ESPACO CRIA
        HX710B + MPS20N0040D (pressao, 0 a 40 kPa) no ESP32
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient

  O que ele faz: a cada 10 s mede a pressao da coluna de agua e publica no broker da escola
  (formato do catalogo, telemetria-cria/mqtt/catalogo-topicos.md):
     cria/<projeto>/<no>/profundidade   cm    agua acima da ponta do tubo; so depois de calibrada
     cria/<projeto>/<no>/pressao        kPa   manometrica: rho x g x profundidade
     cria/<projeto>/<no>/volume         L     pelo formato do reservatorio (constantes abaixo)
  O servidor grava no banco e o painel mostra o no sozinho, sem mudar nada no servidor.
  A grandeza "nivel" do catalogo e a da BOIA (estado 0 ou 1); por isso a medida continua,
  em centimetros, vai com outro nome.

  Ligacoes (as mesmas dos sketches 10 e 10b):
    VCC -> 3V3     OUT -> GPIO 18     SCK -> GPIO 19     GND -> GND

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da rede,
      IP do servidor, MQTT_USUARIO igual ao PROJETO abaixo e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Calibre pela USB, com o notebook (pasta do repositorio telemetria-cria):
        py calibracao/calibrar.py --porta COM5 profundidade --pontos 0 20
      Ponto 1: ponta do tubo fora da agua (0 cm). Ponto 2: ponta a 20 cm de profundidade.
      Sem calibrar, nada e publicado.
*/
#include <CriaTelemetria.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h com esse nome e preencha."
#endif

// ----------------------------------------------------------------- ajustes
const char* PROJETO = "teste";    // "teste" = oficinas e ensaios (a bancada e o horta/no1)
const char* NO = "no10";          // troque por um numero livre no painel

// 1: o no inventa leituras, sem sensor ligado, para testar a rede e o painel. Volte para 0.
#define SIMULAR_SENSORES 0

const int PINO_OUT = 18;
const int PINO_SCK = 19;
const int PINO_LED = 2;                        // LED da placa: aceso com o nivel abaixo do minimo

// O reservatorio (meca o seu; veja o tutorial)
const double ALTURA_DA_PONTA_CM = 2.0;         // do fundo ate a ponta do tubo
const double LITROS_POR_CM = 1.0;              // area da base (cm2) / 1000, paredes retas
const double NIVEL_MINIMO_CM = 8.0;            // a partir do fundo: abaixo disso, aviso

const double CONTAGENS_POR_CM_PADRAO = 50000;  // so a ordem de grandeza: a calibracao troca
const double KPA_POR_CM = 0.0978;              // rho x g x 1 cm, agua a 25 C
const double PROFUNDIDADE_MAXIMA_CM = 150;     // acima disto a leitura nao e de um reservatorio
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
// No modo simulado, a reta fica noutro espaco da memoria: nunca vale com o sensor de verdade.
CriaCalibracao calibracao(no, SIMULAR_SENSORES ? "cria-cal-sim" : "cria-cal");
portMUX_TYPE trava = portMUX_INITIALIZER_UNLOCKED;

// ----------------------------------------------------------------- leitura bruta
// Uma leitura do HX710B (24 bits, complemento de 2). NAN se o chip nao responder em 300 ms.
double umaLeitura() {
  uint32_t inicio = millis();
  while (digitalRead(PINO_OUT) == HIGH) {      // OUT em 0 = leitura pronta
    if (millis() - inicio > 300) return NAN;
    delay(1);
  }
  long valor = 0;
  portENTER_CRITICAL(&trava);                  // o Wi-Fi nao pode interromper os pulsos
  for (int i = 0; i < 24; i++) {
    digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);
    valor = (valor << 1) | digitalRead(PINO_OUT);
    digitalWrite(PINO_SCK, LOW); delayMicroseconds(1);
  }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);   // 25o pulso: entrada do sensor, 10 Hz
  digitalWrite(PINO_SCK, LOW);
  portEXIT_CRITICAL(&trava);
  if (valor & 0x800000L) valor |= 0xFF000000L;
  if (valor >= 8388000L || valor <= -8388000L) return NAN;   // conversor saturado
  return valor;
}

// O "bruto" que a calibracao transforma em centimetros: a mediana de 9 leituras (0,9 s).
double contagensDoSensor() {
#if SIMULAR_SENSORES
  return 95000 + 51000 * (21.0 - millis() / 3600000.0) + random(-300, 301);
#else
  const int N = 9;
  double v[N];
  for (int i = 0; i < N; i++) {
    v[i] = umaLeitura();
    if (isnan(v[i])) return NAN;
  }
  for (int i = 0; i < N - 1; i++)
    for (int j = 0; j < N - 1 - i; j++)
      if (v[j] > v[j + 1]) { double t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  return v[N / 2];
#endif
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  pinMode(PINO_OUT, INPUT);
  pinMode(PINO_SCK, OUTPUT);
  digitalWrite(PINO_SCK, LOW);
  pinMode(PINO_LED, OUTPUT);
#if SIMULAR_SENSORES
  Serial.println("[nivel] ATENCAO: SIMULAR_SENSORES esta ligado; as leituras sao inventadas.");
#endif

  // nome, unidade do bruto, funcao que le o bruto, reta inicial (inclinacao, deslocamento),
  // exige calibracao?  ->  profundidade (cm) = inclinacao x contagens + deslocamento
  calibracao.sensor("profundidade", "contagens", contagensDoSensor,
                    1.0 / CONTAGENS_POR_CM_PADRAO, 0.0, true);
  calibracao.iniciar();

  no.mostrarPublicacoes(true);                 // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  calibracao.atender();                        // comandos da ferramenta de calibracao, pela USB
  no.manter();                                 // Wi-Fi, broker, hora certa e fila
  if (!no.aCada(10000)) return;                // a cada 10 s, e so depois de acertar a hora

  if (calibracao.aguardandoCalibracao("profundidade")) {
    Serial.println("[nivel] sensor sem calibrar: nada publicado (rode o calibrar.py).");
    return;
  }
  double profundidade = calibracao.ler("profundidade");
  if (isnan(profundidade) || profundidade < -2 || profundidade > PROFUNDIDADE_MAXIMA_CM) {
    Serial.println("[nivel] leitura com falha ou fora da faixa: nao publicada.");
    return;
  }
  if (profundidade < 0) profundidade = 0;      // pequeno erro de zero
  double nivel = profundidade + ALTURA_DA_PONTA_CM;          // cm a partir do fundo

  no.publicar("profundidade", profundidade, "cm");
  no.publicar("pressao", profundidade * KPA_POR_CM, "kPa");
  no.publicar("volume", nivel * LITROS_POR_CM, "L");

  bool baixo = nivel < NIVEL_MINIMO_CM;
  digitalWrite(PINO_LED, baixo);
  if (baixo) Serial.printf("[nivel] NIVEL BAIXO: %.1f cm (minimo %.1f). Reponha a agua.\n",
                           nivel, NIVEL_MINIMO_CM);
}
