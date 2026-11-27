/*
  08c - Luz da bancada na REDE DE TELEMETRIA DO ESPACO CRIA
        BH1750 (GY-302) no ESP32
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient e
               BH1750 (Christopher Laws)

  O que ele faz: a cada 10 s le a iluminancia e publica no broker da escola, nos topicos do
  catalogo (telemetria-cria/mqtt/catalogo-topicos.md):
     cria/<projeto>/<no>/iluminancia    lx         a mesma grandeza do no horta/no2
     cria/<projeto>/<no>/dli-estimado   mol/m2/d   luz somada desde a meia-noite (estimativa)
  O servidor grava no banco e o painel mostra o no sozinho, sem mudar nada no servidor.

  Ligacoes (as mesmas dos sketches 08 e 08b, e as do horta/no2):
    BH1750   VCC -> 3V3   GND -> GND   SCL -> GPIO 22   SDA -> GPIO 21   ADDR -> solto (0x23)

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da rede,
      IP do servidor, MQTT_USUARIO igual ao PROJETO abaixo e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Se conferiu o sensor com um luximetro (sketch 08b), copie o fator para FATOR_DE_CORRECAO.
*/
#include <BH1750.h>
#include <CriaTelemetria.h>
#include <Preferences.h>
#include <Wire.h>
#include <time.h>

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h com esse nome e preencha."
#endif

// ----------------------------------------------------------------- ajustes
const char* PROJETO = "teste";    // "teste" = oficinas e ensaios (o da bancada e o horta/no2)
const char* NO = "no8";           // troque por um numero livre no painel

// 1: o no inventa leituras, sem sensor ligado, para testar a rede e o painel. Volte para 0.
#define SIMULAR_SENSORES 0

const uint8_t PINO_SDA = 21, PINO_SCL = 22;
const uint8_t ENDERECO = 0x23;                 // 0x5C com o pino ADDR no 3V3
const float FATOR_DE_CORRECAO = 1.0;           // da conferencia com o luximetro; 1.0 = sem
const bool PUBLICAR_DLI = true;                // false: publica so a iluminancia
const float LUX_POR_UMOL = 54.0;               // fonte de luz: 54 = sol; 67 = LED branco
const long FUSO_EM_SEGUNDOS = -3 * 3600;       // horario de Brasilia: o dia vira a meia-noite
const uint8_t MTREG_NORMAL = 69;               // faixa de fabrica: ate 54612 lx
const uint8_t MTREG_SOL = 32;                  // faixa estendida, para sol pleno: ate 117757 lx
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
BH1750 sensor(ENDERECO);
Preferences memoria;
bool sensorPresente = false;
uint8_t mtreg = MTREG_NORMAL;

float molDeHoje = 0;                           // mol de fotons por m2 somados desde a meia-noite
long diaDaSoma = -1;                           // numero do dia (local) a que a soma pertence
uint32_t ultimaSoma = 0, ultimaGravacao = 0;

// ----------------------------------------------------------------- leitura
// Iluminancia em lux, ja com o fator de correcao. NAN se o sensor falhar ou saturar.
double lerIluminancia() {
#if SIMULAR_SENSORES
  return 9000 + random(-150, 151);
#else
  if (!sensorPresente) {
    sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
    mtreg = MTREG_NORMAL;
    if (!sensorPresente) return NAN;
    delay(200);                                // a primeira medida leva ate 180 ms
  }
  float bruto = sensor.readLightLevel();       // negativo = erro de leitura
  if (bruto < 0) { sensorPresente = false; return NAN; }
  float limite = 65535.0 / 1.2 * 69.0 / mtreg; // fim da faixa atual
  // Troca de faixa para a proxima leitura (dai a 10 s): sol forte pede a faixa estendida.
  uint8_t novo = mtreg;
  if (mtreg == MTREG_NORMAL && bruto > 40000) novo = MTREG_SOL;
  if (mtreg == MTREG_SOL && bruto < 20000) novo = MTREG_NORMAL;
  if (novo != mtreg && sensor.setMTreg(novo)) mtreg = novo;
  if (bruto >= 0.995 * limite) return NAN;     // saturou: o valor real e maior; nao publica
  return bruto * FATOR_DE_CORRECAO;
#endif
}

// ----------------------------------------------------------------- luz somada no dia (DLI)
// Soma PPFD x tempo desde a meia-noite local. Guarda na memoria a cada 10 min, para que um
// reinicio do no no meio do dia nao apague a soma.
void somarLuzDoDia(double lux) {
  long dia = (time(nullptr) + FUSO_EM_SEGUNDOS) / 86400;
  uint32_t agora = millis();
  if (dia != diaDaSoma) {                      // virou o dia: comeca do zero
    diaDaSoma = dia;
    molDeHoje = 0;
    ultimaSoma = agora;
    memoria.putLong("dia", dia);
    memoria.putFloat("mol", 0);
  }
  float segundos = (agora - ultimaSoma) / 1000.0;
  ultimaSoma = agora;
  if (segundos > 60) segundos = 10;            // ficou sem medir: nao inventa luz
  if (!isnan(lux)) molDeHoje += lux / LUX_POR_UMOL * segundos / 1e6;
  if (agora - ultimaGravacao >= 600000) {
    ultimaGravacao = agora;
    memoria.putFloat("mol", molDeHoje);
  }
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  Wire.begin(PINO_SDA, PINO_SCL);
#if SIMULAR_SENSORES
  Serial.println("[luz] ATENCAO: SIMULAR_SENSORES esta ligado; as leituras sao inventadas.");
#else
  sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
  if (!sensorPresente) Serial.println("[luz] BH1750 nao responde: confira VCC, GND, SDA e SCL.");
#endif
  memoria.begin("luz-dia", false);
  diaDaSoma = memoria.getLong("dia", -1);      // se ainda for o mesmo dia, a soma continua
  molDeHoje = memoria.getFloat("mol", 0);

  no.mostrarPublicacoes(true);                 // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  no.manter();                                 // Wi-Fi, broker, hora certa e fila
  if (!no.aCada(10000)) return;                // a cada 10 s, e so depois de acertar a hora

  double lux = lerIluminancia();
  if (isnan(lux)) Serial.println("[luz] BH1750 sem leitura ou no fim da faixa: nao publicada.");
  else no.publicar("iluminancia", lux, "lx");

  if (PUBLICAR_DLI) {
    somarLuzDoDia(lux);
    no.publicar("dli-estimado", molDeHoje, "mol/m2/d");
  }
}
