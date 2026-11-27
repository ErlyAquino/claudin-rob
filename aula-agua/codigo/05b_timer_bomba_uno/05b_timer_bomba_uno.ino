/*
  05b - Timer da bomba da hidroponia no Arduino Uno: tempos fixos, com millis()
  Placa: Arduino Uno          Sem biblioteca

  Ligacoes do modulo rele:  S (IN) -> D7     + (VCC) -> 5V     - (GND) -> GND
  Lado da bomba (12 V):     + da fonte -> COM do rele     NF do rele -> + da bomba
                            - da bomba -> - da fonte
                            diodo 1N4007 em paralelo com a bomba, faixa (catodo) virada para o +

  A bomba fica TEMPO_LIGADA ligada e TEMPO_DESLIGADA desligada, sem parar.
  Para ensaiar na bancada, troque MINUTO para 1000UL: os "minutos" viram segundos.
  Monitor Serial a 9600 baud: mostra o estado e quanto falta para a proxima troca.
*/
const int PINO_RELE = 7;
const bool RELE_ACIONA_EM_NIVEL_BAIXO = false;   // descubra com o sketch 05
const bool BOMBA_NO_CONTATO_NF = true;           // true: NF (placa desligada = bomba LIGADA)

const unsigned long MINUTO = 60000UL;            // 60 000 ms. Para ensaiar: 1000UL
const unsigned long TEMPO_LIGADA    = 15 * MINUTO;
const unsigned long TEMPO_DESLIGADA = 15 * MINUTO;

bool bombaLigada = true;                         // comeca ligada: solucao nas raizes logo
unsigned long inicioDaFase = 0;                  // millis() de quando a fase atual comecou
unsigned long ultimoAviso = 0;

void aplicarBomba() {
  // 1) a bomba deve ligar -> o rele deve ser acionado?  No NF, acionar CORTA a bomba.
  bool acionar = BOMBA_NO_CONTATO_NF ? !bombaLigada : bombaLigada;
  // 2) acionar o rele -> que nivel escrever no pino?
  digitalWrite(PINO_RELE, acionar == RELE_ACIONA_EM_NIVEL_BAIXO ? LOW : HIGH);
  digitalWrite(LED_BUILTIN, bombaLigada ? HIGH : LOW);
}

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  aplicarBomba();                                // nivel certo antes de o pino virar saida
  pinMode(PINO_RELE, OUTPUT);
  inicioDaFase = millis();
  Serial.println("Timer da bomba: tempos fixos");
}

void loop() {
  unsigned long agora = millis();
  unsigned long duracao = bombaLigada ? TEMPO_LIGADA : TEMPO_DESLIGADA;

  if (agora - inicioDaFase >= duracao) {         // a fase acabou: troca e marca o inicio
    bombaLigada = !bombaLigada;
    inicioDaFase = agora;
    aplicarBomba();
  }

  if (agora - ultimoAviso >= 1000) {             // uma linha por segundo, sem travar o programa
    ultimoAviso = agora;
    duracao = bombaLigada ? TEMPO_LIGADA : TEMPO_DESLIGADA;
    unsigned long falta = (duracao - (agora - inicioDaFase)) / 1000;
    Serial.print(bombaLigada ? "bomba LIGADA    " : "bomba DESLIGADA ");
    Serial.print("troca em ");
    Serial.print(falta / 60); Serial.print(" min ");
    Serial.print(falta % 60); Serial.println(" s");
  }
}
