/*
  04b - LED RGB controlado por potenciometro (cor) e botao (modo)
  Placa: Arduino Uno/Nano

  Ligacoes: RGB igual ao sketch 04 (R->9, G->10, B->11, comum->GND, resistores 220)
            Potenciometro 10k: pontas em 5V e GND, meio em A0
            Botao: pino 2 <-> GND (INPUT_PULLUP)

  O potenciometro escolhe a COR (girando pelo arco-iris) e o botao troca o MODO:
    modo 0: cor fixa escolhida pelo pot
    modo 1: pot controla o BRILHO do branco
    modo 2: arco-iris automatico (pot controla a velocidade)

  O que aprender: analogRead + map, funcao que converte "matiz" (0..767) em R,G,B,
  e uma variavel de MODO para o mesmo hardware fazer coisas diferentes.
*/
const int PINO_R = 9, PINO_G = 10, PINO_B = 11, PINO_POT = A0, BOTAO = 2;
int modo = 0;
bool botaoAntes = HIGH;

void cor(int r, int g, int b) { analogWrite(PINO_R, r); analogWrite(PINO_G, g); analogWrite(PINO_B, b); }

// matiz de 0 a 767: vermelho -> verde -> azul -> vermelho
void corPorMatiz(int h) {
  h = h % 768;
  if (h < 256)       cor(255 - h, h, 0);
  else if (h < 512)  cor(0, 511 - h, h - 256);
  else               cor(h - 512, 0, 767 - h);
}

void setup() {
  pinMode(PINO_R, OUTPUT); pinMode(PINO_G, OUTPUT); pinMode(PINO_B, OUTPUT);
  pinMode(BOTAO, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  // botao troca de modo (na borda, com debounce)
  bool botaoAgora = digitalRead(BOTAO);
  if (botaoAntes == HIGH && botaoAgora == LOW) {
    modo = (modo + 1) % 3;
    Serial.print("modo "); Serial.println(modo);
    delay(50);
  }
  botaoAntes = botaoAgora;

  int pot = analogRead(PINO_POT);                 // 0..1023

  if (modo == 0) {
    corPorMatiz(map(pot, 0, 1023, 0, 767));       // pot escolhe a cor
  } else if (modo == 1) {
    int brilho = map(pot, 0, 1023, 0, 255);       // pot escolhe o brilho do branco
    cor(brilho, brilho, brilho);
  } else {
    int velocidade = map(pot, 0, 1023, 1, 40);    // pot escolhe a velocidade
    corPorMatiz((millis() / 10) * velocidade / 10);
  }
  delay(10);
}
