/*
  Guia de montagem do monitor de ar - Etapa 5A: os quatro sensores no mesmo ESP32, no celular
  Placa: DOIT ESP32 DEVKIT V1 (30 pinos)    Bibliotecas: nenhuma extra
  Arquivos extras na mesma pasta: sensores_ar.h, monitor_wifi.h, pagina_web.h

  O ESP32 cria a propria rede Wi-Fi (modo ponto de acesso). Sem roteador e sem servidor:
     celular -> Wi-Fi "Ar-Monitor" (senha 12345678) -> navegador -> http://192.168.4.1
     dados brutos em JSON:                                     http://192.168.4.1/dados

  Ligacoes, sensores usados e calibracao: tudo no sensores_ar.h.

  Para que serve esta etapa:
   1. Conferir a montagem completa com a fonte de 5 V, antes de depender da rede.
   2. Medir o R0 dos dois MQ NESTA montagem: com R0 = 0, a pagina mostra o Rs de cada um e o
      Monitor Serial (115200) escreve a media de 5 minutos. Em ar limpo, essa media e o R0.
   3. Medir quanto tempo leva uma rodada de leituras (item "Ciclo", em ms).
  O zero do MH-Z19C com a fonte definitiva e feito com o sketch m3a_co2_celular (Parte 3),
  gravado nesta mesma montagem: os pinos sao os mesmos.
*/
#include "sensores_ar.h"
#include "monitor_wifi.h"

// ------------------------------------------------------------------ ajustes
const unsigned long INTERVALO_MS = 5000;         // uma rodada a cada 5 s (no m5b: 10 s)
const int CO2_ALERTA_PPM = 1000;                 // ANVISA RE 9/2003
const float MQ2_ALERTA = 0.50, MQ135_ALERTA = 0.70;   // Rs/R0 (referencias do curso)
const int LEITURAS_POR_MEDIA = 60;               // 60 x 5 s = 5 min
// ---------------------------------------------------------------------------

unsigned long ultima = 0;
uint32_t cicloMaxMs = 0;
int ultimoCO2 = 0;                               // mantem o valor principal se uma leitura falhar
double somaRs2 = 0, somaRs135 = 0;
int nRs2 = 0, nRs135 = 0, nMedia = 0;

// acrescenta um item ao JSON da pagina
void junta(String &itens, const String &novo) {
  if (itens.length()) itens += ",";
  itens += novo;
}
// acrescenta um aviso a mensagem da pagina
void avisa(String &msg, const String &novo) {
  if (msg.length()) msg += "; ";
  msg += novo;
}

// item de um MQ: Rs/R0 se o R0 ja foi medido, senao o Rs; devolve true se ha gas
bool itemMq(String &itens, String &msg, const char* nome, float rs, uint32_t mv,
            float r0, float limiar) {
  if (isnan(rs)) {
    junta(itens, item((String(nome) + " pino").c_str(), mv, "mV"));
    avisa(msg, String(nome) + (mv > MAIOR_MV ? " saturou" : " fora da faixa"));
    return mv > MAIOR_MV;
  }
  if (r0 <= 0 || !mqAquecidos()) {
    junta(itens, item((String(nome) + " Rs").c_str(), rs, "kOhm"));
    return false;
  }
  float razao = rs / r0;
  junta(itens, item(nome, razao, "Rs/R0"));
  if (razao < limiar) avisa(msg, String(nome) + ": gas ou ar alterado");
  return razao < limiar;
}

void setup() {
  Serial.begin(115200);
  sensoresIniciar();
  monitorIniciar("Ar-Monitor");
  Serial.printf("partida: %s\n", motivoDaPartida());
  Serial.printf("sensores: MQ-2 %d | MQ-135 %d | MH-Z19C %d | DHT22 %d\n",
                USAR_MQ2, USAR_MQ135, USAR_CO2, USAR_DHT22);
  Serial.printf("MQ-2: RL %.1f k, R0 %.2f k | MQ-135: RL %.1f k, R0 %.2f k | VC = %.2f V\n",
                RL_MQ2_KOHM, R0_MQ2_KOHM, RL_MQ135_KOHM, R0_MQ135_KOHM, TENSAO_DOS_MQ);
}

void loop() {
  monitorAtender();
  if (millis() - ultima < INTERVALO_MS) return;
  ultima = millis();

  LeituraAr l = lerSensores();
  if (l.duracaoMs > cicloMaxMs) cicloMaxMs = l.duracaoMs;
  String itens, msg, linha;
  bool alerta = false;

#if USAR_CO2
  if (l.co2 <= 0) {                      // falhou: o valor principal fica no ultimo CO2 lido
    junta(itens, item("CO2", ultimoCO2, "ppm"));
    avisa(msg, "CO2 sem resposta");
    alerta = true;
  } else {
    ultimoCO2 = l.co2;
    junta(itens, item("CO2", l.co2, "ppm"));
    linha += "CO2_ppm:" + String(l.co2) + " ";
    if (!co2Aquecido()) avisa(msg, "CO2 aquecendo");
    else if (l.co2 >= FAIXA_CO2_PPM) { avisa(msg, "CO2 no fundo de escala"); alerta = true; }
    else if (l.co2 > CO2_ALERTA_PPM) { avisa(msg, "CO2 alto: ventile"); alerta = true; }
  }
#endif
#if USAR_MQ135
  alerta |= itemMq(itens, msg, "MQ-135", l.rsMq135, l.mvMq135, R0_MQ135_KOHM, MQ135_ALERTA);
  if (!isnan(l.rsMq135)) linha += "MQ135_Rs_k:" + String(l.rsMq135, 2) + " ";
#endif
#if USAR_MQ2
  alerta |= itemMq(itens, msg, "MQ-2", l.rsMq2, l.mvMq2, R0_MQ2_KOHM, MQ2_ALERTA);
  if (!isnan(l.rsMq2)) linha += "MQ2_Rs_k:" + String(l.rsMq2, 2) + " ";
#endif
#if USAR_MQ2 || USAR_MQ135
  if (!mqAquecidos())
    avisa(msg, "MQ aquecendo: faltam " + String((PREAQUECIMENTO_MQ_MS - millis()) / 1000) + " s");
#endif
#if USAR_DHT22
  if (isnan(l.temperatura)) { avisa(msg, "DHT22 sem leitura"); alerta = true; }
  else {
    junta(itens, item("Temperatura", l.temperatura, "C"));
    junta(itens, item("Umidade", l.umidade, "%"));
    linha += "Temp_C:" + String(l.temperatura, 1) + " Umid_%:" + String(l.umidade, 1) + " ";
  }
#endif
  junta(itens, item("Ciclo", l.duracaoMs, "ms"));
  junta(itens, item("Ciclo maximo", cicloMaxMs, "ms"));
  linha += "Ciclo_ms:" + String(l.duracaoMs);
  Serial.println(linha);                 // linha "nome:valor" para o Plotter Serial
  if (msg.length()) Serial.println("# " + msg);
  monitorPublicar(jsonMonitor("Monitor de ar - 4 sensores", itens, alerta,
                              msg.length() ? msg : "tudo normal"));

  // media de 5 min dos Rs, depois do aquecimento: em ar limpo, e o R0 de cada MQ
#if USAR_MQ2 || USAR_MQ135
  if (mqAquecidos()) {
    if (!isnan(l.rsMq2)) { somaRs2 += l.rsMq2; nRs2++; }
    if (!isnan(l.rsMq135)) { somaRs135 += l.rsMq135; nRs135++; }
    if (++nMedia >= LEITURAS_POR_MEDIA) {
      Serial.printf("# media de 5 min: Rs MQ-2 = %.2f k (%d leituras) | Rs MQ-135 = %.2f k (%d)\n",
                    nRs2 ? somaRs2 / nRs2 : 0.0, nRs2,
                    nRs135 ? somaRs135 / nRs135 : 0.0, nRs135);
      Serial.println("#   em ar limpo, com os sensores estabilizados, esses valores sao os R0");
      somaRs2 = somaRs135 = 0; nRs2 = nRs135 = nMedia = 0;
    }
  }
#endif
}
