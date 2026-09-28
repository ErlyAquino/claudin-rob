/*
  05 - BME680: temperatura, umidade, pressao e gas (VOC) num so chip (Bosch)
  Placa: Arduino Uno/Nano     Bibliotecas: Adafruit BME680 Library + Adafruit Unified Sensor + Adafruit BusIO

  Ligacoes (I2C):  VCC -> 3,3 V (a maioria dos modulos aceita 5 V, confira!)   GND -> GND
                   SDA -> A4        SCL -> A5        (SDO no GND = endereco 0x76; solto = 0x77)

  Fisica em 4 sensores num chip de 3 mm:
    - Pressao: uma membrana de silicio se deforma com a pressao (piezorresistivo). Com a pressao
      calculamos a ALTITUDE (a pressao cai ~12 hPa a cada 100 m perto do nivel do mar).
    - Umidade: polimero capacitivo, como no DHT, mas calibrado de fabrica (+-3 %).
    - Temperatura: diodo de silicio (o mesmo principio do DS18B20).
    - Gas: uma placa de oxido metalico AQUECIDA a 320 C (igual ao MQ, em miniatura). Le a
      RESISTENCIA em kOhm: cai quando ha compostos organicos volateis (VOC: alcool, tinta,
      perfume, halito...). Nao da ppm de um gas especifico; da um INDICE relativo de qualidade do ar.
  I2C: dois fios (SDA dados, SCL relogio) e cada chip tem um endereco - varios sensores no mesmo par.
*/
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>

#define PRESSAO_NIVEL_MAR 1013.25      // hPa; ajuste pelo boletim meteorologico do dia para altitude exata
Adafruit_BME680 bme;                   // I2C

void setup() {
  Serial.begin(9600);
  if (!bme.begin(0x76) && !bme.begin(0x77)) {
    Serial.println("BME680 nao encontrado: confira SDA/SCL, alimentacao e endereco");
    while (1);
  }
  // quanto mais oversampling, menos ruido e mais tempo
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);          // 320 C por 150 ms
  Serial.println("temp_C,umid_%,pressao_hPa,gas_kOhm,altitude_m");
}

void loop() {
  if (!bme.performReading()) { Serial.println("falha na leitura"); return; }
  Serial.print(bme.temperature, 1);        Serial.print(",");
  Serial.print(bme.humidity, 0);           Serial.print(",");
  Serial.print(bme.pressure / 100.0, 1);   Serial.print(",");
  Serial.print(bme.gas_resistance / 1000.0, 1); Serial.print(",");
  Serial.println(bme.readAltitude(PRESSAO_NIVEL_MAR), 0);
  delay(2000);
}
