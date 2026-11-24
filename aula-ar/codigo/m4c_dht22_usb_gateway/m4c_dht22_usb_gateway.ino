/*
  Guia de montagem do monitor de ar - Etapa 4C: DHT22 / AM2302 na REDE DE TELEMETRIA pela USB
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)
  Biblioteca: DHT sensor library (Adafruit)

  Para quando o Wi-Fi nao alcanca o servidor (ex.: rede da escola que isola os aparelhos).
  O ESP32 escreve uma linha JSON por leitura na USB e o gateway do telemetria-cria
  (gateway/gateway.py) envia ao servidor:
     {"no":"no8","grandeza":"temperatura","valor":28.4,"unidade":"C","seq":1}
  No PC, na raiz do telemetria-cria:  python3 gateway/gateway.py --porta /dev/ttyUSB0
  (feche o Monitor Serial antes: uma porta serial por programa)

  Ligacoes: as MESMAS das Etapas 4A/4B. Nao mude nada na protoboard.
    DHT22 (3 fios): vermelho -> 3V3   amarelo -> GPIO 4   preto -> GND
*/
#include <DHT.h>

// ------------------------------------------------------------------ ajustes
const char* NO = "no8";              // o projeto vem do .env do gateway (GATEWAY_PROJETO)
const int PINO_DHT = 4;
const float CORR_TEMP_C = 0.0;       // os mesmos valores da Etapa 4A
const float UR_A = 1.0, UR_B = 0.0;
const uint32_t INTERVALO_MS = 10000; // padrao do catalogo: uma leitura a cada 10 s
// ---------------------------------------------------------------------------

DHT dht(PINO_DHT, DHT22);
unsigned long seq = 0, ultimaLeitura = 0;

// Uma linha JSON por leitura (formato do gateway).
void publicar(const char* grandeza, float valor, const char* unidade) {
  seq++;
  Serial.printf("{\"no\":\"%s\",\"grandeza\":\"%s\",\"valor\":%.1f,\"unidade\":\"%s\",\"seq\":%lu}\n",
                NO, grandeza, valor, unidade, seq);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println("# DHT22 pela USB, no " + String(NO) + " - primeira leitura em 10 s");
  ultimaLeitura = millis();
}

void loop() {
  if (millis() - ultimaLeitura < INTERVALO_MS) return;
  ultimaLeitura = millis();

  float urLida = dht.readHumidity(), tLida = dht.readTemperature();
  // Leitura com falha nao sai e nao recebe seq.
  if (isnan(urLida) || isnan(tLida) || urLida < 1.0 || urLida > 100.0 || tLida < -40.0 || tLida > 80.0) {
    Serial.println("# sem resposta do DHT22 (dado no GPIO 4? 3V3? GND?): nao enviado");
    return;
  }
  float t = tLida + CORR_TEMP_C;
  float ur = constrain(UR_A * urLida + UR_B, 0, 100);
  publicar("temperatura", round(t * 10) / 10.0, "C");
  publicar("umidade", round(ur * 10) / 10.0, "%");
}
