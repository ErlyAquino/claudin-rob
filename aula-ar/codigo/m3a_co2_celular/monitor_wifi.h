/*
  monitor_wifi.h - servidor web comum (ESP32). Copie junto com pagina_web.h para a pasta do sketch.

  Uso no sketch:
     #include "monitor_wifi.h"
     void setup() { ... monitorIniciar("Sensor-DS18B20"); }
     void loop()  { monitorAtender(); ...; monitorPublicar(json); }
  monitorPublicar recebe o JSON pronto (veja pagina_web.h). A pagina fica em http://192.168.4.1
*/
#pragma once
#include <WiFi.h>
#include <WebServer.h>
#include "pagina_web.h"

static WebServer _servidor(80);
static String _ultimoJson = "{\"titulo\":\"aguardando\",\"itens\":[{\"n\":\"-\",\"v\":0,\"u\":\"\"}],\"alerta\":false,\"msg\":\"\"}";

static void _rotaPagina() { _servidor.send_P(200, "text/html; charset=utf-8", PAGINA_HTML); }
static void _rotaDados()  { _servidor.send(200, "application/json", _ultimoJson); }

void monitorIniciar(const char* nomeRede, const char* senha = "12345678") {
  WiFi.softAP(nomeRede, senha);
  Serial.print("Rede Wi-Fi: "); Serial.print(nomeRede); Serial.print("  senha: "); Serial.print(senha);
  Serial.print("  ->  abra http://"); Serial.println(WiFi.softAPIP());
  _servidor.on("/", _rotaPagina);
  _servidor.on("/dados", _rotaDados);
  _servidor.begin();
}
void monitorAtender() { _servidor.handleClient(); }
void monitorPublicar(const String& json) { _ultimoJson = json; }

// ajuda para montar o JSON:  item("Temperatura", 24.5, "C")
String item(const char* nome, float valor, const char* unidade) {
  if (isnan(valor)) valor = 0;
  return "{\"n\":\"" + String(nome) + "\",\"v\":" + String(valor, 2) + ",\"u\":\"" + String(unidade) + "\"}";
}
String jsonMonitor(const char* titulo, const String& itens, bool alerta, const String& msg = "") {
  return "{\"titulo\":\"" + String(titulo) + "\",\"itens\":[" + itens + "],\"alerta\":" + (alerta ? "true" : "false") + ",\"msg\":\"" + msg + "\"}";
}
