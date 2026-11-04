/*
  02 - Sensor de vazao YF-S201 / ZJ-S201 (efeito Hall) no Arduino Uno: litros por minuto e volume total
  Placa: Arduino Uno/Nano     Sem biblioteca: contamos pulsos com uma INTERRUPCAO

  Ligacoes (cabo de 3 fios):  vermelho -> 5V    preto -> GND    amarelo (sinal) -> pino 2 (INT0)
  A agua deve entrar pelo lado da SETA marcada no corpo do sensor. Rosca G1/2" (a de torneira de jardim).

  Fisica: dentro do tubo ha uma TURBINA com um ima. A agua gira a turbina; a cada volta o ima passa
  por um SENSOR HALL, que gera um pulso. Mais vazao -> turbina mais rapida -> mais pulsos por segundo:
     f (Hz) = K x Q (L/min)      K ~ 7,5 para o YF-S201  (450 pulsos por litro = 7,5 x 60)
  A frequencia e proporcional a vazao; o NUMERO de pulsos e proporcional ao VOLUME (cada pulso ~ 2,2 mL).
  O fabricante diz +-10 %: por isso calibramos com um balde/garrafa de volume conhecido (comandos b e f).

  Comandos no Monitor Serial (115200):
     z        zera o volume acumulado
     b        inicia a calibracao: encha um recipiente de volume conhecido...
     f 2.0    ...e termine informando o volume em litros (ex.: 2.0): o sketch calcula e grava o novo K
     k        mostra o K atual        r  volta ao K padrao (7,5)
  Saida (tambem no Plotter Serial): Vazao_L_min:3.20 Freq_Hz:24.0 Volume_L:1.234
*/
#include <EEPROM.h>

const int PINO_SENSOR = 2;                 // INT0 (no Uno so os pinos 2 e 3 tem interrupcao externa)
const float K_PADRAO = 7.5;                // Hz por (L/min); pulsos por litro = K x 60
float K = K_PADRAO;

volatile unsigned long pulsos = 0;         // "volatile": e alterada DENTRO da interrupcao
unsigned long pulsosTotal = 0, pulsosCalibracao = 0;
float volumeL = 0;
bool calibrando = false;
unsigned long ultimoCalculo = 0;

void contarPulso() { pulsos++; }           // roda a cada borda de subida do sinal, mesmo no meio do loop

void salvar()   { EEPROM.put(8, K); }                     // endereco 8: 0 e 4 sao do pH (sketch 01); o monitor 04 le daqui
void carregar() { float k; EEPROM.get(8, k); if (!isnan(k) && k > 3 && k < 15) K = k; }

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);               // comandos chegam inteiros; sem isto readStringUntil espera 1 s
  pinMode(PINO_SENSOR, INPUT_PULLUP);      // o sensor Hall ja puxa a linha; o pull-up evita ruido com o cabo solto
  attachInterrupt(digitalPinToInterrupt(PINO_SENSOR), contarPulso, RISING);
  carregar();
  Serial.print(F("YF-S201: K = ")); Serial.print(K, 2); Serial.println(F(" Hz/(L/min). Comandos: z, b, f <litros>, k, r"));
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd == "z") { volumeL = 0; pulsosTotal = 0; Serial.println(F("volume zerado")); }
    else if (cmd == "b") { calibrando = true; pulsosCalibracao = 0; Serial.println(F("calibrando: encha o recipiente e depois digite  f <litros>")); }
    else if (cmd.startsWith("f") && calibrando) {
      float litros = cmd.substring(1).toFloat();
      if (litros > 0 && pulsosCalibracao > 50) {
        K = (pulsosCalibracao / litros) / 60.0;       // pulsos por litro / 60 = Hz por (L/min)
        salvar(); calibrando = false;
        Serial.print(pulsosCalibracao); Serial.print(F(" pulsos em ")); Serial.print(litros, 3);
        Serial.print(F(" L  ->  K = ")); Serial.print(K, 3); Serial.println(F(" gravado na EEPROM"));
      } else Serial.println(F("informe o volume (ex.: f 2.0) com pelo menos 50 pulsos contados"));
    }
    else if (cmd == "k") { Serial.print(F("K = ")); Serial.print(K, 3); Serial.print(F("  (")); Serial.print(K * 60, 0); Serial.println(F(" pulsos/L)")); }
    else if (cmd == "r") { K = K_PADRAO; salvar(); Serial.println(F("K padrao restaurado")); }
  }

  if (millis() - ultimoCalculo < 1000) return;      // uma conta por segundo
  unsigned long agora = millis();
  float dt = (agora - ultimoCalculo) / 1000.0;
  ultimoCalculo = agora;

  noInterrupts();                                    // copia e zera o contador sem a interrupcao atrapalhar
  unsigned long n = pulsos; pulsos = 0;
  interrupts();

  float freq = n / dt;                               // Hz
  float vazao = freq / K;                            // L/min
  float litrosAgora = n / (K * 60.0);                // volume que passou neste intervalo
  volumeL += litrosAgora; pulsosTotal += n;
  if (calibrando) pulsosCalibracao += n;

  Serial.print(F("Vazao_L_min:")); Serial.print(vazao, 2);
  Serial.print(F(" Freq_Hz:")); Serial.print(freq, 1);
  Serial.print(F(" Volume_L:")); Serial.print(volumeL, 3);
  if (calibrando) { Serial.print(F("  [calibrando: ")); Serial.print(pulsosCalibracao); Serial.print(F(" pulsos]")); }
  Serial.println();
}
