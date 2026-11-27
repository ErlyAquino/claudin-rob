/*
  08b - Luz da bancada no celular: BH1750 (GY-302) no ESP32, com pagina Wi-Fi
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)
  Biblioteca: BH1750, de Christopher Laws (o resto vem com o ESP32)
  Arquivo extra na mesma pasta: pagina_luz.h

  Ligacoes:
    BH1750   VCC -> 3V3   GND -> GND   SCL -> GPIO 22   SDA -> GPIO 21   ADDR -> solto (0x23)
  O sensor fica virado para cima, na altura das folhas, sem sombra de fio nem de folha.

  O que ele faz: mede a iluminancia (lux) a cada segundo, troca de faixa sozinho sob sol forte,
  estima a luz util para a planta (PPFD) e soma a luz das ultimas 24 horas (DLI estimado).

  Celular: entre na rede "Horta-Luz" (senha 12345678) e abra http://192.168.4.1
  Monitor Serial (115200, "Nova linha"):  c 850 = o luximetro ao lado marca 850 lx (corrige o fator)
                                          r = apagar a correcao
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <Wire.h>
#include <BH1750.h>
#include "pagina_luz.h"

const char* NOME_DA_REDE = "Horta-Luz";
const char* SENHA_DA_REDE = "12345678";        // minimo de 8 caracteres; troque antes de usar

const int PINO_SDA = 21, PINO_SCL = 22;
const byte ENDERECO = 0x23;                    // 0x5C com o pino ADDR no 3V3
const unsigned long INTERVALO = 1000;          // ms entre duas leituras
const float LUX_DE_DIA = 200;                  // acima disto conta como "hora de luz"
const byte MTREG_NORMAL = 69;                  // faixa de fabrica: ate 54612 lx, passo de 1 lx
const byte MTREG_SOL = 32;                     // faixa estendida: ate 117757 lx, passo de 2 lx

WebServer servidor(80);
Preferences memoria;
BH1750 sensor(ENDERECO);

float fator = 1.0;                             // correcao da conferencia com o luximetro
float luxPorUmol = 54.0;                       // fonte de luz: 54 = sol; 67 = LED branco
float dliMin = 12, dliMax = 17;                // meta de luz diaria, em mol/m2/dia (muda na pagina)
float lux = 0, ppfd = 0;
byte mtreg = MTREG_NORMAL;
bool sensorPresente = false, jaMediu = false, saturado = false, pularLeitura = false;
unsigned long ultimaMedida = 0;

// A luz das ultimas 24 horas, em 288 gavetas de 5 minutos.
const int GAVETAS = 288;
const unsigned long TEMPO_DA_GAVETA = 300000;  // 5 min, em ms
float molDaGaveta[GAVETAS];                    // mol de fotons por m2 somado em cada gaveta
uint16_t luzDaGaveta[GAVETAS];                 // segundos com luz em cada gaveta
int gavetaAtual = 0, gavetasUsadas = 1;
unsigned long inicioDaGaveta = 0;

// ------------------------------------------------------------------ medida
float limiteDaFaixa() { return 65535.0 / 1.2 * 69.0 / mtreg; }

// Sob sol forte a faixa de fabrica satura: encurta o tempo de medida (MTreg) e a faixa dobra.
void escolherFaixa(float luxBruto) {
  byte novo = mtreg;
  if (mtreg == MTREG_NORMAL && luxBruto > 40000) novo = MTREG_SOL;
  if (mtreg == MTREG_SOL && luxBruto < 20000) novo = MTREG_NORMAL;
  if (novo == mtreg) return;
  if (sensor.setMTreg(novo)) { mtreg = novo; pularLeitura = true; }   // a proxima ainda e da faixa velha
}

void somarNaGaveta(float segundos) {
  unsigned long agora = millis();
  while (agora - inicioDaGaveta >= TEMPO_DA_GAVETA) {       // passou de 5 min: abre a gaveta seguinte
    inicioDaGaveta += TEMPO_DA_GAVETA;
    gavetaAtual = (gavetaAtual + 1) % GAVETAS;
    molDaGaveta[gavetaAtual] = 0;
    luzDaGaveta[gavetaAtual] = 0;
    if (gavetasUsadas < GAVETAS) gavetasUsadas++;
  }
  molDaGaveta[gavetaAtual] += ppfd * segundos / 1e6;        // umol/m2/s x s = umol/m2; / 1e6 = mol/m2
  if (lux >= LUX_DE_DIA) luzDaGaveta[gavetaAtual] += (uint16_t)(segundos + 0.5);
}

float dli24h() {                               // soma das gavetas: mol/m2 nas ultimas 24 h
  float soma = 0;
  for (int i = 0; i < GAVETAS; i++) soma += molDaGaveta[i];
  return soma;
}

float horasDeLuz() {
  unsigned long s = 0;
  for (int i = 0; i < GAVETAS; i++) s += luzDaGaveta[i];
  return s / 3600.0;
}

float horasMedidas() {                         // ha quanto tempo esta medindo, ate 24 h
  float h = ((gavetasUsadas - 1) * TEMPO_DA_GAVETA + (millis() - inicioDaGaveta)) / 3600000.0;
  return h > 24 ? 24 : h;
}

void medir() {
  unsigned long agora = millis();
  float segundos = (agora - ultimaMedida) / 1000.0;
  ultimaMedida = agora;
  if (!sensorPresente) {                       // tenta achar o sensor de novo
    sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
    mtreg = MTREG_NORMAL;
    return;
  }
  if (pularLeitura) { pularLeitura = false; return; }
  float bruto = sensor.readLightLevel();       // negativo = erro
  if (bruto < 0) { sensorPresente = false; jaMediu = false; return; }
  saturado = bruto >= 0.995 * limiteDaFaixa();
  lux = bruto * fator;
  ppfd = lux / luxPorUmol;
  if (jaMediu) somarNaGaveta(segundos);
  jaMediu = true;
  escolherFaixa(bruto);
}

const char* situacao() {
  if (!sensorPresente) return "erro";
  if (!jaMediu) return "espera";
  if (saturado) return "fim";
  if (lux < LUX_DE_DIA) return "escuro";
  return "luz";
}

// ------------------------------------------------------------------ conferencia com o luximetro
// Com o luximetro ao lado do sensor, sob a mesma luz: fator = leitura do luximetro / leitura bruta.
bool corrigir(float referencia) {
  if (!jaMediu || saturado || lux <= 0) return false;
  float bruto = lux / fator;
  if (bruto < 50) return false;                // luz fraca demais para comparar
  float f = referencia / bruto;
  if (f < 0.5 || f > 3.0) return false;        // fora disso ha erro: sombra, luximetro ou cupula
  fator = f;
  memoria.putFloat("fator", fator);
  lux = referencia;
  ppfd = lux / luxPorUmol;
  Serial.printf("Fator de correcao = %.3f (luximetro: %.0f lx)\n", fator, referencia);
  return true;
}

// ------------------------------------------------------------------ pagina
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_LUZ); }

void rotaDados() {
  char json[320];
  snprintf(json, sizeof(json),
           "{\"lux\":%.0f,\"ppfd\":%.1f,\"dli\":%.2f,\"horas\":%.2f,\"luz\":%.2f,\"fator\":%.3f,"
           "\"lpu\":%.0f,\"min\":%.1f,\"max\":%.1f,\"faixa\":%.0f,\"sit\":\"%s\"}",
           lux, ppfd, dli24h(), horasMedidas(), horasDeLuz(), fator,
           luxPorUmol, dliMin, dliMax, limiteDaFaixa(), situacao());
  servidor.send(200, "application/json", json);
}

void rotaCorrigir() {
  float ref = servidor.arg("ref").toFloat();
  if (ref < 50 || ref > 150000 || !corrigir(ref)) {
    servidor.send(400, "application/json", "{\"erro\":\"correcao recusada\"}");
    return;
  }
  rotaDados();
}

void rotaZerar() {
  lux /= fator;
  fator = 1.0;
  memoria.putFloat("fator", fator);
  ppfd = lux / luxPorUmol;
  rotaDados();
}

void rotaAjustes() {
  float lpu = servidor.arg("lpu").toFloat();
  float mn = servidor.arg("min").toFloat(), mx = servidor.arg("max").toFloat();
  if (lpu < 10 || lpu > 100 || mn < 0 || mx > 60 || mn >= mx) {
    servidor.send(400, "application/json", "{\"erro\":\"ajuste invalido\"}");
    return;
  }
  luxPorUmol = lpu; dliMin = mn; dliMax = mx;
  memoria.putFloat("lpu", luxPorUmol);
  memoria.putFloat("min", dliMin); memoria.putFloat("max", dliMax);
  ppfd = lux / luxPorUmol;
  rotaDados();
}

// ------------------------------------------------------------------ programa
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  Wire.begin(PINO_SDA, PINO_SCL);
  sensorPresente = sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, ENDERECO, &Wire);
  if (!sensorPresente) Serial.println("BH1750 nao respondeu: confira VCC, GND, SDA e SCL.");

  memoria.begin("luz", false);
  fator = memoria.getFloat("fator", 1.0);
  luxPorUmol = memoria.getFloat("lpu", luxPorUmol);
  dliMin = memoria.getFloat("min", dliMin);
  dliMax = memoria.getFloat("max", dliMax);

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);
  servidor.on("/", rotaPagina);
  servidor.on("/dados", rotaDados);
  servidor.on("/corrigir", rotaCorrigir);
  servidor.on("/zerar", rotaZerar);
  servidor.on("/ajustes", rotaAjustes);
  servidor.begin();
  Serial.printf("Rede \"%s\" (senha %s). Abra http://%s\n", NOME_DA_REDE, SENHA_DA_REDE,
                WiFi.softAPIP().toString().c_str());
  Serial.printf("fator = %.3f   fonte: %.0f lx por umol   meta: %.0f a %.0f mol/m2/dia\n",
                fator, luxPorUmol, dliMin, dliMax);
  inicioDaGaveta = ultimaMedida = millis();
}

void loop() {
  servidor.handleClient();                     // atende o celular

  if (millis() - ultimaMedida >= INTERVALO) {
    medir();
    static int n = 0;
    if (jaMediu && ++n % 5 == 0)               // uma linha a cada 5 s no Monitor Serial
      Serial.printf("luz: %.0f lx   PPFD: %.0f umol/m2/s   DLI: %.2f mol/m2 em %.1f h   %s\n",
                    lux, ppfd, dli24h(), horasMedidas(), situacao());
  }

  if (Serial.available()) {                    // comandos pelo cabo USB
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("c")) {
      float ref = cmd.substring(1).toFloat();
      if (ref < 50 || !corrigir(ref))
        Serial.println("Correcao recusada: use c 850 com o luximetro ao lado, sob a mesma luz.");
    } else if (cmd == "r") {
      fator = 1.0;
      memoria.putFloat("fator", fator);
      Serial.println("Correcao apagada: fator = 1.000");
    }
  }
}
