/*
  04 - Teste do modulo MQ-135 (qualidade do ar: NH3, alcool, benzeno, fumaca, CO2 estimado)
  Placa: Arduino Uno/Nano     Bibliotecas: nenhuma (fazemos a conta nos mesmos moldes da telemetria-cria)

  Modulo de 4 pinos:  VCC -> 5V   GND -> GND   AO -> A0   DO -> pino 3 (opcional)
  O aquecedor puxa ~150 mA: pela USB funciona para UM sensor; para varios, use fonte 5 V externa.

  Como funciona: o elemento de SnO2 aquecido tem resistencia Rs. Gas redutor -> Rs CAI -> a tensao
  em AO SOBE. O modulo tem um resistor de carga RL (leia na placa: "102" = 1 k, "103" = 10 k):
        Rs = RL * (Vc - Vao) / Vao
  R0 = Rs medido por NOS em ar limpo, depois do aquecimento. A razao Rs/R0 fica perto de 1 no ar
  limpo e cai com gas - e exatamente o que o projeto "ar" da telemetria-cria publica (unidade Rs/R0).
  A estimativa em ppm usa a curva da folha de dados e serve so como ordem de grandeza.
  ATENCAO: o MQ-135 NAO mede CO2 de verdade - ele reage a varios gases ao mesmo tempo. O "CO2"
  dele e um chute pela curva (+400 ppm de base). Na aula 5 comparamos com o MH-Z19B (NDIR), que mede.

  Passos do teste (Monitor Serial 115200 baud):
   1. Ligue e espere o PRE-AQUECIMENTO (contagem regressiva). Sensor novo: deixe 24-48 h ligado antes.
   2. Se R0_KOHM = 0, o sketch mede o R0 sozinho por 30 s - FACA ISSO EM AR LIMPO (janela aberta).
      Anote o valor mostrado e escreva em R0_KOHM para nao precisar recalibrar a cada vez.
   3. Teste: bafo (CO2 + umidade), alcool num algodao ou vinagre a 10 cm. Rs/R0 deve cair.
*/

const int PINO_AO = A0;
const int PINO_DO = 3;
const float VC = 5.0;               // tensao do modulo (meca com o multimetro e corrija)
const float RL_KOHM = 1.0;          // resistor de carga do modulo
float R0_KOHM = 0.0;                // 0 = calibrar ao ligar; depois escreva aqui o valor medido
const unsigned long PREAQUECIMENTO_S = 600;   // 10 min: o R0 so vale com o sensor estabilizado
const float FATOR_AR_LIMPO = 3.6;   // Rs/R0 da folha de dados no ar limpo
const float CURVA_A = 110.47, CURVA_B = -2.862;   // ppm = A * (Rs/R0_folha)^B  (CO2)
const float LIMIAR_RAZAO = 0.7;     // Rs/R0 abaixo disso: "ar alterado" (ajuste na sua sala)

// Le AO 20 vezes e devolve a tensao media (V); o ADC do Uno tem 10 bits (0-1023)
float tensaoAO() {
  long soma = 0;
  for (int i = 0; i < 20; i++) { soma += analogRead(PINO_AO); delay(2); }
  return (soma / 20.0) * VC / 1023.0;
}

// Rs em kOhm; devolve -1 se a tensao estiver fora da faixa (sensor desligado ou saturado)
float resistenciaSensor(float v) {
  if (v < 0.02 || v > VC - 0.02) return -1;
  return RL_KOHM * (VC - v) / v;
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_DO, INPUT);
  Serial.println(F("# Teste do MQ-135 - pre-aquecendo (o sensor esquenta: nao encoste)"));
  for (unsigned long s = PREAQUECIMENTO_S; s > 0; s--) {
    if (s % 15 == 0 || s <= 5) { Serial.print(F("# faltam ")); Serial.print(s); Serial.print(F(" s   AO = ")); Serial.print(tensaoAO(), 2); Serial.println(F(" V")); }
    delay(1000);
  }
  if (R0_KOHM <= 0) {
    Serial.println(F("# Medindo R0 por 30 s - mantenha o sensor em AR LIMPO..."));
    float soma = 0; int n = 0;
    for (int i = 0; i < 30; i++) {
      float rs = resistenciaSensor(tensaoAO());
      if (rs > 0) { soma += rs; n++; }
      delay(1000);
    }
    if (n == 0) { Serial.println(F("# ERRO: AO fora da faixa. Confira VCC/GND/AO e reinicie.")); while (true) {} }
    R0_KOHM = soma / n;
    Serial.print(F("# R0 = ")); Serial.print(R0_KOHM, 2);
    Serial.println(F(" kOhm  -> escreva esse valor em R0_KOHM no codigo"));
  }
  Serial.println(F("# AO_V, Rs_kOhm, Rs/R0, CO2_ppm_estimado, DO (0 = passou do limiar do trimpot)"));
}

void loop() {
  float v = tensaoAO();
  float rs = resistenciaSensor(v);
  if (rs < 0) {
    Serial.print(F("# AO = ")); Serial.print(v, 2); Serial.println(F(" V fora da faixa: sensor desligado ou saturado"));
    delay(1000);
    return;
  }
  float razao = rs / R0_KOHM;
  float ppm = CURVA_A * pow(razao * FATOR_AR_LIMPO, CURVA_B) + 400;
  int digital = digitalRead(PINO_DO);

  Serial.print(F("AO_V:"));     Serial.print(v, 3);
  Serial.print(F(" Rs_kOhm:")); Serial.print(rs, 2);
  Serial.print(F(" Rs/R0:"));   Serial.print(razao, 3);
  Serial.print(F(" CO2_ppm:"));   Serial.print(ppm, 0);
  Serial.print(F(" DO:"));      Serial.print(digital);
  if (razao < LIMIAR_RAZAO) Serial.print(F("  <<< AR ALTERADO"));
  Serial.println();
  delay(1000);
}
