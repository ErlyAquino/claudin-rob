/*
  01b - Leitura filtrada e saida em CSV (para o Plotter Serial e para o Python)
  Placa: Arduino Uno/Nano  -  mesmas ligacoes do sketch 01

  Duas melhorias:
    a) FILTRO DE MEDIANA: faz 5 leituras e usa a do meio. Uma leitura "louca"
       (eco perdido, ruido) nao passa. Media nao resolveria: um valor absurdo puxa a media.
    b) FORMATO: imprime "tempo_ms,distancia_cm" por linha. E um CSV - o Plotter Serial
       da IDE desenha na hora, e o Python le com um split(",").
*/
const int TRIG = 9, ECHO = 10;
const int N = 5;                       // leituras por medicao (impar!)

float lerUmaVez() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 30000);
  if (t == 0) return -1;               // sem eco
  return t * 0.0343 / 2.0;
}

float lerMediana() {
  float v[N];
  for (int i = 0; i < N; i++) { v[i] = lerUmaVez(); delay(15); }
  // ordena (bubble sort: pequeno e suficiente para 5 valores)
  for (int i = 0; i < N - 1; i++)
    for (int j = 0; j < N - 1 - i; j++)
      if (v[j] > v[j + 1]) { float tmp = v[j]; v[j] = v[j + 1]; v[j + 1] = tmp; }
  return v[N / 2];                     // o do meio
}

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  Serial.println("tempo_ms,distancia_cm");   // cabecalho do CSV
}

void loop() {
  float d = lerMediana();
  Serial.print(millis());
  Serial.print(",");
  Serial.println(d, 1);                // -1.0 significa "fora de alcance"
}
