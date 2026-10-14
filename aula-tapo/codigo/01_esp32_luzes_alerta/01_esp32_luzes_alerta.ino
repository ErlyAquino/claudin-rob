/*
  01 - ESP32 "atuador" da camera Tapo: luz (rele), buzzer e LED RGB comandados pela rede
  Placa: ESP32 Dev Module (core 3.x)   Sem bibliotecas extras (WiFi, WebServer, ESPmDNS vem no core)

  Ideia: a camera Tapo C200/TC70 NAO sabe acender luz. Quem decide e o PC (Python), que ve o video da
  camera por RTSP, reconhece gestos/rostos e manda comandos HTTP para ESTE ESP32. Tudo na MESMA rede Wi-Fi
  da camera (por isso o ESP32 entra na rede em MODO ESTACAO, nao cria a propria).

  Ligacoes:
    Modulo rele 1 canal (5 V): VCC -> VIN(5V)  GND -> GND  IN -> GPIO 26      (a luz 127/220 V vai em COM/NO: SO COM O PROFESSOR)
         Para a aula, use uma lampada de 12 V ou uma fita de LED no lugar da rede eletrica!
    Buzzer passivo: S -> GPIO 27
    LED RGB catodo comum: R -> 220 -> GPIO 32   G -> 220 -> GPIO 33   B -> 220 -> GPIO 25   comum -> GND
    Botao local (liga/desliga a luz na mao): GPIO 4 <-> GND

  Rotas (http://luzes.local ou http://<IP>):
    /                     pagina de estado com botoes
    /luz?on=1 | on=0      liga/desliga o rele      /luz?toggle=1
    /alerta?tipo=intruso  buzzer alarme + LED vermelho piscando por 10 s
    /alerta?tipo=bemvindo 2 bipes suaves + LED verde 5 s
    /alerta?tipo=off      silencia
    /led?cor=verde        LED RGB (verde, vermelho, azul, amarelo, roxo, ciano, branco, off)
    /estado               JSON {"luz":true,"alerta":"intruso","ultimo":"..."}
*/
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

const char* WIFI_SSID = "NOME-DA-REDE";       // a MESMA rede da camera Tapo (2,4 GHz)
const char* WIFI_SENHA = "SENHA-DA-REDE";
const char* NOME_MDNS = "luzes";              // http://luzes.local
const int PINO_RELE = 26, PINO_BUZZER = 27, PINO_R = 32, PINO_G = 33, PINO_B = 25, PINO_BOTAO = 4;
const bool RELE_ATIVO_BAIXO = true;           // a maioria dos modulos de rele liga com IN em LOW

WebServer servidor(80);
bool luzLigada = false;
String alertaAtual = "off", ultimoComando = "nenhum";
unsigned long fimAlerta = 0, ultimoBipe = 0;
bool bipando = false, botaoAntes = HIGH;

void cor(int r, int g, int b) { ledcWrite(PINO_R, r); ledcWrite(PINO_G, g); ledcWrite(PINO_B, b); }
bool corPorNome(const String& n) {
  if (n == "verde") cor(0, 255, 0); else if (n == "vermelho") cor(255, 0, 0); else if (n == "azul") cor(0, 0, 255);
  else if (n == "amarelo") cor(255, 150, 0); else if (n == "roxo") cor(160, 0, 255); else if (n == "ciano") cor(0, 255, 255);
  else if (n == "branco") cor(255, 255, 255); else if (n == "off") cor(0, 0, 0); else return false;
  return true;
}
void setLuz(bool on) { luzLigada = on; digitalWrite(PINO_RELE, (on != RELE_ATIVO_BAIXO) ? HIGH : LOW); Serial.printf("luz -> %s\n", on ? "ON" : "OFF"); }
void setAlerta(const String& tipo) {
  alertaAtual = tipo; noTone(PINO_BUZZER); bipando = false;
  if (tipo == "intruso")  { fimAlerta = millis() + 10000; cor(255, 0, 0); }
  else if (tipo == "bemvindo") { fimAlerta = millis() + 5000; cor(0, 255, 0); tone(PINO_BUZZER, 1200, 120); delay(160); tone(PINO_BUZZER, 1800, 160); }
  else { fimAlerta = 0; cor(0, 0, 0); alertaAtual = "off"; }
  Serial.println("alerta -> " + alertaAtual);
}

const char PAGINA[] PROGMEM = R"HTML(<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luzes e alertas</title><style>body{font-family:sans-serif;background:#111;color:#eee;text-align:center;padding:14px}
.card{background:#222;border-radius:12px;padding:14px;margin:10px auto;max-width:420px}button{font-size:1em;padding:10px 16px;margin:5px;border:0;border-radius:8px;color:#fff}
.on{background:#2a2}.off{background:#555}.al{background:#c22}.bv{background:#36c}#luz{font-size:1.6em}</style></head><body>
<h2>ESP32 — luzes e alertas (Tapo)</h2><div class="card"><div id="luz">luz: --</div>
<button class="on" onclick="c('/luz?on=1')">Ligar luz</button><button class="off" onclick="c('/luz?on=0')">Desligar</button></div>
<div class="card"><button class="al" onclick="c('/alerta?tipo=intruso')">Alarme intruso</button><button class="bv" onclick="c('/alerta?tipo=bemvindo')">Boas-vindas</button>
<button class="off" onclick="c('/alerta?tipo=off')">Silenciar</button><p id="st"></p></div>
<script>async function c(u){await fetch(u);e()}async function e(){const d=await (await fetch('/estado')).json();
document.getElementById('luz').textContent='luz: '+(d.luz?'LIGADA':'desligada');document.getElementById('st').textContent='alerta: '+d.alerta+' | ultimo comando: '+d.ultimo}
e();setInterval(e,1500)</script></body></html>)HTML";

void rotaPagina() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA); }
void rotaLuz() {
  if (servidor.hasArg("toggle")) setLuz(!luzLigada); else if (servidor.hasArg("on")) setLuz(servidor.arg("on") == "1");
  ultimoComando = "luz " + String(luzLigada ? "on" : "off");
  servidor.sendHeader("Access-Control-Allow-Origin", "*"); servidor.send(200, "text/plain", luzLigada ? "on" : "off");
}
void rotaAlerta() { setAlerta(servidor.arg("tipo")); ultimoComando = "alerta " + alertaAtual; servidor.sendHeader("Access-Control-Allow-Origin", "*"); servidor.send(200, "text/plain", alertaAtual); }
void rotaLed() { corPorNome(servidor.arg("cor")); ultimoComando = "led " + servidor.arg("cor"); servidor.sendHeader("Access-Control-Allow-Origin", "*"); servidor.send(200, "text/plain", "ok"); }
void rotaEstado() {
  String j = "{\"luz\":" + String(luzLigada ? "true" : "false") + ",\"alerta\":\"" + alertaAtual + "\",\"ultimo\":\"" + ultimoComando + "\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
  servidor.sendHeader("Access-Control-Allow-Origin", "*"); servidor.send(200, "application/json", j);
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_RELE, OUTPUT); setLuz(false);
  pinMode(PINO_BUZZER, OUTPUT); pinMode(PINO_BOTAO, INPUT_PULLUP);
  ledcAttach(PINO_R, 5000, 8); ledcAttach(PINO_G, 5000, 8); ledcAttach(PINO_B, 5000, 8);
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_SENHA);
  Serial.print("Conectando"); cor(0, 0, 60);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nIP: "); Serial.println(WiFi.localIP());
  if (MDNS.begin(NOME_MDNS)) Serial.printf("http://%s.local\n", NOME_MDNS);
  servidor.on("/", rotaPagina); servidor.on("/luz", rotaLuz); servidor.on("/alerta", rotaAlerta); servidor.on("/led", rotaLed); servidor.on("/estado", rotaEstado);
  servidor.begin();
  cor(0, 0, 0); tone(PINO_BUZZER, 1500, 80);
}

void loop() {
  servidor.handleClient();
  // botao local: liga/desliga a luz mesmo sem rede
  bool b = digitalRead(PINO_BOTAO);
  if (botaoAntes == HIGH && b == LOW) { setLuz(!luzLigada); delay(50); }
  botaoAntes = b;
  // alerta "intruso": buzzer sirene + LED piscando ate o fim
  if (alertaAtual == "intruso") {
    if (millis() > fimAlerta) setAlerta("off");
    else if (millis() - ultimoBipe > 250) { ultimoBipe = millis(); bipando = !bipando; if (bipando) { tone(PINO_BUZZER, 2200); cor(255, 0, 0); } else { tone(PINO_BUZZER, 1400); cor(0, 0, 0); } }
  } else if (alertaAtual == "bemvindo" && millis() > fimAlerta) setAlerta("off");
}
