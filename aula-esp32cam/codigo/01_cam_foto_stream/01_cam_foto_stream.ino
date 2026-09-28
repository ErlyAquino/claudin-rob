/*
  01 - ESP32-CAM: foto e video ao vivo na rede local
  Placa: "AI Thinker ESP32-CAM" (esp32:esp32:esp32cam)   Sem bibliotecas extras (esp_camera vem no core)
  Arquivo extra na pasta: camera_aithinker.h

  Gravacao: o ESP32-CAM NAO tem USB. Use um adaptador USB-serial (FTDI/CH340) em 5 V:
     adaptador TX -> U0R (GPIO 3)   adaptador RX -> U0T (GPIO 1)   5V -> 5V   GND -> GND
     GPIO 0 ligado ao GND SOMENTE durante a gravacao (modo flash); depois solte e aperte RST.
     (A base "ESP32-CAM-MB" faz isso sozinha, com um micro-USB.)

  O ESP32 cria a rede "Camera-ESP32" (senha 12345678). Abra http://192.168.4.1
     /            pagina com o video ao vivo e botoes
     /capture     uma foto JPEG (abra num navegador, ou use no Python)
     /stream      video MJPEG (na porta 81): http://192.168.4.1:81/stream
     /flash?on=1  liga/desliga o LED de flash (GPIO 4)
     /tamanho?v=N muda a resolucao (5 = QVGA 320x240, 8 = VGA, 9 = SVGA, 10 = XGA, 13 = UXGA 1600x1200)
*/
#include <WiFi.h>
#include "esp_http_server.h"
#include "camera_aithinker.h"

const char* SSID_AP = "Camera-ESP32";
const char* SENHA_AP = "12345678";
httpd_handle_t servidorWeb = NULL, servidorStream = NULL;

const char PAGINA[] = R"HTML(<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32-CAM</title><style>body{font-family:sans-serif;background:#111;color:#eee;text-align:center;margin:0;padding:10px}
img{max-width:100%;border-radius:8px}button{font-size:1em;padding:10px 16px;margin:6px;border:0;border-radius:8px;background:#448;color:#fff}</style></head>
<body><h2>ESP32-CAM ao vivo</h2><img id="v" src=""><br>
<button onclick="v.src=location.protocol+'//'+location.hostname+':81/stream'">Video</button>
<button onclick="v.src='/capture?t='+Date.now()">Foto</button>
<button onclick="fetch('/flash?on=1')">Flash on</button><button onclick="fetch('/flash?on=0')">Flash off</button><br>
<button onclick="fetch('/tamanho?v=5')">320x240</button><button onclick="fetch('/tamanho?v=8')">640x480</button>
<button onclick="fetch('/tamanho?v=9')">800x600</button><button onclick="fetch('/tamanho?v=13')">1600x1200</button>
<script>v.src=location.protocol+'//'+location.hostname+':81/stream'</script></body></html>)HTML";

// ---------- handlers ----------
static esp_err_t paginaHandler(httpd_req_t* req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  return httpd_resp_send(req, PAGINA, HTTPD_RESP_USE_STRLEN);
}
static esp_err_t captureHandler(httpd_req_t* req) {
  camera_fb_t* fb = esp_camera_fb_get();               // pega um quadro (frame buffer)
  if (!fb) { httpd_resp_send_500(req); return ESP_FAIL; }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=foto.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t r = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);                            // devolve o buffer (obrigatorio!)
  return r;
}
static esp_err_t streamHandler(httpd_req_t* req) {    // MJPEG: uma sequencia de JPEGs separados por um "boundary"
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  char cabecalho[64];
  while (true) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) break;
    size_t n = snprintf(cabecalho, sizeof(cabecalho), "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    esp_err_t r = httpd_resp_send_chunk(req, cabecalho, n);
    if (r == ESP_OK) r = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (r != ESP_OK) break;                            // o navegador fechou: para o laco
  }
  return ESP_OK;
}
static int lerArg(httpd_req_t* req, const char* nome) {   // le ?nome=valor da URL
  char url[64], valor[8];
  if (httpd_req_get_url_query_str(req, url, sizeof(url)) == ESP_OK && httpd_query_key_value(url, nome, valor, sizeof(valor)) == ESP_OK) return atoi(valor);
  return -1;
}
static esp_err_t flashHandler(httpd_req_t* req) {
  int on = lerArg(req, "on");
  if (on >= 0) digitalWrite(FLASH_GPIO_NUM, on ? HIGH : LOW);
  return httpd_resp_send(req, on ? "flash ligado" : "flash desligado", HTTPD_RESP_USE_STRLEN);
}
static esp_err_t tamanhoHandler(httpd_req_t* req) {
  int v = lerArg(req, "v");
  if (v >= 0) esp_camera_sensor_get()->set_framesize(esp_camera_sensor_get(), (framesize_t)v);
  return httpd_resp_send(req, "ok", HTTPD_RESP_USE_STRLEN);
}

void iniciarServidores() {
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t uPagina = { "/", HTTP_GET, paginaHandler, NULL };
  httpd_uri_t uCapture = { "/capture", HTTP_GET, captureHandler, NULL };
  httpd_uri_t uFlash = { "/flash", HTTP_GET, flashHandler, NULL };
  httpd_uri_t uTam = { "/tamanho", HTTP_GET, tamanhoHandler, NULL };
  if (httpd_start(&servidorWeb, &cfg) == ESP_OK) {
    httpd_register_uri_handler(servidorWeb, &uPagina); httpd_register_uri_handler(servidorWeb, &uCapture);
    httpd_register_uri_handler(servidorWeb, &uFlash);  httpd_register_uri_handler(servidorWeb, &uTam);
  }
  cfg.server_port = 81; cfg.ctrl_port = 32769;         // o stream fica num servidor separado (porta 81) para nao travar os outros pedidos
  httpd_uri_t uStream = { "/stream", HTTP_GET, streamHandler, NULL };
  if (httpd_start(&servidorStream, &cfg) == ESP_OK) httpd_register_uri_handler(servidorStream, &uStream);
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO_NUM, OUTPUT); digitalWrite(FLASH_GPIO_NUM, LOW);
  if (!cameraIniciar(FRAMESIZE_SVGA, 12)) { while (true) delay(1000); }
  WiFi.softAP(SSID_AP, SENHA_AP);
  iniciarServidores();
  Serial.print("Rede "); Serial.print(SSID_AP); Serial.print(" -> http://"); Serial.println(WiFi.softAPIP());
  Serial.println("Stream: http://192.168.4.1:81/stream   Foto: http://192.168.4.1/capture");
}

void loop() { delay(100); }   // os servidores rodam em tarefas proprias; o loop fica livre
