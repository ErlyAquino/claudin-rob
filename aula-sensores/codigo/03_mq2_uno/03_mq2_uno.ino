/*
  03 - MQ-2: gas inflamavel (GLP, butano, propano, hidrogenio) e fumaca
  Placa: Arduino Uno/Nano     Biblioteca: MQUnifiedsensor (Miguel Califa)

  Modulo MQ-2 (4 pinos):  VCC -> 5V   GND -> GND   AO -> A0   DO -> (opcional) pino 3
  O modulo tem um potenciometro que so ajusta o limiar do pino DIGITAL (DO); a saida analogica
  AO nao depende dele.

  Quimica: dentro do sensor ha uma ceramica de OXIDO DE ESTANHO (SnO2) AQUECIDA (~300 C) por um
  filamento. No ar limpo, oxigenio se prende a superficie e "rouba" eletrons: a resistencia fica
  ALTA. Gases redutores (GLP, CO, H2, fumaca) reagem com esse oxigenio, devolvem os eletrons e a
  resistencia CAI. Medimos a resistencia Rs por um divisor de tensao (RL = 5 kOhm no modulo).
  A relacao Rs/R0 x concentracao (ppm) e uma reta em escala log-log (datasheet) - a biblioteca
  guarda os coeficientes (a, b) de cada gas:  ppm = a * (Rs/R0)^b
  R0 = resistencia no AR LIMPO: por isso precisamos CALIBRAR (Rs/R0 = 9,83 no ar limpo, pelo datasheet).
  Pre-aquecimento: o datasheet pede 24 h na primeira vez e alguns minutos nas seguintes.
*/
#include <MQUnifiedsensor.h>

#define PLACA "Arduino UNO"
#define PINO_AO A0
#define TIPO "MQ-2"
#define TENSAO 5
#define BITS_ADC 10
#define RAZAO_AR_LIMPO 9.83
const int PINO_DO = 3;

MQUnifiedsensor MQ2(PLACA, TENSAO, BITS_ADC, PINO_AO, TIPO);

void setup() {
  Serial.begin(9600);
  pinMode(PINO_DO, INPUT);
  MQ2.setRegressionMethod(1);          // ppm = a * ratio^b
  MQ2.init();

  Serial.println("Calibrando no AR LIMPO (afaste gases, espere o pre-aquecimento)...");
  float r0 = 0;
  for (int i = 0; i < 10; i++) { MQ2.update(); r0 += MQ2.calibrate(RAZAO_AR_LIMPO); Serial.print("."); delay(100); }
  MQ2.setR0(r0 / 10);
  Serial.print("\nR0 = "); Serial.print(r0 / 10, 2); Serial.println(" kOhm");
  if (isinf(r0)) Serial.println("ERRO: R0 infinito - fio aberto?");
  if (r0 == 0)   Serial.println("ERRO: R0 zero - curto?");
  Serial.println("GLP_ppm,CO_ppm,fumaca_ppm,Rs/R0,DO");
}

float ler(float a, float b) { MQ2.setA(a); MQ2.setB(b); return MQ2.readSensor(); }

void loop() {
  MQ2.update();                                  // le o A0 uma vez
  float glp    = ler(574.25, -2.222);            // coeficientes do datasheet (biblioteca)
  float co     = ler(36974,  -3.109);
  float fumaca = ler(30000000, -8.308);
  float razao  = MQ2.readSensorR0Rs() > 0 ? 1.0 / MQ2.readSensorR0Rs() : 0;   // Rs/R0

  Serial.print(glp, 0);    Serial.print(",");
  Serial.print(co, 0);     Serial.print(",");
  Serial.print(fumaca, 0); Serial.print(",");
  Serial.print(razao, 2);  Serial.print(",");
  Serial.println(digitalRead(PINO_DO) == LOW ? "ALERTA" : "ok");   // DO vai a LOW acima do limiar do pot
  delay(500);
}
