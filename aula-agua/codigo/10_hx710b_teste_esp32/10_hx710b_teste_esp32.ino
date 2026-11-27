/*
  10 - Sensor de pressao HX710B + MPS20N0040D (0 a 40 kPa): primeiro teste no ESP32
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)        Sem biblioteca

  Ligacoes (os nomes estao escritos na placa do sensor:  VCC  OUT  SCK  GND):
    VCC -> 3V3      (em 3,3 V o OUT ja sai no nivel do ESP32: nao precisa de divisor)
    OUT -> GPIO 18  (dados: o sensor avisa que tem leitura pronta e manda os bits)
    SCK -> GPIO 19  (relogio: o ESP32 da um pulso para cada bit)
    GND -> GND
  A mangueira vai do bico do sensor ate um tubo de ponta aberta, mergulhado na agua.
  O SENSOR NAO VAI NA AGUA: fica acima do nivel maximo, com a mangueira descendo.

  O que aparece no Monitor Serial (115200 baud), duas linhas por segundo:
    a leitura bruta (contagens), a diferenca para o zero, a pressao e a coluna de agua.
  Ao ligar, o programa toma como ZERO a leitura daquele momento: ligue com a ponta do tubo
  FORA da agua. Para zerar de novo, mande a letra z pelo Monitor Serial.
*/
const int PINO_OUT = 18;
const int PINO_SCK = 19;

// Quantas contagens o numero sobe para cada centimetro de agua. E so um chute para o
// primeiro teste: o valor certo de cada sensor sai da calibracao (sketch 10b).
const float CONTAGENS_POR_CM = 50000.0;
const float PA_POR_CM = 97.8;        // rho x g x 1 cm = 997 x 9,81 x 0,01 (agua a 25 C)
const long SEM_RESPOSTA = 0x7FFFFFFF;

long zero = 0;
portMUX_TYPE trava = portMUX_INITIALIZER_UNLOCKED;

// Uma leitura do HX710B: 24 bits, do mais significativo para o menos, em complemento de 2.
long lerHX710B() {
  unsigned long inicio = millis();
  while (digitalRead(PINO_OUT) == HIGH) {            // OUT em 0 = leitura pronta
    if (millis() - inicio > 300) return SEM_RESPOSTA;
    delay(1);
  }
  long valor = 0;
  portENTER_CRITICAL(&trava);                        // sem interrupcoes: SCK em 1 por mais de
  for (int i = 0; i < 24; i++) {                     // 60 us faria o chip dormir no meio
    digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);
    valor = (valor << 1) | digitalRead(PINO_OUT);
    digitalWrite(PINO_SCK, LOW); delayMicroseconds(1);
  }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);   // 25o pulso: a proxima leitura sera da
  digitalWrite(PINO_SCK, LOW);                          // entrada do sensor, a 10 por segundo
  portEXIT_CRITICAL(&trava);
  if (valor & 0x800000L) valor |= 0xFF000000L;       // bit 23 ligado = numero negativo
  return valor;
}

// Mediana de 5 leituras: ordena e fica com a do meio. Um pico isolado nao passa.
long lerMediana() {
  long v[5];
  for (int i = 0; i < 5; i++) {
    v[i] = lerHX710B();
    if (v[i] == SEM_RESPOSTA) return SEM_RESPOSTA;
  }
  for (int i = 0; i < 4; i++)
    for (int j = 0; j < 4 - i; j++)
      if (v[j] > v[j + 1]) { long t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  return v[2];
}

void zerar() {
  long z = lerMediana();
  if (z == SEM_RESPOSTA) {
    Serial.println("Sem resposta do HX710B: confira os quatro fios.");
    return;
  }
  zero = z;
  Serial.printf("Zero = %ld contagens (ponta do tubo fora da agua).\n", zero);
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_OUT, INPUT);
  pinMode(PINO_SCK, OUTPUT);
  digitalWrite(PINO_SCK, LOW);                       // SCK em 0: chip acordado
  delay(500);
  Serial.println("HX710B + MPS20N0040D - teste. Mande z para zerar (tubo fora da agua).");
  lerMediana();                                      // a primeira leitura e descartada
  zerar();
}

void loop() {
  if (Serial.available() && Serial.read() == 'z') zerar();

  long bruto = lerMediana();
  if (bruto == SEM_RESPOSTA) {
    Serial.println("Sem resposta do HX710B: confira VCC, GND, OUT (GPIO 18) e SCK (GPIO 19).");
    delay(1000);
    return;
  }
  long diferenca = bruto - zero;
  float cm = diferenca / CONTAGENS_POR_CM;
  Serial.printf("bruto: %9ld   diferenca: %8ld   coluna: %6.1f cm   pressao: %6.0f Pa",
                bruto, diferenca, cm, cm * PA_POR_CM);
  if (bruto >= 8388607L || bruto <= -8388608L) Serial.print("   <- fim da escala do conversor");
  Serial.println();
}
