/*
  04 - Alarme de distancia no ESP32 com monitor web local
  Placa: ESP32 Dev Module (core 3.x)

  Ligacoes:
    HC-SR04: VCC -> VIN (5 V)   GND -> GND   TRIG -> GPIO 5
             ECHO -> divisor de tensao -> GPIO 18
             ATENCAO: o ECHO sai com 5 V e o ESP32 so aguenta 3,3 V nas entradas!
             Divisor: ECHO -> resistor 1 kOhm -> GPIO 18 -> resistor 2 kOhm -> GND  (5 V * 2/3 = 3,3 V)
    Buzzer (MH-FMD): S -> GPIO 19
    LED RGB: R -> 220 -> GPIO 25   G -> 220 -> GPIO 26   B -> 220 -> GPIO 27   comum -> GND

  O ESP32 cria a rede "Alarme-ESP32" (senha 12345678). No celular, abra http://192.168.4.1
  A pagina pede /dados a cada 300 ms e desenha o grafico distancia x tempo. O limite de alarme
  pode ser mudado pela pagina (rota /limite?cm=40).
*/
#include <WiFi.h>
#include <WebServer.h>

const int TRIG = 5, ECHO = 18, BUZZER = 19;
const int PINO_R = 25, PINO_G = 26, PINO_B = 27;
const char* SSID_AP = "Alarme-ESP32";
const char* SENHA_AP = "12345678";

WebServer servidor(80);

// ---------- estado ----------
float distancia = 999;
int limiteAlarme = 40;          // cm: abaixo disso = ALARME
bool emAlarme = false;
unsigned long ultimaMedida = 0, ultimoBipe = 0, inicioAlarme = 0;
int totalAlarmes = 0;
bool bipando = false;

const char PAGINA[] PROGMEM = R"HTML(
<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alarme de distancia</title>
<style>
 body{font-family:sans-serif;background:#111;color:#eee;margin:0;padding:14px;text-align:center}
 .card{background:#222;border-radius:12px;padding:14px;margin:10px auto;max-width:520px}
 #dist{font-size:3em;font-weight:bold} #alarme{font-size:1.4em;padding:8px;border-radius:8px}
 .ok{background:#2a2} .al{background:#c22;animation:p 1s infinite} @keyframes p{50%{opacity:.4}}
 canvas{width:100%;height:220px;background:#000;border-radius:8px}
 input{width:70px;font-size:1.1em} button{font-size:1em;padding:8px 14px;border:0;border-radius:8px;background:#448;color:#fff}
</style></head><body>
<h2>Sensor HC-SR04 — monitor</h2>
<div class="card"><div id="dist">-- cm</div><div id="alarme" class="ok">normal</div>
 <p>alarmes desde que ligou: <b id="n">0</b></p></div>
<div class="card"><canvas id="g" width="500" height="220"></canvas><p>últimos 60 s</p></div>
<div class="card">limite de alarme: <input type="number" id="lim" value="%LIMITE%" min="5" max="300"> cm
 <button onclick="fetch('/limite?cm='+document.getElementById('lim').value)">aplicar</button></div>
<script>
 const hist=[]; const c=document.getElementById('g').getContext('2d');
 function desenha(lim){const W=500,H=220,max=200;c.clearRect(0,0,W,H);
   c.strokeStyle='#c22';c.beginPath();const yl=H-lim/max*H;c.moveTo(0,yl);c.lineTo(W,yl);c.stroke();
   c.strokeStyle='#4af';c.lineWidth=2;c.beginPath();
   hist.forEach((v,i)=>{const x=i/200*W,y=H-Math.min(v,max)/max*H;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();c.lineWidth=1;
   c.fillStyle='#888';c.font='12px sans-serif';c.fillText('0 cm',4,H-4);c.fillText(max+' cm',4,12);}
 async function tick(){try{const d=await (await fetch('/dados')).json();
   document.getElementById('dist').textContent=d.cm<0?'-- cm':d.cm.toFixed(0)+' cm';
   const a=document.getElementById('alarme');a.textContent=d.alarme?'ALARME! objeto a '+d.cm.toFixed(0)+' cm':'normal';a.className=d.alarme?'al':'ok';
   document.getElementById('n').textContent=d.total;
   hist.push(d.cm<0?200:d.cm);if(hist.length>200)hist.shift();desenha(d.limite);}catch(e){}}
 setInterval(tick,300);
</script></body></html>
)HTML";

// ---------- sensor ----------
float lerDistancia() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 30000);
  return (t == 0) ? -1 : t * 0.0343 / 2.0;
}
void cor(int r, int g, int b) { ledcWrite(PINO_R, r); ledcWrite(PINO_G, g); ledcWrite(PINO_B, b); }

// ---------- rotas ----------
void paginaInicial() {
  String html = FPSTR(PAGINA);
  html.replace("%LIMITE%", String(limiteAlarme));
  servidor.send(200, "text/html; charset=utf-8", html);
}
void rotaDados() {      // JSON: a pagina (ou qualquer programa) le isto
  String json = "{\"cm\":" + String(distancia, 1) + ",\"alarme\":" + (emAlarme ? "true" : "false") +
                ",\"limite\":" + String(limiteAlarme) + ",\"total\":" + String(totalAlarmes) + "}";
  servidor.send(200, "application/json", json);
}
void rotaLimite() {
  int novo = servidor.arg("cm").toInt();
  if (novo >= 5 && novo <= 300) limiteAlarme = novo;
  servidor.send(200, "text/plain", String(limiteAlarme));
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); pinMode(BUZZER, OUTPUT);
  ledcAttach(PINO_R, 5000, 8); ledcAttach(PINO_G, 5000, 8); ledcAttach(PINO_B, 5000, 8);
  WiFi.softAP(SSID_AP, SENHA_AP);
  Serial.print("Rede: "); Serial.print(SSID_AP); Serial.print("  ->  http://"); Serial.println(WiFi.softAPIP());
  servidor.on("/", paginaInicial);
  servidor.on("/dados", rotaDados);
  servidor.on("/limite", rotaLimite);
  servidor.begin();
}

void loop() {
  servidor.handleClient();

  if (millis() - ultimaMedida >= 60) {
    ultimaMedida = millis();
    distancia = lerDistancia();
    bool agora = (distancia > 0 && distancia < limiteAlarme);
    if (agora && !emAlarme) { totalAlarmes++; inicioAlarme = millis(); Serial.printf("ALARME #%d: %.0f cm\n", totalAlarmes, distancia); }
    emAlarme = agora;
    if (emAlarme) cor(255, 0, 0);
    else if (distancia > 0 && distancia < limiteAlarme * 2) cor(255, 120, 0);
    else cor(0, 255, 0);
  }

  // buzzer: bipe cuja rapidez depende de quao perto esta
  if (emAlarme) {
    int intervalo = map((int)distancia, 0, limiteAlarme, 60, 400);
    if (millis() - ultimoBipe >= (unsigned long)intervalo) {
      ultimoBipe = millis(); bipando = !bipando;
      if (bipando) tone(BUZZER, 2200); else noTone(BUZZER);
    }
  } else { noTone(BUZZER); bipando = false; }
}
