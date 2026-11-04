/*
  03 - Sensor de pressao HX710B + MPS20N0040D no Arduino Uno: pressao e NIVEL de agua
  Placa: Arduino Uno/Nano     Sem biblioteca: falamos o protocolo do HX710B com dois pinos

  Modulo (4 pinos):  VCC -> 5V    OUT -> pino 3    SCK -> pino 4    GND -> GND
  Mangueira: do bico do sensor ate um tubo com a ponta aberta mergulhado no reservatorio (tubo de bolha).
  O ar preso no tubo fica na mesma pressao da agua na ponta: P = rho x g x h (rho = 1000 kg/m3, g = 9,81 m/s2)
  -> cada 1 cm de coluna de agua = 98,1 Pa.  Faixa do sensor: 0-40 kPa = ate ~4 m de agua.

  Fisica: o MPS20N0040D tem uma MEMBRANA de silicio com 4 resistores piezorresistivos em PONTE DE WHEATSTONE.
  A pressao deforma a membrana, a resistencia muda e aparece uma tensao de poucos milivolts (ate ~50 mV).
  O HX710B e um conversor A/D de 24 BITS com amplificador (ganho 128): le esses milivolts e entrega um numero
  inteiro (complemento de 2, -8 388 608 a +8 388 607) por um protocolo serial simples:
    - OUT fica em 0 quando ha uma leitura pronta (10 por segundo)
    - a cada pulso em SCK sai 1 bit (24 bits, do mais significativo ao menos)
    - um 25o pulso diz "proxima leitura: entrada diferencial, 10 Hz" (26 = tensao DVDD-AVDD; 27 = diferencial a 40 Hz)
    - SCK em 1 por mais de 60 us coloca o chip em modo de descanso (power-down)

  Calibracao de 2 pontos (gravada na EEPROM):
    c0        tubo FORA da agua (pressao atmosferica) -> grava o ZERO
    c 20      ponta do tubo a 20 cm abaixo da superficie (meca com a regua) -> grava a sensibilidade (contagens/cm)
    r         volta ao padrao
  Saida (Plotter Serial): Contagem:123456 Pressao_Pa:1962 Nivel_cm:20.0
*/
#include <EEPROM.h>

const int PINO_OUT = 3, PINO_SCK = 4;
const float SENS_PADRAO = 50000.0;        // contagens por cm de agua (ordem de grandeza tipica; CALIBRE)
long zero = 0;                            // contagem com o tubo fora da agua
float sens = SENS_PADRAO;
const int N_MEDIA = 8;

long lerHX710B() {                        // devolve a contagem de 24 bits ou 0x7FFFFFFF se o modulo nao responder
  unsigned long t0 = millis();
  while (digitalRead(PINO_OUT) == HIGH) { if (millis() - t0 > 300) return 0x7FFFFFFF; }
  long v = 0;
  noInterrupts();                         // os pulsos nao podem ser interrompidos (SCK alto > 60 us = power-down)
  for (int i = 0; i < 24; i++) {
    digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);
    v = (v << 1) | digitalRead(PINO_OUT);
    digitalWrite(PINO_SCK, LOW);  delayMicroseconds(1);
  }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1); digitalWrite(PINO_SCK, LOW);   // 25o pulso
  interrupts();
  if (v & 0x800000L) v |= 0xFF000000L;    // estende o sinal: numero negativo em complemento de 2
  return v;
}

float lerMedia() {                        // media de N leituras (10 por segundo -> ~0,8 s)
  float soma = 0; int ok = 0;
  for (int i = 0; i < N_MEDIA; i++) { long v = lerHX710B(); if (v != 0x7FFFFFFF) { soma += v; ok++; } }
  return ok ? soma / ok : NAN;
}

void salvar()   { EEPROM.put(12, zero); EEPROM.put(16, sens); }
void carregar() { long z; float s; EEPROM.get(12, z); EEPROM.get(16, s); if (z != -1 && z > -8000000L && z < 8000000L) zero = z; /* -1 = EEPROM virgem */ if (!isnan(s) && s > 100 && s < 1e7) sens = s; }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  pinMode(PINO_OUT, INPUT); pinMode(PINO_SCK, OUTPUT); digitalWrite(PINO_SCK, LOW);
  carregar();
  Serial.println(F("HX710B. Comandos: c0 (tubo fora da agua)   c <cm> (tubo a <cm> de profundidade)   r"));
  Serial.print(F("zero = ")); Serial.print(zero); Serial.print(F("   sens = ")); Serial.print(sens, 0); Serial.println(F(" contagens/cm"));
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "c0") { float m = lerMedia(); if (!isnan(m)) { zero = (long)m; salvar(); Serial.print(F("zero gravado: ")); Serial.println(zero); } }
    else if (cmd.startsWith("c ")) {
      float cm = cmd.substring(2).toFloat(); float m = lerMedia();
      if (cm > 0 && !isnan(m) && fabs(m - zero) > 100) { sens = (m - zero) / cm; salvar(); Serial.print(F("sensibilidade gravada: ")); Serial.print(sens, 1); Serial.println(F(" contagens/cm")); }
      else Serial.println(F("use c <cm> com o tubo mergulhado (e o zero ja gravado)"));
    }
    else if (cmd == "r") { zero = 0; sens = SENS_PADRAO; salvar(); Serial.println(F("padrao restaurado: faca c0 e c <cm>")); }
  }
  float m = lerMedia();
  if (isnan(m)) { Serial.println(F("HX710B nao responde: confira OUT, SCK e a alimentacao")); delay(500); return; }
  float nivelCm = (m - zero) / sens;
  float pressaoPa = nivelCm * 98.1;                   // rho g h com h em cm
  Serial.print(F("Contagem:")); Serial.print((long)m);
  Serial.print(F(" Pressao_Pa:")); Serial.print(pressaoPa, 0);
  Serial.print(F(" Nivel_cm:")); Serial.println(nivelCm, 1);
}
