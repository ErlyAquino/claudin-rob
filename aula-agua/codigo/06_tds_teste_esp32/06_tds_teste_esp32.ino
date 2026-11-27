/*
  06 - Sensor de condutividade "TDS Meter V1.0": primeiro teste no ESP32
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)        Sem biblioteca

  Ligacoes (a ordem dos pinos esta escrita na placa do sensor:  -  +  A):
    -  -> GND
    +  -> 3V3
    A  -> GPIO 34   (entrada analogica do ADC1; a saida vai de 0 a 2,3 V: nao precisa de divisor)
  So a SONDA vai na agua. A placa azul e o conector nao sao a prova d'agua.

  O que aparece no Monitor Serial (115200 baud), uma linha por segundo:
    tensao no pino, condutividade (CE) em uS/cm e em mS/cm, e o TDS em ppm.
  Este teste supoe a agua a 25 C. O sketch 06b mede a temperatura e corrige.
*/
const int PINO_TDS = 34;            // ADC1: continua funcionando com o Wi-Fi ligado
const float FATOR_K = 1.0;          // fator da calibracao; 1.0 = sem calibrar
const float TEMPERATURA = 25.0;     // temperatura da agua, em C (medida com um termometro)
const float FATOR_TDS = 0.5;        // ppm = CE (uS/cm) x 0,5: a escala dos medidores "de NaCl"

// Tensao media no pino, em volts. Le 30 vezes, ordena e despreza as 5 menores e as 5 maiores.
float lerTensao() {
  const int N = 30;
  int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINO_TDS); delay(10); }
  for (int i = 0; i < N - 1; i++)
    for (int j = 0; j < N - 1 - i; j++)
      if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0;
  for (int i = 5; i < N - 5; i++) soma += v[i];
  return soma / float(N - 10) / 1000.0;
}

// Curva do fabricante do modulo: tensao (V) -> condutividade (uS/cm), sem a temperatura.
float curvaDoModulo(float v) {
  return 133.42 * v * v * v - 255.86 * v * v + 857.39 * v;
}

void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PINO_TDS, ADC_11db);   // faixa do ADC ate cerca de 3,1 V
  Serial.println("TDS Meter V1.0 - teste. Sonda mergulhada, longe das paredes do copo.");
}

void loop() {
  float tensao = lerTensao();
  float ce = curvaDoModulo(tensao) * FATOR_K;                // CE na temperatura da agua
  float ce25 = ce / (1.0 + 0.02 * (TEMPERATURA - 25.0));     // referida a 25 C: 2 % por grau
  float tds = ce25 * FATOR_TDS;

  Serial.printf("tensao: %.3f V   CE: %.0f uS/cm = %.2f mS/cm   TDS: %.0f ppm",
                tensao, ce25, ce25 / 1000.0, tds);
  // Abaixo de 0,15 V o ADC do ESP32 nao distingue as tensoes; acima de 2,2 V e o fim da escala.
  if (tensao < 0.16)      Serial.print("   <- sonda no ar ou agua quase sem sais");
  else if (tensao > 2.2)  Serial.print("   <- fim da escala: o valor real pode ser maior");
  Serial.println();
  delay(700);
}
