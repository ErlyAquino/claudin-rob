/*
  03 - Semaforo SEM delay(): usando millis()
  Placa: Arduino Uno/Nano  (mesmas ligacoes do sketch 02)

  Problema do delay(): enquanto espera, o Arduino nao faz MAIS NADA (nao le botao,
  nao responde ao Wi-Fi...). Com millis() o programa "olha o relogio" e troca de
  fase quando chega a hora, sem travar. E assim que o semaforo vai funcionar no ESP32
  junto com a pagina web.

  Extra: um botao no pino 2 (INPUT_PULLUP, outro lado no GND) e um LED de pedestre
  no pino 7 sao opcionais - veja o Desafio 2.4.
*/
const int VERMELHO = 10, AMARELO = 9, VERDE = 8;

// tabela do ciclo: qual pino acende e por quanto tempo
const int FASE_PINO[]  = { VERDE, AMARELO, VERMELHO };
const unsigned long FASE_MS[] = { 4000, 1500, 4000 };
const int NUM_FASES = 3;

int faseAtual = 0;
unsigned long inicioFase = 0;

void mostrar(int cor) {
  digitalWrite(VERMELHO, cor == VERMELHO);
  digitalWrite(AMARELO,  cor == AMARELO);
  digitalWrite(VERDE,    cor == VERDE);
}

void setup() {
  pinMode(VERMELHO, OUTPUT); pinMode(AMARELO, OUTPUT); pinMode(VERDE, OUTPUT);
  Serial.begin(9600);
  mostrar(FASE_PINO[faseAtual]);
  inicioFase = millis();
}

void loop() {
  // ja passou o tempo desta fase? entao vai para a proxima (e volta ao 0 no fim)
  if (millis() - inicioFase >= FASE_MS[faseAtual]) {
    faseAtual = (faseAtual + 1) % NUM_FASES;
    mostrar(FASE_PINO[faseAtual]);
    inicioFase = millis();
    Serial.print("fase "); Serial.println(faseAtual);
  }
  // aqui o Arduino esta LIVRE para fazer outras coisas (ler botoes, sensores, Wi-Fi...)
}
