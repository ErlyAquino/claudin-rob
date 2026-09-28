/*
  01 - DS18B20: termometro digital a prova d'agua (1-Wire)
  Placa: Arduino Uno/Nano     Bibliotecas: OneWire, DallasTemperature (Gerenciador de Bibliotecas)

  Ligacoes da sonda (cabo de 3 fios):
    VERMELHO (VDD) -> 5V      PRETO (GND) -> GND      AMARELO (DQ, dados) -> pino 2
    Resistor de 4,7 kOhm entre DQ e 5V (pull-up). SEM ele o sensor nao responde (-127 C).

  Fisica: dentro do tubo de inox ha um chip que mede a temperatura pela tensao de uma juncao
  de silicio (varia ~2 mV por grau) e a converte com um ADC interno de ate 12 bits (0,0625 C).
  1-Wire: um unico fio serve para alimentar e conversar; cada sensor tem um ENDERECO de 64 bits
  gravado de fabrica, entao varios podem dividir o mesmo fio.
*/
#include <OneWire.h>
#include <DallasTemperature.h>

const int PINO_DADOS = 2;
OneWire oneWire(PINO_DADOS);
DallasTemperature sensores(&oneWire);
DeviceAddress endereco;

void setup() {
  Serial.begin(9600);
  sensores.begin();
  int n = sensores.getDeviceCount();
  Serial.print("Sensores encontrados: "); Serial.println(n);
  for (int i = 0; i < n; i++) {
    if (sensores.getAddress(endereco, i)) {
      Serial.print("  #"); Serial.print(i); Serial.print(" endereco: ");
      for (int b = 0; b < 8; b++) { if (endereco[b] < 16) Serial.print("0"); Serial.print(endereco[b], HEX); }
      Serial.println();
      sensores.setResolution(endereco, 12);      // 9..12 bits: 12 = 0,0625 C, leva 750 ms
    }
  }
}

void loop() {
  sensores.requestTemperatures();               // manda TODOS os sensores converterem
  for (int i = 0; i < sensores.getDeviceCount(); i++) {
    float t = sensores.getTempCByIndex(i);
    Serial.print("sensor "); Serial.print(i); Serial.print(": ");
    if (t == DEVICE_DISCONNECTED_C) Serial.println("desconectado (confira o pull-up de 4,7k)");
    else { Serial.print(t, 2); Serial.println(" C"); }
  }
  delay(1000);
}
