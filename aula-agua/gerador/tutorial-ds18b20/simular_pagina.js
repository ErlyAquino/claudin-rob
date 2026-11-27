// Simulador da pagina do sketch 07b (temperatura da solucao no celular), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/07b_ds18b20_esp32_web/pagina_temp.h e imita as rotas /dados, /ajustar, /zerar,
// /extremos e /faixa.
// Uso:  node simular_pagina.js [porta] [temperatura inicial em C]     ->  http://localhost:8771
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "07b_ds18b20_esp32_web", "pagina_temp.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8771;
let base = +process.argv[3] || 24.3, ajuste = -0.25, min = 20, max = 26, n = 0, tmin = null, tmax = null;

function dados() {
  n++;                                               // a solucao esquenta devagar, com um pouco de ruido
  const bruta = Math.round((base + 0.012 * n + 0.12 * Math.sin(n / 5) - ajuste) / 0.0625) * 0.0625;
  const t = bruta + ajuste;
  tmin = tmin === null ? t : Math.min(tmin, t); tmax = tmax === null ? t : Math.max(tmax, t);
  const sit = t >= 30 ? "critica" : t < min ? "fria" : t > max ? "quente" : "ok";
  return JSON.stringify({ t: +t.toFixed(2), bruta: +bruta.toFixed(2), ajuste, tmin: +tmin.toFixed(1), tmax: +tmax.toFixed(1),
    min, max, critica: 30, sit, rom: "28-7A-4C-1E-0F-00-00-A1", bits: 12 });
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const recusa = (m) => { res.writeHead(400, { "Content-Type": "application/json" }); res.end(`{"erro":"${m}"}`); };
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/ajustar") {
    const ref = parseFloat(u.searchParams.get("ref")), atual = base + 0.012 * n - ajuste;
    if (!(ref >= -10 && ref <= 60) || Math.abs(ref - atual) > 3) return recusa("ajuste recusado");
    ajuste = +(ref - atual).toFixed(3); tmin = tmax = null;
  } else if (u.pathname === "/zerar") { ajuste = 0; tmin = tmax = null; }
  else if (u.pathname === "/extremos") tmin = tmax = null;
  else if (u.pathname === "/faixa") {
    const a = parseFloat(u.searchParams.get("min")), b = parseFloat(u.searchParams.get("max"));
    if (!(a >= 0 && b <= 50 && a < b)) return recusa("faixa invalida");
    min = a; max = b;
  } else if (u.pathname !== "/dados") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(dados());
}).listen(PORTA, () => console.log(`simulador da pagina da temperatura em http://localhost:${PORTA}`));
