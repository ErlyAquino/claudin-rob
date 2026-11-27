// Simulador da pagina do sketch 05e (timer da bomba no ESP32), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/05e_timer_bomba_esp32_web/pagina_timer.h e imita as rotas /estado, /modo e /tempos.
// Uso:  node simular_pagina.js [porta] [modo inicial: auto | liga | desliga]     ->  http://localhost:8765
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "05e_timer_bomba_esp32_web", "pagina_timer.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8765, MINUTO = 60000, MANUAL_MAX = 30;
let lig = 15, des = 15, modo = "auto", bomba = true, inicio = Date.now() - 2.5 * MINUTO, inicioManual = 0;

function recomecar(ligada) { bomba = ligada; inicio = Date.now(); }
function mudarModo(m) {
  if (m === "auto") { modo = m; recomecar(true); }
  else if (m === "liga" || m === "desliga") { modo = m; inicioManual = Date.now(); recomecar(m === "liga"); }
}
function andar() {                                   // o mesmo que o loop() do sketch
  const agora = Date.now();
  if (modo !== "auto" && agora - inicioManual >= MANUAL_MAX * MINUTO) { modo = "auto"; recomecar(true); }
  if (modo === "auto" && agora - inicio >= (bomba ? lig : des) * MINUTO) recomecar(!bomba);
}
function estado() {
  const dur = modo === "auto" ? (bomba ? lig : des) * MINUTO : MANUAL_MAX * MINUTO;
  const passou = Date.now() - (modo === "auto" ? inicio : inicioManual);
  return JSON.stringify({ bomba: bomba ? 1 : 0, modo, falta: Math.max(0, Math.floor((dur - passou) / 1000)), lig, des, max: MANUAL_MAX });
}
if (process.argv[3]) { mudarModo(process.argv[3]); inicioManual -= 4.2 * MINUTO; }

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); andar();
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/modo") mudarModo(u.searchParams.get("m"));
  else if (u.pathname === "/tempos") {
    const l = parseInt(u.searchParams.get("lig")), d = parseInt(u.searchParams.get("des"));
    if (!(l >= 1 && l <= 720 && d >= 1 && d <= 720)) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end('{"erro":"tempos de 1 a 720 min"}'); }
    lig = l; des = d; if (modo === "auto") recomecar(true);
  } else if (u.pathname !== "/estado") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(estado());
}).listen(PORTA, () => console.log(`simulador da pagina do timer em http://localhost:${PORTA}`));
