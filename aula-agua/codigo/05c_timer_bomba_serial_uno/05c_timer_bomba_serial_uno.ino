/*
  05c - Timer da bomba no Arduino Uno: tempos ajustaveis pelo Monitor Serial, guardados na EEPROM
  Placa: Arduino Uno          Biblioteca: EEPROM (vem com o core)

  Ligacoes: as mesmas do 05b (S -> D7, + -> 5V, - -> GND; bomba pelo contato NF).

  Comandos (Monitor Serial, 9600 baud, "Nova linha"):
     l 15   tempo LIGADA, em minutos (1 a 720)      d 30   tempo DESLIGADA, em minutos (1 a 720)
     a      modo automatico (o timer manda)         1 / 0  liga / desliga a bomba na mao
     s      mostra a configuracao                   r      volta aos tempos de fabrica (15 / 15)
  O modo manual volta sozinho para o automatico depois de MANUAL_MAXIMO:
  ninguem esquece a bomba parada.
  Os tempos ficam gravados: depois de configurado, o Uno trabalha sozinho, so com a fonte.
*/
#include <EEPROM.h>

const int PINO_RELE = 7;
const bool RELE_ACIONA_EM_NIVEL_BAIXO = false;   // descubra com o sketch 05
const bool BOMBA_NO_CONTATO_NF = true;           // true: placa desligada = bomba ligada

const unsigned long MINUTO = 60000UL;            // para ensaiar: 1000UL (minutos viram segundos)
const unsigned long MANUAL_MAXIMO = 30 * MINUTO;
const unsigned int MIN_PADRAO_LIGADA = 15, MIN_PADRAO_DESLIGADA = 15;

struct Config { unsigned int marca; unsigned int ligada; unsigned int desligada; };
const unsigned int MARCA = 0xB0B5;               // EEPROM sem esta marca = nunca foi gravada
Config cfg;

enum Modo { AUTOMATICO, MANUAL_LIGADA, MANUAL_DESLIGADA };
Modo modo = AUTOMATICO;
bool bombaLigada = true;
unsigned long inicioDaFase = 0, inicioDoManual = 0, ultimoAviso = 0;

void aplicarBomba() {
  bool acionar = BOMBA_NO_CONTATO_NF ? !bombaLigada : bombaLigada;
  digitalWrite(PINO_RELE, acionar == RELE_ACIONA_EM_NIVEL_BAIXO ? LOW : HIGH);
  digitalWrite(LED_BUILTIN, bombaLigada ? HIGH : LOW);
}

void carregar() {
  EEPROM.get(0, cfg);
  bool valida = cfg.marca == MARCA && cfg.ligada >= 1 && cfg.ligada <= 720
                && cfg.desligada >= 1 && cfg.desligada <= 720;
  if (!valida) cfg = { MARCA, MIN_PADRAO_LIGADA, MIN_PADRAO_DESLIGADA };
}
void salvar() { EEPROM.put(0, cfg); }            // put() so regrava os bytes que mudaram

void mostrar() {
  Serial.print("ligada "); Serial.print(cfg.ligada);
  Serial.print(" min / desligada "); Serial.print(cfg.desligada);
  Serial.print(" min   modo: ");
  if (modo == AUTOMATICO) Serial.println("automatico");
  else Serial.println(modo == MANUAL_LIGADA ? "MANUAL ligada" : "MANUAL desligada");
}

void recomecar(bool ligada) {                    // comeca uma fase nova a partir de agora
  bombaLigada = ligada;
  inicioDaFase = millis();
  aplicarBomba();
}

void lerComando() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n'); cmd.trim();
  if (cmd.length() == 0) return;
  char c = cmd.charAt(0);
  long n = cmd.substring(1).toInt();
  if ((c == 'l' || c == 'd') && n >= 1 && n <= 720) {
    if (c == 'l') cfg.ligada = n; else cfg.desligada = n;
    salvar();
    if (modo == AUTOMATICO) recomecar(true);     // o ciclo recomeca, ja com os tempos novos
  }
  else if (c == 'l' || c == 'd') { Serial.println("use 1 a 720 min, exemplo:  l 15"); return; }
  else if (c == 'a') { modo = AUTOMATICO; recomecar(true); }
  else if (c == '1') { modo = MANUAL_LIGADA;    inicioDoManual = millis(); recomecar(true); }
  else if (c == '0') { modo = MANUAL_DESLIGADA; inicioDoManual = millis(); recomecar(false); }
  else if (c == 'r') {
    cfg = { MARCA, MIN_PADRAO_LIGADA, MIN_PADRAO_DESLIGADA }; salvar();
    modo = AUTOMATICO; recomecar(true);
  }
  else if (c != 's') { Serial.println("comandos: l <min>  d <min>  a  1  0  s  r"); return; }
  mostrar();
}

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50);                         // sem isto, readStringUntil espera 1 s
  pinMode(LED_BUILTIN, OUTPUT);
  carregar();
  aplicarBomba();
  pinMode(PINO_RELE, OUTPUT);
  inicioDaFase = millis();
  Serial.println("Timer da bomba. Comandos: l <min>  d <min>  a  1  0  s  r");
  mostrar();
}

void loop() {
  lerComando();
  unsigned long agora = millis();

  if (modo != AUTOMATICO && agora - inicioDoManual >= MANUAL_MAXIMO) {
    modo = AUTOMATICO; recomecar(true);
    Serial.println("manual expirou: de volta ao automatico");
  }

  if (modo == AUTOMATICO) {
    unsigned long duracao = (bombaLigada ? cfg.ligada : cfg.desligada) * MINUTO;
    if (agora - inicioDaFase >= duracao) recomecar(!bombaLigada);
  }

  if (agora - ultimoAviso >= 5000) {             // uma linha a cada 5 s
    ultimoAviso = agora;
    Serial.print(bombaLigada ? "bomba LIGADA" : "bomba DESLIGADA");
    if (modo == AUTOMATICO) {
      unsigned long duracao = (bombaLigada ? cfg.ligada : cfg.desligada) * MINUTO;
      unsigned long falta = (duracao - (agora - inicioDaFase)) / 1000;
      Serial.print("  troca em "); Serial.print(falta / 60); Serial.print(" min ");
      Serial.print(falta % 60); Serial.println(" s");
    } else Serial.println("  (manual)");
  }
}
