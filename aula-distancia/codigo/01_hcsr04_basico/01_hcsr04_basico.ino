/*
  01 - HC-SR04: medindo distancia com som
  Placa: Arduino Uno/Nano

  Ligacoes do HC-SR04:
    VCC  -> 5V        GND  -> GND
    TRIG -> pino 9    ECHO -> pino 10

  Como funciona (fisica):
    1. Mandamos um pulso de 10 us no TRIG.
    2. O sensor emite 8 "cliques" ultrassonicos de 40 kHz (inaudiveis).
    3. O pino ECHO fica em HIGH ate o eco voltar. pulseIn() mede esse tempo em microssegundos.
    4. O som anda a ~343 m/s = 0,0343 cm/us. O tempo medido e de IDA E VOLTA, entao:
          distancia (cm) = tempo (us) * 0,0343 / 2  =  tempo / 58,3
       E uma regra de tres: 58,3 us  <->  1 cm.
*/
const int TRIG = 9;
const int ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  digitalWrite(TRIG, LOW);
}

void loop() {
  // 1) pulso de disparo: LOW limpo, depois HIGH por 10 us
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // 2) mede quanto tempo o ECHO fica em HIGH (timeout de 30 ms = ~5 m)
  unsigned long tempo = pulseIn(ECHO, HIGH, 30000);

  // 3) converte tempo em distancia
  float distancia = tempo * 0.0343 / 2.0;     // cm

  Serial.print("tempo = ");
  Serial.print(tempo);
  Serial.print(" us   ->   distancia = ");
  if (tempo == 0) Serial.println("fora de alcance");
  else { Serial.print(distancia, 1); Serial.println(" cm"); }

  delay(100);   // o fabricante pede >= 60 ms entre medicoes (para o eco anterior "morrer")
}
