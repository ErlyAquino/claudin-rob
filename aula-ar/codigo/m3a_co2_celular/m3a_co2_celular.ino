/*
  Guia de montagem do monitor de ar - Etapa 3A: MH-Z19C (CO2 por infravermelho), resultado no celular
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)    Bibliotecas: nenhuma extra (Serial2 vem no core)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  O ESP32 cria a propria rede Wi-Fi (modo ponto de acesso). Sem roteador e sem servidor:
     celular -> Wi-Fi "Ar-CO2" (senha 12345678) -> navegador -> http://192.168.4.1
     dados brutos em JSON:                                 http://192.168.4.1/dados
     estado do sensor (versao, faixa, ABC):                http://192.168.4.1/info
     zero em 400 ppm, AO AR LIVRE (pagina com botao):      http://192.168.4.1/zero
     autocalibracao (ABC) liga / desliga:                  http://192.168.4.1/abc?ligar=1  (ou 0)

  Ligacoes (as MESMAS do no da Rede de Telemetria, firmware/no-ar):
    MH-Z19C Vin -> VIN (5 V)  NUNCA no 3V3: em 3,3 V a lampada IR enfraquece e o sensor marca 5000
            GND -> GND
            Tx  -> GPIO 16 (RX2)      Rx -> GPIO 17 (TX2)   (UART de 3,3 V: direto, sem divisor)
            HD, SR, Vo, PWM, AOT: sem ligacao (HD no GND por 7 s faz o zero!)

  Comandos pelo Monitor Serial (115200): i = estado   z = zero 400 ppm   a / d = ABC liga / desliga
  O CO2 vale depois de 3 min ligado (o manual pede 1 min; na partida o sensor devolve 500 ppm fixo).

  O zero so e aceito UMA vez por partida, com o sensor ligado ha 30 min (exigencia do manual) e
  com a leitura estavel nos ultimos 5 min. Pelo navegador, ele exige o botao da pagina /zero
  (pedido POST): recarregar a pagina ou abrir o endereco pelo historico nao refaz o zero.
*/
#include "monitor_wifi.h"

// ------------------------------------------------------------------ ajustes
const int PINO_RX2 = 16;             // recebe do Tx do sensor
const int PINO_TX2 = 17;             // envia ao Rx do sensor
const unsigned long PREAQUECIMENTO_MS = 3UL * 60 * 1000;
const unsigned long TEMPO_MIN_ZERO_MS = 30UL * 60 * 1000;   // 30 min ligado (manual v1.2)
const unsigned long INTERVALO_MS = 5000;
const int AMOSTRAS_ESTAVEL = 60;     // 60 leituras de 5 s = 5 min
const int VARIACAO_MAX_PPM = 40;     // maior - menor nos ultimos 5 min, para aceitar o zero
const int FAIXA_PPM = 5000;          // faixa de fabrica desta unidade (veja /info)
const int CO2_BOA = 800, CO2_ACEITAVEL = 1000, CO2_VENTILE = 1500;   // ANVISA RE 9/2003: <= 1000
// ---------------------------------------------------------------------------

unsigned long ultima = 0, falhas = 0;
int maximo = 0, minimo = 0, ultimoPpm = -1;
bool aquecido = false, zeroFeito = false;
int janela[AMOSTRAS_ESTAVEL];        // ultimas leituras validas (para conferir a estabilidade)
int nJanela = 0, posJanela = 0;

// pacote de 9 bytes: FF 01 cmd b3 b4 00 b6 b7 checksum
void enviarComando(uint8_t cmd, uint8_t b3 = 0, uint8_t b4 = 0, uint8_t b6 = 0, uint8_t b7 = 0) {
  uint8_t p[9] = {0xFF, 0x01, cmd, b3, b4, 0x00, b6, b7, 0x00};
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += p[i];
  p[8] = 0xFF - soma + 1;
  while (Serial2.available()) Serial2.read();   // descarta restos
  Serial2.write(p, 9);
}

// envia e confere a resposta (cabecalho FF, eco do comando e checksum)
bool pedir(uint8_t cmd, uint8_t r[9]) {
  enviarComando(cmd);
  if (Serial2.readBytes(r, 9) != 9 || r[0] != 0xFF || r[1] != cmd) return false;
  uint8_t soma = 0;
  for (int i = 1; i < 8; i++) soma += r[i];
  return (uint8_t)(0xFF - soma + 1) == r[8];
}

// comando 0x86 (documentado): CO2 = byte2 * 256 + byte3.
// A temperatura interna (byte4 - 40) nao esta no manual: vem da comunidade, e nao mede o ar.
int lerCO2(int &temperatura) {
  uint8_t r[9];
  if (!pedir(0x86, r)) return -1;
  temperatura = (int)r[4] - 40;
  return r[2] * 256 + r[3];
}

// versao (0xA0), faixa (0x9B) e ABC (0x7D): nao estao no manual do C (sao do MH-Z19B),
// mas esta unidade respondeu a todos. Consulte so quando precisar.
String estado() {
  uint8_t r[9];
  String s = "MH-Z19C\n";
  if (pedir(0xA0, r)) {
    s += "versao do firmware: ";
    for (int i = 2; i <= 5; i++) s += (char)r[i];   // 4 caracteres, ex.: 100E
    s += "\n";
  } else s += "versao: sem resposta\n";
  s += pedir(0x9B, r) ? "faixa: " + String(r[4] * 256 + r[5]) + " ppm\n" : "faixa: sem resposta\n";
  s += pedir(0x7D, r) ? String("ABC (autocalibracao): ") + (r[7] ? "LIGADA" : "desligada") + "\n"
                      : "ABC: sem resposta\n";
  s += "ligado ha " + String(millis() / 60000) + " min\n";
  return s;
}

// variacao (maior - menor) das leituras guardadas; -1 se ainda nao ha 5 min de leituras
int variacaoRecente() {
  if (nJanela < AMOSTRAS_ESTAVEL) return -1;
  int mai = janela[0], men = janela[0];
  for (int i = 1; i < AMOSTRAS_ESTAVEL; i++) {
    mai = max(mai, janela[i]);
    men = min(men, janela[i]);
  }
  return mai - men;
}

String zero() {
  if (zeroFeito) return "RECUSADO: o zero ja foi feito nesta partida. Desligue e religue para outro.\n";
  if (millis() < TEMPO_MIN_ZERO_MS)
    return "RECUSADO: o sensor precisa de 30 min ligado AO AR LIVRE (conta desde que a placa ligou)."
           " Faltam " + String((TEMPO_MIN_ZERO_MS - millis()) / 60000 + 1) + " min.\n";
  if (ultimoPpm <= 0 || ultimoPpm >= FAIXA_PPM)
    return "RECUSADO: a ultima leitura falhou ou esta no fundo de escala.\n";
  int v = variacaoRecente();
  if (v < 0 || v > VARIACAO_MAX_PPM)
    return "RECUSADO: leitura instavel (variou " + String(v) + " ppm em 5 min; maximo " +
           String(VARIACAO_MAX_PPM) + "). Espere estabilizar.\n";
  enviarComando(0x87);
  zeroFeito = true;
  maximo = minimo = 0;
  nJanela = posJanela = 0;
  return "ZERO enviado (antes: " + String(ultimoPpm) + " ppm). A leitura atual passa a 400 ppm.\n"
         "Espere 2 min e confira (380 a 440 ppm). Se nao mudar, use o pino HD.\n";
}

String abc(bool ligar) {
  enviarComando(0x79, ligar ? 0xA0 : 0x00);
  return String("ABC ") + (ligar ? "LIGADA" : "desligada") + ". Confira em /info.\n";
}

const char* qualidade(int ppm) {
  if (ppm <= CO2_BOA) return "ar bom";
  if (ppm <= CO2_ACEITAVEL) return "ar aceitavel";
  if (ppm <= CO2_VENTILE) return "ventile: abra porta e janelas";
  return "AR RUIM: ventile ja";
}

void responderTexto(const String& t) { _servidor.send(200, "text/plain; charset=utf-8", t); }

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, PINO_RX2, PINO_TX2);
  Serial2.setTimeout(150);           // curto: enquanto espera, a pagina do celular nao e atendida
  monitorIniciar("Ar-CO2");
  // rotas extras do servidor web do monitor_wifi.h
  _servidor.on("/info", []() { responderTexto(estado()); });
  // GET /zero so mostra o botao; o zero sai no POST do botao
  _servidor.on("/zero", HTTP_GET, []() {
    _servidor.send(200, "text/html; charset=utf-8",
      "<meta name=viewport content='width=device-width'><h3>Zero do MH-Z19C em 400 ppm</h3>"
      "<p>So ao ar livre, com o sensor ligado ha 30 min e a leitura estavel.</p>"
      "<form method=post><button style='font-size:1.4em'>Fazer o zero agora</button></form>");
  });
  _servidor.on("/zero", HTTP_POST, []() {
    String resposta = zero();
    Serial.print(resposta);
    responderTexto(resposta);
  });
  _servidor.on("/abc", []() {
    String a = _servidor.arg("ligar");
    if (a != "0" && a != "1") {      // qualquer outro valor so mostra a ajuda
      responderTexto("Use /abc?ligar=1 (liga) ou /abc?ligar=0 (desliga)\n");
      return;
    }
    String resposta = abc(a == "1");
    Serial.print(resposta);
    responderTexto(resposta);
  });
  Serial.println("comandos: i = estado | z = zero 400 ppm (ar livre) | a / d = ABC liga / desliga");
}

void loop() {
  monitorAtender();
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'i') Serial.print(estado());
    if (c == 'z') Serial.print(zero());
    if (c == 'a') Serial.print(abc(true));
    if (c == 'd') Serial.print(abc(false));
  }
  if (millis() - ultima < INTERVALO_MS) return;
  ultima = millis();

  int temperatura;
  int ppm = lerCO2(temperatura);
  ultimoPpm = ppm;
  if (ppm < 0) {
    falhas++;
    Serial.printf("sem resposta do MH-Z19C (%lu): Tx->GPIO16? Rx->GPIO17? Vin no VIN?\n", falhas);
    monitorPublicar(jsonMonitor("MH-Z19C", item("Falhas", falhas, ""), true, "sensor nao responde"));
    return;
  }
  if (millis() >= PREAQUECIMENTO_MS) aquecido = true;   // fica verdadeiro para sempre
  if (!aquecido) {
    unsigned long falta = (PREAQUECIMENTO_MS - millis()) / 1000;
    Serial.printf("aquecendo: faltam %lu s | %d ppm (ainda nao vale) | %d C\n",
                  falta, ppm, temperatura);
    monitorPublicar(jsonMonitor("MH-Z19C - aquecendo",   // 1o item em ppm: o grafico nao mistura
      item("Leitura", ppm, "ppm") + "," + item("Faltam", falta, "s"),
      false, "aguarde o aquecimento"));
    return;
  }
  if (ppm >= FAIXA_PPM) {
    Serial.printf("%d ppm = fundo de escala: Vin no 3V3? alimentacao fraca? zero errado?\n", ppm);
    monitorPublicar(jsonMonitor("MH-Z19C - fundo de escala", item("CO2", ppm, "ppm"), true,
      "5000 fixo: confira o Vin no VIN (5 V)"));
    return;
  }
  janela[posJanela] = ppm;
  posJanela = (posJanela + 1) % AMOSTRAS_ESTAVEL;
  if (nJanela < AMOSTRAS_ESTAVEL) nJanela++;
  if (ppm > maximo) maximo = ppm;
  if (minimo == 0 || ppm < minimo) minimo = ppm;
  // linha "nome:valor": o Plotter Serial da Arduino IDE desenha cada grandeza
  Serial.printf("CO2_ppm:%d Temp_interna_C:%d\n", ppm, temperatura);
  Serial.println(qualidade(ppm));    // linha so de texto: o Plotter ignora
  monitorPublicar(jsonMonitor("MH-Z19C - CO2 (NDIR)",
    item("CO2", ppm, "ppm") + "," + item("Minimo", minimo, "ppm") + "," +
    item("Maximo", maximo, "ppm") + "," + item("Temp. interna", temperatura, "C"),
    ppm > CO2_ACEITAVEL, qualidade(ppm)));
}
