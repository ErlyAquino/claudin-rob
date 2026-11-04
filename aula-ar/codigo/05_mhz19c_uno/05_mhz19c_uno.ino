/*
  05 - Teste do MH-Z19C: CO2 de verdade, por infravermelho (NDIR)
  Placa: Arduino Uno/Nano     Bibliotecas: SoftwareSerial (vem com o core AVR)

  MH-Z19C (manual Winsen v1.2): 9 pinos em DUAS fileiras - leia os NOMES na placa:
    fileira 1: HD  SR  Tx  Rx  Vo        fileira 2: PWM  AOT  GND  Vin
    SR e Vo sao reservados (nao ligar). HD = zero manual (0 V por 7 s: nao ligar!). AOT = saida analogica 0,4-2 V.
  Ligacoes:
    Vin -> 5V (5,0 V +-0,1 V; pico 125 mA)        GND -> GND
    TX do sensor -> pino 10 do Uno (direto: 3,3 V passa do limiar de 3,0 V do Uno - funciona, com margem pequena)
    RX do sensor <- pino 11 do Uno ATRAVES do divisor 1 k / 2 k:
         pino 11 -> 1 k -> RX do sensor -> 2 k -> GND      (5 V viram 3,3 V; a UART do sensor e de 3,3 V)

  Protocolo: 9600 baud. Pedido de 9 bytes  FF 01 86 00 00 00 00 00 79
             Resposta de 9 bytes          FF 86 HH LL TT SS -- -- CS   (CO2 = HH*256 + LL)
             checksum = 0xFF - (soma dos bytes 1 a 7) + 1

  Comandos pelo Monitor Serial (115200 baud, "Nova linha"):
    z  calibrar o ZERO em 400 ppm  (so ao ar livre, sensor ligado ha 20-30 min ou mais!)
    a  liga a autocalibracao ABC   (o sensor assume que, 1 vez a cada 24 h, o ar chega a 400 ppm)
    d  desliga a ABC               (recomendado em sala que fica sempre fechada)
    2  faixa 400-2000 ppm   5  faixa 400-5000 ppm
  (o manual v1.2 do MH-Z19C documenta so 0x86 e 0x79; z (0x87) e 2/5 (0x99) sao do manual do MH-Z19B e o C os aceita)
*/
#include <SoftwareSerial.h>

SoftwareSerial co2Serial(10, 11);       // RX (recebe do TX do sensor), TX (vai ao RX do sensor)
const unsigned long PREAQUECIMENTO_MS = 60000UL;    // 1 min (manual do MH-Z19C v1.2; o MH-Z19B pedia 3 min)
const unsigned long INTERVALO_MS = 5000;
unsigned long ultima = 0, falhas = 0;
bool aquecido = false;

// monta o pacote de 9 bytes com o checksum e envia
void enviarComando(uint8_t cmd, uint8_t b3 = 0, uint8_t b6 = 0, uint8_t b7 = 0) {
  uint8_t p[9] = {0xFF, 0x01, cmd, b3, 0x00, 0x00, b6, b7, 0x00};
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += p[i];
  p[8] = 0xFF - soma + 1;
  while (co2Serial.available()) co2Serial.read();    // descarta restos
  co2Serial.write(p, 9);
}

// pede a leitura; devolve o CO2 em ppm ou -1 (sem resposta / checksum errado)
int lerCO2(int &temperatura, uint8_t &status) {
  enviarComando(0x86);
  uint8_t r[9];
  if (co2Serial.readBytes(r, 9) != 9) return -1;
  if (r[0] != 0xFF || r[1] != 0x86) return -1;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  if ((uint8_t)(0xFF - soma + 1) != r[8]) return -1;
  temperatura = (int)r[4] - 40;       // temperatura interna (grosseira, nao use como termometro)
  status = r[5];
  return r[2] * 256 + r[3];
}

const char* qualidade(int ppm) {
  if (ppm <= 800) return "boa";
  if (ppm <= 1000) return "moderada";
  if (ppm <= 1500) return "ruim - ventile";
  return "muito ruim - abra janelas";
}

void setup() {
  Serial.begin(115200);
  co2Serial.begin(9600);
  co2Serial.setTimeout(300);
  Serial.println(F("# Teste do MH-Z19C. Comandos: z (zero 400 ppm), a/d (ABC liga/desliga), 2/5 (faixa)"));
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'z') { enviarComando(0x87); Serial.println(F("# ZERO calibrado em 400 ppm (so vale se estava ao ar livre!)")); }
    if (c == 'a') { enviarComando(0x79, 0xA0); Serial.println(F("# ABC ligada")); }
    if (c == 'd') { enviarComando(0x79, 0x00); Serial.println(F("# ABC desligada")); }
    if (c == '2') { enviarComando(0x99, 0, 2000 >> 8, 2000 & 0xFF); Serial.println(F("# faixa 0-2000 ppm")); }
    if (c == '5') { enviarComando(0x99, 0, 5000 >> 8, 5000 & 0xFF); Serial.println(F("# faixa 0-5000 ppm")); }
  }
  if (millis() - ultima < INTERVALO_MS) return;
  ultima = millis();

  int temperatura; uint8_t status;
  int ppm = lerCO2(temperatura, status);
  if (ppm < 0) {
    falhas++;
    Serial.print(F("# sem resposta do sensor (")); Serial.print(falhas);
    Serial.println(F(") - TX do sensor no pino 10? RX no 11 pelo divisor? Vin em 5V?"));
    return;
  }
  if (millis() >= PREAQUECIMENTO_MS) aquecido = true;
  if (!aquecido) {
    Serial.print(F("# aquecendo (")); Serial.print((PREAQUECIMENTO_MS - millis()) / 1000);
    Serial.print(F(" s): leitura ainda nao vale -> ")); Serial.println(ppm);
    return;
  }
  Serial.print(F("CO2_ppm:")); Serial.print(ppm);
  Serial.print(F(" Temp_interna_C:")); Serial.print(temperatura);
  Serial.print(F("  ar ")); Serial.println(qualidade(ppm));
}
