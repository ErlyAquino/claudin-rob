/*
  02 - Semaforo com 3 LEDs
  Placa: Arduino Uno/Nano

  Ligacoes (cada LED com seu resistor de 220 ohms no anodo, catodos no GND):
    pino 10 -> vermelho     pino 9 -> amarelo     pino 8 -> verde

  O que aprender: varias saidas, constantes com nome, e FUNCOES para nao
  repetir codigo. Um semaforo e uma "maquina de estados": verde -> amarelo
  -> vermelho -> verde...
*/
const int VERMELHO = 10;
const int AMARELO  = 9;
const int VERDE    = 8;

// tempos de cada fase (ms) - mexa aqui!
const int T_VERDE    = 4000;
const int T_AMARELO  = 1500;
const int T_VERMELHO = 4000;

// acende SO a cor pedida e apaga as outras
void mostrar(int cor) {
  digitalWrite(VERMELHO, cor == VERMELHO);   // true vira HIGH, false vira LOW
  digitalWrite(AMARELO,  cor == AMARELO);
  digitalWrite(VERDE,    cor == VERDE);
}

void setup() {
  pinMode(VERMELHO, OUTPUT);
  pinMode(AMARELO, OUTPUT);
  pinMode(VERDE, OUTPUT);
}

void loop() {
  mostrar(VERDE);     delay(T_VERDE);
  mostrar(AMARELO);   delay(T_AMARELO);
  mostrar(VERMELHO);  delay(T_VERMELHO);
}
