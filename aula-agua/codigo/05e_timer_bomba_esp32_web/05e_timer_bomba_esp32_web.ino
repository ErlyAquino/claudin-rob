/*
  05e - Timer da bomba da hidroponia no ESP32, controlado pelo celular (Wi-Fi)
  Placa: ESP32 Dev Module     Bibliotecas: WiFi, WebServer, Preferences (vem com o core)
  Arquivo extra, na mesma pasta: pagina_timer.h

  Ligacoes do modulo rele:  S (IN) -> GPIO 26     + (VCC) -> VIN (5 V da USB)     - (GND) -> GND
  Lado da bomba: igual ao do Uno (+ da fonte -> COM; NF -> + da bomba; - da bomba -> - da fonte;
  diodo na bomba).

  Celular: entre na rede "Timer-Bomba" (senha 12345678) e abra http://192.168.4.1
  A pagina mostra a bomba, liga / desliga na mao e muda os tempos, que ficam gravados.
  Para ensaiar na bancada, troque MINUTO para 1000UL: os "minutos" viram segundos.
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "pagina_timer.h"

const char* NOME_DA_REDE = "Timer-Bomba";
const char* SENHA_DA_REDE = "12345678";          // troque antes de instalar (8 ou mais)

const int PINO_RELE = 26;
const bool RELE_ACIONA_EM_NIVEL_BAIXO = false;   // KY-019: false.  Optoacoplado: true
const bool BOMBA_NO_CONTATO_NF = true;           // true: ESP32 desligado = bomba ligada

const unsigned long MINUTO = 60000UL;            // para ensaiar: 1000UL
const unsigned int MANUAL_MAXIMO_MIN = 30;       // o modo manual volta sozinho ao automatico
const unsigned int TEMPO_MIN = 1, TEMPO_MAX = 720;

WebServer servidor(80);
Preferences memoria;
unsigned int minLigada = 15, minDesligada = 15;  // de fabrica; os gravados entram no setup()

enum Modo { AUTOMATICO, MANUAL_LIGADA, MANUAL_DESLIGADA };
Modo modo = AUTOMATICO;
bool bombaLigada = true;
unsigned long inicioDaFase = 0, inicioDoManual = 0;

void aplicarBomba() {
  bool acionar = BOMBA_NO_CONTATO_NF ? !bombaLigada : bombaLigada;
  digitalWrite(PINO_RELE, acionar == RELE_ACIONA_EM_NIVEL_BAIXO ? LOW : HIGH);
}

void recomecar(bool ligada) {                    // comeca uma fase nova a partir de agora
  if (modo != AUTOMATICO) inicioDoManual = millis();   // no manual, comeca a contar os 30 min
  bombaLigada = ligada;
  inicioDaFase = millis();
  aplicarBomba();
  Serial.println(bombaLigada ? "bomba LIGADA" : "bomba DESLIGADA");
}

// ---------- rotas da pagina ----------
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_TIMER); }

void rotaEstado() {                              // responde em JSON; "falta" em segundos
  unsigned long agora = millis();
  unsigned long duracao, passou;
  if (modo == AUTOMATICO) {                      // falta para a proxima troca
    duracao = (bombaLigada ? minLigada : minDesligada) * MINUTO;
    passou = agora - inicioDaFase;
  } else {                                       // falta para o manual expirar
    duracao = MANUAL_MAXIMO_MIN * MINUTO;
    passou = agora - inicioDoManual;
  }
  unsigned long falta = passou < duracao ? (duracao - passou) / 1000 : 0;
  String json = "{\"bomba\":" + String(bombaLigada ? 1 : 0);
  const char* nome = modo == AUTOMATICO ? "auto" : modo == MANUAL_LIGADA ? "liga" : "desliga";
  json += ",\"modo\":\"" + String(nome) + "\"";
  json += ",\"falta\":" + String(falta);
  json += ",\"lig\":" + String(minLigada) + ",\"des\":" + String(minDesligada);
  json += ",\"max\":" + String(MANUAL_MAXIMO_MIN) + "}";
  servidor.send(200, "application/json", json);
}

void rotaModo() {                                // /modo?m=auto  |  liga  |  desliga
  String m = servidor.arg("m");
  if (m == "auto")         { modo = AUTOMATICO;       recomecar(true); }
  else if (m == "liga")    { modo = MANUAL_LIGADA;    recomecar(true);  }
  else if (m == "desliga") { modo = MANUAL_DESLIGADA; recomecar(false); }
  rotaEstado();
}

void rotaTempos() {                              // /tempos?lig=15&des=30
  long lig = servidor.arg("lig").toInt(), des = servidor.arg("des").toInt();
  if (lig < TEMPO_MIN || lig > TEMPO_MAX || des < TEMPO_MIN || des > TEMPO_MAX) {
    servidor.send(400, "application/json", "{\"erro\":\"tempos de 1 a 720 min\"}");
    return;
  }
  minLigada = lig; minDesligada = des;
  memoria.begin("timer", false);                 // grava na flash: sobrevive a falta de energia
  memoria.putUInt("lig", minLigada);
  memoria.putUInt("des", minDesligada);
  memoria.end();
  if (modo == AUTOMATICO) recomecar(true);       // o ciclo recomeca com os tempos novos
  rotaEstado();
}

void setup() {
  Serial.begin(115200);
  aplicarBomba();                                // nivel certo antes de o pino virar saida
  pinMode(PINO_RELE, OUTPUT);

  memoria.begin("timer", true);                  // true = so leitura
  minLigada = constrain(memoria.getUInt("lig", 15), TEMPO_MIN, TEMPO_MAX);
  minDesligada = constrain(memoria.getUInt("des", 15), TEMPO_MIN, TEMPO_MAX);
  memoria.end();

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);      // rede propria: nao depende do Wi-Fi da escola
  servidor.on("/", rotaPagina);
  servidor.on("/estado", rotaEstado);
  servidor.on("/modo", rotaModo);
  servidor.on("/tempos", rotaTempos);
  servidor.begin();

  Serial.printf("Rede \"%s\" (senha %s)  ->  abra http://%s\n",
                NOME_DA_REDE, SENHA_DA_REDE, WiFi.softAPIP().toString().c_str());
  Serial.printf("Timer: %u min ligada / %u min desligada\n", minLigada, minDesligada);
  recomecar(true);
}

void loop() {
  servidor.handleClient();                       // atende o celular e volta logo, sem travar
  unsigned long agora = millis();

  if (modo != AUTOMATICO && agora - inicioDoManual >= MANUAL_MAXIMO_MIN * MINUTO) {
    modo = AUTOMATICO;                           // manual esquecido: o timer reassume
    recomecar(true);
  }
  if (modo == AUTOMATICO) {
    unsigned long duracao = (bombaLigada ? minLigada : minDesligada) * MINUTO;
    if (agora - inicioDaFase >= duracao) recomecar(!bombaLigada);
  }
}
