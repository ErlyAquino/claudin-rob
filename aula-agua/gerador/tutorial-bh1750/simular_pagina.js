// Simulador da pagina do sketch 08b (luz da bancada no celular), para ver e capturar a pagina sem a placa.
// Serve o MESMO HTML de ../../codigo/08b_bh1750_esp32_web/pagina_luz.h e imita as rotas /dados, /corrigir, /zerar e /ajustes.
// Uso:  node simular_pagina.js [porta] [lux] [DLI das ultimas 24 h] [horas de luz] [lux por umol]   ->  http://localhost:8771
const http = require("http"), fs = require("fs"), path = require("path");
const fonte = fs.readFileSync(path.join(__dirname, "..", "..", "codigo", "08b_bh1750_esp32_web", "pagina_luz.h"), "utf8");
const HTML = fonte.slice(fonte.indexOf('R"HTML(') + 7, fonte.indexOf(')HTML"'));
const PORTA = +process.argv[2] || 8771;
let alvo = process.argv[3] !== undefined ? +process.argv[3] : 13900;
const dli = +process.argv[4] || 12.1, horasDeLuz = +process.argv[5] || 16;
let lpu = +process.argv[6] || 67, fator = 1.0, min = 12, max = 17, n = 0;

function dados() {
  n++;                                               // luz quase constante, com um pouco de ruido, como sob um painel
  const lux = alvo < 1 ? 0 : alvo + 60 * Math.sin(n / 4) + (Math.random() - 0.5) * 40;
  const sit = lux < 200 ? "escuro" : "luz";
  return JSON.stringify({ lux: Math.round(lux), ppfd: +(lux / lpu).toFixed(1), dli, horas: 24, luz: horasDeLuz,
                          fator, lpu, min, max, faixa: 54612, sit });
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HTML); }
  if (u.pathname === "/corrigir") {
    const ref = parseFloat(u.searchParams.get("ref"));
    if (!(ref >= 50 && ref <= 150000) || alvo < 50 || ref / alvo < 0.5 || ref / alvo > 3) {
      res.writeHead(400, { "Content-Type": "application/json" }); return res.end('{"erro":"correcao recusada"}');
    }
    fator = ref / (alvo / fator); alvo = ref; n = 0;
  } else if (u.pathname === "/zerar") { alvo /= fator; fator = 1; }
  else if (u.pathname === "/ajustes") {
    const l = parseFloat(u.searchParams.get("lpu")), a = parseFloat(u.searchParams.get("min")), b = parseFloat(u.searchParams.get("max"));
    if (!(l >= 10 && l <= 100 && a >= 0 && b <= 60 && a < b)) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end('{"erro":"ajuste invalido"}'); }
    lpu = l; min = a; max = b;
  } else if (u.pathname !== "/dados") { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(dados());
}).listen(PORTA, () => console.log(`simulador da pagina da luz em http://localhost:${PORTA}`));
