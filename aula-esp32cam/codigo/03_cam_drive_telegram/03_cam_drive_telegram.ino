/*
  03 - Pela internet: foto para o Google Drive (Apps Script) e alerta com foto no Telegram
  Placa: AI Thinker ESP32-CAM      Arquivo extra: camera_aithinker.h      Sem bibliotecas extras

  Ligacoes: iguais ao sketch 02 (PIR no GPIO 13, LED no 12). SD opcional.
  O ESP32 entra na rede Wi-Fi COM INTERNET. A cada movimento (ou a cada INTERVALO_S segundos):
    1) tira a foto
    2) manda para o Google Drive: POST HTTPS para um "Web App" do Google Apps Script (veja apps_script/Code.gs),
       com a imagem em BASE64 no corpo. O script cria o arquivo na sua pasta do Drive.
    3) manda para o Telegram: POST multipart para api.telegram.org/bot<TOKEN>/sendPhoto (a foto chega no celular).
  "Ao vivo pela internet": o /stream so funciona na rede local. Para ver de fora, o guia explica as opcoes
  (Tailscale/ngrok/port-forward) - aqui fazemos "quase ao vivo": uma foto a cada N segundos no Drive.

  Preparacao: apps_script/Code.gs (Drive) e um bot do Telegram (@BotFather -> token; seu chat_id via @userinfobot).
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <base64.h>
#include "camera_aithinker.h"

// ---------- preencha ----------
const char* WIFI_SSID = "NOME-DA-REDE";
const char* WIFI_SENHA = "SENHA-DA-REDE";
const char* URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycb.../exec";   // URL do Web App implantado
const char* TELEGRAM_TOKEN = "123456789:ABCDEF...";
const char* TELEGRAM_CHAT_ID = "123456789";
const int PINO_PIR = 13, PINO_LED = 12;
const unsigned long INTERVALO_S = 0;        // 0 = so por movimento; 60 = tambem uma foto por minuto ("quase ao vivo")
const unsigned long COOLDOWN_MS = 30000;    // no maximo 1 envio por movimento a cada 30 s

unsigned long ultimoEnvio = 0, ultimoPeriodico = 0;

// ---------- Google Drive via Apps Script ----------
bool enviarDrive(camera_fb_t* fb, const char* motivo) {
  WiFiClientSecure cliente; cliente.setInsecure();
  HTTPClient http;
  http.begin(cliente, URL_APPS_SCRIPT);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);     // o Apps Script responde com redirect 302
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String corpo = "motivo=" + String(motivo) + "&imagem=" + base64::encode(fb->buf, fb->len);   // JPEG vira texto base64 (+33 %)
  int codigo = http.POST(corpo);
  String resp = http.getString(); http.end();
  Serial.printf("Drive: HTTP %d %s\n", codigo, resp.substring(0, 80).c_str());
  return codigo == 200;
}

// ---------- Telegram sendPhoto (multipart/form-data) ----------
bool enviarTelegram(camera_fb_t* fb, const char* legenda) {
  WiFiClientSecure cliente; cliente.setInsecure();
  if (!cliente.connect("api.telegram.org", 443)) { Serial.println("Telegram: nao conectou"); return false; }
  String limite = "----ESP32CAM";
  String inicio = "--" + limite + "\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n" + TELEGRAM_CHAT_ID + "\r\n" +
                  "--" + limite + "\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n" + legenda + "\r\n" +
                  "--" + limite + "\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"foto.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String fim = "\r\n--" + limite + "--\r\n";
  cliente.printf("POST /bot%s/sendPhoto HTTP/1.1\r\nHost: api.telegram.org\r\nContent-Type: multipart/form-data; boundary=%s\r\nContent-Length: %u\r\nConnection: close\r\n\r\n",
                 TELEGRAM_TOKEN, limite.c_str(), inicio.length() + fb->len + fim.length());
  cliente.print(inicio);
  for (size_t i = 0; i < fb->len; i += 1024) cliente.write(fb->buf + i, min((size_t)1024, fb->len - i));   // envia o JPEG em pedacos
  cliente.print(fim);
  unsigned long t0 = millis(); String linha;
  while (cliente.connected() && millis() - t0 < 10000) { linha = cliente.readStringUntil('\n'); if (linha.startsWith("HTTP/")) break; }
  cliente.stop();
  Serial.println("Telegram: " + linha);
  return linha.indexOf("200") > 0;
}

void enviarFoto(const char* motivo) {
  digitalWrite(PINO_LED, LOW);
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { Serial.println("sem quadro"); return; }
  Serial.printf("Foto de %u bytes (%s). Enviando...\n", fb->len, motivo);
  enviarDrive(fb, motivo);
  enviarTelegram(fb, (String("ESP32-CAM: ") + motivo).c_str());
  esp_camera_fb_return(fb);
  digitalWrite(PINO_LED, HIGH);
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_PIR, INPUT); pinMode(PINO_LED, OUTPUT);
  if (!cameraIniciar(FRAMESIZE_VGA, 12)) { while (true) delay(1000); }   // VGA: ~30 kB por foto, rapido de enviar
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  Serial.print("Wi-Fi"); while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nIP "); Serial.println(WiFi.localIP());
  digitalWrite(PINO_LED, HIGH);
  enviarFoto("teste ao ligar");
}

void loop() {
  static bool pirAntes = false;
  bool pir = digitalRead(PINO_PIR);
  if (pir && !pirAntes && millis() - ultimoEnvio > COOLDOWN_MS) { ultimoEnvio = millis(); enviarFoto("movimento"); }
  pirAntes = pir;
  if (INTERVALO_S > 0 && millis() - ultimoPeriodico >= INTERVALO_S * 1000UL) { ultimoPeriodico = millis(); enviarFoto("periodica"); }
  delay(50);
}
