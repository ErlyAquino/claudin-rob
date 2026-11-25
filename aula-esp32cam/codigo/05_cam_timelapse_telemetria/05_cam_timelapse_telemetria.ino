/*
  05 - Time-lapse da horta: foto no microSD a cada 10 min + no da REDE DE TELEMETRIA DO ESPACO CRIA
  Placa: AI Thinker ESP32-CAM      Arquivo extra: camera_aithinker.h (nesta pasta)
  Bibliotecas: CriaTelemetria (telemetria-cria/firmware/biblioteca-cria) e PubSubClient;
               SD_MMC, FS, HTTPClient e esp_camera vem no core.

  O que faz:
   1. A cada INTERVALO_ENTRE_FOTOS_MS tira uma foto e grava no microSD, COM OU SEM REDE.
      A foto nova entra em /pendentes; depois de enviada ao servidor vai para
      /fotos/AAAA-MM-DD/HH-MM-SS.jpg (nada e apagado do cartao).
   2. Entra na rede de telemetria como um no (cria/<PROJETO>/<NO>) e publica:
        cria/<PROJETO>/<NO>/fotos       {"valor":128,"unidade":"un",...}  fotos guardadas no cartao
        cria/<PROJETO>/<NO>/pendentes   {"valor":0,"unidade":"un",...}    fotos ainda nao enviadas
   3. Envia cada foto ao servidor por HTTP:  POST http://SERVIDOR:3000/api/imagens/<NO>
      (usuario e senha do projeto, os mesmos do MQTT). O painel mostra a foto mais recente e o
      servidor guarda tudo em IMAGENS_DIR/<projeto>/<no>/<dia>/<hora>.jpg.
      Se o servidor estiver fora, as fotos ficam em /pendentes e sobem quando ele voltar.
      ATENCAO: o servidor da o nome pela hora em que RECEBE a foto; uma foto enviada com atraso
      fica com a hora do envio la (no cartao o nome e sempre o da hora em que foi tirada).

   4. Abre a camera no navegador, para conferir o enquadramento e se esta tudo funcionando:
        http://IP_DA_CAMERA/           pagina com a imagem ao vivo e o estado (fotos, pendentes, SD)
        http://IP_DA_CAMERA/foto.jpg   uma foto na hora      http://IP_DA_CAMERA:81/stream   video
        http://IP_DA_CAMERA/estado     o estado em JSON
      O IP aparece no Monitor Serial; o painel da telemetria mostra o link "abrir camera" no
      cartao do no depois da primeira foto enviada.

  Ligacoes: nenhuma alem da propria placa.
    microSD no slot (FAT32, ate 32 GB), usado em modo 1 bit (GPIO 2, 14, 15).
    Alimentacao: 5 V com pelo menos 2 A (com menos a placa reinicia ao ligar Wi-Fi + camera).
    Para gravar: GPIO 0 no GND (ou a base ESP32-CAM-MB); para rodar, solte o GPIO 0 e reinicie.

  ANTES DE COMPILAR:
   1. Copie credenciais.exemplo.h (nesta pasta) para credenciais.h e preencha. MQTT_USUARIO tem
      de ser igual ao PROJETO. O credenciais.h nunca vai para o GitHub.
   2. PROJETO "teste" na bancada; "horta" + "no3" so na camera definitiva da bancada hidroponica.
   3. Escolha um NO livre (veja no painel). Dois nos com o mesmo nome se derrubam no broker.
   4. A camera enquadra o cultivo, nao pessoas. Confira o enquadramento ao instalar.

  Montar o video no PC (pasta de um dia):
     ffmpeg -framerate 12 -pattern_type glob -i '*.jpg' timelapse.mp4
*/
#include <CriaTelemetria.h>
#include <HTTPClient.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_http_server.h"
#include "camera_aithinker.h"

#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#error "Falta o credenciais.h: copie credenciais.exemplo.h para credenciais.h e preencha."
#endif

// ------------------------------------------------------------------ ajustes
const char* PROJETO = "teste";       // "teste" (bancada) ou "horta" (definitivo, com NO "no3")
const char* NO = "no10";             // um no livre do projeto
const uint32_t INTERVALO_ENTRE_FOTOS_MS = 10UL * 60 * 1000;   // 10 min = 144 fotos por dia
// So fotografa entre estas horas (hora local). 0 e 24 = o dia inteiro. Para nao guardar fotos
// no escuro use, por exemplo, 6 e 20. So vale depois de o relogio acertar pela rede.
const int PRIMEIRA_HORA = 0;
const int ULTIMA_HORA = 24;
const int FUSO_HORAS = -3;           // Brasilia: UTC-3
const uint16_t PORTA_DO_SERVIDOR = 3000;
// 1600 x 1200 com PSRAM; qualidade de 0 (melhor) a 63. Com 12 cada foto fica em 150 a 300 KB
// (20 a 45 MB por dia). O servidor recusa fotos acima de 2 MB.
const framesize_t TAMANHO_DA_FOTO = FRAMESIZE_UXGA;
const int QUALIDADE_DO_JPEG = 12;
const uint32_t ESPACO_MINIMO_MB = 20;          // abaixo disso para de gravar (cartao cheio)
const uint32_t PRAZO_DO_ENVIO_MS = 20000;
const uint32_t ESPERA_APOS_FALHA_MS = 60000;   // envio falhou: tenta de novo em 1 min
const uint32_t ESPERA_ENTRE_ENVIOS_MS = 2000;  // folga para o MQTT entre duas fotos atrasadas
// ---------------------------------------------------------------------------

const char* PASTA_PENDENTES = "/pendentes";
const char* PASTA_FOTOS = "/fotos";

CriaNo no(PROJETO, NO);
bool cameraPronta = false, sdOk = false;
uint32_t ultimaTentativaDaCamera = 0, ultimaTentativaDoSd = 0;
uint32_t fotosNoCartao = 0, pendentes = 0;   // fotosNoCartao inclui as pendentes
uint32_t fotosSemHora = 0;                   // contador dos nomes sem relogio, neste boot
bool jaFotografou = false;
uint32_t ultimaFoto = 0, proximoEnvio = 0, ultimaPublicacao = 0;
bool publicarContagem = true;
volatile bool brokerConectado = false;   // copia para a pagina web
volatile uint32_t livreMb = 0;            // idem; so o loop() mexe no cartao

// ---------- cartao ----------
uint32_t contarArquivos(const char* pasta) {      // conta os .jpg, entrando nas subpastas
  File dir = SD_MMC.open(pasta);
  if (!dir || !dir.isDirectory()) return 0;
  uint32_t n = 0;
  for (File f = dir.openNextFile(); f; f = dir.openNextFile()) {
    if (f.isDirectory()) n += contarArquivos(f.path());
    else if (String(f.name()).endsWith(".jpg")) n++;
  }
  return n;
}

bool iniciarSd() {
  if (!SD_MMC.begin("/sdcard", true)) {           // true = modo 1 bit (deixa o GPIO 4 do flash livre)
    Serial.println("[cam] ERRO: microSD nao encontrado (FAT32? encaixado ate o fim?).");
    return false;
  }
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);
  SD_MMC.mkdir(PASTA_PENDENTES);
  SD_MMC.mkdir(PASTA_FOTOS);
  pendentes = contarArquivos(PASTA_PENDENTES);
  fotosNoCartao = pendentes + contarArquivos(PASTA_FOTOS);
  Serial.printf("[cam] microSD de %llu MB: %u fotos guardadas, %u por enviar.\n",
                SD_MMC.cardSize() / (1024 * 1024), (unsigned)fotosNoCartao, (unsigned)pendentes);
  livreMb = (SD_MMC.totalBytes() - SD_MMC.usedBytes()) / (1024 * 1024);
  publicarContagem = true;
  return true;
}

// Hora local (UTC + fuso) como struct tm.
struct tm horaLocal() {
  time_t agora = time(nullptr) + FUSO_HORAS * 3600L;
  struct tm t;
  gmtime_r(&agora, &t);
  return t;
}

// ---------- foto -> cartao ----------
void fotografar() {
  if (SD_MMC.totalBytes() - SD_MMC.usedBytes() < (uint64_t)ESPACO_MINIMO_MB * 1024 * 1024) {
    Serial.println("[cam] ERRO: microSD cheio: foto nao tirada. Copie as fotos para o PC e esvazie /fotos.");
    return;
  }
  // As primeiras imagens depois de um tempo parada vem com a exposicao antiga: descarta duas.
  for (int i = 0; i < 2; i++) {
    camera_fb_t* velha = esp_camera_fb_get();
    if (velha) esp_camera_fb_return(velha);
  }
  camera_fb_t* foto = esp_camera_fb_get();
  if (!foto) {
    Serial.println("[cam] ERRO: a camera nao entregou a foto.");
    return;
  }
  char nome[64];
  if (no.temHora()) {
    struct tm t = horaLocal();
    char quando[24];
    strftime(quando, sizeof(quando), "%Y-%m-%d_%H-%M-%S", &t);
    snprintf(nome, sizeof(nome), "%s/%s.jpg", PASTA_PENDENTES, quando);
  } else {   // sem rede desde que ligou: nome pelo numero do boot e da foto
    snprintf(nome, sizeof(nome), "%s/b%05u_%05u.jpg", PASTA_PENDENTES, (unsigned)no.boot(), (unsigned)++fotosSemHora);
  }
  File f = SD_MMC.open(nome, FILE_WRITE);
  size_t gravados = f ? f.write(foto->buf, foto->len) : 0;
  if (f) f.close();
  size_t tamanho = foto->len;
  esp_camera_fb_return(foto);
  if (gravados != tamanho) {
    Serial.printf("[cam] ERRO: nao gravou %s inteira; o cartao sera reiniciado.\n", nome);
    SD_MMC.remove(nome);
    SD_MMC.end();
    sdOk = false;
    return;
  }
  livreMb = (SD_MMC.totalBytes() - SD_MMC.usedBytes()) / (1024 * 1024);
  fotosNoCartao++;
  pendentes++;
  publicarContagem = true;
  Serial.printf("[cam] foto %s gravada (%u KB). No cartao: %u.\n", nome, (unsigned)(tamanho / 1024), (unsigned)fotosNoCartao);
}

// ---------- cartao -> servidor ----------
// /pendentes/2026-11-25_14-30-00.jpg -> /fotos/2026-11-25/14-30-00.jpg ; sem hora -> /fotos/sem-hora/
void arquivar(const String& caminho, const String& nome) {
  String pasta, novo;
  if (nome.length() == 23 && nome[10] == '_') {
    pasta = String(PASTA_FOTOS) + "/" + nome.substring(0, 10);
    novo = pasta + "/" + nome.substring(11);
  } else {
    pasta = String(PASTA_FOTOS) + "/sem-hora";
    novo = pasta + "/" + nome;
  }
  SD_MMC.mkdir(pasta);
  if (!SD_MMC.rename(caminho, novo)) {
    Serial.printf("[cam] ERRO: nao moveu %s para %s.\n", caminho.c_str(), novo.c_str());
    return;
  }
  if (pendentes > 0) pendentes--;
  publicarContagem = true;
}

// Envia UMA foto pendente. Devolve o tempo de espera ate a proxima tentativa.
uint32_t enviarUmaPendente() {
  File dir = SD_MMC.open(PASTA_PENDENTES);
  File f;
  for (f = dir.openNextFile(); f; f = dir.openNextFile())
    if (!f.isDirectory() && String(f.name()).endsWith(".jpg")) break;
  if (!f) {            // contagem errada (cartao mexido no PC): acerta
    if (pendentes != 0) { pendentes = 0; publicarContagem = true; }
    return ESPERA_ENTRE_ENVIOS_MS;
  }
  String caminho = f.path(), nome = f.name();
  size_t tamanho = f.size();

  WiFiClient conexao;
  HTTPClient http;
  String endereco = String("http://") + MQTT_HOST + ":" + PORTA_DO_SERVIDOR + "/api/imagens/" + no.nome();
  http.begin(conexao, endereco);
  http.setAuthorization(MQTT_USUARIO, MQTT_SENHA);
  http.addHeader("Content-Type", "image/jpeg");
  http.setConnectTimeout(5000);
  http.setTimeout(PRAZO_DO_ENVIO_MS);
  int codigo = http.sendRequest("POST", &f, tamanho);   // le do cartao e envia aos pedacos
  String resposta = codigo > 0 && codigo != 201 ? http.getString() : String();
  http.end();
  f.close();

  if (codigo == 201) {
    Serial.printf("[cam] %s enviada (%u KB).\n", nome.c_str(), (unsigned)(tamanho / 1024));
    arquivar(caminho, nome);
    return ESPERA_ENTRE_ENVIOS_MS;
  }
  if (codigo == 400 || codigo == 413) {   // arquivo estragado ou grande demais: nao adianta insistir
    Serial.printf("[cam] o servidor recusou %s (%d): fica so no cartao. %s\n", nome.c_str(), codigo, resposta.c_str());
    arquivar(caminho, nome);
    return ESPERA_ENTRE_ENVIOS_MS;
  }
  if (codigo == 401) Serial.println("[cam] ERRO: o servidor recusou a senha: confira MQTT_USUARIO e MQTT_SENHA no credenciais.h.");
  else if (codigo > 0) Serial.printf("[cam] o servidor respondeu %d: %s\n", codigo, resposta.c_str());
  else Serial.printf("[cam] envio falhou (%s): o painel esta ligado na porta %u do servidor?\n",
                     http.errorToString(codigo).c_str(), PORTA_DO_SERVIDOR);
  return ESPERA_APOS_FALHA_MS;
}

// ---------- camera no navegador ----------
// O servidor web roda em tarefas proprias e so le a camera e as variaveis de estado: nao toca
// no cartao, que e usado pelo loop().
uint32_t fotoAnteriorHaS() { return jaFotografou ? (millis() - ultimaFoto) / 1000 : 0; }

const char PAGINA[] = R"HTML(<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Camera time-lapse</title>
<style>body{font-family:sans-serif;background:#111;color:#eee;margin:0;padding:10px;text-align:center}
img{max-width:100%;border-radius:8px;background:#222;min-height:120px}table{margin:10px auto;border-collapse:collapse}
td{padding:4px 10px;text-align:left;border-bottom:1px solid #333}td+td{font-weight:bold}.ok{color:#8f8}.erro{color:#f88}
a,button{font-size:1em;padding:8px 12px;margin:4px;border:0;border-radius:8px;background:#448;color:#fff;text-decoration:none;display:inline-block}</style>
</head><body><h2 id="t">Camera time-lapse</h2><img id="v" alt="imagem ao vivo"><br>
<button onclick="vivo()">Ao vivo</button><button onclick="parar()">Parar</button><a href="/foto.jpg" target="_blank">Foto agora</a>
<table id="e"></table>
<script>
const base=location.protocol+'//'+location.hostname;
function vivo(){v.src=base+':81/stream?'+Date.now()}
function parar(){v.src='/foto.jpg?'+Date.now()}
function l(n,x,c){return '<tr><td>'+n+'</td><td class="'+(c||'')+'">'+x+'</td></tr>'}
function sn(b){return b?['sim','ok']:['NAO','erro']}
async function estado(){try{const d=await (await fetch('/estado')).json();
t.textContent='Camera '+d.projeto+'/'+d.no;
e.innerHTML=l('Sensor',d.sensor)+l('Camera',...sn(d.camera))+l('microSD',...sn(d.sd))+l('Servidor (MQTT)',...sn(d.conectado))
+l('Relogio certo',...sn(d.hora))+l('Fotos no cartao',d.fotos)+l('Por enviar',d.pendentes,d.pendentes>3?'erro':'ok')
+l('Ultima foto',d.jaFotografou?'ha '+Math.round(d.ultimaFotoS/60)+' min':'ainda nao')+l('Intervalo',d.intervaloS/60+' min')
+l('Cartao livre',d.livreMb+' MB')+l('Sinal Wi-Fi',d.rssi+' dBm')+l('Ligado ha',Math.round(d.ligadoS/60)+' min')}
catch(x){e.innerHTML=l('Camera','sem resposta','erro')}}
vivo();estado();setInterval(estado,5000)</script></body></html>)HTML";

static esp_err_t paginaHandler(httpd_req_t* req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  return httpd_resp_send(req, PAGINA, HTTPD_RESP_USE_STRLEN);
}
static esp_err_t estadoHandler(httpd_req_t* req) {
  char json[420];
  int n = snprintf(json, sizeof(json),
                   "{\"projeto\":\"%s\",\"no\":\"%s\",\"sensor\":\"%s\",\"camera\":%s,\"sd\":%s,\"conectado\":%s,"
                   "\"hora\":%s,\"fotos\":%u,\"pendentes\":%u,\"jaFotografou\":%s,\"ultimaFotoS\":%u,"
                   "\"intervaloS\":%u,\"livreMb\":%u,\"rssi\":%d,\"ligadoS\":%u}",
                   PROJETO, NO, cameraNome, cameraPronta ? "true" : "false", sdOk ? "true" : "false",
                   brokerConectado ? "true" : "false", time(nullptr) > 1600000000 ? "true" : "false",
                   (unsigned)fotosNoCartao, (unsigned)pendentes, jaFotografou ? "true" : "false", (unsigned)fotoAnteriorHaS(),
                   (unsigned)(INTERVALO_ENTRE_FOTOS_MS / 1000), (unsigned)livreMb, (int)WiFi.RSSI(), (unsigned)(millis() / 1000));
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json, n);
}
static esp_err_t fotoHandler(httpd_req_t* req) {
  camera_fb_t* fb = cameraPronta ? esp_camera_fb_get() : nullptr;
  if (!fb) return httpd_resp_send_500(req);
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  esp_err_t r = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return r;
}
static esp_err_t streamHandler(httpd_req_t* req) {
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  char cab[80];
  while (cameraPronta) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) break;
    size_t n = snprintf(cab, sizeof(cab), "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", (unsigned)fb->len);
    esp_err_t r = httpd_resp_send_chunk(req, cab, n);
    if (r == ESP_OK) r = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (r != ESP_OK) break;
    delay(100);   // deixa folga para a foto do time-lapse e para o Wi-Fi
  }
  return ESP_OK;
}
void iniciarServidorWeb() {
  httpd_handle_t web = NULL, video = NULL;
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t us[] = { {"/", HTTP_GET, paginaHandler, NULL}, {"/estado", HTTP_GET, estadoHandler, NULL},
                       {"/foto.jpg", HTTP_GET, fotoHandler, NULL} };
  if (httpd_start(&web, &cfg) == ESP_OK) for (auto& u : us) httpd_register_uri_handler(web, &u);
  cfg.server_port = 81;
  cfg.ctrl_port = 32769;
  httpd_uri_t uStream = { "/stream", HTTP_GET, streamHandler, NULL };
  if (httpd_start(&video, &cfg) == ESP_OK) httpd_register_uri_handler(video, &uStream);
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);            // o LED forte da placa fica apagado
  cameraPronta = cameraIniciar(TAMANHO_DA_FOTO, QUALIDADE_DO_JPEG);
  sdOk = iniciarSd();
  // Gravar e enviar uma foto prende o programa por alguns segundos, sem manter() no meio: com o
  // keepalive padrao de 5 s o MQTT cairia a cada foto e o painel mostraria o no off-line a toa.
  no.usarKeepAlive(30);
  no.mostrarPublicacoes(true);
  no.iniciar(WIFI_SSID, WIFI_SENHA, MQTT_HOST, MQTT_PORTA, MQTT_USUARIO, MQTT_SENHA);
  iniciarServidorWeb();
  Serial.printf("[cam] no cria/%s/%s | uma foto a cada %lu min\n", PROJETO, NO,
                (unsigned long)(INTERVALO_ENTRE_FOTOS_MS / 60000));
}

void loop() {
  no.manter();                                  // Wi-Fi, broker, relogio e fila: tudo pela biblioteca
  uint32_t agora = millis();
  brokerConectado = no.conectado();
  static bool wifiAntes = false;
  bool wifi = WiFi.status() == WL_CONNECTED;
  if (wifi && !wifiAntes) Serial.printf("[cam] camera no navegador: http://%s/\n", WiFi.localIP().toString().c_str());
  wifiAntes = wifi;

  // camera ou cartao que nao iniciaram: tenta de novo a cada minuto
  if (!cameraPronta && agora - ultimaTentativaDaCamera > 60000) {
    ultimaTentativaDaCamera = agora;
    cameraPronta = cameraIniciar(TAMANHO_DA_FOTO, QUALIDADE_DO_JPEG);
  }
  if (!sdOk && agora - ultimaTentativaDoSd > 60000) {
    ultimaTentativaDoSd = agora;
    sdOk = iniciarSd();
  }
  if (!cameraPronta || !sdOk) return;

  // 1) foto no cartao. A primeira sai quando o relogio acerta (ou 1 min depois de ligar, sem rede).
  bool naHora = jaFotografou ? agora - ultimaFoto >= INTERVALO_ENTRE_FOTOS_MS
                             : (no.temHora() || agora > 60000);
  if (naHora) {
    jaFotografou = true;
    ultimaFoto = agora;
    int hora = no.temHora() ? horaLocal().tm_hour : PRIMEIRA_HORA;
    if (hora >= PRIMEIRA_HORA && hora < ULTIMA_HORA) fotografar();
    return;
  }

  // 2) fotos pendentes para o servidor, uma por volta
  if (pendentes > 0 && no.conectado() && (int32_t)(agora - proximoEnvio) >= 0) {
    proximoEnvio = millis() + enviarUmaPendente();
    return;
  }

  // 3) contagem para o painel, quando mudou (no maximo uma vez a cada 10 s)
  if (publicarContagem && no.temHora() && agora - ultimaPublicacao >= 10000) {
    ultimaPublicacao = agora;
    publicarContagem = false;
    no.publicar("fotos", fotosNoCartao, "un");
    no.publicar("pendentes", pendentes, "un");
  }
}
