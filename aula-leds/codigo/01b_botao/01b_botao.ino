/*
  01b - Botao controlando o LED: de "interruptor" a "toggle"
  Placa: Arduino Uno/Nano

  Ligacoes:
    LED: pino 8 -> resistor 220 -> anodo (perna longa); catodo -> GND
    Botao: uma perna no pino 2, a outra no GND. Usamos INPUT_PULLUP:
           solto = HIGH (1), apertado = LOW (0)   <- atencao, e "ao contrario"!

  O que aprender: digitalRead, if/else, e a diferenca entre
  "LED acende ENQUANTO aperto" (versao A) e "cada toque inverte" (versao B).
*/
const int PINO_LED = 8;
const int PINO_BOTAO = 2;

bool ledLigado = false;
bool botaoAntes = HIGH;        // estado anterior do botao (para detectar o TOQUE)

void setup() {
  pinMode(PINO_LED, OUTPUT);
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  bool botaoAgora = digitalRead(PINO_BOTAO);   // HIGH = solto, LOW = apertado

  // ---- VERSAO A: interruptor (acende enquanto aperta) ----
  // digitalWrite(PINO_LED, botaoAgora == LOW);

  // ---- VERSAO B: toggle (cada toque inverte) ----
  // so age na BORDA: estava solto e agora esta apertado
  if (botaoAntes == HIGH && botaoAgora == LOW) {
    ledLigado = !ledLigado;                     // inverte
    digitalWrite(PINO_LED, ledLigado);
    Serial.println(ledLigado ? "LED ligado" : "LED desligado");
    delay(50);                                  // debounce: ignora "tremidas" do contato
  }
  botaoAntes = botaoAgora;
}
