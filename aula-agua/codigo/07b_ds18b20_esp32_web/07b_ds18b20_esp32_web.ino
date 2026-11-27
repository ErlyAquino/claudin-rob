/*
  07b - Temperatura da solucao no celular: DS18B20 no ESP32, com pagina Wi-Fi
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)
  Bibliotecas: OneWire e DallasTemperature (o resto vem com o ESP32)
  Arquivo extra na mesma pasta: pagina_temp.h

  Ligacoes:
    DS18B20   vermelho (VDD) -> 3V3   preto -> GND   amarelo (dados) -> GPIO 4
              resistor de 4,7 k entre o amarelo e o 3V3
  So a capsula de inox vai na agua. O ESP32 e a protoboard ficam longe dela.

  Celular: entre na rede "Horta-Temp" (senha 12345678) e abra http://192.168.4.1
  Monitor Serial (115200, "Nova linha"):
     a 0      = ajustar no banho de gelo (a temperatura verdadeira e 0 C)
     a 24.6   = ajustar pelo termometro de referencia, que marca 24,6 C
     r        = apagar o ajuste
     m        = recomecar a minima e a maxima
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "pagina_temp.h"

const char* NOME_DA_REDE = "Horta-Temp";
const char* SENHA_DA_REDE = "12345678";        // minimo de 8 caracteres; troque antes de usar

const int PINO_DS18B20 = 4;
const int RESOLUCAO = 12;                      // bits: passos de 0,0625 C, conversao de 750 ms
const unsigned long INTERVALO = 2000;          // ms entre duas medidas
const float AJUSTE_MAXIMO = 3.0;               // C: ajuste maior que isso e sinal de defeito
const float LIMITE_CRITICO = 30.0;             // C: acima disso a pagina fica vermelha
const int FALHAS_PARA_AVISAR = 3;              // leituras seguidas com falha ate avisar

WebServer servidor(80);
Preferences memoria;
OneWire umFio(PINO_DS18B20);
DallasTemperature ds18b20(&umFio);

DeviceAddress endereco;                        // os 8 bytes do sensor achado no fio
char enderecoTexto[24] = "nenhum";
bool temEndereco = false;

float ajuste = 0.0;                            // C somados a leitura do sensor
float faixaMin = 20, faixaMax = 26;            // faixa desejada, em C (muda na pagina)
float bruta = NAN, temperatura = NAN;          // sem e com o ajuste
float minima = NAN, maxima = NAN;              // desde que ligou, ou desde o botao
bool medindo = false;
int falhas = FALHAS_PARA_AVISAR;               // comeca "sem sensor" ate a primeira leitura boa
unsigned long inicioDaMedida = 0, ultimaMedida = 0, esperaDaConversao = 750;

// ------------------------------------------------------------------ medida
bool procurarSensor() {                        // acha o 1o sensor do fio e guarda o endereco
  ds18b20.begin();
  temEndereco = ds18b20.getAddress(endereco, 0);
  if (!temEndereco) { strcpy(enderecoTexto, "nenhum"); return false; }
  ds18b20.setResolution(endereco, RESOLUCAO);
  snprintf(enderecoTexto, sizeof(enderecoTexto), "%02X-%02X-%02X-%02X-%02X-%02X-%02X-%02X",
           endereco[0], endereco[1], endereco[2], endereco[3],
           endereco[4], endereco[5], endereco[6], endereco[7]);
  return true;
}

void comecarMedida() {                         // so pede a conversao; a leitura vem depois
  if (!temEndereco) procurarSensor();
  ds18b20.requestTemperatures();               // volta na hora (setWaitForConversion(false))
  inicioDaMedida = millis();
  medindo = true;
}

void terminarMedida() {
  float t = temEndereco ? ds18b20.getTempC(endereco) : DEVICE_DISCONNECTED_C;
  medindo = false;
  ultimaMedida = millis();
  // -127 C: sem resposta. 85 C: valor de partida do chip, antes da primeira conversao.
  if (t == DEVICE_DISCONNECTED_C || t == 85.0 || t < -55 || t > 125) {
    if (falhas < FALHAS_PARA_AVISAR) falhas++;
    if (falhas >= FALHAS_PARA_AVISAR) temEndereco = false;   // procura de novo na proxima
    Serial.println("DS18B20 sem leitura valida: confira os tres fios e o resistor de 4,7 k.");
    return;
  }
  falhas = 0;
  bruta = t;
  temperatura = bruta + ajuste;
  if (isnan(minima) || temperatura < minima) minima = temperatura;
  if (isnan(maxima) || temperatura > maxima) maxima = temperatura;
  Serial.printf("temperatura: %.2f C  (sensor: %.4f C  ajuste: %+.2f C)  min %.1f  max %.1f\n",
                temperatura, bruta, ajuste, minima, maxima);
}

const char* situacao() {
  if (falhas >= FALHAS_PARA_AVISAR) return "sem";      // sensor nao responde
  if (temperatura >= LIMITE_CRITICO) return "critica";
  if (temperatura < faixaMin) return "fria";
  if (temperatura > faixaMax) return "quente";
  return "ok";
}

// ------------------------------------------------------------------ ajuste (calibracao do zero)
// Com o sensor no banho de gelo (referencia = 0) ou ao lado de um termometro de confianca:
//    ajuste = temperatura verdadeira - temperatura que o sensor mostra
bool ajustar(float referencia) {
  if (falhas > 0 || isnan(bruta)) return false;
  float novo = referencia - bruta;
  if (fabs(novo) > AJUSTE_MAXIMO) return false;        // o DS18B20 erra ate 0,5 C de fabrica
  ajuste = novo;
  memoria.putFloat("ajuste", ajuste);
  temperatura = bruta + ajuste;
  minima = maxima = temperatura;
  Serial.printf("Ajustado em %.2f C: ajuste = %+.3f C\n", referencia, ajuste);
  return true;
}

void apagarAjuste() {
  ajuste = 0.0;
  memoria.putFloat("ajuste", ajuste);
  if (!isnan(bruta)) { temperatura = bruta; minima = maxima = temperatura; }
}

// ------------------------------------------------------------------ pagina
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_TEMP); }

void rotaDados() {
  char json[280];
  bool vazio = isnan(temperatura);             // ainda nao houve leitura boa
  snprintf(json, sizeof(json),
           "{\"t\":%.2f,\"bruta\":%.2f,\"ajuste\":%.2f,\"tmin\":%.1f,\"tmax\":%.1f,"
           "\"min\":%.1f,\"max\":%.1f,\"critica\":%.0f,\"sit\":\"%s\",\"rom\":\"%s\","
           "\"bits\":%d}",
           vazio ? 0 : temperatura, vazio ? 0 : bruta, ajuste, vazio ? 0 : minima,
           vazio ? 0 : maxima, faixaMin, faixaMax, LIMITE_CRITICO, situacao(), enderecoTexto,
           RESOLUCAO);
  servidor.send(200, "application/json", json);
}

void rotaAjustar() {
  if (!servidor.hasArg("ref") || servidor.arg("ref").length() == 0) {
    servidor.send(400, "application/json", "{\"erro\":\"falta o valor\"}");
    return;
  }
  float ref = servidor.arg("ref").toFloat();
  if (ref < -10 || ref > 60 || !ajustar(ref)) {
    servidor.send(400, "application/json", "{\"erro\":\"ajuste recusado\"}");
    return;
  }
  rotaDados();
}

void rotaZerar() { apagarAjuste(); rotaDados(); }

void rotaExtremos() {                          // recomeca a minima e a maxima
  minima = maxima = temperatura;
  rotaDados();
}

void rotaFaixa() {
  float mn = servidor.arg("min").toFloat(), mx = servidor.arg("max").toFloat();
  if (mn < 0 || mx > 50 || mn >= mx) {
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

  memoria.begin("temp", false);
  ajuste = memoria.getFloat("ajuste", 0.0);
  faixaMin = memoria.getFloat("min", faixaMin);
  faixaMax = memoria.getFloat("max", faixaMax);

  procurarSensor();
  ds18b20.setWaitForConversion(false);         // requestTemperatures() volta na hora
  esperaDaConversao = ds18b20.millisToWaitForConversion(RESOLUCAO) + 50;

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);
  servidor.on("/", rotaPagina);
  servidor.on("/dados", rotaDados);
  servidor.on("/ajustar", rotaAjustar);
  servidor.on("/zerar", rotaZerar);
  servidor.on("/extremos", rotaExtremos);
  servidor.on("/faixa", rotaFaixa);
  servidor.begin();
  Serial.printf("Rede \"%s\" (senha %s). Abra http://%s\n", NOME_DA_REDE, SENHA_DA_REDE,
                WiFi.softAPIP().toString().c_str());
  Serial.printf("Sensor: %s   ajuste: %+.2f C   faixa desejada: %.1f a %.1f C\n",
                enderecoTexto, ajuste, faixaMin, faixaMax);
  comecarMedida();
}

void loop() {
  servidor.handleClient();                     // atende o celular

  unsigned long agora = millis();
  if (medindo && agora - inicioDaMedida >= esperaDaConversao) terminarMedida();
  if (!medindo && agora - ultimaMedida >= INTERVALO) comecarMedida();

  if (Serial.available()) {                    // comandos pelo cabo USB
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("a") && cmd.length() > 1) {
      if (!ajustar(cmd.substring(1).toFloat()))
        Serial.println("Ajuste recusado: sensor sem leitura, ou diferenca maior que 3 C.");
    } else if (cmd == "r") {
      apagarAjuste();
      Serial.println("Ajuste apagado: +0.00 C");
    } else if (cmd == "m") {
      minima = maxima = temperatura;
      Serial.println("Minima e maxima recomecadas.");
    }
  }
}
