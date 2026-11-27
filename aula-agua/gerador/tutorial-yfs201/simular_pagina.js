// Simulador da pagina do sketch 09b (vazao no celular), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/09b_yfs201_esp32_web/pagina_vazao.h e imita as rotas /dados, /calibrar, /faixa e /zerar.
// Uso:  node simular_pagina.js [porta] [vazao em L/min; 0 = bomba parada ha 23 min, em alerta]   ->  http://localhost:8771
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "09b_yfs201_esp32_web", "pagina_vazao.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8771;
const alvo = process.argv[3] === undefined ? 7.4 : +process.argv[3];
let ppl = 466, min = 5, max = 10, alerta = 20, n = 0, vol = 41.3, cal = 0, pcal = 0;

function dados() {
  n++;                                               // a vazao oscila um pouco, como numa bancada
  const q = alvo > 0 ? alvo + 0.15 * Math.sin(n / 4) + (Math.random() - 0.5) * 0.1 : 0;
  const agora = alvo > 0 ? q + (Math.random() - 0.5) * 0.25 : 0;
  vol += q * 2 / 60;                                 // a pagina pede a cada 2 s
  if (cal) pcal += Math.round(agora * ppl * 2 / 60);
  const parada = alvo > 0 ? 0 : 23.4 + n * 2 / 60;
  const sit = q <= 0 ? (alerta > 0 && parada >= alerta ? "alerta" : "parada") : q < min ? "baixa" : q > max ? "alta" : "ok";
  return JSON.stringify({ q: +q.toFixed(2), agora: +agora.toFixed(2), hz: +(agora * ppl / 60).toFixed(1), vol: +vol.toFixed(2),
                          ppl, min, max, alerta, parada: +parada.toFixed(1), cal, pcal, sit });
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const recusar = (m) => { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ erro: m })); };
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/calibrar") {
    const acao = u.searchParams.get("acao"), litros = parseFloat(u.searchParams.get("litros"));
    if (acao === "comecar") { cal = 1; pcal = 0; }
    else if (acao === "cancelar") cal = 0;
    else if (acao === "padrao") { ppl = 450; cal = 0; }
    else if (cal && litros >= 0.2 && pcal >= 100 && pcal / litros >= 120 && pcal / litros <= 1200) { ppl = +(pcal / litros).toFixed(1); cal = 0; }
    else return recusar("calibracao recusada");
  } else if (u.pathname === "/faixa") {
    const a = parseFloat(u.searchParams.get("min")), b = parseFloat(u.searchParams.get("max")), c = parseFloat(u.searchParams.get("alerta"));
    if (!(a >= 0 && b <= 30 && a < b && c >= 0 && c <= 600)) return recusar("valores invalidos");
    min = a; max = b; alerta = c;
  } else if (u.pathname === "/zerar") vol = 0;
  else if (u.pathname !== "/dados") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(dados());
}).listen(PORTA, () => console.log(`simulador da pagina da vazao em http://localhost:${PORTA}`));
