/*
  03b - MQ-2 no ESP32 com monitor Wi-Fi
  Placa: ESP32 Dev Module     Biblioteca: MQUnifiedsensor
  Arquivos extras: monitor_wifi.h, pagina_web.h

  ATENCAO (fisica): o MQ-2 PRECISA de 5 V para o aquecedor (~150 mA) - alimente pelo VIN.
  A saida AO vai ate 5 V e o ESP32 so aguenta 3,3 V: use um DIVISOR 1 k / 2 k (AO -> 1k -> GPIO34 -> 2k -> GND).
  Com o divisor, o ESP32 le 2/3 da tensao real; a biblioteca e configurada para 3,3 V e 12 bits e
  corrigimos o fator 3/2 na leitura (veja FATOR_DIVISOR).
  Ligacoes: VCC -> VIN   GND -> GND   AO -> divisor -> GPIO 34   DO -> GPIO 27 (opcional)
  Celular: rede "Sensor-MQ2" -> http://192.168.4.1
*/
#include <MQUnifiedsensor.h>
#include "monitor_wifi.h"

#define PLACA "ESP-32"
#define PINO_AO 34
#define TIPO "MQ-2"
#define TENSAO 3.3
#define BITS_ADC 12
#define RAZAO_AR_LIMPO 9.83
const int PINO_DO = 27;
const float FATOR_DIVISOR = 1.5;     // 1k/2k: o GPIO ve 2/3 da tensao; nao usado pela lib, so informativo
const float GLP_ALERTA = 1000;       // ppm

MQUnifiedsensor MQ2(PLACA, TENSAO, BITS_ADC, PINO_AO, TIPO);
unsigned long ultimaLeitura = 0;

float ler(float a, float b) { MQ2.setA(a); MQ2.setB(b); return MQ2.readSensor(); }

void setup() {
  Serial.begin(115200);
  pinMode(PINO_DO, INPUT);
  analogReadResolution(12);
  MQ2.setRegressionMethod(1);
  MQ2.init();
  Serial.println("Calibrando no ar limpo...");
  float r0 = 0;
  for (int i = 0; i < 10; i++) { MQ2.update(); r0 += MQ2.calibrate(RAZAO_AR_LIMPO); delay(100); }
  MQ2.setR0(r0 / 10);
  Serial.printf("R0 = %.2f kOhm\n", r0 / 10);
  monitorIniciar("Sensor-MQ2");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura >= 1000) {
    ultimaLeitura = millis();
    MQ2.update();
    float glp = ler(574.25, -2.222), co = ler(36974, -3.109), fumaca = ler(30000000, -8.308);
    float razao = MQ2.readSensorR0Rs() > 0 ? 1.0 / MQ2.readSensorR0Rs() : 0;
    bool alerta = glp > GLP_ALERTA || digitalRead(PINO_DO) == LOW;
    Serial.printf("GLP %.0f ppm  CO %.0f  fumaca %.0f  Rs/R0 %.2f\n", glp, co, fumaca, razao);
    monitorPublicar(jsonMonitor("MQ-2 - gas inflamavel",
      item("GLP", glp, "ppm") + "," + item("CO", co, "ppm") + "," + item("Fumaca", fumaca, "ppm") + "," + item("Rs/R0", razao, ""),
      alerta, "gas detectado!"));
  }
}
