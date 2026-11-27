/*
  07c - Temperatura da solucao na REDE DE TELEMETRIA DO ESPACO CRIA: DS18B20 no ESP32
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria), PubSubClient, OneWire
               e DallasTemperature

  O que ele faz: a cada 10 s le a temperatura e publica no broker da escola, no topico do
  catalogo (telemetria-cria/mqtt/catalogo-topicos.md):
     cria/<projeto>/<no>/temperatura     C     DS18B20 mergulhado na solucao
  O servidor grava no banco e o painel mostra o no sozinho, sem mudar nada no servidor.
  E o exemplo NoDS18B20 da biblioteca, com tres acrescimos: o modo simulado, a conversao
  pedida sem prender o programa e a conferencia das leituras com falha.

  Ligacoes (as mesmas dos sketches 07 e 07b, e as do no horta/no1):
    DS18B20   vermelho (VDD) -> 3V3   preto -> GND   amarelo (dados) -> GPIO 4
              resistor de 4,7 k entre o amarelo e o 3V3

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha: Wi-Fi da rede,
      IP do servidor, MQTT_USUARIO igual ao PROJETO abaixo e a senha desse projeto.
      O credenciais.h nunca vai para o git.
   2. Escolha um NO livre (veja o painel). Dois nos com o mesmo nome se derrubam no broker.
   3. Opcional: ajuste o zero pela USB, contra o banho de gelo ou um termometro de confianca:
         py calibracao/calibrar.py --porta COM5 temperatura
      (pasta do repositorio telemetria-cria). Sem ajuste, vale a leitura de fabrica.
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
const char* NO = "no8";           // troque por um numero livre no painel

// 1: o no inventa leituras, sem sensor ligado, para testar a rede e o painel. Volte para 0.
#define SIMULAR_SENSORES 0

const int PINO_DS18B20 = 4;
const int RESOLUCAO = 12;                      // bits: passos de 0,0625 C, conversao de 750 ms
const uint32_t INTERVALO_MS = 10000;           // uma publicacao a cada 10 s
const double MENOR_TEMPERATURA = -10.0;        // fora desta faixa, na solucao, e defeito:
const double MAIOR_TEMPERATURA = 60.0;         //   a leitura nao e publicada
// ----------------------------------------------------------------------

CriaNo no(PROJETO, NO);
// No modo simulado, a reta fica noutro espaco da memoria: nunca vale com o sensor de verdade.
CriaCalibracao calibracao(no, SIMULAR_SENSORES ? "cria-cal-sim" : "cria-cal");
OneWire umFio(PINO_DS18B20);
DallasTemperature ds18b20(&umFio);

uint32_t esperaDaConversaoMs = 750;
uint32_t horaDoPedido = 0;        // quando a ultima conversao foi pedida (0 = nenhuma)

// ----------------------------------------------------------------- leituras brutas
// Confere a leitura do chip. NAN se ela nao valer.
double conferir(float t) {
  // -127 C: sensor desconectado. 85 C: valor de partida, antes da primeira conversao.
  if (t == DEVICE_DISCONNECTED_C || t == 85.0) return NAN;
  if (t < MENOR_TEMPERATURA || t > MAIOR_TEMPERATURA) return NAN;
  return t;
}

// Pede a conversao e volta na hora. A leitura fica pronta esperaDaConversaoMs depois.
void pedirConversao() {
#if !SIMULAR_SENSORES
  ds18b20.requestTemperatures();
#endif
  horaDoPedido = millis();
  if (horaDoPedido == 0) horaDoPedido = 1;
}

// Temperatura do DS18B20, em C, antes da calibracao. NAN se o sensor falhar.
// Se ja ha uma conversao pronta e recente, so busca o resultado; senao pede uma e espera.
// E esta a funcao que a ferramenta de calibracao chama pela USB.
double temperaturaBruta() {
#if SIMULAR_SENSORES
  horaDoPedido = 0;
  return 26.0 + random(-10, 11) / 100.0;
#else
  uint32_t idade = millis() - horaDoPedido;
  if (horaDoPedido == 0 || idade > 3000) {     // nada pedido, ou pedido velho: pede agora
    pedirConversao();
    idade = 0;
  }
  if (idade < esperaDaConversaoMs) delay(esperaDaConversaoMs - idade);
  horaDoPedido = 0;
  return conferir(ds18b20.getTempCByIndex(0));
#endif
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  ds18b20.begin();
  ds18b20.setResolution(RESOLUCAO);
  ds18b20.setWaitForConversion(false);         // requestTemperatures() volta na hora
  esperaDaConversaoMs = ds18b20.millisToWaitForConversion(RESOLUCAO) + 50;
#if SIMULAR_SENSORES
  Serial.println("[temp] ATENCAO: SIMULAR_SENSORES esta ligado; as leituras sao inventadas.");
#else
  Serial.printf("[temp] sensores no fio do GPIO %d: %d\n", PINO_DS18B20,
                ds18b20.getDeviceCount());
#endif

  // nome, unidade do bruto, funcao que le o bruto, reta inicial (inclinacao, deslocamento),
  // exige calibracao? Nao: o DS18B20 ja sai de fabrica dentro de 0,5 C.
  calibracao.sensor("temperatura", "C", temperaturaBruta, 1.0, 0.0, false);
  calibracao.iniciar();

  no.mostrarPublicacoes(true);                 // mostra no Monitor Serial cada leitura publicada
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
}

void loop() {
  calibracao.atender();                        // comandos da ferramenta de calibracao, pela USB
  no.manter();                                 // Wi-Fi, broker, hora certa e fila

  // Um segundo antes de cada publicacao, pede a conversao e segue cuidando da rede.
  static uint32_t ultimaPublicacao = 0;
  if (horaDoPedido == 0 && millis() - ultimaPublicacao >= INTERVALO_MS - 1000) pedirConversao();

  if (!no.aCada(INTERVALO_MS)) return;         // a cada 10 s, e so depois de acertar a hora
  ultimaPublicacao = millis();

  double temperatura = calibracao.ler("temperatura");   // bruto + reta gravada no no
  if (isnan(temperatura)) {
    Serial.println("[temp] DS18B20 sem leitura valida: confira os fios e o 4,7 k.");
    return;                                    // leitura com falha nao e publicada
  }
  no.publicar("temperatura", temperatura, "C");
}
