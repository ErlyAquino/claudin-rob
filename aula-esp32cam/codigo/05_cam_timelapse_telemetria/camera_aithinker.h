/*
  camera_aithinker.h - inicializacao da camera do ESP32-CAM (AI-Thinker) com sensor OV2640 ou OV3660.
  Copie este arquivo para a pasta de cada sketch. Uso:
      #include "camera_aithinker.h"
      void setup() { ... if (!cameraIniciar()) { ... } }

  Pinos da camera no AI-Thinker (fixos, definidos pela placa):
     XCLK 0, SIOD 26, SIOC 27, Y9..Y2 = 35 34 39 36 21 19 18 5, VSYNC 25, HREF 23, PCLK 22, PWDN 32
  Pinos LIVRES para o seu projeto: 12, 13, 14, 15 (se o microSD nao for usado), 2 (SD 1-bit), 4 (flash), 16 e 33 (LED vermelho, ativo em LOW)
*/
#pragma once
#include "esp_camera.h"

#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22
#define FLASH_GPIO_NUM   4     // LED branco de alta potencia
#define LED_VERMELHO    33     // LED pequeno no verso (LOW = aceso)

const char* cameraNome = "?";

bool cameraIniciar(framesize_t tamanho = FRAMESIZE_SVGA, int qualidade = 12) {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM; c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;          // 20 MHz para o sensor
  c.pixel_format = PIXFORMAT_JPEG;    // o sensor ja entrega JPEG comprimido
  c.frame_size = tamanho;             // SVGA 800x600 e um bom equilibrio; OV3660 vai ate QXGA 2048x1536
  c.jpeg_quality = qualidade;         // 0 (melhor) .. 63 (pior); 10-12 e bom
  c.fb_count = psramFound() ? 2 : 1;  // 2 buffers na PSRAM = video mais fluido
  c.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;
  if (!psramFound()) { c.frame_size = FRAMESIZE_VGA; }

  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) { Serial.printf("Camera falhou: 0x%x (cabo flat? PSRAM? alimentacao 5 V?)\n", err); return false; }

  sensor_t* s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {      // ajustes recomendados para o OV3660
    cameraNome = "OV3660";
    s->set_vflip(s, 1);               // a imagem vem de cabeca para baixo neste sensor
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  } else if (s->id.PID == OV2640_PID) cameraNome = "OV2640";
  Serial.printf("Camera OK: sensor %s, PSRAM %s\n", cameraNome, psramFound() ? "sim" : "NAO");
  return true;
}
