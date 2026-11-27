/*
  09b - Vazao da solucao no celular: YF-S201 no ESP32, com pagina Wi-Fi
  Placa: ESP32 Dev Module (DevKit V1, 30 pinos)      Sem biblioteca extra
  Arquivo extra na mesma pasta: pagina_vazao.h

  Ligacoes:
    YF-S201   vermelho -> VIN (5 V)   preto -> GND
              amarelo  -> resistor de 1 k -> GPIO 27 -> resistor de 2 k -> GND   (divisor)
    Opcional  fio-espia do rele da bomba -> GPIO 33 (veja PINO_ESPIA_BOMBA)

  Celular: entre na rede "Horta-Vazao" (senha 12345678) e abra http://192.168.4.1
  Monitor Serial (115200, "Nova linha"):
    c = comecar a contagem da calibracao     f 5.0 = terminar: foram coletados 5,0 litros
    x = cancelar a calibracao                r = voltar a 450 pulsos por litro
    z = zerar o volume
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "pagina_vazao.h"

const char* NOME_DA_REDE = "Horta-Vazao";
const char* SENHA_DA_REDE = "12345678";        // minimo de 8 caracteres; troque antes de usar

const int PINO_VAZAO = 27;                     // fio amarelo, depois do divisor
const float PULSOS_POR_LITRO_DA_FOLHA = 450.0; // f (Hz) = 7,5 x vazao (L/min)
const int SEGUNDOS_DA_MEDIA = 10;              // a vazao mostrada e a media deste tempo

// Fio-espia (opcional): um fio do pino que comanda o rele da bomba (GPIO 26 do sketch 05e)
// ate este pino, com os GND dos dois ESP32 ligados. Com ele, o alerta so conta o tempo em
// que a bomba deveria estar ligada. Com -1 (sem o fio), conta todo o tempo sem vazao.
const int PINO_ESPIA_BOMBA = -1;               // -1 = sem o fio; 33 = fio no GPIO 33
const int NIVEL_COM_BOMBA_LIGADA = LOW;        // sketch 05e, bomba no contato NF: LOW = ligada

WebServer servidor(80);
Preferences memoria;

// ------------------------------------------------------------------ pulsos
volatile uint32_t pulsos = 0;
volatile uint32_t ultimoPulsoUs = 0;

void IRAM_ATTR contarPulso() {
  uint32_t agora = micros();
  if (agora - ultimoPulsoUs < 1500) return;    // ruido: a 30 L/min ha um pulso a cada 4,4 ms
  ultimoPulsoUs = agora;
  pulsos = pulsos + 1;
}

// ------------------------------------------------------------------ medida
float pulsosPorLitro = PULSOS_POR_LITRO_DA_FOLHA;
float faixaMin = 5.0, faixaMax = 10.0;         // faixa desejada, em L/min (muda na pagina)
float minutosDoAlerta = 20.0;                  // sem vazao por mais que isto: alerta. 0 desliga

uint16_t porSegundo[SEGUNDOS_DA_MEDIA];        // pulsos de cada um dos ultimos segundos
int posicao = 0, segundosMedidos = 0;
uint32_t pulsosNaUltimaConta = 0, horaDaUltimaConta = 0;
float frequencia = 0, vazaoAgora = 0, vazaoMedia = 0;
double volume = 0;                             // litros desde o ultimo "zerar"
uint32_t semVazaoDesde = 0;                    // millis() em que a vazao parou
bool calibrando = false;
uint32_t pulsosNoInicioDaCalibracao = 0;

bool bombaDeveriaEstarLigada() {
  if (PINO_ESPIA_BOMBA < 0) return true;       // sem o fio-espia: supoe que sim
  return digitalRead(PINO_ESPIA_BOMBA) == NIVEL_COM_BOMBA_LIGADA;
}

float minutosSemVazao() { return (millis() - semVazaoDesde) / 60000.0; }

void fazerAConta() {                           // uma vez por segundo
  uint32_t agora = millis();
  uint32_t total = pulsos;                     // copia de uma vez so
  uint32_t novos = total - pulsosNaUltimaConta;
  frequencia = novos * 1000.0 / (agora - horaDaUltimaConta);
  pulsosNaUltimaConta = total;
  horaDaUltimaConta = agora;

  porSegundo[posicao] = novos;
  posicao = (posicao + 1) % SEGUNDOS_DA_MEDIA;
  if (segundosMedidos < SEGUNDOS_DA_MEDIA) segundosMedidos++;
  uint32_t soma = 0;
  for (int i = 0; i < segundosMedidos; i++) soma += porSegundo[i];

  vazaoAgora = frequencia * 60.0 / pulsosPorLitro;                  // L/min, ultimo segundo
  vazaoMedia = soma * 60.0 / (segundosMedidos * pulsosPorLitro);    // L/min, media
  volume += novos / pulsosPorLitro;
  if (soma > 0 || !bombaDeveriaEstarLigada()) semVazaoDesde = agora;

  Serial.printf("vazao: %.2f L/min (agora %.2f)   %.1f Hz   volume: %.2f L   %.0f pulsos/L%s\n",
                vazaoMedia, vazaoAgora, frequencia, volume, pulsosPorLitro,
                calibrando ? "   [contando para a calibracao]" : "");
}

const char* situacao() {
  if (segundosMedidos < 3) return "espera";
  if (vazaoMedia <= 0) {
    if (minutosDoAlerta > 0 && minutosSemVazao() >= minutosDoAlerta) return "alerta";
    return "parada";
  }
  if (vazaoMedia < faixaMin) return "baixa";
  if (vazaoMedia > faixaMax) return "alta";
  return "ok";
}

// ------------------------------------------------------------------ calibracao
// Metodo do balde: zera a contagem, enche um recipiente de volume conhecido e divide.
void comecarCalibracao() {
  pulsosNoInicioDaCalibracao = pulsos;
  calibrando = true;
  Serial.println("Calibracao: contagem zerada. Encha o recipiente e informe os litros.");
}

uint32_t pulsosDaCalibracao() { return calibrando ? pulsos - pulsosNoInicioDaCalibracao : 0; }

bool terminarCalibracao(float litros) {
  if (!calibrando || litros < 0.2 || litros > 100) return false;
  uint32_t contados = pulsosDaCalibracao();
  float novo = contados / litros;
  if (contados < 100 || novo < 120 || novo > 1200) return false;   // fora disso ha erro
  pulsosPorLitro = novo;
  memoria.putFloat("ppl", pulsosPorLitro);
  calibrando = false;
  Serial.printf("Calibrado: %lu pulsos em %.3f L = %.1f pulsos por litro\n",
                (unsigned long)contados, litros, pulsosPorLitro);
  return true;
}

void voltarAoPadrao() {
  pulsosPorLitro = PULSOS_POR_LITRO_DA_FOLHA;
  memoria.putFloat("ppl", pulsosPorLitro);
  calibrando = false;
}

// ------------------------------------------------------------------ pagina
void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA_VAZAO); }

void rotaDados() {
  char json[280];
  snprintf(json, sizeof(json),
           "{\"q\":%.2f,\"agora\":%.2f,\"hz\":%.1f,\"vol\":%.2f,\"ppl\":%.1f,\"min\":%.1f,"
           "\"max\":%.1f,\"alerta\":%.0f,\"parada\":%.1f,\"cal\":%d,\"pcal\":%lu,\"sit\":\"%s\"}",
           vazaoMedia, vazaoAgora, frequencia, volume, pulsosPorLitro, faixaMin, faixaMax,
           minutosDoAlerta, minutosSemVazao(), calibrando ? 1 : 0,
           (unsigned long)pulsosDaCalibracao(), situacao());
  servidor.send(200, "application/json", json);
}

void recusar(const char* motivo) {
  servidor.send(400, "application/json", String("{\"erro\":\"") + motivo + "\"}");
}

void rotaCalibrar() {
  String acao = servidor.arg("acao");
  if (acao == "comecar") comecarCalibracao();
  else if (acao == "cancelar") calibrando = false;
  else if (acao == "padrao") voltarAoPadrao();
  else if (!terminarCalibracao(servidor.arg("litros").toFloat())) {
    recusar("calibracao recusada");
    return;
  }
  rotaDados();
}

void rotaFaixa() {
  float mn = servidor.arg("min").toFloat(), mx = servidor.arg("max").toFloat();
  float al = servidor.arg("alerta").toFloat();
  if (mn < 0 || mx > 30 || mn >= mx || al < 0 || al > 600) {
    recusar("valores invalidos");
    return;
  }
  faixaMin = mn; faixaMax = mx; minutosDoAlerta = al;
  memoria.putFloat("min", faixaMin);
  memoria.putFloat("max", faixaMax);
  memoria.putFloat("alerta", minutosDoAlerta);
  rotaDados();
}

void rotaZerar() {
  volume = 0;
  rotaDados();
}

// ------------------------------------------------------------------ programa
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  pinMode(PINO_VAZAO, INPUT);                  // o 2 k do divisor segura o pino em 0 V
  if (PINO_ESPIA_BOMBA >= 0) pinMode(PINO_ESPIA_BOMBA, INPUT);
  attachInterrupt(digitalPinToInterrupt(PINO_VAZAO), contarPulso, FALLING);

  memoria.begin("vazao", false);
  pulsosPorLitro = memoria.getFloat("ppl", PULSOS_POR_LITRO_DA_FOLHA);
  faixaMin = memoria.getFloat("min", faixaMin);
  faixaMax = memoria.getFloat("max", faixaMax);
  minutosDoAlerta = memoria.getFloat("alerta", minutosDoAlerta);

  WiFi.softAP(NOME_DA_REDE, SENHA_DA_REDE);
  servidor.on("/", rotaPagina);
  servidor.on("/dados", rotaDados);
  servidor.on("/calibrar", rotaCalibrar);
  servidor.on("/faixa", rotaFaixa);
  servidor.on("/zerar", rotaZerar);
  servidor.begin();
  Serial.printf("Rede \"%s\" (senha %s). Abra http://%s\n", NOME_DA_REDE, SENHA_DA_REDE,
                WiFi.softAPIP().toString().c_str());
  Serial.printf("%.1f pulsos por litro   faixa: %.1f a %.1f L/min   alerta: %.0f min\n",
                pulsosPorLitro, faixaMin, faixaMax, minutosDoAlerta);
  horaDaUltimaConta = semVazaoDesde = millis();
}

void loop() {
  servidor.handleClient();                     // atende o celular
  if (millis() - horaDaUltimaConta >= 1000) fazerAConta();

  if (Serial.available()) {                    // comandos pelo cabo USB
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "c") comecarCalibracao();
    else if (cmd.startsWith("f")) {
      if (!terminarCalibracao(cmd.substring(1).toFloat()))
        Serial.println("Recusado: use c, encha pelo menos 0,2 L e termine com f <litros>.");
    } else if (cmd == "x") { calibrando = false; Serial.println("Calibracao cancelada."); }
    else if (cmd == "r") { voltarAoPadrao(); Serial.println("De volta a 450 pulsos por litro."); }
    else if (cmd == "z") { volume = 0; Serial.println("Volume zerado."); }
  }
}
