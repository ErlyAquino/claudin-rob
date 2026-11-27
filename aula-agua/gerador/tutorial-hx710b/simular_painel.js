// Simulador do servidor da telemetria-cria, so para capturar o PAINEL de verdade (servidor/painel/) com leituras
// inventadas de um no "teste/no10" igual ao do sketch 10c. Nao usa broker nem banco: serve os arquivos do painel,
// responde /api/historico e manda as leituras pelo Socket.IO, no formato do catalogo de topicos.
// Precisa do repositorio telemetria-cria com `npm ci` feito em servidor/ (socket.io e chart.js vem de la).
// Uso:  TELEMETRIA_DIR=/d/Projetos/telemetria-cria node simular_painel.js [porta]     ->  http://localhost:8772
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = process.env.TELEMETRIA_DIR || path.join(__dirname, "..", "..", "..", "..", "telemetria-cria");
const SERVIDOR = path.join(RAIZ, "servidor"), PAINEL = path.join(SERVIDOR, "painel");
const { Server } = require(path.join(SERVIDOR, "node_modules", "socket.io"));
const CHART = path.join(SERVIDOR, "node_modules", "chart.js", "dist", "chart.umd.min.js");
const PORTA = +process.argv[2] || 8772, PROJETO = "teste", NO = "no10";
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png" };
const PONTA_CM = 2, LITROS_POR_CM = 1.2, KPA_POR_CM = 0.0978;

// Uma hora de historia plausivel, numa tarde quente: a coluna cai cerca de 0,6 cm e, aos 40 min, alguem completa
// o reservatorio com agua ate a marca.
function profundidade(t, agora) {
  const min = (t - (agora - 3600e3)) / 60e3, ruido = Math.sin(t / 7919) * 0.5 + Math.sin(t / 1543) * 0.5;
  const base = min < 40 ? 24.6 - 0.015 * min : min < 42 ? 24.0 + 2.0 * (min - 40) : 28.0 - 0.015 * (min - 42);
  return base + 0.03 * ruido;
}
function leitura(grandeza, t, agora) {
  const h = profundidade(t, agora);
  if (grandeza === "profundidade") return +h.toFixed(2);
  if (grandeza === "pressao") return +(h * KPA_POR_CM).toFixed(3);
  return +((h + PONTA_CM) * LITROS_POR_CM).toFixed(2);
}
const UNIDADE = { profundidade: "cm", pressao: "kPa", volume: "L" };

const servidor = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/historico") {
    const agora = Date.now(), g = u.searchParams.get("grandeza"), pontos = [];
    if (UNIDADE[g]) for (let t = agora - 3600e3; t < agora; t += 10e3) pontos.push({ t, valor: leitura(g, t, agora) });
    res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify(pontos));
  }
  const arq = u.pathname === "/vendor/chart.js/chart.umd.min.js" ? CHART
    : path.join(PAINEL, path.normalize(u.pathname === "/" ? "index.html" : u.pathname).replace(/^([/\\]|\.\.)+/, ""));
  if (!arq.startsWith(PAINEL) && arq !== CHART) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (erro, dados) => {
    if (erro) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream" }); res.end(dados);
  });
});

const io = new Server(servidor);
let seq = 360 * 3;
io.on("connection", (socket) => {
  const agora = Date.now(), grandezas = {};
  for (const g of Object.keys(UNIDADE)) grandezas[g] = { valor: leitura(g, agora, agora), unidade: UNIDADE[g] };
  socket.emit("nos", { agora, nos: [{
    projeto: PROJETO, no: NO, status: "online", origem: "mqtt", ultimaRecepcao: agora - 3000, grandezas,
    perda: { boot: 2, recebidas: seq, esperadas: seq }, ultimaImagem: null, camera: null }] });
});
setInterval(() => {
  const t = Date.now();
  for (const g of Object.keys(UNIDADE)) io.emit("leitura", { projeto: PROJETO, no: NO, grandeza: g, valor: leitura(g, t, t), unidade: UNIDADE[g], seq: ++seq, boot: 2, t });
}, 10e3);
servidor.listen(PORTA, () => console.log(`painel da telemetria (simulado) em http://localhost:${PORTA}`));
