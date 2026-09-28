/*
  08 - Servo de ROTACAO CONTINUA: controle de velocidade pelo pot + gravar/reproduzir por TEMPO
  Placa: Arduino Uno/Nano      Servo: SG90 "360" / FS90R / SG90 com engrenagem quebrada

  Num servo continuo nao existe "angulo": o pulso define VELOCIDADE e SENTIDO.
    1500 us = parado     < 1500 = gira para um lado     > 1500 = gira para o outro
  Por isso, em vez de gravar POSES, gravamos SEGMENTOS: (velocidade, duracao em ms).

  Modo manual: o pot controla a velocidade (centro = parado).
  Botao GRAVAR (pino 2): comeca/termina um segmento. Aperte, mova pelo tempo desejado, aperte de novo.
  Botao PLAY   (pino 3): reproduz todos os segmentos em sequencia (malha aberta: acumula erro!).
  Serial (9600):  g = gravar/terminar segmento   p = play   l = listar   x = apagar

  Ligacoes: servo laranja->9, vermelho->5V, marrom->GND | pot: GND, A0, 5V | botoes: pino->GND (INPUT_PULLUP)
*/
#include <Servo.h>

const int PINO_SERVO = 9, PINO_POT = A0, BTN_GRAVAR = 2, BTN_PLAY = 3;
const int PARADO = 1500;      // ajuste (ex.: 1480/1520) ate o servo ficar parado com o pot no centro
const int FAIXA = 200;        // 1300..1700 us
const int ZONA_MORTA = 25;

const int MAX_SEG = 20;
struct Segmento { int pulso; unsigned long ms; };
Segmento seg[MAX_SEG];
int numSeg = 0;

Servo servo;
bool gravando = false;
unsigned long inicioSeg = 0;
int pulsoAtual = PARADO;

int lerPot() {
  int pulso = map(analogRead(PINO_POT), 0, 1023, PARADO - FAIXA, PARADO + FAIXA);
  if (abs(pulso - PARADO) < ZONA_MORTA) pulso = PARADO;
  return pulso;
}

bool apertou(int pino) {
  static unsigned long ultimo[4] = {0};
  int i = pino - 2;
  if (digitalRead(pino) == LOW && millis() - ultimo[i] > 300) { ultimo[i] = millis(); return true; }
  return false;
}

void listar() {
  Serial.print(numSeg); Serial.println(" segmento(s):");
  for (int i = 0; i < numSeg; i++) {
    Serial.print("  #"); Serial.print(i + 1);
    Serial.print("  velocidade "); Serial.print((seg[i].pulso - PARADO) * 100 / FAIXA);
    Serial.print(" %  por "); Serial.print(seg[i].ms); Serial.println(" ms");
  }
}

void reproduzir() {
  Serial.println("PLAY");
  for (int i = 0; i < numSeg; i++) {
    servo.writeMicroseconds(seg[i].pulso);
    unsigned long t0 = millis();
    while (millis() - t0 < seg[i].ms) {
      if (apertou(BTN_PLAY) || (Serial.available() && Serial.read() == 'p')) { servo.writeMicroseconds(PARADO); Serial.println("PARADO"); return; }
    }
  }
  servo.writeMicroseconds(PARADO);
  Serial.println("fim do ciclo");
}

void alternarGravacao() {
  if (!gravando) {
    if (numSeg >= MAX_SEG) { Serial.println("Lista cheia!"); return; }
    gravando = true; inicioSeg = millis();
    seg[numSeg].pulso = pulsoAtual;           // velocidade no momento em que apertou
    Serial.print("Gravando segmento "); Serial.print(numSeg + 1); Serial.println("... (aperte de novo para terminar)");
  } else {
    seg[numSeg].ms = millis() - inicioSeg;
    numSeg++; gravando = false;
    Serial.println("Segmento gravado."); listar();
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(BTN_GRAVAR, INPUT_PULLUP); pinMode(BTN_PLAY, INPUT_PULLUP);
  servo.attach(PINO_SERVO);
  servo.writeMicroseconds(PARADO);
  Serial.println("g=gravar/terminar  p=play  l=listar  x=apagar");
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'g') alternarGravacao();
    if (c == 'p') reproduzir();
    if (c == 'l') listar();
    if (c == 'x') { numSeg = 0; gravando = false; Serial.println("Apagado."); }
  }
  if (apertou(BTN_GRAVAR)) alternarGravacao();
  if (apertou(BTN_PLAY)) reproduzir();

  // modo manual: pot -> velocidade. Durante a gravacao a velocidade fica fixa no valor inicial do segmento.
  if (!gravando) pulsoAtual = lerPot();
  servo.writeMicroseconds(pulsoAtual);

  static unsigned long ultimoPrint = 0;
  if (millis() - ultimoPrint > 250) {
    ultimoPrint = millis();
    Serial.print("velocidade = "); Serial.print((pulsoAtual - PARADO) * 100 / FAIXA); Serial.println(gravando ? " %  [GRAVANDO]" : " %");
  }
  delay(10);
}
