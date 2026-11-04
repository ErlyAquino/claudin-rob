/*
  01 - pH-4502C + sonda BNC no Arduino Uno: medindo a acidez de liquidos
  Placa: Arduino Uno/Nano     Sem biblioteca: e um sinal analogico que NOS calibramos (EEPROM guarda a calibracao)

  Placa pH-4502C:  V+ -> 5V    G -> GND (os dois G)    Po -> A0 (saida de pH)    To -> A1 (temperatura, opcional)
                   Do -> saida digital com limiar (pot pequeno; nao usamos)      A sonda entra no conector BNC.
  Pot grande (perto do BNC) = OFFSET: ajusta a saida para 2,5 V com o BNC em curto (equivale a pH 7).
  Pot pequeno = limiar do Do (nao mexe no Po).

  Quimica: a sonda e uma celula eletroquimica. O bulbo de VIDRO especial troca ions H+ com o liquido; a
  diferenca de concentracao de H+ entre a amostra e a solucao interna (pH 7) gera uma TENSAO
  (equacao de Nernst): -59,16 mV por unidade de pH a 25 C, 0 V em pH 7. pH 4 -> +177 mV; pH 10 -> -177 mV.
  A placa amplifica (~x3) e desloca esse sinal para 0..5 V (pH 7 = 2,5 V). pH = -log10[H+].

  Calibracao de 2 pontos com solucoes tampao pH 7,00 e pH 4,00 (ou 10,00):
    1. Sonda em pH 7, espere estabilizar, digite  c7  no Monitor Serial -> grava V7
    2. Enxague com agua destilada, sonda em pH 4: digite  c4  -> grava a inclinacao (V/pH)
    r = volta ao padrao.  A inclinacao ideal e ~ -0,177 V/pH; abaixo de -0,15 (em modulo) a sonda esta velha.
  Monitor Serial a 115200 baud. A linha "pH:7.02 V:2.503" tambem sai no Plotter Serial.
*/
#include <EEPROM.h>

const int PINO_PH = A0;
const int N_AMOSTRAS = 30;
const float VREF = 5.0;              // tensao real do 5V do Uno (meca com o multimetro e corrija)
float V7 = 2.50;                     // tensao em pH 7 (offset)
float INCLINACAO = -0.177;           // V por unidade de pH (negativo: nesta placa, mais acido = mais tensao)
const float PH_MIN_OK = 6.5, PH_MAX_OK = 8.5;   // faixa "agua boa" (aquario, piscina, torneira)

float lerTensao() {                  // media APARADA: 30 amostras, descarta as 5 maiores e as 5 menores
  int v[N_AMOSTRAS];
  for (int i = 0; i < N_AMOSTRAS; i++) { v[i] = analogRead(PINO_PH); delay(10); }
  for (int i = 0; i < N_AMOSTRAS - 1; i++)                       // ordena (bubble sort: 30 valores, tudo bem)
    for (int j = 0; j < N_AMOSTRAS - 1 - i; j++)
      if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0;
  for (int i = 5; i < N_AMOSTRAS - 5; i++) soma += v[i];
  return (soma / float(N_AMOSTRAS - 10)) * VREF / 1023.0;
}

float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }   // a reta da calibracao

void salvar()   { EEPROM.put(0, V7); EEPROM.put(4, INCLINACAO); }
void carregar() {                    // so aceita valores plausiveis (EEPROM nova vem com lixo)
  float a, b; EEPROM.get(0, a); EEPROM.get(4, b);
  if (!isnan(a) && a > 1.0 && a < 4.0) V7 = a;
  if (!isnan(b) && b < -0.05 && b > -0.5) INCLINACAO = b;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  carregar();
  Serial.println(F("pH-4502C. Comandos: c7 (sonda em pH 7)  c4 (pH 4)  c10 (pH 10)  r (reset)"));
  Serial.print(F("V7 = ")); Serial.print(V7, 3); Serial.print(F(" V   inclinacao = ")); Serial.print(INCLINACAO, 4); Serial.println(F(" V/pH"));
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    float v = lerTensao();
    if (cmd == "c7") { V7 = v; salvar(); Serial.print(F("V7 gravado: ")); Serial.println(v, 3); }
    else if (cmd == "c4" || cmd == "c10") {
      float phRef = (cmd == "c4") ? 4.0 : 10.0;
      INCLINACAO = (v - V7) / (phRef - 7.0); salvar();
      Serial.print(F("inclinacao gravada: ")); Serial.print(INCLINACAO, 4); Serial.print(F(" V/pH  (saude da sonda: "));
      Serial.print(100.0 * INCLINACAO / -0.177, 0); Serial.println(F(" % da teorica)"));
    }
    else if (cmd == "r") { V7 = 2.5; INCLINACAO = -0.177; salvar(); Serial.println(F("calibracao padrao restaurada")); }
  }
  float v = lerTensao(), ph = tensaoParaPH(v);
  const char* classe = ph < 6.5 ? "acido" : (ph > 7.5 ? "basico" : "neutro");
  Serial.print(F("pH:")); Serial.print(ph, 2); Serial.print(F(" V:")); Serial.print(v, 3);
  Serial.print(F("  ")); Serial.print(classe);
  if (ph < PH_MIN_OK || ph > PH_MAX_OK) Serial.print(F("  <<< fora da faixa 6,5-8,5"));
  Serial.println();
  delay(1000);
}
