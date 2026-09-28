/*
  06 - pH-4502C + sonda BNC: medindo acidez de liquidos
  Placa: Arduino Uno/Nano     Sem biblioteca: e um sinal analogico que NOS calibramos.

  Placa pH-4502C:  V+ -> 5V   G -> GND (os dois G)   Po -> A0 (saida de pH)   To -> A1 (temperatura, opcional)
                   Do -> saida digital com limiar (pot menor)   A sonda entra no conector BNC.
  Pot grande (perto do BNC) = OFFSET: ajusta a saida para 2,5 V com a sonda em pH 7 (ou com o BNC em curto).
  Pot pequeno = limiar do Do (nao mexe no Po).

  Quimica: a sonda e uma celula eletroquimica. Uma membrana de VIDRO especial deixa ions H+
  "conversarem" com a solucao; a diferenca de concentracao de H+ entre o liquido e a solucao
  interna (pH 7) gera uma TENSAO (equacao de Nernst): ~59,16 mV por unidade de pH a 25 C,
  e 0 V em pH 7. pH 4 -> +177 mV; pH 10 -> -177 mV. A placa amplifica e desloca esse sinal
  para 0..5 V (pH 7 = 2,5 V). pH = -log10[H+]: cada unidade e 10x mais ions H+.

  Calibracao (2 pontos) com solucoes tampao pH 7,00 e pH 4,00 (ou 10,00):
    1. Sonda em pH 7: digite  c7  no Serial -> grava V7
    2. Enxague com agua destilada, sonda em pH 4: digite  c4  -> grava V4 e calcula a inclinacao
    Os valores ficam na EEPROM. A inclinacao ideal e ~ -0,177 V/pH (depende da placa e da sonda).
*/
#include <EEPROM.h>

const int PINO_PH = A0;
const int N_AMOSTRAS = 30;
float V7 = 2.50;          // tensao em pH 7 (offset)
float INCLINACAO = -0.177;// V por unidade de pH (negativo: mais acido = mais tensao nesta placa)

float lerTensao() {                    // media de N amostras descartando as 5 maiores e 5 menores
  int v[N_AMOSTRAS];
  for (int i = 0; i < N_AMOSTRAS; i++) { v[i] = analogRead(PINO_PH); delay(10); }
  for (int i = 0; i < N_AMOSTRAS - 1; i++) for (int j = 0; j < N_AMOSTRAS - 1 - i; j++)
    if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0; for (int i = 5; i < N_AMOSTRAS - 5; i++) soma += v[i];
  return (soma / float(N_AMOSTRAS - 10)) * 5.0 / 1023.0;
}

float tensaoParaPH(float v) { return 7.0 + (v - V7) / INCLINACAO; }

void salvar() { EEPROM.put(0, V7); EEPROM.put(4, INCLINACAO); }
void carregar() {
  float a, b; EEPROM.get(0, a); EEPROM.get(4, b);
  if (!isnan(a) && a > 1 && a < 4) V7 = a;
  if (!isnan(b) && b < -0.05 && b > -0.5) INCLINACAO = b;
}

void setup() {
  Serial.begin(9600);
  carregar();
  Serial.println("Comandos: c7 (sonda em pH 7)   c4 (sonda em pH 4)   c10 (sonda em pH 10)   r (reset calibracao)");
  Serial.print("V7 = "); Serial.print(V7, 3); Serial.print(" V   inclinacao = "); Serial.print(INCLINACAO, 4); Serial.println(" V/pH");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    float v = lerTensao();
    if (cmd == "c7") { V7 = v; salvar(); Serial.print("V7 gravado: "); Serial.println(v, 3); }
    else if (cmd == "c4" || cmd == "c10") {
      float phRef = (cmd == "c4") ? 4.0 : 10.0;
      INCLINACAO = (v - V7) / (phRef - 7.0); salvar();
      Serial.print("inclinacao gravada: "); Serial.print(INCLINACAO, 4); Serial.println(" V/pH");
    }
    else if (cmd == "r") { V7 = 2.5; INCLINACAO = -0.177; salvar(); Serial.println("calibracao padrao restaurada"); }
  }
  float v = lerTensao();
  Serial.print("tensao = "); Serial.print(v, 3); Serial.print(" V   pH = "); Serial.println(tensaoParaPH(v), 2);
  delay(1000);
}
