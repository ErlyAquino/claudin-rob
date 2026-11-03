/*
  05b - MH-Z19B (CO2 por infravermelho) no ESP32, com monitor Wi-Fi no celular
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)    Bibliotecas: nenhuma extra (Serial2 vem no core)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  Ligacoes (as mesmas do no-ar da telemetria-cria):
    Vin -> VIN (5 V)   GND -> GND
    TX do sensor -> GPIO 16 (RX2)      RX do sensor -> GPIO 17 (TX2)
  A UART do sensor e de 3,3 V: liga DIRETO no ESP32, sem divisor.

  Comandos pelo Monitor Serial (115200): z = zero 400 ppm (ar livre, 20 min ligado), a/d = ABC liga/desliga
  Celular: rede "Ar-CO2" (senha 12345678) -> http://192.168.4.1
*/
#include "monitor_wifi.h"

const int PINO_RX2 = 16, PINO_TX2 = 17;
const unsigned long PREAQUECIMENTO_MS = 180000UL;
const int CO2_ALERTA = 1000;            // ppm: limite recomendado para ambiente interno (ANVISA RE 9/2003)
unsigned long ultima = 0, falhas = 0;
int maximo = 0;
bool aquecido = false;

void enviarComando(uint8_t cmd, uint8_t b3 = 0, uint8_t b6 = 0, uint8_t b7 = 0) {
  uint8_t p[9] = {0xFF, 0x01, cmd, b3, 0x00, 0x00, b6, b7, 0x00};
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += p[i];
  p[8] = 0xFF - soma + 1;
  while (Serial2.available()) Serial2.read();
  Serial2.write(p, 9);
}

int lerCO2(int &temperatura) {
  enviarComando(0x86);
  uint8_t r[9];
  if (Serial2.readBytes(r, 9) != 9) return -1;
  if (r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  temperatura = (int)r[4] - 40;
  return r[2] * 256 + r[3];
}

const char* qualidade(int ppm) {
  return ppm <= 800 ? "boa" : ppm <= 1000 ? "moderada" : ppm <= 1500 ? "ruim - ventile" : "muito ruim";
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, PINO_RX2, PINO_TX2);
  Serial2.setTimeout(150);   // curto: enquanto espera, a pagina do celular nao e atendida
  monitorIniciar("Ar-CO2");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'z') { enviarComando(0x87); Serial.println("ZERO calibrado em 400 ppm"); }
    if (c == 'a') { enviarComando(0x79, 0xA0); Serial.println("ABC ligada"); }
    if (c == 'd') { enviarComando(0x79, 0x00); Serial.println("ABC desligada"); }
  }
  if (millis() - ultima < 5000) return;
  ultima = millis();

  int temperatura;
  int ppm = lerCO2(temperatura);
  if (ppm < 0) {
    falhas++;
    Serial.printf("sem resposta do MH-Z19B (%lu) - TX->GPIO16? RX->GPIO17? Vin no VIN (5 V)?\n", falhas);
    monitorPublicar(jsonMonitor("MH-Z19B", item("Falhas", falhas, ""), true, "sensor nao responde"));
    return;
  }
  if (millis() >= PREAQUECIMENTO_MS) aquecido = true;
  if (!aquecido) {
    unsigned long falta = (PREAQUECIMENTO_MS - millis()) / 1000;
    Serial.printf("aquecendo (%lu s): %d ppm ainda nao vale\n", falta, ppm);
    monitorPublicar(jsonMonitor("MH-Z19B - aquecendo", item("Faltam", falta, "s"), false, "aguarde 3 min"));
    return;
  }
  if (ppm > maximo) maximo = ppm;
  Serial.printf("CO2_ppm:%d Temp_interna_C:%d  ar %s\n", ppm, temperatura, qualidade(ppm));
  monitorPublicar(jsonMonitor("MH-Z19B - CO2 (NDIR)",
    item("CO2", ppm, "ppm") + "," + item("Maximo", maximo, "ppm") + "," + item("Temp. interna", temperatura, "C"),
    ppm > CO2_ALERTA, String("ar ") + qualidade(ppm) + ": abra as janelas"));
}
