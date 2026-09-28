/*
  04b - MQ-135 no ESP32 com monitor Wi-Fi (qualidade do ar)
  Placa: ESP32 Dev Module     Biblioteca: MQUnifiedsensor
  Arquivos extras: monitor_wifi.h, pagina_web.h

  Ligacoes (iguais ao MQ-2): VCC -> VIN (5 V)   GND -> GND   AO -> 1k -> GPIO 34 -> 2k -> GND   DO -> GPIO 27
  Celular: rede "Sensor-MQ135" -> http://192.168.4.1
*/
#include <MQUnifiedsensor.h>
#include "monitor_wifi.h"

#define PLACA "ESP-32"
#define PINO_AO 34
#define TIPO "MQ-135"
#define TENSAO 3.3
#define BITS_ADC 12
#define RAZAO_AR_LIMPO 3.6
const int PINO_DO = 27;
const float CO2_ALERTA = 1500;       // ppm: acima disso a sala precisa ventilar

MQUnifiedsensor MQ135(PLACA, TENSAO, BITS_ADC, PINO_AO, TIPO);
unsigned long ultimaLeitura = 0;

float ler(float a, float b) { MQ135.setA(a); MQ135.setB(b); return MQ135.readSensor(); }

void setup() {
  Serial.begin(115200);
  pinMode(PINO_DO, INPUT);
  analogReadResolution(12);
  MQ135.setRegressionMethod(1);
  MQ135.init();
  Serial.println("Calibrando no ar limpo (ao ar livre)...");
  float r0 = 0;
  for (int i = 0; i < 10; i++) { MQ135.update(); r0 += MQ135.calibrate(RAZAO_AR_LIMPO); delay(100); }
  MQ135.setR0(r0 / 10);
  Serial.printf("R0 = %.2f kOhm\n", r0 / 10);
  monitorIniciar("Sensor-MQ135");
}

void loop() {
  monitorAtender();
  if (millis() - ultimaLeitura >= 1000) {
    ultimaLeitura = millis();
    MQ135.update();
    float co2 = ler(110.47, -2.862) + 400, nh4 = ler(102.2, -2.473), alcool = ler(77.255, -3.18), co = ler(605.18, -3.937);
    float razao = MQ135.readSensorR0Rs() > 0 ? 1.0 / MQ135.readSensorR0Rs() : 0;
    const char* qualidade = co2 < 800 ? "boa" : co2 < 1200 ? "razoavel" : co2 < 2000 ? "ruim" : "pessima";
    bool alerta = co2 > CO2_ALERTA;
    Serial.printf("CO2 ~%.0f ppm (%s)  NH4 %.1f  alcool %.1f\n", co2, qualidade, nh4, alcool);
    monitorPublicar(jsonMonitor(String("MQ-135 - ar ").c_str(),
      item("CO2 estimado", co2, "ppm") + "," + item("Amonia", nh4, "ppm") + "," + item("Alcool", alcool, "ppm") + "," + item("CO", co, "ppm") + "," + item("Rs/R0", razao, ""),
      alerta, "ventile a sala: " + String(qualidade)));
  }
}
