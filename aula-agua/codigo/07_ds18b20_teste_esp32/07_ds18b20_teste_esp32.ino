/*
  07 - Sensor de temperatura DS18B20: primeiro teste no ESP32, com a leitura do endereco
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)
  Bibliotecas: OneWire e DallasTemperature

  Ligacoes (as mesmas para o TO-92 e para a sonda a prova d'agua):
    VDD   (sonda: fio vermelho)             -> 3V3
    GND   (sonda: fio preto)                -> GND
    DADOS (sonda: fio amarelo; TO-92: pino do meio) -> GPIO 4
    Resistor de 4,7 k entre DADOS e 3V3 (um so, mesmo com varios sensores no fio)

  O que aparece no Monitor Serial (115200 baud):
    na partida, a lista dos sensores achados no fio: endereco de 64 bits, tipo de chip,
    resolucao e modo de alimentacao; depois, a temperatura de cada um a cada 2 s.
*/
#include <OneWire.h>
#include <DallasTemperature.h>

const int PINO_DS18B20 = 4;          // fio de dados
const int RESOLUCAO = 12;            // bits: 9, 10, 11 ou 12 (12 = passos de 0,0625 C)
const int MAXIMO_DE_SENSORES = 8;    // quantos enderecos o programa guarda

OneWire umFio(PINO_DS18B20);
DallasTemperature sensores(&umFio);

DeviceAddress endereco[MAXIMO_DE_SENSORES];   // cada endereco tem 8 bytes
int quantos = 0;

// Escreve os 8 bytes do endereco em hexadecimal: 28-7A-4C-1E-0F-00-00-A1
void mostrarEndereco(const DeviceAddress e) {
  for (int i = 0; i < 8; i++) {
    Serial.printf("%02X", e[i]);
    if (i < 7) Serial.print("-");
  }
}

// O primeiro byte do endereco diz a familia do chip.
const char* nomeDaFamilia(uint8_t codigo) {
  switch (codigo) {
    case 0x28: return "DS18B20";
    case 0x10: return "DS18S20 (resolucao fixa de 9 bits)";
    case 0x22: return "DS1822";
    case 0x3B: return "DS1825 ou MAX31850";
    default:   return "nao e um sensor de temperatura conhecido";
  }
}

void procurarSensores() {
  sensores.begin();                              // percorre o fio e conta os chips
  quantos = min((int)sensores.getDeviceCount(), MAXIMO_DE_SENSORES);
  Serial.printf("\nSensores no fio do GPIO %d: %d\n", PINO_DS18B20, quantos);
  if (quantos == 0) {
    Serial.println("Nenhum respondeu. Confira: resistor de 4,7 k entre DADOS e 3V3,");
    Serial.println("fio de dados no GPIO certo, VDD e GND nao invertidos.");
    return;
  }
  for (int i = 0; i < quantos; i++) {
    if (!sensores.getAddress(endereco[i], i)) continue;
    sensores.setResolution(endereco[i], RESOLUCAO);
    Serial.printf("  %d: ", i);
    mostrarEndereco(endereco[i]);
    Serial.printf("   %s   %d bits\n", nomeDaFamilia(endereco[i][0]),
                  sensores.getResolution(endereco[i]));
  }
  Serial.printf("Alimentacao: %s\n", sensores.isParasitePowerMode()
                ? "PARASITA em pelo menos um sensor (VDD sem tensao?)"
                : "normal, pelos tres fios");
  Serial.printf("Tempo de uma conversao em %d bits: %d ms\n\n", RESOLUCAO,
                sensores.millisToWaitForConversion(RESOLUCAO));
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("DS18B20 - teste e leitura do endereco");
  procurarSensores();
}

void loop() {
  if (quantos == 0) {                            // nada no fio: procura de novo a cada 3 s
    delay(3000);
    procurarSensores();
    return;
  }

  sensores.requestTemperatures();                // manda TODOS converterem e espera terminar
  for (int i = 0; i < quantos; i++) {
    float t = sensores.getTempC(endereco[i]);    // le pelo endereco: a ordem nunca se confunde
    Serial.printf("sensor %d: ", i);
    if (t == DEVICE_DISCONNECTED_C)              // -127: o chip nao respondeu
      Serial.print("SEM RESPOSTA (-127): fio solto ou resistor faltando");
    else if (t == DEVICE_POWER_ON_RESET_C || t == 85.0)   // 85 C e o valor de partida do chip;
      Serial.print("VALOR DE PARTIDA (85 C): o chip reiniciou e nao converteu (alimentacao?)");
    else if (t == DEVICE_INSUFFICIENT_POWER_C)   // a biblioteca 4.x devolve -251 e -250
      Serial.print("ALIMENTACAO INSUFICIENTE durante a conversao (-250)");
    else if (t < -55 || t > 125)                 // outros codigos de falha: abaixo de -127
      Serial.printf("FALHA (codigo %.0f)", t);
    else
      Serial.printf("%.2f C", t);
    Serial.print(i < quantos - 1 ? "    " : "\n");
  }
  delay(2000);
}
