/*
  03 - Mini projeto: alarme de re (sensor de estacionamento)
  Placa: Arduino Uno/Nano

  Ligacoes:
    HC-SR04: VCC 5V, GND, TRIG 9, ECHO 10
    Buzzer (MH-FMD): S -> 8
    LED RGB catodo comum: R -> 220 -> 5(~)   G -> 220 -> 6(~)   B -> 220 -> 3(~)   comum -> GND

  Comportamento (igual ao de um caminhao):
    > 100 cm : verde, silencio
    60..100  : amarelo, bipe lento
    30..60   : laranja, bipe rapido
    < 30     : vermelho, bipe continuo
  Tudo SEM delay() longo: o bipe usa millis(), assim a distancia continua sendo lida
  enquanto o buzzer toca - o alarme reage na hora.
*/
const int TRIG = 9, ECHO = 10, BUZZER = 8;
const int PINO_R = 5, PINO_G = 6, PINO_B = 3;

// tabela de faixas: limite (cm), cor (r,g,b), intervalo do bipe (ms; 0 = continuo; -1 = silencio)
const int   LIMITE[]    = { 100, 60, 30, 0 };
const int   COR[][3]    = { {0,255,0}, {255,150,0}, {255,40,0}, {255,0,0} };
const int   INTERVALO[] = { -1, 600, 250, 0 };

float lerDistancia() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 30000);
  return (t == 0) ? 999 : t * 0.0343 / 2.0;    // sem eco = "muito longe"
}

int faixaDe(float d) {                            // devolve 0..3
  for (int i = 0; i < 3; i++) if (d > LIMITE[i]) return i;
  return 3;
}

void cor(int r, int g, int b) { analogWrite(PINO_R, r); analogWrite(PINO_G, g); analogWrite(PINO_B, b); }

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); pinMode(BUZZER, OUTPUT);
  pinMode(PINO_R, OUTPUT); pinMode(PINO_G, OUTPUT); pinMode(PINO_B, OUTPUT);
}

unsigned long ultimaMedida = 0, ultimoBipe = 0;
bool bipando = false;
int faixa = 0;

void loop() {
  // 1) mede a cada 60 ms (nao mais rapido: o sensor precisa desse tempo)
  if (millis() - ultimaMedida >= 60) {
    ultimaMedida = millis();
    float d = lerDistancia();
    faixa = faixaDe(d);
    cor(COR[faixa][0], COR[faixa][1], COR[faixa][2]);
    Serial.print(d, 0); Serial.print(" cm  faixa "); Serial.println(faixa);
  }

  // 2) buzzer conforme a faixa, sem travar
  int intervalo = INTERVALO[faixa];
  if (intervalo < 0) { noTone(BUZZER); bipando = false; }            // silencio
  else if (intervalo == 0) { tone(BUZZER, 2000); }                    // continuo
  else if (millis() - ultimoBipe >= (unsigned long)intervalo) {       // bipe intermitente
    ultimoBipe = millis();
    bipando = !bipando;
    if (bipando) tone(BUZZER, 2000); else noTone(BUZZER);
  }
}
