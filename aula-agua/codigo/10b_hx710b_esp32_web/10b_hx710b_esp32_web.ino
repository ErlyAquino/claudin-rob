/*
  10b - Nivel do reservatorio no celular: HX710B + MPS20N0040D no ESP32, com pagina Wi-Fi
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)        Sem biblioteca (o resto vem com o ESP32)
  Arquivo extra na mesma pasta: pagina_nivel.h

  Ligacoes (as mesmas do sketch 10):
    VCC -> 3V3     OUT -> GPIO 18     SCK -> GPIO 19     GND -> GND
  Mangueira: do bico do sensor ate um tubo de ponta aberta preso dentro do reservatorio.
  O sensor e o ESP32 ficam ACIMA do nivel maximo da agua.

  Celular: entre na rede "Horta-Nivel" (senha 12345678) e abra http://192.168.4.1
  Monitor Serial (115200, "Nova linha"):
    z        zero: ponta do tubo FORA da agua
    c 20     ganho: ponta do tubo a 20 cm abaixo da superficie (medidos com a regua)
    s 51234  grava direto as contagens por cm (resultado de uma reta feita na planilha)
    r        apaga a calibracao
  O LED azul da placa (GPIO 2) pisca quando o nivel esta abaixo do minimo.
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "pagina_nivel.h"

const char* NOME_DA_REDE = "Horta-Nivel";
const char* SENHA_DA_REDE = "12345678";        // minimo de 8 caracteres; troque antes de usar

const int PINO_OUT = 18;
const int PINO_SCK = 19;
const int PINO_LED = 2;                        // LED da propria placa
const float SENS_PADRAO = 50000.0;             // contagens por cm, so ate calibrar
const float PA_POR_CM = 97.8;                  // rho x g x 1 cm, agua a 25 C
const long FIM_DA_ESCALA = 8388000L;           // perto de 2^23: o conversor saturou
const unsigned long INTERVALO = 1000;          // ms entre dois calculos do nivel
const int N = 15;                              // leituras na mediana (1,5 s a 10 por segundo)

WebServer servidor(80);
Preferences memoria;
portMUX_TYPE trava = portMUX_INITIALIZER_UNLOCKED;

// O que fica na memoria permanente
long zero = 0;                                 // contagens com a ponta do tubo fora da agua
float sens = SENS_PADRAO;                      // contagens por cm de agua
bool calibrado = false;
float alturaDaPonta = 2.0;                     // cm do fundo do reservatorio ate a ponta do tubo
float litrosPorCm = 1.0;                       // litros para cada cm de altura (area da base / 1000)
float nivelMinimo = 8.0;                       // cm a partir do fundo: abaixo disso, alerta
float nivelCheio = 30.0;                       // cm a partir do fundo: a marca de "cheio"

long amostras[N];
int quantas = 0, proxima = 0;
long bruto = 0;
float profundidade = 0, nivel = 0, volume = 0;
bool jaMediu = false, falha = false;
unsigned long ultimaLeitura = 0, ultimoCalculo = 0;

// ------------------------------------------------------------------ medida
// Le os 24 bits. So e chamada com o OUT em 0 (leitura pronta), por isso nao espera.
long lerHX710B() {
  long valor = 0;
  portENTER_CRITICAL(&trava);                  // o Wi-Fi nao pode interromper os pulsos
  for (int i = 0; i < 24; i++) {
    digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);
    valor = (valor << 1) | digitalRead(PINO_OUT);
    digitalWrite(PINO_SCK, LOW); delayMicroseconds(1);
  }
  digitalWrite(PINO_SCK, HIGH); delayMicroseconds(1);   // 25o pulso: entrada do sensor, 10 Hz
  digitalWrite(PINO_SCK, LOW);
  portEXIT_CRITICAL(&trava);
  if (valor & 0x800000L) valor |= 0xFF000000L;
  return valor;
}

void colherAmostra() {                         // chamada em todo loop(): nao trava
  if (digitalRead(PINO_OUT) == HIGH) return;   // ainda nao ha leitura nova
  amostras[proxima] = lerHX710B();
  proxima = (proxima + 1) % N;
  if (quantas < N) quantas++;
  ultimaLeitura = millis();
}

long mediana() {                               // ordena uma copia e devolve a do meio
  long v[N];
  for (int i = 0; i < quantas; i++) v[i] = amostras[i];
  for (int i = 0; i < quantas - 1; i++)
    for (int j = 0; j < quantas - 1 - i; j++)
      if (v[j] > v[j + 1]) { long t = v[j]; v[j] = v[j + 1]; v[j + 1] = t; }
  return v[quantas / 2];
}

void calcular() {
  ultimoCalculo = millis();
  falha = (quantas == 0) || (millis() - ultimaLeitura > 1000);   // 1 s sem leitura: sensor mudo
  if (falha) return;
  bruto = mediana();
  profundidade = (bruto - zero) / sens;        // cm de agua acima da ponta do tubo
  nivel = profundidade + alturaDaPonta;        // cm a partir do fundo
  volume = nivel * litrosPorCm;                // litros (reservatorio de paredes retas)
  jaMediu = true;
}

const char* situacao() {
  if (falha) return "falha";
  if (!jaMediu) return "espera";
  if (labs(bruto) >= FIM_DA_ESCALA) return "fim";
  if (!calibrado) return "semcal";
  if (profundidade < 0.5) return "ponta";      // a agua desceu abaixo da ponta do tubo
  if (nivel < nivelMinimo) return "baixo";
  if (nivel > nivelCheio + 1.0) return "alto";
  return "ok";
}

// ------------------------------------------------------------------ calibracao
void gravarCalibracao() {
  memoria.putLong("zero", zero);
  memoria.putFloat("sens", sens);
  memoria.putBool("cal", calibrado);
}

bool zerar() {                                 // ponta do tubo fora da agua
  if (falha || quantas < N) return false;
  zero = mediana();
  gravarCalibracao();
  Serial.printf("Zero gravado: %ld contagens\n", zero);
  return true;
}

// Ponta do tubo a `cm` de profundidade: sens = (leitura - zero) / cm.
bool calibrar(float cm) {
  if (falha || quantas < N || cm < 2 || cm > 400) return false;
  float s = (mediana() - zero) / cm;
  if (fabs(s) < 2000 || fabs(s) > 2000000) return false;   // fora disso: tubo fora da agua, ou vazamento
  sens = s;
  calibrado = true;
  gravarCalibracao();
  Serial.printf("Calibrado em %.1f cm: %.0f contagens por cm\n", cm, sens);
  return true;
}

void apagarCalibracao() {
  zero = 0; sens = SENS_PADRAO; calibrado = false;
  gravarCalibracao();
  Serial.println("Calibracao apagada.");
}

// ------------------------------------------------------------------ pagina
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_NIVEL); }

void rotaDados() {
  char json[330];
  snprintf(json, sizeof(json),
           "{\"nivel\":%.1f,\"prof\":%.1f,\"vol\":%.1f,\"pa\":%.0f,\"bruto\":%ld,\"zero\":%ld,"
           "\"sens\":%.0f,\"cal\":%d,\"ponta\":%.1f,\"lpc\":%.3f,\"min\":%.1f,\"cheio\":%.1f,"
           "\"sit\":\"%s\"}",
           nivel, profundidade, volume, profundidade * PA_POR_CM, bruto, zero, sens,
           calibrado ? 1 : 0, alturaDaPonta, litrosPorCm, nivelMinimo, nivelCheio, situacao());
  servidor.send(200, "application/json", json);
}

void recusar(const char* motivo) {
  String s = String("{\"erro\":\"") + motivo + "\"}";
  servidor.send(400, "application/json", s);
}

void rotaZerar() { if (zerar()) rotaDados(); else recusar("sensor sem leitura"); }

void rotaCalibrar() {
  if (calibrar(servidor.arg("cm").toFloat())) rotaDados();
  else recusar("calibracao recusada");
}

void rotaApagar() { apagarCalibracao(); rotaDados(); }

void rotaReservatorio() {
  float p = servidor.arg("ponta").toFloat(), l = servidor.arg("lpc").toFloat();
  float mn = servidor.arg("min").toFloat(), ch = servidor.arg("cheio").toFloat();
  if (p < 0 || p > 100 || l <= 0 || l > 100 || mn < 0 || ch <= mn || ch > 400) {
    recusar("valores invalidos");
    return;
  }
  alturaDaPonta = p; litrosPorCm = l; nivelMinimo = mn; nivelCheio = ch;
  memoria.putFloat("ponta", p); memoria.putFloat("lpc", l);
  memoria.putFloat("min", mn); memoria.putFloat("cheio", ch);
  rotaDados();
}

// ------------------------------------------------------------------ programa
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  pinMode(PINO_OUT, INPUT);
  pinMode(PINO_SCK, OUTPUT);
  digitalWrite(PINO_SCK, LOW);
  pinMode(PINO_LED, OUTPUT);

  memoria.begin("nivel", false);
  zero = memoria.getLong("zero", 0);
  sens = memoria.getFloat("sens", SENS_PADRAO);
  calibrado = memoria.getBool("cal", false);
  alturaDaPonta = memoria.getFloat("ponta", alturaDaPonta);
  litrosPorCm = memoria.getFloat("lpc", litrosPorCm);
  nivelMinimo = memoria.getFloat("min", nivelMinimo);
  nivelCheio = memoria.getFloat("cheio", nivelCheio);

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);
  servidor.on("/", rotaPagina);
  servidor.on("/dados", rotaDados);
  servidor.on("/zerar", rotaZerar);
  servidor.on("/calibrar", rotaCalibrar);
  servidor.on("/apagar", rotaApagar);
  servidor.on("/reservatorio", rotaReservatorio);
  servidor.begin();
  Serial.printf("Rede \"%s\" (senha %s). Abra http://%s\n", NOME_DA_REDE, SENHA_DA_REDE,
                WiFi.softAPIP().toString().c_str());
  Serial.printf("zero = %ld   %.0f contagens/cm%s\n", zero, sens, calibrado ? "" : " (sem calibrar)");
}

void loop() {
  servidor.handleClient();                     // atende o celular
  colherAmostra();                             // guarda a leitura nova, se houver

  if (millis() - ultimoCalculo >= INTERVALO) {
    calcular();
    const char* sit = situacao();
    if (falha) Serial.println("HX710B sem resposta: confira os quatro fios.");
    else Serial.printf("nivel: %.1f cm   volume: %.1f L   coluna: %.1f cm   bruto: %ld   [%s]\n",
                       nivel, volume, profundidade, bruto, sit);
  }
  // alerta simples: o LED pisca com o nivel baixo ou a ponta do tubo fora da agua
  bool alerta = jaMediu && calibrado && (nivel < nivelMinimo || profundidade < 0.5);
  digitalWrite(PINO_LED, alerta && (millis() / 300) % 2);

  if (Serial.available()) {                    // comandos pelo cabo USB
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "z") { if (!zerar()) Serial.println("Zero recusado: sensor sem leitura."); }
    else if (cmd.startsWith("c")) {
      if (!calibrar(cmd.substring(1).toFloat()))
        Serial.println("Calibracao recusada: use c 20 com a ponta do tubo a 20 cm de profundidade.");
    } else if (cmd.startsWith("s")) {
      float s = cmd.substring(1).toFloat();
      if (fabs(s) >= 2000 && fabs(s) <= 2000000) {
        sens = s; calibrado = true; gravarCalibracao();
        Serial.printf("Gravado: %.0f contagens por cm\n", sens);
      } else Serial.println("Valor recusado.");
    } else if (cmd == "r") apagarCalibracao();
  }
}
