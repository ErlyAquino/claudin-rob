// Simulador do servidor da telemetria-cria, so para capturar o PAINEL de verdade (servidor/painel/) com leituras
// inventadas de um no "teste/no7" igual ao do sketch 08c. Nao usa broker nem banco: serve os arquivos do painel,
// responde /api/historico e manda as leituras pelo Socket.IO, no formato do catalogo de topicos.
// Precisa do repositorio telemetria-cria com `npm ci` feito em servidor/ (socket.io e chart.js vem de la).
// Uso:  TELEMETRIA_DIR=/d/Projetos/telemetria-cria node simular_painel.js [porta]     ->  http://localhost:8772
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = process.env.TELEMETRIA_DIR || path.join(__dirname, "..", "..", "..", "..", "telemetria-cria");
const SERVIDOR = path.join(RAIZ, "servidor"), PAINEL = path.join(SERVIDOR, "painel");
const { Server } = require(path.join(SERVIDOR, "node_modules", "socket.io"));
const CHART = path.join(SERVIDOR, "node_modules", "chart.js", "dist", "chart.umd.min.js");
const PORTA = +process.argv[2] || 8772, PROJETO = "teste", NO = "no8";
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png" };

// Uma hora de historia plausivel, no meio da manha de um dia de sol com nuvens, sob tela: a luz sobe devagar,
// uma nuvem passa aos 35 min e a soma do dia (DLI estimado) cresce o tempo todo, mais devagar durante a nuvem.
function luz(min, t) {
  const ruido = Math.sin(t / 7919) * 0.5 + Math.sin(t / 1543) * 0.5;
  const nuvem = min > 33 && min < 41 ? 0.45 + 0.55 * Math.abs(min - 37) / 4 : 1;
  return (24000 + 110 * min) * nuvem + 300 * ruido;
}
function leitura(grandeza, t, agora) {
  const min = (t - (agora - 3600e3)) / 60e3;
  if (grandeza === "iluminancia") return Math.round(luz(min, t));
  let mol = 6.4;                                    // somado desde a meia-noite ate uma hora atras
  for (let m = 0; m < min; m += 0.5) mol += luz(m, agora - 3600e3 + m * 60e3) / 54 * 30 / 1e6;
  return +mol.toFixed(2);
}
const UNIDADE = { iluminancia: "lx", "dli-estimado": "mol/m2/d" };

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
let seq = 360 * 2;
io.on("connection", (socket) => {
  const agora = Date.now();
  socket.emit("nos", { agora, nos: [{
    projeto: PROJETO, no: NO, status: "online", origem: "mqtt", ultimaRecepcao: agora - 3000,
    grandezas: Object.fromEntries(Object.keys(UNIDADE).map((g) => [g, { valor: leitura(g, agora, agora), unidade: UNIDADE[g] }])),
    perda: { boot: 3, recebidas: seq, esperadas: seq }, ultimaImagem: null, camera: null }] });
});
setInterval(() => {
  const t = Date.now();
  for (const g of Object.keys(UNIDADE)) io.emit("leitura", { projeto: PROJETO, no: NO, grandeza: g, valor: leitura(g, t, t), unidade: UNIDADE[g], seq: ++seq, boot: 3, t });
}, 10e3);
servidor.listen(PORTA, () => console.log(`painel da telemetria (simulado) em http://localhost:${PORTA}`));
