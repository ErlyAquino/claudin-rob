/*
  05 - Teste do modulo rele no Arduino Uno: o "clique"
  Placa: Arduino Uno          Sem biblioteca

  Ligacoes (modulo de 1 canal, tipo KY-019):
     S (ou IN) -> D7     + (ou VCC) -> 5V     - (ou GND) -> GND
  Os bornes COM / NA / NF ficam VAZIOS neste teste: nada de bomba ainda.

  O que deve acontecer: o rele estala a cada 2 s, o LED do modulo acende junto com a palavra
  ACIONADO no Monitor Serial (9600 baud) e o LED "L" do Uno acompanha.
  Se o LED do modulo acender na palavra SOLTO, o seu modulo aciona em nivel baixo:
  troque RELE_ACIONA_EM_NIVEL_BAIXO para true e grave de novo.
*/
const int PINO_RELE = 7;
// KY-019 (3 pinos: S + -): false.     Modulos optoacoplados (IN, VCC, GND, JD-VCC): true
const bool RELE_ACIONA_EM_NIVEL_BAIXO = false;

void acionarRele(bool acionar) {
  // "acionar" = passar corrente na bobina. O nivel do pino que faz isso depende do modulo.
  digitalWrite(PINO_RELE, acionar == RELE_ACIONA_EM_NIVEL_BAIXO ? LOW : HIGH);
  digitalWrite(LED_BUILTIN, acionar ? HIGH : LOW);
}

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  acionarRele(false);            // nivel de repouso ANTES de virar saida: sem estalo na partida
  pinMode(PINO_RELE, OUTPUT);
  Serial.println("Teste do rele: 2 s acionado, 2 s solto");
}

void loop() {
  acionarRele(true);
  Serial.println("ACIONADO  (bobina com corrente: COM encosta no NA)");
  delay(2000);                   // delay() so serve aqui, num teste que nao faz mais nada
  acionarRele(false);
  Serial.println("SOLTO     (bobina sem corrente: COM volta para o NF)");
  delay(2000);
}
