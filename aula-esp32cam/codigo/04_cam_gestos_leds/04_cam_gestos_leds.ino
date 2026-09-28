/*
  04 - Projeto: gestos com a mao (reconhecidos em Python) acendem LEDs de cores diferentes
  Placa: AI Thinker ESP32-CAM      Arquivo extra: camera_aithinker.h

  Divisao de trabalho:
    ESP32-CAM  = olhos (video/foto pela rede) + maos (LED RGB)
    Python/PC  = cerebro (MediaPipe reconhece o gesto e manda a cor de volta por HTTP)

  Ligacoes (microSD nao usado, entao GPIO 12/13/14 estao livres):
    LED RGB catodo comum: R -> 220 -> GPIO 12   G -> 220 -> GPIO 13   B -> 220 -> GPIO 14   comum -> GND
  Rede: "Camera-ESP32" / http://192.168.4.1     (ou MODO_AP = false para entrar na rede da escola)
  Rotas: /capture (foto), :81/stream (video), /led?r=255&g=0&b=0, /led?cor=verde, /estado
*/
#include <WiFi.h>
#include "esp_http_server.h"
#include "camera_aithinker.h"

const bool MODO_AP = true;
const char* SSID_AP = "Camera-ESP32"; const char* SENHA_AP = "12345678";
const char* SSID_REDE = "NOME-DA-REDE"; const char* SENHA_REDE = "SENHA-DA-REDE";
const int PINO_R = 12, PINO_G = 13, PINO_B = 14;
httpd_handle_t servidorWeb = NULL, servidorStream = NULL;
int corR = 0, corG = 0, corB = 0;
String ultimoGesto = "nenhum";
unsigned long ultimoComando = 0;

void cor(int r, int g, int b) { corR = r; corG = g; corB = b; ledcWrite(PINO_R, r); ledcWrite(PINO_G, g); ledcWrite(PINO_B, b); }

// cores por nome (o Python pode mandar o nome do gesto direto)
bool corPorNome(const String& n) {
  if (n == "vermelho" || n == "Closed_Fist")  cor(255, 0, 0);
  else if (n == "verde" || n == "Open_Palm")  cor(0, 255, 0);
  else if (n == "azul" || n == "Pointing_Up") cor(0, 0, 255);
  else if (n == "amarelo" || n == "Victory")  cor(255, 150, 0);
  else if (n == "roxo" || n == "Thumb_Up")    cor(160, 0, 255);
  else if (n == "ciano" || n == "ILoveYou")   cor(0, 255, 255);
  else if (n == "branco")                     cor(255, 255, 255);
  else if (n == "off" || n == "Thumb_Down" || n == "None") cor(0, 0, 0);
  else return false;
  return true;
}

static String argStr(httpd_req_t* req, const char* nome) {
  char url[128], v[32];
  if (httpd_req_get_url_query_str(req, url, sizeof(url)) == ESP_OK && httpd_query_key_value(url, nome, v, sizeof(v)) == ESP_OK) return String(v);
  return "";
}
static esp_err_t captureHandler(httpd_req_t* req) {
  camera_fb_t* fb = esp_camera_fb_get(); if (!fb) { httpd_resp_send_500(req); return ESP_FAIL; }
  httpd_resp_set_type(req, "image/jpeg"); httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t r = httpd_resp_send(req, (const char*)fb->buf, fb->len); esp_camera_fb_return(fb); return r;
}
static esp_err_t streamHandler(httpd_req_t* req) {
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame"); char cab[64];
  while (true) {
    camera_fb_t* fb = esp_camera_fb_get(); if (!fb) break;
    size_t n = snprintf(cab, sizeof(cab), "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    esp_err_t r = httpd_resp_send_chunk(req, cab, n); if (r == ESP_OK) r = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb); if (r != ESP_OK) break;
  }
  return ESP_OK;
}
static esp_err_t ledHandler(httpd_req_t* req) {
  String nome = argStr(req, "cor"), sr = argStr(req, "r");
  if (nome.length()) { corPorNome(nome); ultimoGesto = nome; }
  else if (sr.length()) cor(sr.toInt(), argStr(req, "g").toInt(), argStr(req, "b").toInt());
  ultimoComando = millis();
  Serial.printf("LED <- %s (%d,%d,%d)\n", nome.c_str(), corR, corG, corB);
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN);
}
static esp_err_t estadoHandler(httpd_req_t* req) {
  String j = "{\"gesto\":\"" + ultimoGesto + "\",\"r\":" + corR + ",\"g\":" + corG + ",\"b\":" + corB + "}";
  httpd_resp_set_type(req, "application/json"); return httpd_resp_send(req, j.c_str(), j.length());
}
static esp_err_t paginaHandler(httpd_req_t* req) {
  static const char P[] = R"HTML(<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gestos</title>
<style>body{font-family:sans-serif;background:#111;color:#eee;text-align:center;padding:10px}img{max-width:100%;border-radius:8px}#c{width:80px;height:80px;border-radius:50%;margin:10px auto;border:3px solid #444}</style></head>
<body><h2>ESP32-CAM - gestos</h2><img id="v"><div id="c"></div><p id="g">-</p>
<script>v.src=location.protocol+'//'+location.hostname+':81/stream';setInterval(async()=>{const d=await (await fetch('/estado')).json();
c.style.background='rgb('+d.r+','+d.g+','+d.b+')';g.textContent='ultimo gesto: '+d.gesto},500)</script></body></html>)HTML";
  httpd_resp_set_type(req, "text/html; charset=utf-8"); return httpd_resp_send(req, P, HTTPD_RESP_USE_STRLEN);
}

void setup() {
  Serial.begin(115200);
  ledcAttach(PINO_R, 5000, 8); ledcAttach(PINO_G, 5000, 8); ledcAttach(PINO_B, 5000, 8);
  cor(0, 0, 40);
  if (!cameraIniciar(FRAMESIZE_VGA, 12)) { while (true) delay(1000); }     // VGA: bom para o MediaPipe e rapido
  if (MODO_AP) { WiFi.softAP(SSID_AP, SENHA_AP); Serial.print("http://"); Serial.println(WiFi.softAPIP()); }
  else { WiFi.begin(SSID_REDE, SENHA_REDE); while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); } Serial.print("\nhttp://"); Serial.println(WiFi.localIP()); }
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t us[] = { {"/", HTTP_GET, paginaHandler, NULL}, {"/capture", HTTP_GET, captureHandler, NULL}, {"/led", HTTP_GET, ledHandler, NULL}, {"/estado", HTTP_GET, estadoHandler, NULL} };
  if (httpd_start(&servidorWeb, &cfg) == ESP_OK) for (auto& u : us) httpd_register_uri_handler(servidorWeb, &u);
  cfg.server_port = 81; cfg.ctrl_port = 32769;
  httpd_uri_t uStream = { "/stream", HTTP_GET, streamHandler, NULL };
  if (httpd_start(&servidorStream, &cfg) == ESP_OK) httpd_register_uri_handler(servidorStream, &uStream);
  cor(0, 0, 0);
}

void loop() {
  // se o Python parar de mandar comandos por 5 s, apaga (evita LED "preso")
  if (ultimoComando && millis() - ultimoComando > 5000) { cor(0, 0, 0); ultimoComando = 0; ultimoGesto = "sem conexao"; }
  delay(100);
}
