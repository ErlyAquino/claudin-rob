/*
  09 - Sensor de vazao YF-S201 (1/2", efeito Hall): primeiro teste no ESP32
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)        Sem biblioteca

  Ligacoes (as cores sao as do cabo do sensor):
    vermelho -> VIN (5 V da USB)
    preto    -> GND
    amarelo  -> divisor de tensao -> GPIO 27
                (amarelo - resistor de 1 k - GPIO 27 - resistor de 2 k - GND)
  O sensor trabalha em 5 V e devolve pulsos de 5 V. O ESP32 so aceita 3,3 V: o divisor
  entrega dois tercos da tensao. Confira com o multimetro antes de ligar (tutorial, secao 9).

  O que aparece no Monitor Serial (115200 baud), uma linha por segundo:
    pulsos no ultimo segundo, frequencia, vazao em L/min, total de pulsos e volume em litros.
  Comando: z + Enter zera o total (use antes de encher o balde da calibracao).
*/
const int PINO_VAZAO = 27;
const float PULSOS_POR_LITRO = 450.0;      // folha de dados: f (Hz) = 7,5 x vazao (L/min)
const float VAZAO_MINIMA = 1.0;            // L/min: abaixo disto a folha de dados nao garante

// O contador mora numa interrupcao: a cada pulso o ESP32 para o que esta fazendo, soma 1
// e volta. "volatile" avisa o compilador de que a variavel muda fora do loop().
volatile uint32_t pulsos = 0;
volatile uint32_t ultimoPulsoUs = 0;

void IRAM_ATTR contarPulso() {
  uint32_t agora = micros();
  if (agora - ultimoPulsoUs < 1500) return;   // ruido: a 30 L/min ha um pulso a cada 4,4 ms
  ultimoPulsoUs = agora;
  pulsos = pulsos + 1;
}

uint32_t pulsosNaUltimaConta = 0;
uint32_t horaDaUltimaConta = 0;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  pinMode(PINO_VAZAO, INPUT);              // o resistor de 2 k do divisor segura o pino em 0 V
  attachInterrupt(digitalPinToInterrupt(PINO_VAZAO), contarPulso, FALLING);
  Serial.println("YF-S201 - teste. Sopre na entrada do sensor ou deixe a agua passar.");
  horaDaUltimaConta = millis();
}

void loop() {
  if (Serial.available()) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();
    if (comando == "z") {
      noInterrupts();
      pulsos = 0;
      interrupts();
      pulsosNaUltimaConta = 0;
      Serial.println("total zerado");
    }
  }

  uint32_t agora = millis();
  if (agora - horaDaUltimaConta < 1000) return;

  uint32_t total = pulsos;                           // copia de uma vez so
  uint32_t novos = total - pulsosNaUltimaConta;
  float frequencia = novos * 1000.0 / (agora - horaDaUltimaConta);   // pulsos por segundo
  float vazao = frequencia * 60.0 / PULSOS_POR_LITRO;                // litros por minuto
  float volume = total / PULSOS_POR_LITRO;                           // litros desde o zero
  pulsosNaUltimaConta = total;
  horaDaUltimaConta = agora;

  Serial.printf("pulsos: %3lu   frequencia: %5.1f Hz   vazao: %5.2f L/min   total: %lu pulsos"
                " = %.3f L", (unsigned long)novos, frequencia, vazao, (unsigned long)total, volume);
  if (novos == 0)                 Serial.print("   <- turbina parada");
  else if (vazao < VAZAO_MINIMA)  Serial.print("   <- abaixo de 1 L/min: leitura pouco confiavel");
  Serial.println();
}
