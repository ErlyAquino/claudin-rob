/*
  Guia de montagem do monitor de ar - Etapa 4A: DHT22 / AM2302 (temperatura e umidade), no celular
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)    Biblioteca: DHT sensor library (Adafruit)
  Arquivos extras na mesma pasta: monitor_wifi.h, pagina_web.h

  O ESP32 cria a propria rede Wi-Fi (modo ponto de acesso). Sem roteador e sem servidor:
     celular -> Wi-Fi "Ar-DHT22" (senha 12345678) -> navegador -> http://192.168.4.1
     dados brutos em JSON:                                   http://192.168.4.1/dados

  Ligacoes (as MESMAS do no da Rede de Telemetria, firmware/no-ar):
    DHT22 com cabo de 3 fios (AM2302): vermelho -> 3V3   amarelo -> GPIO 4   preto -> GND
                                       (o resistor de pull-up ja vem dentro da caixa)
    DHT22 de 4 pinos, sem placa:       1 VCC -> 3V3   2 dado -> GPIO 4   3 nada   4 GND -> GND
                                       + resistor de 10 k do pino 2 (dado) ao 3V3
  Alimente SEMPRE no 3V3: o fio de dados fica no nivel que o GPIO do ESP32 aceita.
  Nunca na trilha de 5 V (VIN) usada pelos MQ e pelo MH-Z19C.

  O sketch le a cada 2,5 s (o DHT22 exige pelo menos 2 s entre leituras) e mostra temperatura,
  umidade, sensacao termica (indice de calor) e ponto de orvalho. A cada minuto, escreve a media
  das leituras no Monitor Serial (115200): e ela que entra na calibracao.
*/
#include <DHT.h>
#include "monitor_wifi.h"

// ------------------------------------------------------------------ ajustes
const int PINO_DHT = 4;              // o mesmo do firmware/no-ar
const unsigned long INTERVALO_MS = 2500;
// Calibracao (deixe 0 / 1 / 0 enquanto nao calibrar; os mesmos valores vao no m4b):
const float CORR_TEMP_C = 0.0;       // C: T_referencia - T_lida
const float UR_A = 1.0;              // ganho da umidade (2 pontos) ou 1.0
const float UR_B = 0.0;              // %: deslocamento da umidade
const float SENSACAO_PERIGO_C = 41.0;   // indice de calor: "perigo" (alerta vermelho na pagina)
const int LEITURAS_POR_MEDIA = 24;   // 24 x 2,5 s = 1 min
// ---------------------------------------------------------------------------

DHT dht(PINO_DHT, DHT22);
unsigned long ultima = 0, leituras = 0, falhas = 0, falhasSeguidas = 0;
double somaT = 0, somaUR = 0;
int nMedia = 0;

// ponto de orvalho (formula de Magnus): temperatura em que este ar comeca a condensar
float pontoDeOrvalho(float t, float ur) {
  const float a = 17.27, b = 237.7;
  float alfa = (a * t) / (b + t) + log(ur / 100.0);
  return (b * alfa) / (a - alfa);
}

// A biblioteca devolve NaN quando o sensor nao responde ou o checksum nao confere. Com mau
// contato, os 40 bits podem chegar zerados e o checksum "confere" (0 = 0): por isso tambem
// sao descartadas as leituras impossiveis (umidade abaixo de 1 % ou fora da faixa do sensor).
bool leituraValida(float ur, float t) {
  return !isnan(ur) && !isnan(t) && ur >= 1.0 && ur <= 100.0 && t >= -40.0 && t <= 80.0;
}

// faixas do indice de calor (tabela classica do NWS: 80 / 90 / 105 / 130 F), em graus Celsius
const char* faixa(float sensacao) {
  if (sensacao < 27) return "conforto termico";
  if (sensacao < 32) return "cautela: calor";
  if (sensacao < 41) return "cautela extrema: hidrate-se e ventile";
  if (sensacao < 54) return "PERIGO: calor excessivo";
  return "PERIGO EXTREMO";
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  monitorIniciar("Ar-DHT22");
  Serial.printf("DHT22 no GPIO %d | correcoes: T %+.1f C | UR x %.3f %+.1f\n",
                PINO_DHT, CORR_TEMP_C, UR_A, UR_B);
}

void loop() {
  monitorAtender();
  if (millis() - ultima < INTERVALO_MS) return;
  ultima = millis();

  float urLida = dht.readHumidity(), tLida = dht.readTemperature();
  leituras++;
  if (!leituraValida(urLida, tLida)) {
    falhas++; falhasSeguidas++;
    Serial.printf("FALHA %lu de %lu: dado no GPIO 4? VCC no 3V3? GND? pull-up?\n", falhas, leituras);
    // a pagina so muda na 2a falha seguida: uma falha isolada nao apaga o grafico
    if (falhasSeguidas >= 2)
      monitorPublicar(jsonMonitor("DHT22 - sem leitura", item("Falhas seguidas", falhasSeguidas, ""),
        true, "sensor nao responde: confira os 3 fios"));
    return;
  }
  falhasSeguidas = 0;
  float t = tLida + CORR_TEMP_C;
  float ur = constrain(UR_A * urLida + UR_B, 0, 100);
  float sensacao = dht.computeHeatIndex(t, ur, false);   // false = em graus Celsius
  float orvalho = pontoDeOrvalho(t, ur);

  // linha "nome:valor": o Plotter Serial da Arduino IDE desenha cada grandeza
  Serial.printf("Temperatura_C:%.1f Umidade_%%:%.1f Sensacao_C:%.1f Orvalho_C:%.1f\n",
                t, ur, sensacao, orvalho);
  somaT += t; somaUR += ur; nMedia++;
  if (nMedia >= LEITURAS_POR_MEDIA) {
    Serial.printf("# media de 1 min: T = %.2f C | UR = %.1f %% | falhas ate agora: %lu de %lu\n",
                  somaT / nMedia, somaUR / nMedia, falhas, leituras);
    somaT = somaUR = 0; nMedia = 0;
  }
  monitorPublicar(jsonMonitor("DHT22 - temperatura e umidade",
    item("Temperatura", t, "C") + "," + item("Umidade", ur, "%") + "," +
    item("Sensacao termica", sensacao, "C") + "," + item("Ponto de orvalho", orvalho, "C") + "," +
    item("Falhas", falhas, ""),
    sensacao >= SENSACAO_PERIGO_C, faixa(sensacao)));
}
