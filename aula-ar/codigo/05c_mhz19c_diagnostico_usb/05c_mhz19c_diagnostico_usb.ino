/*
  05c - Diagnostico e calibracao do MH-Z19C pela USB, com envio para a telemetria-cria
  Placa: ESP32 Dev Module (DevKit V1)     Biblioteca: DHT sensor library (Adafruit), so para o DHT11
  Ligacoes (as mesmas do 05b e do no-ar):  Vin -> VIN (5 V)  GND -> GND
                                            TX do sensor -> GPIO 16   RX do sensor -> GPIO 17
  DHT11 (modulo 3 pinos, ja tem resistor de pull-up e LED):  + -> 3V3   DATA (meio) -> GPIO 4   - -> GND
  Publica co2 (ppm), temperatura (C, interna do sensor), reinicios e falhas (vezes) e,
  do DHT11, umidade (%), temperatura-ar (C) e sensacao-termica (C, indice de calor). Sem DHT11 ligado, so aparece "DHT11 falha".
  Saida (115200 baud):
    linhas "# ..."  diagnostico (o gateway mostra como "placa: ...")
    linhas JSON     uma por leitura, no formato do gateway (mqtt/catalogo-topicos.md, secao 2):
                    {"no":"no19","grandeza":"co2","valor":612,"unidade":"ppm","seq":1}
  Comandos pelo Monitor Serial (feche o gateway antes; "Nova linha"):
    i  informacoes: versao, faixa, estado da ABC (bytes crus)
    z  ZERO em 400 ppm (so ao ar livre, ligado ha 20 min ou mais)
    a  liga a ABC      d  desliga a ABC
    2  faixa 2000 ppm  5  faixa 5000 ppm  (o sensor pode precisar ser religado)
    s  SPAN em 2000 ppm (so com gas-padrao de 2000 ppm! nunca no ar comum)
    r  reinicia o sensor (0x8D)
    f  alterna o intervalo entre 10 s (telemetria) e 2 s (monitor_mhz19c.py)
    x  liga/desliga a leitura estendida (0x85 e 0x84, nao documentados - ATENCAO: no ensaio de
       09/11/2026 o sensor passou a travar a cada ciclo com eles ligados; deixe desligado no uso normal)
  Comandos 0x84, 0x85, 0x7D, 0x9B, 0xA0 e 0x8D nao estao no manual do C; sao do MH-Z19B e da
  engenharia reversa da comunidade (biblioteca MH-Z19 de WifWaf). Se o sensor nao responder,
  aparece "sem resposta" - nao e defeito.
*/
#include <DHT.h>
const char* NO = "no19";             // projeto "teste" da telemetria-cria (no = "no" + numero)
const int PINO_RX2 = 16, PINO_TX2 = 17, PINO_DHT = 4;
DHT dht(PINO_DHT, DHT11);
unsigned long falhasDht = 0;
unsigned long INTERVALO_MS = 10000;         // 10 s = padrao do catalogo; tecla f alterna com 2 s
const unsigned long PREAQUECIMENTO_MS = 60000UL;
unsigned long ultima = 0, seq = 0;
unsigned long reinicios = 0;   // vezes que o SENSOR religou ou travou (a placa continua ligada)
unsigned long falhas = 0;      // respostas invalidas ao 0x86
int ultimoPpm = -1;            // -1 = ainda nao leu
bool estendido = false;        // tecla x: le tambem 0x85 e 0x84 (nao documentados)
bool pinosTrocados = false;    // true = TX/RX do sensor ligados ao contrario (16 <-> 17), detectado sozinho
int seguidasSemResposta = 0;
int seguidos500 = 0;           // leituras seguidas exatamente em 500 ppm
int antesDo500 = -1;           // ultima leitura diferente de 500

void avisarReinicio(const char* motivo) {
  reinicios++;
  Serial.printf("# ATENCAO: o sensor reiniciou ou travou (%lu vezes): %s - confira Vin = 5,0 V e o conector\n", reinicios, motivo);
}

void enviar(uint8_t cmd, uint8_t b3 = 0, uint8_t b4 = 0, uint8_t b6 = 0, uint8_t b7 = 0) {
  uint8_t p[9] = {0xFF, 0x01, cmd, b3, b4, 0x00, b6, b7, 0x00};
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += p[i];
  p[8] = 0xFF - soma + 1;
  while (Serial2.available()) Serial2.read();
  Serial2.write(p, 9);
}

// envia o comando e le os 9 bytes; devolve true se o cabecalho e o checksum conferem
bool pedir(uint8_t cmd, uint8_t r[9], bool imprimir) {
  enviar(cmd);
  int n = Serial2.readBytes(r, 9);
  if (imprimir) {
    Serial.printf("# cmd 0x%02X -> %d bytes:", cmd, n);
    for (int i = 0; i < n; i++) Serial.printf(" %02X", r[i]);
  }
  bool ok = n == 9 && r[0] == 0xFF && r[1] == cmd;
  if (ok) {
    uint8_t soma = 0;
    for (int i = 1; i < 8; i++) soma += r[i];
    ok = (uint8_t)(0xFF - soma + 1) == r[8];
  }
  if (imprimir) Serial.println(ok ? "  (ok)" : "  (sem resposta valida)");
  return ok;
}

void publicar(const char* grandeza, float valor, int casas, const char* unidade) {
  seq++;
  Serial.printf("{\"no\":\"%s\",\"grandeza\":\"%s\",\"valor\":%.*f,\"unidade\":\"%s\",\"seq\":%lu}\n",
                NO, grandeza, casas, valor, unidade, seq);
}

void informacoes() {
  uint8_t r[9];
  if (pedir(0xA0, r, true)) Serial.printf("#   versao do firmware: %c%c%c%c\n", r[2], r[3], r[4], r[5]);
  if (pedir(0x9B, r, true)) Serial.printf("#   faixa: %d ppm\n", r[4] * 256 + r[5]);
  if (pedir(0x7D, r, true)) Serial.printf("#   ABC: %s (byte 7 = %d)\n", r[7] ? "LIGADA" : "desligada", r[7]);
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, PINO_RX2, PINO_TX2);
  Serial2.setTimeout(200);
  dht.begin();
  delay(500);
  Serial.println("# 05c diagnostico MH-Z19C. Comandos: i z a d 2 5 s r x f");
  informacoes();
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'i') informacoes();
    if (c == 'z') { enviar(0x87); Serial.println("# ZERO enviado (400 ppm)"); }
    if (c == 'a') { enviar(0x79, 0xA0); Serial.println("# ABC ligada"); }
    if (c == 'd') { enviar(0x79, 0x00); Serial.println("# ABC desligada"); }
    if (c == '2') { enviar(0x99, 0, 0, 2000 >> 8, 2000 & 0xFF); Serial.println("# faixa 2000 ppm"); }
    if (c == '5') { enviar(0x99, 0, 0, 5000 >> 8, 5000 & 0xFF); Serial.println("# faixa 5000 ppm"); }
    if (c == 's') { enviar(0x88, 2000 >> 8, 2000 & 0xFF); Serial.println("# SPAN enviado (2000 ppm)"); }
    if (c == 'r') { enviar(0x8D); Serial.println("# reinicio do sensor enviado"); }
    if (c == 'f') { INTERVALO_MS = INTERVALO_MS == 10000 ? 2000 : 10000; Serial.printf("# intervalo: %lu ms\n", INTERVALO_MS); }
    if (c == 'x') { estendido = !estendido; Serial.printf("# leitura estendida (0x85/0x84): %s\n", estendido ? "LIGADA" : "desligada"); }
  }
  if (millis() - ultima < INTERVALO_MS) return;
  ultima = millis();

  uint8_t r[9];
  bool aquecido = millis() >= PREAQUECIMENTO_MS;
  if (pedir(0x86, r, true)) {
    int ppm = r[2] * 256 + r[3];
    int temp = (int)r[4] - 40;
    // o sensor volta a 500 ppm FIXO por ~1 min depois de religar. Um 500 isolado e so o CO2 real passando
    // por 500 (falso alarme visto em 09/11/2026); reinicio = 3 leituras seguidas em 500 depois de outro valor
    if (ppm == 500) {
      if (++seguidos500 == 3 && antesDo500 > 0) avisarReinicio("voltou ao valor de partida (500 ppm fixo)");
    } else {
      seguidos500 = 0;
      antesDo500 = ppm;
    }
    ultimoPpm = ppm;
    if (pinosTrocados) Serial.println("#   AVISO: o sensor so responde com TX/RX invertidos - troque os fios do GPIO 16 e 17");
    Serial.printf("#   CO2 %d ppm  temp %d C  status 0x%02X%s\n", ppm, temp, r[5], aquecido ? "" : "  (aquecendo)");
    if (aquecido) {
      publicar("co2", ppm, 0, "ppm");
      publicar("temperatura", temp, 0, "C");
    }
    seguidasSemResposta = 0;
  } else {
    falhas++;
    // 3 falhas seguidas: tenta os pinos invertidos (fio TX/RX trocado e o erro mais comum de montagem)
    if (++seguidasSemResposta % 3 == 0) {
      pinosTrocados = !pinosTrocados;
      Serial2.end();
      Serial2.begin(9600, SERIAL_8N1, pinosTrocados ? PINO_TX2 : PINO_RX2, pinosTrocados ? PINO_RX2 : PINO_TX2);
      Serial.printf("# sem resposta: testando %s (TX do sensor no GPIO %d, RX no GPIO %d)\n",
                    pinosTrocados ? "pinos INVERTIDOS" : "pinos normais",
                    pinosTrocados ? PINO_TX2 : PINO_RX2, pinosTrocados ? PINO_RX2 : PINO_TX2);
    }
    if (ultimoPpm != 0) avisarReinicio("resposta invalida ao 0x86");
    ultimoPpm = 0;
  }
  if (aquecido) {
    publicar("reinicios", reinicios, 0, "vezes");
    publicar("falhas", falhas, 0, "vezes");
  }
  // DHT11: le junto com o CO2 (o intervalo minimo do DHT11 e 2 s, igual ao modo rapido)
  float umid = dht.readHumidity(), tAr = dht.readTemperature();
  // 0 % com checksum "certo" = bits zerados por mau contato (abaixo dos 20 % que o DHT11 mede): descarta
  if (isnan(umid) || isnan(tAr) || umid < 1) {
    falhasDht++;
    Serial.printf("#   DHT11 falha na leitura (%lu vezes) - confira DATA no GPIO 4 e + no 3V3\n", falhasDht);
  } else {
    float sensacao = dht.computeHeatIndex(tAr, umid, false);   // indice de calor (NWS), em C
    Serial.printf("#   DHT11 umidade %.0f %%  temp %.1f C  sensacao %.1f C\n", umid, tAr, sensacao);
    publicar("umidade", umid, 0, "%");
    publicar("temperatura-ar", tAr, 1, "C");
    publicar("sensacao-termica", sensacao, 1, "C");
  }
  if (!estendido) return;
  // comandos NAO documentados no manual do MH-Z19C: so com a tecla x (suspeitos de travar o sensor)
  if (pedir(0x85, r, true))
    Serial.printf("#   0x85: bytes2-3 = %d  bytes4-5 (CO2 sem limite) = %d  bytes6-7 = %d\n",
                  r[2] * 256 + r[3], r[4] * 256 + r[5], r[6] * 256 + r[7]);
  if (pedir(0x84, r, true))
    Serial.printf("#   0x84: bytes2-3 (bruto) = %d  bytes4-5 = %d\n", r[2] * 256 + r[3], r[4] * 256 + r[5]);
}
