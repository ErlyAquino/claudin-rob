/*
  08 - Sensor de luz BH1750 (placa GY-302): primeiro teste no ESP32
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)
  Biblioteca: BH1750, de Christopher Laws (a Wire vem com o ESP32)

  Ligacoes (a ordem dos pinos esta escrita na placa do sensor):
    VCC  -> 3V3
    GND  -> GND
    SCL  -> GPIO 22
    SDA  -> GPIO 21
    ADDR -> solto (ou GND): endereco 0x23.  No 3V3: endereco 0x5C.

  O que aparece no Monitor Serial (115200 baud):
    primeiro, os enderecos que responderam no barramento I2C;
    depois, uma linha por segundo com a iluminancia em lux, uma comparacao com o dia a dia
    e a luz util para a planta (PPFD), estimada pelo fator da fonte de luz.
*/
#include <Wire.h>
#include <BH1750.h>

const int PINO_SDA = 21;
const int PINO_SCL = 22;
const byte ENDERECO = 0x23;            // 0x5C com o pino ADDR no 3V3
const float FATOR_DE_CORRECAO = 1.0;   // resultado da conferencia com um luximetro; 1.0 = sem corrigir
const float LUX_POR_UMOL = 54.0;       // luz do sol: 54 lx para cada umol/m2/s. LED branco: cerca de 67

BH1750 sensor(ENDERECO);
bool sensorPresente = false;

// Pergunta a cada endereco do barramento se ha alguem ali. O BH1750 responde em 0x23 ou 0x5C.
void procurarNoBarramento() {
  Serial.println("Procurando no barramento I2C (SDA = 21, SCL = 22)...");
  int achados = 0;
  for (byte endereco = 1; endereco < 127; endereco++) {
    Wire.beginTransmission(endereco);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  respondeu o endereco 0x%02X%s\n", endereco,
                    (endereco == 0x23 || endereco == 0x5C) ? "  <- BH1750" : "");
      achados++;
    }
  }
  if (achados == 0) Serial.println("  ninguem respondeu: confira VCC, GND, SDA e SCL.");
}

// Uma comparacao para dar nocao do tamanho do numero.
const char* comparar(float lux) {
  if (lux < 1) return "escuro";
  if (lux < 50) return "penumbra, luz de vela ou de corredor";
  if (lux < 300) return "sala de casa";
  if (lux < 1000) return "sala de aula ou escritorio bem iluminado";
  if (lux < 5000) return "perto da janela, ou dia muito fechado";
  if (lux < 25000) return "dia nublado, ou sombra em dia de sol";
  if (lux < 54000) return "ceu aberto, sol encoberto ou baixo";
  return "sol pleno: no fim da faixa deste modo (veja o sketch 08b)";
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Wire.begin(PINO_SDA, PINO_SCL);
  procurarNoBarramento();
  // Modo continuo de alta resolucao: 1 lx por passo, uma medida nova a cada 120 ms.
  sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
  if (!sensorPresente) Serial.println("BH1750 nao respondeu neste endereco.");
}

void loop() {
  if (!sensorPresente) {               // tenta de novo: o sensor pode ter sido ligado depois
    sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
    delay(1000);
    return;
  }
  float lux = sensor.readLightLevel(); // negativo = erro de leitura
  if (lux < 0) {
    Serial.println("Sem leitura: confira a fiacao.");
    sensorPresente = false;
  } else {
    lux *= FATOR_DE_CORRECAO;
    float ppfd = lux / LUX_POR_UMOL;   // luz util para a fotossintese, estimada
    Serial.printf("luz: %.0f lx   (%s)   PPFD estimado: %.0f umol/m2/s\n",
                  lux, comparar(lux), ppfd);
  }
  delay(1000);
}
