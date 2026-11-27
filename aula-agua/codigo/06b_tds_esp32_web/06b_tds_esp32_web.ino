/*
  06b - Condutividade da solucao no celular: TDS Meter V1.0 + DS18B20 no ESP32, com pagina Wi-Fi
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)
  Bibliotecas: OneWire e DallasTemperature (o resto vem com o ESP32)
  Arquivo extra na mesma pasta: pagina_tds.h

  Ligacoes:
    TDS Meter   -  -> GND     +  -> GPIO 32 (ligado so para medir)     A -> GPIO 34
    DS18B20     vermelho -> 3V3   preto -> GND   amarelo -> GPIO 4 (4,7 k do amarelo ao 3V3)
  A sonda do TDS e a capsula do DS18B20 ficam juntas na agua. As placas ficam longe dela.

  Celular: entre na rede "Horta-CE" (senha 12345678) e abra http://192.168.4.1
  Monitor Serial (115200, "Nova linha"):  c 1413 = calibrar na solucao de 1413 uS/cm
                                          r = apagar a calibracao
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "pagina_tds.h"

const char* NOME_DA_REDE = "Horta-CE";
const char* SENHA_DA_REDE = "12345678";        // minimo de 8 caracteres; troque antes de usar

const int PINO_TDS = 34;                       // saida A do sensor (ADC1)
const int PINO_ALIMENTACAO_TDS = 32;           // pino + do sensor
const int PINO_DS18B20 = 4;
const bool DESLIGAR_TDS_ENTRE_LEITURAS = true; // true: o sensor so fica ligado durante a medida
const unsigned long ESPERA_TDS_LIGADO = 800;   // ms entre ligar o sensor e ler
const unsigned long INTERVALO = 5000;          // ms entre duas medidas
const float TEMPERATURA_SEM_SONDA = 25.0;      // usada se o DS18B20 nao responder
const float FATOR_TDS = 0.5;                   // ppm = CE (uS/cm) x 0,5

WebServer servidor(80);
Preferences memoria;
OneWire umFio(PINO_DS18B20);
DallasTemperature ds18b20(&umFio);

float fatorK = 1.0;                            // correcao da calibracao
float faixaMin = 1200, faixaMax = 1600;        // faixa desejada da CE, em uS/cm (muda na pagina)
float tensao = 0, ce25 = 0, temperatura = TEMPERATURA_SEM_SONDA;
bool temSondaDeTemperatura = false, jaMediu = false, medindo = false;
unsigned long inicioDaMedida = 0, ultimaMedida = 0;

// ------------------------------------------------------------------ medida
float curvaDoModulo(float v) {                 // tensao (V) -> CE (uS/cm), curva do fabricante
  return 133.42 * v * v * v - 255.86 * v * v + 857.39 * v;
}

float lerTensao() {                            // media de 30 leituras, sem os extremos
  const int N = 30;
  int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINO_TDS); delay(5); }
  for (int i = 0; i < N - 1; i++)
    for (int j = 0; j < N - 1 - i; j++)
      if (v[j] > v[j + 1]) { int t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  long soma = 0;
  for (int i = 5; i < N - 5; i++) soma += v[i];
  return soma / float(N - 10) / 1000.0;
}

void comecarMedida() {                         // liga o sensor e pede a temperatura; le depois
  digitalWrite(PINO_ALIMENTACAO_TDS, HIGH);
  ds18b20.requestTemperatures();               // nao espera: a conversao leva cerca de 750 ms
  inicioDaMedida = millis();
  medindo = true;
}

void terminarMedida() {
  float t = ds18b20.getTempCByIndex(0);
  temSondaDeTemperatura = (t != DEVICE_DISCONNECTED_C && t != 85.0);
  temperatura = temSondaDeTemperatura ? t : TEMPERATURA_SEM_SONDA;
  tensao = lerTensao();
  if (DESLIGAR_TDS_ENTRE_LEITURAS) digitalWrite(PINO_ALIMENTACAO_TDS, LOW);
  float ce = curvaDoModulo(tensao) * fatorK;             // CE na temperatura da solucao
  ce25 = ce / (1.0 + 0.02 * (temperatura - 25.0));       // CE referida a 25 C
  medindo = false;
  jaMediu = true;
  ultimaMedida = millis();
  Serial.printf("CE: %.0f uS/cm (%.2f mS/cm)   TDS: %.0f ppm   %.1f C%s   %.3f V   K = %.3f\n",
                ce25, ce25 / 1000.0, ce25 * FATOR_TDS, temperatura,
                temSondaDeTemperatura ? "" : " (sem DS18B20)", tensao, fatorK);
}

const char* situacao() {
  if (!jaMediu) return "espera";
  if (tensao < 0.16) return "ar";              // o ADC nao le abaixo de 0,15 V
  if (tensao > 2.2) return "fim";              // fim da escala do modulo
  if (ce25 < faixaMin) return "baixa";
  if (ce25 > faixaMax) return "alta";
  return "ok";
}

// ------------------------------------------------------------------ calibracao
// Com a sonda na solucao-padrao: K = (CE verdadeira, na temperatura da solucao) / (CE da curva).
bool calibrar(float referencia25) {
  float bruta = curvaDoModulo(tensao);
  if (!jaMediu || tensao < 0.2 || bruta <= 0) return false;
  float k = referencia25 * (1.0 + 0.02 * (temperatura - 25.0)) / bruta;
  if (k < 0.25 || k > 4.0) return false;       // fora disso ha erro: solucao, sonda ou fiacao
  fatorK = k;
  memoria.putFloat("k", fatorK);
  ce25 = referencia25;
  Serial.printf("Calibrado em %.0f uS/cm: K = %.3f\n", referencia25, fatorK);
  return true;
}

// ------------------------------------------------------------------ pagina
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_TDS); }

void rotaDados() {
  char json[240];
  snprintf(json, sizeof(json),
           "{\"ce\":%.0f,\"tds\":%.0f,\"temp\":%.1f,\"sonda\":%d,\"v\":%.3f,\"k\":%.3f,"
           "\"min\":%.0f,\"max\":%.0f,\"sit\":\"%s\"}",
           ce25, ce25 * FATOR_TDS, temperatura, temSondaDeTemperatura ? 1 : 0, tensao, fatorK,
           faixaMin, faixaMax, situacao());
  servidor.send(200, "application/json", json);
}

void rotaCalibrar() {
  float ref = servidor.arg("ref").toFloat();
  if (ref < 100 || ref > 2000 || !calibrar(ref)) {
    servidor.send(400, "application/json", "{\"erro\":\"calibracao recusada\"}");
    return;
  }
  rotaDados();
}

void rotaZerar() {
  fatorK = 1.0;
  memoria.putFloat("k", fatorK);
  rotaDados();
}

void rotaFaixa() {
  float mn = servidor.arg("min").toFloat(), mx = servidor.arg("max").toFloat();
  if (mn < 0 || mx > 3000 || mn >= mx) {
    servidor.send(400, "application/json", "{\"erro\":\"faixa invalida\"}");
    return;
  }
  faixaMin = mn; faixaMax = mx;
  memoria.putFloat("min", faixaMin); memoria.putFloat("max", faixaMax);
  rotaDados();
}

// ------------------------------------------------------------------ programa
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  pinMode(PINO_ALIMENTACAO_TDS, OUTPUT);
  digitalWrite(PINO_ALIMENTACAO_TDS, DESLIGAR_TDS_ENTRE_LEITURAS ? LOW : HIGH);
  analogSetPinAttenuation(PINO_TDS, ADC_11db);
  ds18b20.begin();
  ds18b20.setWaitForConversion(false);         // requestTemperatures() volta na hora

  memoria.begin("tds", false);
  fatorK = memoria.getFloat("k", 1.0);
  faixaMin = memoria.getFloat("min", faixaMin);
  faixaMax = memoria.getFloat("max", faixaMax);

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);
  servidor.on("/", rotaPagina);
  servidor.on("/dados", rotaDados);
  servidor.on("/calibrar", rotaCalibrar);
  servidor.on("/zerar", rotaZerar);
  servidor.on("/faixa", rotaFaixa);
  servidor.begin();
  Serial.printf("Rede \"%s\" (senha %s). Abra http://%s\n", NOME_DA_REDE, SENHA_DA_REDE,
                WiFi.softAPIP().toString().c_str());
  Serial.printf("K = %.3f   faixa desejada: %.0f a %.0f uS/cm\n", fatorK, faixaMin, faixaMax);
  comecarMedida();
}

void loop() {
  servidor.handleClient();                     // atende o celular

  unsigned long agora = millis();
  if (medindo && agora - inicioDaMedida >= ESPERA_TDS_LIGADO) terminarMedida();
  if (!medindo && agora - ultimaMedida >= INTERVALO) comecarMedida();

  if (Serial.available()) {                    // comandos pelo cabo USB
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("c")) {
      float ref = cmd.substring(1).toFloat();
      if (ref < 100 || ref > 2000 || !calibrar(ref))
        Serial.println("Calibracao recusada: use c 1413 com a sonda na solucao-padrao.");
    } else if (cmd == "r") {
      fatorK = 1.0;
      memoria.putFloat("k", fatorK);
      Serial.println("Calibracao apagada: K = 1.000");
    }
  }
}
