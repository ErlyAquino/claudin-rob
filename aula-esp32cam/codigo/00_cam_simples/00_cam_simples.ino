/*
  00 - ESP32-CAM simples: so a camera ao vivo no navegador
  Placa: "AI Thinker ESP32-CAM" (esp32:esp32:esp32cam)
  Sem bibliotecas extras e sem cartao microSD.

  Como usar:
    1. Grave com o IO0 ligado ao GND. Depois tire o jumper do IO0 e religue a placa.
    2. No celular ou no computador, entre na rede Wi-Fi "Camera-ESP32" (senha 12345678).
    3. Abra http://192.168.4.1 no navegador.
  O LED vermelho do verso pisca 1 vez por segundo enquanto o programa roda.
*/

// ===== PARTE 1: bibliotecas (todas ja vem com a placa ESP32) =====
#include <WiFi.h>              // Wi-Fi: cria a rede da camera
#include "esp_camera.h"        // camera: liga o sensor e entrega as fotos
#include "esp_http_server.h"   // servidor web: responde ao navegador

// ===== PARTE 2: configuracoes =====
const char* NOME_REDE  = "Camera-ESP32";
const char* SENHA_REDE = "12345678";   // no minimo 8 caracteres
const int LED_VERMELHO = 33;           // LED pequeno do verso da placa (acende com LOW)

// ===== PARTE 3: pinos da camera na placa AI-Thinker (fixos, nao mude) =====
#define PWDN_GPIO_NUM  32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM   0
#define SIOD_GPIO_NUM  26
#define SIOC_GPIO_NUM  27
#define Y9_GPIO_NUM    35
#define Y8_GPIO_NUM    34
#define Y7_GPIO_NUM    39
#define Y6_GPIO_NUM    36
#define Y5_GPIO_NUM    21
#define Y4_GPIO_NUM    19
#define Y3_GPIO_NUM    18
#define Y2_GPIO_NUM     5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22

// ===== PARTE 4: ligar a camera =====
bool iniciarCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;    c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;            // relogio de 20 MHz para o sensor
  c.pixel_format = PIXFORMAT_JPEG;      // o sensor ja entrega a foto comprimida em JPEG
  c.frame_size = FRAMESIZE_VGA;         // 640 x 480 pixels
  c.jpeg_quality = 12;                  // 0 = melhor qualidade ... 63 = pior
  c.fb_count = 1;                       // 1 quadro na memoria por vez
  c.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;     // sempre o quadro mais novo

  if (esp_camera_init(&c) != ESP_OK) return false;
  sensor_t* s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) s->set_vflip(s, 1);   // OV3660: imagem de cabeca para baixo
  return true;
}

// ===== PARTE 5: a pagina que o navegador recebe =====
const char PAGINA[] = R"HTML(<!DOCTYPE html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32-CAM</title>
<style>body{background:#111;color:#eee;font-family:sans-serif;
  text-align:center;margin:0;padding:10px}
img{max-width:100%;border-radius:8px}</style></head>
<body><h2>ESP32-CAM ao vivo</h2><img src="/video"></body></html>)HTML";

// ===== PARTE 6: o que fazer quando o navegador pede cada endereco =====
// Endereco "/": envia a pagina.
esp_err_t responderPagina(httpd_req_t* req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  return httpd_resp_send(req, PAGINA, HTTPD_RESP_USE_STRLEN);
}

// Endereco "/video": envia fotos JPEG uma atras da outra, sem parar (video MJPEG).
esp_err_t responderVideo(httpd_req_t* req) {
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=quadro");
  char cabecalho[80];
  while (true) {
    camera_fb_t* foto = esp_camera_fb_get();          // 1. pede uma foto a camera
    if (!foto) return ESP_FAIL;
    int n = snprintf(cabecalho, sizeof(cabecalho),    // 2. monta o aviso de que vem uma foto...
      "\r\n--quadro\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", foto->len);
    esp_err_t r = httpd_resp_send_chunk(req, cabecalho, n);                 //    ...e envia o aviso
    if (r == ESP_OK)
      r = httpd_resp_send_chunk(req, (const char*)foto->buf, foto->len);   // 3. envia a foto
    esp_camera_fb_return(foto);                       // 4. devolve a memoria (obrigatorio)
    if (r != ESP_OK) return ESP_OK;                   // o navegador fechou a pagina: para
  }
}

void iniciarServidor() {
  httpd_handle_t servidor = NULL;
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();        // porta 80, a padrao dos sites
  httpd_uri_t pagina = { "/",      HTTP_GET, responderPagina, NULL };
  httpd_uri_t video  = { "/video", HTTP_GET, responderVideo,  NULL };
  if (httpd_start(&servidor, &cfg) == ESP_OK) {
    httpd_register_uri_handler(servidor, &pagina);
    httpd_register_uri_handler(servidor, &video);
  }
}

// ===== PARTE 7: setup (roda uma vez, quando a placa liga) =====
void setup() {
  Serial.begin(115200);
  pinMode(LED_VERMELHO, OUTPUT);
  Serial.println("\n\nESP32-CAM simples ligando...");

  if (!iniciarCamera()) {
    Serial.println("ERRO: camera nao iniciou. Confira o cabo flat e a alimentacao de 5 V.");
    while (true) {                                      // pisca rapido para sempre = erro
      digitalWrite(LED_VERMELHO, !digitalRead(LED_VERMELHO));
      delay(100);
    }
  }
  Serial.println("Camera OK");

  WiFi.softAP(NOME_REDE, SENHA_REDE);   // a placa cria a propria rede Wi-Fi
  WiFi.setTxPower(WIFI_POWER_11dBm);    // potencia menor = picos de corrente menores
  Serial.printf("Rede Wi-Fi: %s   senha: %s\n", NOME_REDE, SENHA_REDE);

  iniciarServidor();
  Serial.print("Abra no navegador: http://");
  Serial.println(WiFi.softAPIP());
}

// ===== PARTE 8: loop (repete para sempre) =====
void loop() {
  digitalWrite(LED_VERMELHO, LOW);  delay(100);    // pisca curto: o programa esta rodando
  digitalWrite(LED_VERMELHO, HIGH); delay(900);
  static unsigned long ultimo = 0;
  if (millis() - ultimo > 10000) {                  // a cada 10 s: aparelhos na rede
    ultimo = millis();
    Serial.printf("Aparelhos conectados: %d\n", WiFi.softAPgetStationNum());
  }
}
