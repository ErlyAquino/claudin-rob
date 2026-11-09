"""Monitor ao vivo do MH-Z19C, direto pela USB (sem gateway, sem servidor da telemetria).

Le a saida do sketch aula-ar/codigo/05c_mhz19c_diagnostico_usb, pede leituras a cada 2 s
e mostra no navegador: CO2, temperatura interna, sinal bruto (0x84), quadros crus e alertas.

Uso (a partir de python-dados/; feche o gateway e o Monitor Serial antes):
  uv run python ../aula-ar/python/monitor_mhz19c.py --porta /dev/ttyUSB0
  -> abre http://localhost:8019
"""
import argparse, json, queue, re, threading, time, webbrowser
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import serial

ap = argparse.ArgumentParser()
ap.add_argument("--porta", default="/dev/ttyUSB0")
ap.add_argument("--http", type=int, default=8019)
ap.add_argument("--lento", action="store_true", help="mantem o intervalo de 10 s do sketch")
ap.add_argument("--sem-navegador", action="store_true")
a = ap.parse_args()

historico = deque(maxlen=2000)      # eventos ja enviados, para quem abrir a pagina depois
assinantes = []                     # filas dos navegadores conectados (SSE)
trava = threading.Lock()
ser = None

RE_CO2 = re.compile(r"CO2 (\d+) ppm\s+temp (-?\d+) C\s+status 0x([0-9A-F]{2})(.*)")
RE_84 = re.compile(r"0x84: bytes2-3 \(bruto\) = (\d+)")
RE_DHT = re.compile(r"DHT11 umidade (\d+) %\s+temp (-?[\d.]+) C(?:\s+sensacao (-?[\d.]+) C)?")
RE_85 = re.compile(r"0x85: bytes2-3 = (\d+)\s+bytes4-5 \(CO2 sem limite\) = (\d+)")


def emitir(ev):
    ev["t"] = time.time() * 1000
    with trava:
        historico.append(ev)
        for q in list(assinantes):
            q.put(ev)


def ler_serial():
    global ser
    while True:
        try:
            ser = serial.Serial()
            ser.port, ser.baudrate, ser.timeout = a.porta, 115200, 1
            ser.dtr = ser.rts = False          # nao reinicia o ESP32 ao abrir
            ser.open()
            emitir({"tipo": "info", "texto": f"porta {a.porta} aberta"})
            time.sleep(1.5)
            if not a.lento:
                ser.write(b"f")                # 2 s entre leituras
            anterior = None
            while True:
                bruto = ser.readline()
                if not bruto:
                    continue
                linha = bruto.decode(errors="replace").replace("\x00", "").strip()
                if not linha or linha == anterior:
                    continue                   # ruido da partida e rajadas repetidas
                anterior = linha
                if linha.startswith("{"):
                    continue                   # linhas JSON sao para o gateway
                m = RE_CO2.search(linha)
                if m:
                    emitir({"tipo": "co2", "ppm": int(m[1]), "temp": int(m[2]), "status": m[3],
                            "aquecendo": "aquecendo" in m[4]})
                elif (m := RE_DHT.search(linha)):
                    emitir({"tipo": "dht", "umid": int(m[1]), "temp": float(m[2]),
                            "sensacao": float(m[3]) if m[3] else None})
                elif "DHT11 falha" in linha:
                    emitir({"tipo": "dhtfalha", "texto": linha.lstrip("# ")})
                elif (m := RE_84.search(linha)):
                    emitir({"tipo": "bruto", "valor": int(m[1])})
                elif (m := RE_85.search(linha)):
                    emitir({"tipo": "semlimite", "valor": int(m[2])})
                elif "ATENCAO" in linha:
                    emitir({"tipo": "alerta", "texto": linha.lstrip("# ")})
                elif "sem resposta valida" in linha:
                    emitir({"tipo": "falha", "texto": linha.lstrip("# ")})
                else:
                    emitir({"tipo": "linha", "texto": linha.lstrip("# ")})
        except serial.SerialException as e:
            emitir({"tipo": "erro", "texto": f"porta {a.porta}: {e}. Nova tentativa em 3 s"})
            time.sleep(3)


PAGINA = r"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Monitor MH-Z19C + DHT11</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--tx:#1d2733;--mut:#5f6b7a;--bd:#d9dee5;--pri:#1f4e79;--ok:#2e7d32;--mod:#b7791f;--ruim:#c0392b;--crit:#7b1fa2}
@media (prefers-color-scheme:dark){:root{--bg:#12161c;--card:#1b2129;--tx:#e6ebf1;--mut:#9aa6b4;--bd:#2c3540;--pri:#6fa8dc}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:0 0 4px}.sub{color:var(--mut);margin:0 0 16px;font-size:13px}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px 14px}
.rot{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.val{font-size:34px;font-weight:700;font-variant-numeric:tabular-nums}.uni{font-size:15px;color:var(--mut);font-weight:400}
.est{font-weight:600}canvas{width:100%;height:280px;display:block}
.botoes{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
button{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer}
button.perigo{border-color:var(--ruim);color:var(--ruim)}button:hover{filter:brightness(.95)}
#log{font:12px/1.45 ui-monospace,monospace;height:220px;overflow:auto;white-space:pre-wrap;margin:0}
.alerta{color:var(--ruim)}.falha{color:var(--mod)}
</style></head><body><main>
<h1>Monitor MH‑Z19C + DHT11</h1><p class="sub">Leitura direta pela USB (<span id="porta"></span>), sem gateway e sem servidor · <span id="conn">conectando…</span></p>
<div class="grade">
 <div class="card"><div class="rot">CO₂</div><div class="val"><span id="co2">—</span> <span class="uni">ppm</span></div><div class="est" id="estado">—</div></div>
 <div class="card"><div class="rot">Temperatura interna</div><div class="val"><span id="temp">—</span> <span class="uni">°C</span></div><div class="rot" id="idade">—</div></div>
 <div class="card"><div class="rot">Sinal bruto (0x84)</div><div class="val"><span id="bruto">—</span></div><div class="rot">só com leitura estendida (x)</div></div>
 <div class="card"><div class="rot">Umidade (DHT11)</div><div class="val"><span id="umid">—</span> <span class="uni">%</span></div><div class="est" id="uest">—</div></div>
 <div class="card"><div class="rot">Temperatura do ar (DHT11)</div><div class="val"><span id="tar">—</span> <span class="uni">°C</span></div><div class="rot" id="dfal">falhas do DHT11: 0</div></div>
 <div class="card"><div class="rot">Sensação térmica (índice de calor)</div><div class="val"><span id="hi">—</span> <span class="uni">°C</span></div><div class="est" id="hest">—</div></div>
 <div class="card"><div class="rot">Reinícios / falhas</div><div class="val"><span id="rein">0</span> / <span id="falh">0</span></div><div class="rot">desde que o monitor abriu</div></div>
</div>
<div class="card"><div class="rot">CO₂ — últimos 15 min</div><canvas id="graf"></canvas></div>
<div class="card" style="margin-top:12px"><div class="rot">Comandos ao sensor</div>
 <div class="botoes">
  <button data-c="i">i · informações</button><button data-c="x">x · leitura estendida (0x84/0x85)</button>
  <button data-c="f">f · intervalo 2 s / 10 s</button><button data-c="d">d · ABC desliga</button><button data-c="a">a · ABC liga</button>
  <button class="perigo" id="zero">z · ZERO 400 ppm…</button>
 </div><div class="rot" id="zaviso"></div></div>
<div class="card" style="margin-top:12px"><div class="rot">Mensagens do sketch</div><pre id="log"></pre></div>
</main><script>
const $=id=>document.getElementById(id);$("porta").textContent=PORTA;
const pts=[];let rein=0,falh=0,ult=0,dfal=0;
function cls(p){return p<=800?["boa","--ok"]:p<=1000?["aceitável","--ok"]:p<=1500?["moderada — ventile","--mod"]:p<=2000?["ruim — abra as janelas","--ruim"]:["muito ruim","--crit"]}
function log(t,c){const d=document.createElement("div");if(c)d.className=c;d.textContent=new Date().toLocaleTimeString()+"  "+t;$("log").appendChild(d);if($("log").children.length>400)$("log").firstChild.remove();$("log").scrollTop=1e9}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function desenhar(){const c=$("graf"),r=devicePixelRatio||1,W=c.clientWidth,H=c.clientHeight;c.width=W*r;c.height=H*r;const g=c.getContext("2d");g.scale(r,r);g.clearRect(0,0,W,H);
 const agora=Date.now(),t0=agora-15*60e3,vis=pts.filter(p=>p.t>=t0);const L=46,R=10,T=8,B=22;
 let max=Math.max(1200,...vis.map(p=>p.v))*1.08;const y=v=>T+(H-T-B)*(1-v/max),x=t=>L+(W-L-R)*(t-t0)/(agora-t0);
 g.fillStyle=css("--ok")+"18";g.fillRect(L,y(1000),W-L-R,y(400)-y(1000));
 g.strokeStyle=css("--bd");g.fillStyle=css("--mut");g.font="11px system-ui";g.lineWidth=1;
 const passo=max>3000?1000:max>1500?500:200;for(let v=0;v<=max;v+=passo){g.beginPath();g.moveTo(L,y(v));g.lineTo(W-R,y(v));g.stroke();g.fillText(v,4,y(v)+4)}
 for(let m=0;m<=15;m+=5){const tt=agora-m*60e3;g.fillText(m?"-"+m+" min":"agora",x(tt)-(m?18:30),H-6)}
 g.strokeStyle=css("--pri");g.lineWidth=2;g.beginPath();let ant=null;
 for(const p of vis){if(ant&&p.t-ant.t>15e3){g.stroke();g.beginPath();ant=null}ant?g.lineTo(x(p.t),y(p.v)):g.moveTo(x(p.t),y(p.v));ant=p}g.stroke();
 g.fillStyle=css("--pri");for(const p of vis.slice(-1))g.beginPath(),g.arc(x(p.t),y(p.v),3.5,0,7),g.fill()}
function tratar(e){
 if(e.tipo==="co2"){$("co2").textContent=e.ppm;$("temp").textContent=e.temp;ult=e.t;
  if(e.aquecendo){$("estado").textContent="aquecendo (não vale ainda)";$("estado").style.color=css("--mut")}
  else if(e.ppm===500&&pts.length&&pts.at(-1).v===500){$("estado").textContent="500 = valor de partida";$("estado").style.color=css("--mod")}
  else if(e.ppm<=400){$("estado").textContent="no mínimo da escala: zero desajustado?";$("estado").style.color=css("--mod")}
  else if(e.ppm>=5000){$("estado").textContent="saturado: confira Vin = 5 V";$("estado").style.color=css("--ruim")}
  else{const [t,c]=cls(e.ppm);$("estado").textContent="ar "+t;$("estado").style.color=css(c)}
  pts.push({t:e.t,v:e.ppm});desenhar()}
 else if(e.tipo==="dht"){$("umid").textContent=e.umid;$("tar").textContent=e.temp.toFixed(1);
  const [t,c]=e.umid<30?["ar seco","--mod"]:e.umid<=60?["confortável","--ok"]:e.umid<=70?["úmido","--mod"]:["muito úmido: risco de mofo","--ruim"];
  $("uest").textContent=t;$("uest").style.color=css(c);
  if(e.sensacao!=null){$("hi").textContent=e.sensacao.toFixed(1);const h=e.sensacao;
   const [ht,hc]=h<27?["normal","--ok"]:h<32?["cautela: água e ventilação","--mod"]:h<41?["cautela extrema: pausas, menos esforço","--ruim"]:["perigo: suspender atividades","--crit"];
   $("hest").textContent=ht;$("hest").style.color=css(hc)}}
 else if(e.tipo==="dhtfalha"){dfal++;$("dfal").textContent="falhas do DHT11: "+dfal;if(dfal%10===1)log(e.texto,"falha")}
 else if(e.tipo==="bruto")$("bruto").textContent=e.valor;
 else if(e.tipo==="semlimite")log("0x85 CO₂ sem limite = "+e.valor);
 else if(e.tipo==="alerta"){rein++;$("rein").textContent=rein;log(e.texto,"alerta")}
 else if(e.tipo==="falha"){falh++;$("falh").textContent=falh;log(e.texto,"falha")}
 else log(e.texto,e.tipo==="erro"?"alerta":"")}
setInterval(()=>{if(ult)$("idade").textContent="última leitura há "+Math.round((Date.now()-ult)/1000)+" s"},1000);
addEventListener("resize",desenhar);
const es=new EventSource("/eventos");es.onopen=()=>$("conn").textContent="ao vivo";es.onerror=()=>$("conn").textContent="sem conexão com o monitor";
es.onmessage=m=>tratar(JSON.parse(m.data));
const enviar=c=>fetch("/cmd?c="+c,{method:"POST"});
document.querySelectorAll("button[data-c]").forEach(b=>b.onclick=()=>enviar(b.dataset.c));
let zarm=0;$("zero").onclick=()=>{if(Date.now()-zarm<5000){enviar("z");$("zaviso").textContent="ZERO enviado.";zarm=0}else{zarm=Date.now();$("zaviso").textContent="Só ao ar livre, ligado há 20–30 min. Clique de novo em 5 s para confirmar."}};
</script></body></html>"""


class Http(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/":
            corpo = PAGINA.replace("PORTA", json.dumps(a.porta), 1).encode()
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write(corpo)
        elif self.path == "/eventos":
            self.send_response(200); self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache"); self.end_headers()
            q = queue.Queue()
            with trava:
                antigos = list(historico)
                assinantes.append(q)
            try:
                for ev in antigos:
                    self.wfile.write(f"data: {json.dumps(ev)}\n\n".encode())
                self.wfile.flush()
                while True:
                    try:
                        ev = q.get(timeout=15)
                        self.wfile.write(f"data: {json.dumps(ev)}\n\n".encode())
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with trava:
                    assinantes.remove(q)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path.startswith("/cmd?c="):
            c = self.path[7:8]
            if c in "izadxf" and ser and ser.is_open:
                ser.write(c.encode())
                emitir({"tipo": "linha", "texto": f"comando '{c}' enviado"})
            self.send_response(204); self.end_headers()
        else:
            self.send_error(404)


threading.Thread(target=ler_serial, daemon=True).start()
srv = ThreadingHTTPServer(("127.0.0.1", a.http), Http)
url = f"http://localhost:{a.http}"
print(f"Monitor MH-Z19C em {url}  (Ctrl+C encerra)")
if not a.sem_navegador:
    webbrowser.open(url)
try:
    srv.serve_forever()
except KeyboardInterrupt:
    pass
