// Simulador da pagina do sketch 10b (nivel do reservatorio no celular), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/10b_hx710b_esp32_web/pagina_nivel.h e imita as rotas /dados, /zerar, /calibrar,
// /apagar e /reservatorio.
// Uso:  node simular_pagina.js [porta] [nivel inicial em cm]     ->  http://localhost:8771
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "10b_hx710b_esp32_web", "pagina_nivel.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8771;
let nivel0 = +process.argv[3] || 26.4, n = 0;
let zero = 91250, sens = 51200, cal = 1, ponta = 2, lpc = 1.2, min = 24, cheio = 30;

function dados() {
  n++;                                               // o nivel cai devagar, com um pouco de ruido, como numa tarde quente
  const nivel = nivel0 - 0.012 * n + (Math.random() - 0.5) * 0.06;
  const prof = nivel - ponta, bruto = Math.round(zero + prof * sens);
  const sit = !cal ? "semcal" : prof < 0.5 ? "ponta" : nivel < min ? "baixo" : nivel > cheio + 1 ? "alto" : "ok";
  return JSON.stringify({ nivel: +nivel.toFixed(1), prof: +prof.toFixed(1), vol: +(nivel * lpc).toFixed(1),
    pa: Math.round(prof * 97.8), bruto, zero, sens, cal, ponta, lpc, min, cheio, sit });
}
const recusar = (res, motivo) => { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ erro: motivo })); };

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), q = (k) => parseFloat(u.searchParams.get(k));
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/calibrar") {
    if (!(q("cm") >= 2 && q("cm") <= 400)) return recusar(res, "calibracao recusada");
    nivel0 = q("cm") + ponta; n = 0; cal = 1;
  } else if (u.pathname === "/apagar") { cal = 0; sens = 50000; zero = 0; }
  else if (u.pathname === "/reservatorio") {
    if (!(q("ponta") >= 0 && q("lpc") > 0 && q("min") >= 0 && q("cheio") > q("min"))) return recusar(res, "valores invalidos");
    ponta = q("ponta"); lpc = q("lpc"); min = q("min"); cheio = q("cheio");
  } else if (u.pathname !== "/dados" && u.pathname !== "/zerar") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(dados());
}).listen(PORTA, () => console.log(`simulador da pagina do nivel em http://localhost:${PORTA}`));
