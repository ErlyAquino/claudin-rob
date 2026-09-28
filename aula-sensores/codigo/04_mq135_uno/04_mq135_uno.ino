/*
  04 - MQ-135: qualidade do ar (CO2 estimado, amonia, alcool, benzeno, fumaca)
  Placa: Arduino Uno/Nano     Biblioteca: MQUnifiedsensor

  Modulo MQ-135:  VCC -> 5V   GND -> GND   AO -> A0   DO -> (opcional) pino 3

  Mesmo principio do MQ-2 (SnO2 aquecido), mas o material foi "dopado" para reagir mais a
  amonia (NH3), oxidos de nitrogenio, alcool, benzeno, fumaca e CO2. IMPORTANTE: o MQ-135 NAO e
  um sensor de CO2 de verdade (isso seria um NDIR, infravermelho); ele ESTIMA CO2 pela curva do
  datasheet, e o ar limpo externo tem ~400-420 ppm. Por isso somamos 400 ao valor da curva.
  Rs/R0 no ar limpo = 3,6. Calibre ao ar livre (ou janela aberta), apos pre-aquecer.
*/
#include <MQUnifiedsensor.h>

#define PLACA "Arduino UNO"
#define PINO_AO A0
#define TIPO "MQ-135"
#define TENSAO 5
#define BITS_ADC 10
#define RAZAO_AR_LIMPO 3.6
const int PINO_DO = 3;

MQUnifiedsensor MQ135(PLACA, TENSAO, BITS_ADC, PINO_AO, TIPO);

void setup() {
  Serial.begin(9600);
  pinMode(PINO_DO, INPUT);
  MQ135.setRegressionMethod(1);
  MQ135.init();
  Serial.println("Calibrando no AR LIMPO...");
  float r0 = 0;
  for (int i = 0; i < 10; i++) { MQ135.update(); r0 += MQ135.calibrate(RAZAO_AR_LIMPO); Serial.print("."); delay(100); }
  MQ135.setR0(r0 / 10);
  Serial.print("\nR0 = "); Serial.print(r0 / 10, 2); Serial.println(" kOhm");
  Serial.println("CO2_ppm,NH4_ppm,alcool_ppm,CO_ppm,Rs/R0");
}

float ler(float a, float b) { MQ135.setA(a); MQ135.setB(b); return MQ135.readSensor(); }

void loop() {
  MQ135.update();
  float co2    = ler(110.47, -2.862) + 400;      // + 400 ppm de base atmosferica
  float nh4    = ler(102.2,  -2.473);
  float alcool = ler(77.255, -3.18);
  float co     = ler(605.18, -3.937);
  float razao  = MQ135.readSensorR0Rs() > 0 ? 1.0 / MQ135.readSensorR0Rs() : 0;

  Serial.print(co2, 0);    Serial.print(",");
  Serial.print(nh4, 1);    Serial.print(",");
  Serial.print(alcool, 1); Serial.print(",");
  Serial.print(co, 1);     Serial.print(",");
  Serial.println(razao, 2);
  delay(1000);
}
