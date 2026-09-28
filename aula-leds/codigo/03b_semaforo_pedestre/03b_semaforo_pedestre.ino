/*
  03b - Semaforo com botao de pedestre (sem delay!)
  Placa: Arduino Uno/Nano

  Ligacoes: LEDs iguais ao sketch 02 (10 vermelho, 9 amarelo, 8 verde)
            Botao de pedestre: pino 2 <-> GND (INPUT_PULLUP)

  Regra: quando alguem aperta o botao, o semaforo termina a fase atual,
  passa pelo amarelo e fica no VERMELHO por um tempo extra (pedestre atravessa).
  So funciona sem travar porque usamos millis() em vez de delay().
*/
const int VERMELHO = 10, AMARELO = 9, VERDE = 8, BOTAO = 2;

const int FASE_PINO[] = { VERDE, AMARELO, VERMELHO };
const unsigned long FASE_MS[] = { 4000, 1500, 4000 };
const unsigned long T_PEDESTRE = 6000;   // vermelho mais longo quando pedido

int faseAtual = 0;
unsigned long inicioFase = 0;
bool pedidoPedestre = false;

void mostrar(int cor) {
  digitalWrite(VERMELHO, cor == VERMELHO);
  digitalWrite(AMARELO,  cor == AMARELO);
  digitalWrite(VERDE,    cor == VERDE);
}

void setup() {
  pinMode(VERMELHO, OUTPUT); pinMode(AMARELO, OUTPUT); pinMode(VERDE, OUTPUT);
  pinMode(BOTAO, INPUT_PULLUP);
  Serial.begin(9600);
  mostrar(FASE_PINO[0]); inicioFase = millis();
}

void loop() {
  // 1) o botao pode ser lido A QUALQUER MOMENTO, porque nao ha delay()
  if (digitalRead(BOTAO) == LOW && !pedidoPedestre) {
    pedidoPedestre = true;
    Serial.println("Pedestre pediu para atravessar");
  }

  // 2) quanto dura a fase atual? no vermelho, se houve pedido, dura mais
  unsigned long duracao = FASE_MS[faseAtual];
  if (faseAtual == 2 && pedidoPedestre) duracao = T_PEDESTRE;

  // 3) no verde, um pedido encurta a fase (vai logo para o amarelo)
  if (faseAtual == 0 && pedidoPedestre && millis() - inicioFase > 1000) duracao = 1000;

  if (millis() - inicioFase >= duracao) {
    if (faseAtual == 2) pedidoPedestre = false;   // pedido atendido ao sair do vermelho
    faseAtual = (faseAtual + 1) % 3;
    mostrar(FASE_PINO[faseAtual]);
    inicioFase = millis();
  }
}
