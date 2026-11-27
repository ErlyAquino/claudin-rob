// Simulador da pagina do sketch 06b (condutividade no celular), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/06b_tds_esp32_web/pagina_tds.h e imita as rotas /dados, /calibrar, /zerar e /faixa.
// Uso:  node simular_pagina.js [porta] [CE inicial em uS/cm]     ->  http://localhost:8767
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "06b_tds_esp32_web", "pagina_tds.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8767;
let alvo = +process.argv[3] || 1430, k = 1.021, min = 1200, max = 1600, n = 0;
const temp = 26.4;
const curva = (v) => 133.42 * v ** 3 - 255.86 * v ** 2 + 857.39 * v;

function tensaoPara(ceBruta) {                       // inverte a curva do modulo por bissecao
  let a = 0, b = 2.3;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (curva(m) < ceBruta) a = m; else b = m; }
  return (a + b) / 2;
}
function dados() {
  n++;                                               // a CE cai devagar, com um pouco de ruido, como numa bancada
  const ce = alvo - 0.6 * n + 6 * Math.sin(n / 3) + (Math.random() - 0.5) * 6;
  const v = tensaoPara(ce * (1 + 0.02 * (temp - 25)) / k);
  const sit = ce < min ? "baixa" : ce > max ? "alta" : "ok";
  return JSON.stringify({ ce: Math.round(ce), tds: Math.round(ce / 2), temp, sonda: 1, v: +v.toFixed(3), k, min, max, sit });
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/calibrar") {
    const ref = parseFloat(u.searchParams.get("ref"));
    if (!(ref >= 100 && ref <= 2000)) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end('{"erro":"calibracao recusada"}'); }
    alvo = ref; n = 0;
  } else if (u.pathname === "/zerar") k = 1;
  else if (u.pathname === "/faixa") {
    const a = parseFloat(u.searchParams.get("min")), b = parseFloat(u.searchParams.get("max"));
    if (!(a >= 0 && b <= 3000 && a < b)) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end('{"erro":"faixa invalida"}'); }
    min = a; max = b;
  } else if (u.pathname !== "/dados") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(dados());
}).listen(PORTA, () => console.log(`simulador da pagina da condutividade em http://localhost:${PORTA}`));
