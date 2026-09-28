/*
  06 - Controle pelo Wi-Fi: pagina web local para o semaforo e o LED RGB
  Placa: ESP32 Dev Module (core esp32 3.x)   Ligacoes: iguais ao sketch 05

  Como funciona:
    1. O ESP32 entra na rede Wi-Fi (ou cria a sua propria, se MODO_AP = true).
    2. Ele roda um SERVIDOR WEB: quem acessar http://<ip>/ recebe a pagina HTML abaixo.
    3. Os botoes da pagina chamam enderecos como /semaforo?cor=verde  e  /rgb?r=255&g=0&b=0
    4. O ESP32 le os parametros e acende os LEDs. Tudo sem delay(), para nunca travar o servidor.

  Abra o Monitor Serial (115200) para ver o endereco IP. Celular e ESP32 na MESMA rede.
*/
#include <WiFi.h>
#include <WebServer.h>

// ---------- rede ----------
const bool MODO_AP = true;                 // true: o ESP32 cria a rede "Semaforo-ESP32" (senha abaixo)
const char* SSID_AP = "Semaforo-ESP32";    // false: entra na rede da escola (preencha abaixo)
const char* SENHA_AP = "12345678";
const char* SSID_ESCOLA = "NOME-DA-REDE";
const char* SENHA_ESCOLA = "SENHA-DA-REDE";

// ---------- pinos ----------
const int VERMELHO = 25, AMARELO = 26, VERDE = 27;
const int PINO_R = 14, PINO_G = 12, PINO_B = 13;
const int BOTAO = 4, PINO_POT = 34;        // botao fisico: avanca o semaforo; pot: brilho geral do RGB
bool botaoAntes = HIGH;

WebServer servidor(80);

// estado atual (o que a pagina mostra e o que os LEDs fazem)
String corSemaforo = "auto";               // "auto", "verde", "amarelo", "vermelho", "off"
int corR = 0, corG = 0, corB = 128;
const int FASE_PINO[] = { VERDE, AMARELO, VERMELHO };
const unsigned long FASE_MS[] = { 4000, 1500, 4000 };
int faseAtual = 0;
unsigned long inicioFase = 0;

// ---------- pagina HTML (fica na memoria flash) ----------
const char PAGINA[] PROGMEM = R"HTML(
<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Semaforo ESP32</title>
<style>
 body{font-family:sans-serif;background:#111;color:#eee;text-align:center;margin:0;padding:16px}
 h1{font-size:1.4em} .card{background:#222;border-radius:12px;padding:16px;margin:12px auto;max-width:360px}
 button{font-size:1.1em;padding:12px 18px;margin:6px;border:0;border-radius:8px;color:#fff;cursor:pointer}
 .vd{background:#2a2} .am{background:#ca0} .vm{background:#c22} .au{background:#448} .off{background:#555}
 input[type=color]{width:120px;height:60px;border:0;background:none}
 #estado{opacity:.8}
</style></head><body>
<h1>Semaforo + RGB pelo Wi-Fi</h1>
<div class="card"><h2>Semaforo</h2>
 <button class="vd" onclick="sem('verde')">Verde</button>
 <button class="am" onclick="sem('amarelo')">Amarelo</button>
 <button class="vm" onclick="sem('vermelho')">Vermelho</button><br>
 <button class="au" onclick="sem('auto')">Automatico</button>
 <button class="off" onclick="sem('off')">Apagar</button>
 <p id="estado">estado: %SEMAFORO%</p></div>
<div class="card"><h2>LED RGB</h2>
 <input type="color" id="cor" value="%COR%" oninput="rgb(this.value)">
 <p>toque na cor para escolher</p></div>
<script>
 function sem(c){fetch('/semaforo?cor='+c).then(r=>r.text()).then(t=>document.getElementById('estado').textContent='estado: '+t)}
 function rgb(hex){const r=parseInt(hex.substr(1,2),16),g=parseInt(hex.substr(3,2),16),b=parseInt(hex.substr(5,2),16);
   fetch('/rgb?r='+r+'&g='+g+'&b='+b)}
</script></body></html>
)HTML";

// ---------- LEDs ----------
void mostrar(int pino) {
  digitalWrite(VERMELHO, pino == VERMELHO);
  digitalWrite(AMARELO,  pino == AMARELO);
  digitalWrite(VERDE,    pino == VERDE);
}
void aplicarSemaforo() {
  if (corSemaforo == "verde")         mostrar(VERDE);
  else if (corSemaforo == "amarelo")  mostrar(AMARELO);
  else if (corSemaforo == "vermelho") mostrar(VERMELHO);
  else if (corSemaforo == "off")      mostrar(-1);
  // "auto": quem cuida e o loop() com millis()
}
int brilho = 255;                                   // 0..255, vem do potenciometro
void cor(int r, int g, int b) {                     // aplica o brilho do pot a cor escolhida na pagina
  ledcWrite(PINO_R, r * brilho / 255);
  ledcWrite(PINO_G, g * brilho / 255);
  ledcWrite(PINO_B, b * brilho / 255);
}

// ---------- rotas do servidor ----------
void paginaInicial() {
  String html = FPSTR(PAGINA);
  html.replace("%SEMAFORO%", corSemaforo);
  char hex[8]; snprintf(hex, sizeof(hex), "#%02x%02x%02x", corR, corG, corB);
  html.replace("%COR%", hex);
  servidor.send(200, "text/html; charset=utf-8", html);
}
void rotaSemaforo() {
  if (servidor.hasArg("cor")) corSemaforo = servidor.arg("cor");
  aplicarSemaforo();
  Serial.println("semaforo -> " + corSemaforo);
  servidor.send(200, "text/plain", corSemaforo);
}
void rotaRgb() {
  corR = servidor.arg("r").toInt();
  corG = servidor.arg("g").toInt();
  corB = servidor.arg("b").toInt();
  cor(corR, corG, corB);
  Serial.printf("rgb -> %d %d %d\n", corR, corG, corB);
  servidor.send(200, "text/plain", "ok");
}

void setup() {
  Serial.begin(115200);
  pinMode(VERMELHO, OUTPUT); pinMode(AMARELO, OUTPUT); pinMode(VERDE, OUTPUT);
  pinMode(BOTAO, INPUT_PULLUP);
  analogReadResolution(12);
  ledcAttach(PINO_R, 5000, 8); ledcAttach(PINO_G, 5000, 8); ledcAttach(PINO_B, 5000, 8);
  cor(corR, corG, corB);

  if (MODO_AP) {
    WiFi.softAP(SSID_AP, SENHA_AP);
    Serial.print("Rede criada: "); Serial.print(SSID_AP);
    Serial.print("  ->  acesse http://"); Serial.println(WiFi.softAPIP());
  } else {
    WiFi.begin(SSID_ESCOLA, SENHA_ESCOLA);
    Serial.print("Conectando");
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.print("\nConectado!  ->  acesse http://"); Serial.println(WiFi.localIP());
  }

  servidor.on("/", paginaInicial);
  servidor.on("/semaforo", rotaSemaforo);
  servidor.on("/rgb", rotaRgb);
  servidor.begin();
  inicioFase = millis();
}

void loop() {
  servidor.handleClient();                       // atende quem acessou a pagina
  if (corSemaforo == "auto" && millis() - inicioFase >= FASE_MS[faseAtual]) {
    faseAtual = (faseAtual + 1) % 3;
    mostrar(FASE_PINO[faseAtual]);
    inicioFase = millis();
  }
  // botao fisico: forca a proxima cor (a pagina passa a mostrar esse estado)
  bool botaoAgora = digitalRead(BOTAO);
  if (botaoAntes == HIGH && botaoAgora == LOW) {
    if (corSemaforo == "verde") corSemaforo = "amarelo";
    else if (corSemaforo == "amarelo") corSemaforo = "vermelho";
    else corSemaforo = "verde";
    aplicarSemaforo();
    delay(50);
  }
  botaoAntes = botaoAgora;
  // potenciometro: brilho geral do RGB (le a cada 100 ms para nao "tremer")
  static unsigned long ultimoPot = 0;
  if (millis() - ultimoPot > 100) {
    ultimoPot = millis();
    int novo = map(analogRead(PINO_POT), 0, 4095, 0, 255);
    if (abs(novo - brilho) > 3) { brilho = novo; cor(corR, corG, corB); }
  }
}
