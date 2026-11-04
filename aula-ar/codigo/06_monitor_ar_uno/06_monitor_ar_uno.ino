/*
  06 - PROJETO: Monitor de qualidade do ar no Arduino Uno (todos os sensores juntos)
  Placa: Arduino Uno     Bibliotecas: "DHT sensor library" + "Adafruit Unified Sensor"; SoftwareSerial (core)

  Ligacoes (protoboard de 830 pontos; trilha + = 5 V, trilha - = GND):
    DHT11 (modulo 3 pinos)  + -> 5V   DATA (meio) -> D2   - -> GND
    DHT22 (3 fios)          vermelho -> 5V   amarelo -> D4   preto -> GND
    MQ-2                    VCC -> 5V   GND -> GND   AO -> A0
    MQ-135                  VCC -> 5V   GND -> GND   AO -> A1
    MH-Z19C                 Vin -> 5V   GND -> GND   TX -> D10   RX <- divisor (D11 -> 1 k -> RX -> 2 k -> GND)
    LED RGB (catodo comum)  R -> 220 R -> D9   G -> 220 R -> D6   B -> 220 R -> D5   catodo -> GND

  ALIMENTACAO: 2 aquecedores MQ (~150 mA cada) + MH-Z19C (picos de 125 mA) + Uno ~ 0,5 A. A USB do PC
  fornece 0,5 A no limite: alimente os SENSORES por uma FONTE 5 V / 2 A nas trilhas da protoboard e ligue
  so o GND da fonte ao GND do Uno. NAO ligue a fonte no pino 5V do Uno com a USB conectada (empurra
  corrente para a porta do PC). Meca o 5V do Uno e escreva em VC (o ADC usa o 5V do Uno como referencia).

  LED de status: AZUL = aquecendo | VERDE = CO2 ate 800 ppm | AMARELO = ate 1000 | VERMELHO = acima de 1000
                 VERMELHO PISCANDO = MQ-2 detectou gas (prioridade) | AZUL PISCANDO = MH-Z19C sem resposta

  SAIDA na USB (115200 baud):
    SAIDA_GATEWAY 0 -> tabela legivel para o Monitor Serial
    SAIDA_GATEWAY 1 -> uma linha JSON por leitura, no formato do gateway da telemetria-cria
                       {"no":"no3","grandeza":"co2","valor":612,"unidade":"ppm","seq":12}
                       Rode gateway/gateway.py (projeto no .env do gateway) e os dados aparecem no painel.
  Grandezas publicadas (catalogo, projeto "ar"): temperatura e umidade (DHT22), co2 (MH-Z19C),
  mq2 e mq135 (Rs/R0, so depois do aquecimento e com R0 medido). O DHT11 aparece so na tabela,
  para comparar com o DHT22: o catalogo nao deixa duas "temperatura" no mesmo no.
*/
#include <DHT.h>
#include <SoftwareSerial.h>

// ----------------------------------------------------------------- ajustes
#define SAIDA_GATEWAY 0
const char* NO = "no3";                 // no deste monitor no catalogo: escolha um livre (painel)!

const int PINO_DHT11 = 2, PINO_DHT22 = 4;
const int PINO_MQ2 = A0, PINO_MQ135 = A1;
const int PINO_CO2_RX = 10, PINO_CO2_TX = 11;
const int LED_R = 9, LED_G = 6, LED_B = 5;

const float VC = 5.0;                   // tensao dos MQ (meca)
const float RL_MQ2_KOHM = 1.0, RL_MQ135_KOHM = 1.0;
// R0 de cada MQ em ar limpo, em kOhm: use o valor que os sketches 03 e 04 mediram.
// Enquanto valer 0, o Rs aparece na tabela e o MQ NAO e publicado.
const float R0_MQ2_KOHM = 0.0, R0_MQ135_KOHM = 0.0;
const float LIMIAR_GAS_MQ2 = 0.5;       // Rs/R0 do MQ-2 abaixo disso = gas

const unsigned long INTERVALO_MS = 10000;                 // padrao do catalogo
const unsigned long PREAQUECIMENTO_CO2_MS = 1UL * 60 * 1000;   // MH-Z19C: 1 min
const unsigned long PREAQUECIMENTO_MQ_MS = 10UL * 60 * 1000;
const int FAIXA_CO2_PPM = 5000;
// ----------------------------------------------------------------------

DHT dht11(PINO_DHT11, DHT11);
DHT dht22(PINO_DHT22, DHT22);
SoftwareSerial co2Serial(PINO_CO2_RX, PINO_CO2_TX);

unsigned long seq = 0, ultimaLeitura = 0, ultimoPisca = 0;
bool jaLeu = false, piscaAceso = false;
bool co2Aquecido = false, mqAquecidos = false;   // ficam verdadeiras para sempre (sobrevivem a volta do millis)
int ultimoCO2 = -1;
bool gasDetectado = false;

// ----------------------------------------------------------------- sensores
int lerCO2() {
  const uint8_t pedido[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  while (co2Serial.available()) co2Serial.read();
  co2Serial.write(pedido, 9);
  uint8_t r[9];
  if (co2Serial.readBytes(r, 9) != 9 || r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  return r[2] * 256 + r[3];
}

// Rs (kOhm) de um MQ ligado direto ao Uno; NAN se a tensao estiver fora da faixa
float resistenciaMq(int pino, float rl) {
  long soma = 0;
  for (int i = 0; i < 20; i++) soma += analogRead(pino);
  float v = (soma / 20.0) * VC / 1023.0;
  if (v < 0.02 || v > VC - 0.02) return NAN;
  return rl * (VC - v) / v;
}

// ----------------------------------------------------------------- saida
// Uma linha JSON por leitura (formato do gateway). Leitura com falha nao sai e nao recebe seq.
void publicar(const char* grandeza, float valor, uint8_t casas, const char* unidade) {
  if (isnan(valor) || isinf(valor)) return;
#if SAIDA_GATEWAY
  seq++;
  Serial.print(F("{\"no\":\""));       Serial.print(NO);
  Serial.print(F("\",\"grandeza\":\"")); Serial.print(grandeza);
  Serial.print(F("\",\"valor\":"));     Serial.print(valor, casas);
  Serial.print(F(",\"unidade\":\""));   Serial.print(unidade);
  Serial.print(F("\",\"seq\":"));       Serial.print(seq);
  Serial.println(F("}"));
#else
  (void)grandeza; (void)valor; (void)casas; (void)unidade;
#endif
}

void coluna(const __FlashStringHelper* nome, float v, uint8_t casas) {
#if !SAIDA_GATEWAY
  Serial.print(nome);
  if (isnan(v)) Serial.print(F("  --  ")); else Serial.print(v, casas);
  Serial.print(F("  "));
#else
  (void)nome; (void)v; (void)casas;
#endif
}

// ----------------------------------------------------------------- LED
void cor(bool r, bool g, bool b) { digitalWrite(LED_R, r); digitalWrite(LED_G, g); digitalWrite(LED_B, b); }

void atualizarLed() {
  if (millis() - ultimoPisca < 300) return;
  ultimoPisca = millis();
  piscaAceso = !piscaAceso;
  if (gasDetectado)                          cor(piscaAceso, 0, 0);
  else if (!co2Aquecido)                     cor(0, 0, 1);
  else if (ultimoCO2 < 0)                    cor(0, 0, piscaAceso);
  else if (ultimoCO2 <= 800)                 cor(0, 1, 0);
  else if (ultimoCO2 <= 1000)                cor(1, 1, 0);
  else                                       cor(1, 0, 0);
}

// ----------------------------------------------------------------- programa
void setup() {
  Serial.begin(115200);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);
  cor(1, 1, 1); delay(300); cor(0, 0, 0);     // teste rapido do LED: branco
  dht11.begin();
  dht22.begin();
  co2Serial.begin(9600);
  co2Serial.setTimeout(300);
  // linha que nao comeca com "{": o gateway so mostra no terminal
  Serial.print(F("telemetria: monitor de ar ")); Serial.println(NO);
}

void loop() {
  atualizarLed();
  if (jaLeu && millis() - ultimaLeitura < INTERVALO_MS) return;
  jaLeu = true;
  ultimaLeitura = millis();

  float t11 = dht11.readTemperature(), h11 = dht11.readHumidity();
  float t22 = dht22.readTemperature(), h22 = dht22.readHumidity();
  if (millis() >= PREAQUECIMENTO_CO2_MS) co2Aquecido = true;
  if (millis() >= PREAQUECIMENTO_MQ_MS) mqAquecidos = true;
  int co2 = lerCO2();
  if (co2 <= 0 || co2 > FAIXA_CO2_PPM) co2 = -1;   // fora da faixa = falha
  ultimoCO2 = co2Aquecido ? co2 : -1;

  float rs2 = resistenciaMq(PINO_MQ2, RL_MQ2_KOHM);
  float rs135 = resistenciaMq(PINO_MQ135, RL_MQ135_KOHM);
  float razao2 = (R0_MQ2_KOHM > 0 && mqAquecidos) ? rs2 / R0_MQ2_KOHM : NAN;
  float razao135 = (R0_MQ135_KOHM > 0 && mqAquecidos) ? rs135 / R0_MQ135_KOHM : NAN;
  gasDetectado = !isnan(razao2) && razao2 < LIMIAR_GAS_MQ2;

  // --- telemetria (so com SAIDA_GATEWAY 1)
  publicar("temperatura", t22, 1, "C");
  publicar("umidade", h22, 1, "%");
  if (co2Aquecido && co2 > 0) publicar("co2", co2, 0, "ppm");
  publicar("mq2", razao2, 3, "Rs/R0");
  publicar("mq135", razao135, 3, "Rs/R0");

  // --- tabela (so com SAIDA_GATEWAY 0)
  coluna(F("DHT11 T:"), t11, 1);  coluna(F("U:"), h11, 0);
  coluna(F("| DHT22 T:"), t22, 1); coluna(F("U:"), h22, 1);
  coluna(F("| CO2:"), co2Aquecido && co2 > 0 ? co2 : NAN, 0);
  coluna(F("| MQ2 Rs:"), rs2, 2);  coluna(F("Rs/R0:"), razao2, 2);
  coluna(F("| MQ135 Rs:"), rs135, 2); coluna(F("Rs/R0:"), razao135, 2);
#if !SAIDA_GATEWAY
  if (!co2Aquecido) Serial.print(F("| CO2 aquecendo "));
  if (!mqAquecidos) Serial.print(F("| MQ aquecendo "));
  if (gasDetectado) Serial.print(F("| <<< GAS!"));
  Serial.println();
#endif
}
