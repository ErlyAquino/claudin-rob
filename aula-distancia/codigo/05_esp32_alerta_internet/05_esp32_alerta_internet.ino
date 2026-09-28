/*
  05 - Alerta pela INTERNET: WhatsApp (CallMeBot) e e-mail (SMTP do Gmail)
  Placa: ESP32 Dev Module (core 3.x)   Sem bibliotecas extras.
  Ligacoes: iguais ao sketch 04

  O e-mail e enviado "na mao", conversando com o servidor SMTP do Gmail em TEXTO PUTO:
  EHLO, AUTH LOGIN, MAIL FROM, RCPT TO, DATA, QUIT. Abra o Monitor Serial e veja o dialogo -
  e o mesmo protocolo de 1982 que todo programa de e-mail usa por baixo dos panos.
  (Alternativa com biblioteca: "ESP Mail Client", de Mobizt - precisa da particao "Huge APP".)

  Diferenca em relacao ao sketch 04: agora o ESP32 ENTRA na rede Wi-Fi da escola (que tem internet)
  em vez de criar a propria. Quando um objeto passa do limite, ele:
     1) manda uma mensagem de WhatsApp pela API gratuita CallMeBot
     2) manda um e-mail pelo servidor SMTP do Gmail
  Ha um "tempo de silencio" (COOLDOWN) para nao mandar 50 mensagens num unico evento.

  --- Preparacao (uma vez) ---
  WhatsApp: salve o contato +34 644 87 21 57, mande "I allow callmebot to send me messages" e
            anote a APIKEY que vem na resposta (uso pessoal; so manda para o SEU numero).
  E-mail:   na conta Google, ative a verificacao em 2 etapas e crie uma "Senha de app" (16 letras).
            Use essa senha aqui, NUNCA a senha normal.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <base64.h>

// ---------- preencha ----------
const char* WIFI_SSID  = "NOME-DA-REDE";
const char* WIFI_SENHA = "SENHA-DA-REDE";
const char* ZAP_FONE   = "+5581999999999";     // seu numero com DDI+DDD
const char* ZAP_APIKEY = "123456";             // apikey do CallMeBot
const char* EMAIL_DE   = "seu.email@gmail.com";
const char* EMAIL_SENHA_APP = "abcd efgh ijkl mnop";
const char* EMAIL_PARA = "destino@exemplo.com";

// ---------- hardware ----------
const int TRIG = 5, ECHO = 18, BUZZER = 19;
const int PINO_R = 25, PINO_G = 26, PINO_B = 27;
const int LIMITE_CM = 40;
const unsigned long COOLDOWN_MS = 60000;       // no maximo 1 alerta por minuto

unsigned long ultimoAlerta = 0;
bool emAlarme = false;
int totalAlarmes = 0;

float lerDistancia() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 30000);
  return (t == 0) ? -1 : t * 0.0343 / 2.0;
}
void cor(int r, int g, int b) { ledcWrite(PINO_R, r); ledcWrite(PINO_G, g); ledcWrite(PINO_B, b); }

// ---------- WhatsApp ----------
String urlEncode(String s) {                    // espaco -> %20 etc.
  String out = "";
  const char* hex = "0123456789ABCDEF";
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s[i];
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') out += c;
    else { out += '%'; out += hex[(c >> 4) & 0xF]; out += hex[c & 0xF]; }
  }
  return out;
}
bool enviarWhatsApp(String texto) {
  WiFiClientSecure cliente;
  cliente.setInsecure();                        // nao valida o certificado (ok para a aula)
  HTTPClient http;
  String url = "https://api.callmebot.com/whatsapp.php?phone=" + String(ZAP_FONE) +
               "&text=" + urlEncode(texto) + "&apikey=" + String(ZAP_APIKEY);
  http.begin(cliente, url);
  int codigo = http.GET();
  http.end();
  Serial.printf("WhatsApp: HTTP %d\n", codigo);
  return codigo == 200;
}

// ---------- E-mail (SMTP "na mao") ----------
// manda uma linha ao servidor e espera a resposta; o SMTP responde com um codigo de 3 digitos
bool smtpFala(WiFiClientSecure& c, String linha, int esperado) {
  if (linha.length()) { c.println(linha); Serial.println("> " + (linha.startsWith("AUTH") || linha.length() == 24 ? "(credencial)" : linha)); }
  unsigned long t0 = millis();
  while (!c.available() && millis() - t0 < 8000) delay(10);
  String resp = c.readStringUntil('\n');
  Serial.println("< " + resp);
  return resp.startsWith(String(esperado));
}

bool enviarEmail(String assunto, String texto) {
  WiFiClientSecure c;
  c.setInsecure();
  if (!c.connect("smtp.gmail.com", 465)) { Serial.println("SMTP: nao conectou"); return false; }
  String senha = EMAIL_SENHA_APP; senha.replace(" ", "");            // a senha de app vem com espacos
  bool ok = smtpFala(c, "", 220)
         && smtpFala(c, "EHLO esp32", 250)
         && smtpFala(c, "AUTH LOGIN", 334)
         && smtpFala(c, base64::encode(EMAIL_DE), 334)
         && smtpFala(c, base64::encode(senha), 235)
         && smtpFala(c, "MAIL FROM:<" + String(EMAIL_DE) + ">", 250)
         && smtpFala(c, "RCPT TO:<" + String(EMAIL_PARA) + ">", 250)
         && smtpFala(c, "DATA", 354);
  if (ok) {
    c.println("From: Alarme ESP32 <" + String(EMAIL_DE) + ">");
    c.println("To: <" + String(EMAIL_PARA) + ">");
    c.println("Subject: " + assunto);
    c.println("Content-Type: text/plain; charset=utf-8");
    c.println();
    c.println(texto);
    ok = smtpFala(c, ".", 250);                                     // linha so com "." = fim da mensagem
  }
  smtpFala(c, "QUIT", 221);
  c.stop();
  Serial.println(ok ? "E-mail enviado!" : "E-mail: falhou (veja o dialogo acima)");
  return ok;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); pinMode(BUZZER, OUTPUT);
  ledcAttach(PINO_R, 5000, 8); ledcAttach(PINO_G, 5000, 8); ledcAttach(PINO_B, 5000, 8);

  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nConectado. IP: "); Serial.println(WiFi.localIP());
  cor(0, 255, 0);
}

void loop() {
  float d = lerDistancia();
  bool agora = (d > 0 && d < LIMITE_CM);

  if (agora && !emAlarme) {                                   // BORDA: acabou de entrar em alarme
    totalAlarmes++;
    Serial.printf("ALARME #%d: %.0f cm\n", totalAlarmes, d);
    cor(255, 0, 0); tone(BUZZER, 2200, 300);
    if (millis() - ultimoAlerta > COOLDOWN_MS || ultimoAlerta == 0) {
      ultimoAlerta = millis();
      String texto = "ALERTA: objeto detectado a " + String(d, 0) + " cm (alarme #" + String(totalAlarmes) + ")";
      cor(0, 0, 255);                                          // azul = enviando
      enviarWhatsApp(texto);                                   // ~2 s
      enviarEmail("Alarme ESP32 disparou", texto);             // ~5 s
      cor(255, 0, 0);
    } else Serial.println("(dentro do cooldown, nao envia de novo)");
  }
  if (!agora && emAlarme) cor(0, 255, 0);
  emAlarme = agora;
  delay(100);
}
