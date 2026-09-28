/*
  02 - Camera de seguranca: sensor de presenca (PIR) + gravacao no microSD + galeria web
  Placa: AI Thinker ESP32-CAM      Arquivo extra: camera_aithinker.h
  Bibliotecas: SD_MMC, FS (vem no core)

  Ligacoes:
    PIR HC-SR501: VCC -> 5V   GND -> GND   OUT -> GPIO 13   (o PIR sai em 3,3 V, ok)
    LED de status (verde) -> resistor 220 -> GPIO 12 -> GND  (GPIO 12 deve ficar em LOW no boot: LED para o GND e seguro)
    microSD no slot (formatado em FAT32, ate 32 GB)
    Flash: GPIO 4 (LED da propria placa)

  O microSD e usado em modo 1 bit (GPIO 2, 14, 15) para liberar os GPIO 4, 12 e 13.
  Cada movimento: liga o flash (se escuro/opcao), tira uma foto, grava /fotos/AAAA-MM-DD_HH-MM-SS.jpg.
  Data/hora: se MODO_AP = false, o ESP32 entra na sua rede e acerta o relogio pela internet (NTP);
  em modo AP nao ha internet: os nomes usam o tempo desde que ligou.
  Pagina: /  (ao vivo + galeria)   /lista  (JSON)   /foto?n=nome   /apagar?n=nome   /modo?timelapse=SEG
*/
#include <WiFi.h>
#include <time.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_http_server.h"
#include "camera_aithinker.h"

const bool MODO_AP = true;
const char* SSID_AP = "Camera-ESP32";  const char* SENHA_AP = "12345678";
const char* SSID_REDE = "NOME-DA-REDE"; const char* SENHA_REDE = "SENHA-DA-REDE";
const int PINO_PIR = 13, PINO_LED = 12;
const bool USAR_FLASH = true;
const unsigned long INTERVALO_MIN_MS = 5000;   // nao tira 2 fotos em menos de 5 s

httpd_handle_t servidorWeb = NULL, servidorStream = NULL;
unsigned long ultimaFoto = 0, timelapseSeg = 0, ultimoTimelapse = 0;
int totalFotos = 0;
bool sdOk = false;

// ---------- utilidades ----------
String nomeArquivo() {
  struct tm t;
  char nome[48];
  if (getLocalTime(&t, 10)) strftime(nome, sizeof(nome), "/fotos/%Y-%m-%d_%H-%M-%S.jpg", &t);
  else snprintf(nome, sizeof(nome), "/fotos/t%08lu.jpg", millis() / 1000);
  return String(nome);
}
bool tirarFoto(const char* motivo) {
  if (USAR_FLASH) { digitalWrite(FLASH_GPIO_NUM, HIGH); delay(120); }
  camera_fb_t* fb = esp_camera_fb_get();
  digitalWrite(FLASH_GPIO_NUM, LOW);
  if (!fb) { Serial.println("sem quadro"); return false; }
  bool ok = false;
  if (sdOk) {
    String nome = nomeArquivo();
    File f = SD_MMC.open(nome, FILE_WRITE);
    if (f) { f.write(fb->buf, fb->len); f.close(); ok = true; totalFotos++; Serial.printf("[%s] gravada %s (%u bytes)\n", motivo, nome.c_str(), fb->len); }
    else Serial.println("erro ao abrir arquivo no SD");
  }
  esp_camera_fb_return(fb);
  return ok;
}

// ---------- web ----------
const char PAGINA[] = R"HTML(<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Camera de seguranca</title><style>body{font-family:sans-serif;background:#111;color:#eee;margin:0;padding:10px;text-align:center}
img{max-width:100%;border-radius:8px}.g{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.g div{background:#222;padding:6px;border-radius:8px;font-size:.8em}
.g img{width:160px;height:120px;object-fit:cover}button{font-size:.9em;padding:8px 12px;margin:4px;border:0;border-radius:8px;background:#448;color:#fff}
#st{color:#8f8}</style></head><body><h2>Camera de seguranca</h2>
<img id="v"><p id="st"></p>
<button onclick="fetch('/foto_agora').then(lista)">Tirar foto agora</button>
<button onclick="fetch('/modo?timelapse=30').then(lista)">Timelapse 30 s</button><button onclick="fetch('/modo?timelapse=0').then(lista)">Parar timelapse</button>
<h3>Galeria (SD)</h3><div class="g" id="g"></div>
<script>v.src=location.protocol+'//'+location.hostname+':81/stream';
async function lista(){const d=await (await fetch('/lista')).json();st.textContent='fotos: '+d.total+' | movimento: '+(d.pir?'SIM':'nao')+' | timelapse: '+d.timelapse+' s';
g.innerHTML=d.fotos.slice().reverse().map(n=>'<div><a href="/foto?n='+n+'" target="_blank"><img src="/foto?n='+n+'"></a><br>'+n+' <button onclick="fetch(\'/apagar?n='+n+'\').then(lista)">x</button></div>').join('')}
lista();setInterval(lista,10000)</script></body></html>)HTML";

static esp_err_t paginaHandler(httpd_req_t* req) { httpd_resp_set_type(req, "text/html; charset=utf-8"); return httpd_resp_send(req, PAGINA, HTTPD_RESP_USE_STRLEN); }
static esp_err_t streamHandler(httpd_req_t* req) {
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  char cab[64];
  while (true) {
    camera_fb_t* fb = esp_camera_fb_get(); if (!fb) break;
    size_t n = snprintf(cab, sizeof(cab), "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    esp_err_t r = httpd_resp_send_chunk(req, cab, n);
    if (r == ESP_OK) r = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (r != ESP_OK) break;
  }
  return ESP_OK;
}
static String argStr(httpd_req_t* req, const char* nome) {
  char url[128], v[64];
  if (httpd_req_get_url_query_str(req, url, sizeof(url)) == ESP_OK && httpd_query_key_value(url, nome, v, sizeof(v)) == ESP_OK) return String(v);
  return "";
}
static esp_err_t listaHandler(httpd_req_t* req) {
  String json = "{\"total\":" + String(totalFotos) + ",\"pir\":" + (digitalRead(PINO_PIR) ? "true" : "false") + ",\"timelapse\":" + String(timelapseSeg) + ",\"fotos\":[";
  if (sdOk) {
    File dir = SD_MMC.open("/fotos"); File f = dir.openNextFile(); bool primeiro = true; int n = 0;
    while (f && n < 60) { if (!f.isDirectory()) { if (!primeiro) json += ","; json += "\"" + String(f.name()) + "\""; primeiro = false; n++; } f = dir.openNextFile(); }
  }
  json += "]}";
  httpd_resp_set_type(req, "application/json");
  return httpd_resp_send(req, json.c_str(), json.length());
}
static esp_err_t fotoHandler(httpd_req_t* req) {          // serve um JPEG do SD
  String n = argStr(req, "n"); File f = SD_MMC.open("/fotos/" + n);
  if (!f) { httpd_resp_send_404(req); return ESP_FAIL; }
  httpd_resp_set_type(req, "image/jpeg");
  char buf[2048]; size_t lidos;
  while ((lidos = f.read((uint8_t*)buf, sizeof(buf))) > 0) httpd_resp_send_chunk(req, buf, lidos);
  f.close(); httpd_resp_send_chunk(req, NULL, 0);
  return ESP_OK;
}
static esp_err_t apagarHandler(httpd_req_t* req) { String n = argStr(req, "n"); SD_MMC.remove("/fotos/" + n); return httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN); }
static esp_err_t fotoAgoraHandler(httpd_req_t* req) { tirarFoto("web"); return httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN); }
static esp_err_t modoHandler(httpd_req_t* req) { timelapseSeg = argStr(req, "timelapse").toInt(); return httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN); }

void iniciarServidores() {
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG(); cfg.max_uri_handlers = 10;
  httpd_uri_t us[] = { {"/", HTTP_GET, paginaHandler, NULL}, {"/lista", HTTP_GET, listaHandler, NULL}, {"/foto", HTTP_GET, fotoHandler, NULL},
                       {"/apagar", HTTP_GET, apagarHandler, NULL}, {"/foto_agora", HTTP_GET, fotoAgoraHandler, NULL}, {"/modo", HTTP_GET, modoHandler, NULL} };
  if (httpd_start(&servidorWeb, &cfg) == ESP_OK) for (auto& u : us) httpd_register_uri_handler(servidorWeb, &u);
  cfg.server_port = 81; cfg.ctrl_port = 32769;
  httpd_uri_t uStream = { "/stream", HTTP_GET, streamHandler, NULL };
  if (httpd_start(&servidorStream, &cfg) == ESP_OK) httpd_register_uri_handler(servidorStream, &uStream);
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO_NUM, OUTPUT); digitalWrite(FLASH_GPIO_NUM, LOW);
  pinMode(PINO_PIR, INPUT); pinMode(PINO_LED, OUTPUT);
  if (!cameraIniciar(FRAMESIZE_SVGA, 12)) { while (true) delay(1000); }

  sdOk = SD_MMC.begin("/sdcard", true);              // true = modo 1 bit (libera GPIO 4, 12, 13)
  if (sdOk) { SD_MMC.mkdir("/fotos"); Serial.printf("SD OK: %llu MB\n", SD_MMC.cardSize() / (1024 * 1024)); }
  else Serial.println("SD nao encontrado: fotos nao serao gravadas");

  if (MODO_AP) { WiFi.softAP(SSID_AP, SENHA_AP); Serial.print("http://"); Serial.println(WiFi.softAPIP()); }
  else {
    WiFi.begin(SSID_REDE, SENHA_REDE);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.print("\nhttp://"); Serial.println(WiFi.localIP());
    configTime(-3 * 3600, 0, "pool.ntp.org");        // horario de Brasilia
  }
  iniciarServidores();
  digitalWrite(PINO_LED, HIGH);
  Serial.println("O PIR precisa de ~60 s para estabilizar apos ligar.");
}

void loop() {
  // 1) movimento (borda de subida do PIR) com intervalo minimo
  static bool pirAntes = false;
  bool pir = digitalRead(PINO_PIR);
  if (pir && !pirAntes && millis() - ultimaFoto > INTERVALO_MIN_MS) {
    ultimaFoto = millis();
    digitalWrite(PINO_LED, LOW); tirarFoto("PIR"); digitalWrite(PINO_LED, HIGH);
  }
  pirAntes = pir;
  // 2) timelapse
  if (timelapseSeg > 0 && millis() - ultimoTimelapse >= timelapseSeg * 1000UL) { ultimoTimelapse = millis(); tirarFoto("timelapse"); }
  delay(50);
}
