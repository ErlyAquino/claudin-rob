/*
  05d - Timer da bomba com hora certa: Arduino Uno + relogio DS3231 (ciclo de dia e de noite)
  Placa: Arduino Uno          Biblioteca: Wire (vem com o core).
  O DS3231 e lido direto pelo I2C, sem biblioteca propria.

  Ligacoes: rele como no 05b (S -> D7, + -> 5V, - -> GND; bomba pelo contato NF)
        DS3231 (modulo ZS-042, com bateria CR2032):  VCC -> 5V  GND -> GND  SDA -> A4  SCL -> A5

  De DIA_COMECA a NOITE_COMECA vale o ciclo do dia; no resto, o ciclo da noite.
  A decisao sai direto do relogio: minutos desde o comeco do periodo, divididos pelo tamanho
  do ciclo, olhando o resto da divisao.
  Por isso, depois de uma falta de energia o timer volta no ponto certo, sem guardar nada.
  Se o relogio nao responder ou estiver sem hora, a bomba fica LIGADA (lado seguro) e o Serial
  avisa.

  Comandos (Monitor Serial, 9600 baud, "Nova linha"):
     h 14:30   acerta o relogio        s   mostra a hora e o estado
*/
#include <Wire.h>

const int PINO_RELE = 7;
const bool RELE_ACIONA_EM_NIVEL_BAIXO = false;   // descubra com o sketch 05
const bool BOMBA_NO_CONTATO_NF = true;           // true: placa desligada = bomba ligada

const int DIA_COMECA = 6 * 60;                   // 06:00, em minutos desde a meia-noite
const int NOITE_COMECA = 18 * 60;                // 18:00
const int DIA_LIGADA = 15,   DIA_DESLIGADA = 15;     // minutos
const int NOITE_LIGADA = 15, NOITE_DESLIGADA = 105;  // minutos: 15 min a cada 2 h

const byte DS3231 = 0x68;                        // endereco I2C do relogio
bool bombaLigada = true, relogioOk = false;
int hora = 0, minuto = 0, segundo = 0;
unsigned long ultimaLeitura = 0, ultimoAviso = 0;

byte bcdParaDec(byte b) { return (b >> 4) * 10 + (b & 0x0F); }   // o DS3231 guarda 23 como 0x23
byte decParaBcd(byte d) { return ((d / 10) << 4) | (d % 10); }

bool lerRelogio() {
  Wire.beginTransmission(DS3231);
  Wire.write(0x00);                              // registrador 0: segundos; 1: minutos; 2: horas
  if (Wire.endTransmission() != 0) return false; // ninguem respondeu no endereco 0x68
  if (Wire.requestFrom(DS3231, (byte)3) != 3) return false;
  segundo = bcdParaDec(Wire.read() & 0x7F);
  minuto  = bcdParaDec(Wire.read() & 0x7F);
  hora    = bcdParaDec(Wire.read() & 0x3F);      // formato 24 h
  Wire.beginTransmission(DS3231);
  Wire.write(0x0F);                              // estado: bit 7 (OSF) = 1 se o relogio parou
  if (Wire.endTransmission() != 0) return false;
  if (Wire.requestFrom(DS3231, (byte)1) != 1) return false;
  bool parou = Wire.read() & 0x80;
  return !parou && hora < 24 && minuto < 60;
}

void acertarRelogio(int h, int m) {
  Wire.beginTransmission(DS3231);
  Wire.write(0x00);
  Wire.write(decParaBcd(0)); Wire.write(decParaBcd(m)); Wire.write(decParaBcd(h));
  Wire.endTransmission();
  Wire.beginTransmission(DS3231);                // apaga o aviso de "relogio parou"
  Wire.write(0x0F); Wire.write(0x00);
  Wire.endTransmission();
}

void aplicarBomba() {
  bool acionar = BOMBA_NO_CONTATO_NF ? !bombaLigada : bombaLigada;
  digitalWrite(PINO_RELE, acionar == RELE_ACIONA_EM_NIVEL_BAIXO ? LOW : HIGH);
  digitalWrite(LED_BUILTIN, bombaLigada ? HIGH : LOW);
}

bool deveLigar() {
  int agora = hora * 60 + minuto;                              // minutos desde a meia-noite
  bool dia = agora >= DIA_COMECA && agora < NOITE_COMECA;
  // minutos desde o comeco do periodo (a noite atravessa a meia-noite: dai o + 1440 e o resto)
  int desdeOComeco = dia ? agora - DIA_COMECA : (agora - NOITE_COMECA + 1440) % 1440;
  int ligada = dia ? DIA_LIGADA : NOITE_LIGADA;
  int ciclo = ligada + (dia ? DIA_DESLIGADA : NOITE_DESLIGADA);
  return desdeOComeco % ciclo < ligada;                        // o ciclo comeca ligado
}

void doisDigitos(int n) { if (n < 10) Serial.print('0'); Serial.print(n); }

void mostrar() {
  if (!relogioOk) {
    Serial.println("RELOGIO SEM HORA: bomba ligada direto. Acerte com  h HH:MM");
    return;
  }
  doisDigitos(hora); Serial.print(':'); doisDigitos(minuto); Serial.print(':');
  doisDigitos(segundo);
  int agora = hora * 60 + minuto;
  Serial.print(agora >= DIA_COMECA && agora < NOITE_COMECA ? "  dia    " : "  noite  ");
  Serial.println(bombaLigada ? "bomba LIGADA" : "bomba DESLIGADA");
}

void lerComando() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n'); cmd.trim();
  if (cmd.startsWith("h")) {
    int doisPontos = cmd.indexOf(':');
    int h = cmd.substring(1, doisPontos).toInt(), m = cmd.substring(doisPontos + 1).toInt();
    if (doisPontos > 0 && h >= 0 && h < 24 && m >= 0 && m < 60) {
      acertarRelogio(h, m);
      ultimaLeitura = 0;                         // forca uma leitura ja na proxima volta
      Serial.println("relogio acertado");
    }
    else Serial.println("use  h HH:MM  (exemplo: h 14:30)");
  } else if (cmd == "s") mostrar();
}

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50);
  Wire.begin();
  pinMode(LED_BUILTIN, OUTPUT);
  aplicarBomba();
  pinMode(PINO_RELE, OUTPUT);
  Serial.println("Timer da bomba com DS3231. Comandos:  h HH:MM   s");
}

void loop() {
  lerComando();
  unsigned long agora = millis();
  if (ultimaLeitura == 0 || agora - ultimaLeitura >= 1000) {   // le o relogio 1 vez por segundo
    ultimaLeitura = agora;
    relogioOk = lerRelogio();
    bool ligar = relogioOk ? deveLigar() : true;               // sem hora confiavel: ligada
    if (ligar != bombaLigada) { bombaLigada = ligar; aplicarBomba(); mostrar(); }
  }
  if (agora - ultimoAviso >= 10000) { ultimoAviso = agora; mostrar(); }
}
