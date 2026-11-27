/*
  pagina_nivel.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pede /dados a cada 2 s e manda a calibracao (/zerar, /calibrar?cm=20, /apagar) e as
  medidas do reservatorio (/reservatorio?ponta=2&lpc=1.2&min=24&cheio=30).
*/
#pragma once

const char PAGINA_NIVEL[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nível do reservatório</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #eef3f7; color: #1b2b3a }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 4px 0 14px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .cartao { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px;
            box-shadow: 0 1px 4px #0002; }
  #estado { color: #fff; background: #7a8794; display: flex; align-items: center; gap: 16px; }
  #estado.ok { background: #2e7d32; }
  #estado.baixo { background: #c55a11; }
  #estado.alto { background: #1f6fb2; }
  #estado.fora { background: #b3261e; }
  #tanque { width: 74px; height: 120px; border: 3px solid #fff; border-top: 0; flex: none;
            border-radius: 0 0 10px 10px; position: relative; overflow: hidden; }
  #agua { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: #9fd3f5;
          transition: height 1s; }
  #marca { position: absolute; left: 0; right: 0; border-top: 2px dashed #fff; }
  #nivel { font-size: 40px; font-weight: bold; }
  #nivel small { font-size: 18px; color: #fff; }
  #volume { font-size: 22px; }
  #frase { font-size: 16px; margin-top: 4px; }
  .linha { display: flex; justify-content: space-between; padding: 6px 0;
           border-bottom: 1px solid #e3e9ee; font-size: 16px; }
  .linha:last-child { border-bottom: 0; }
  .linha b { font-weight: 600; }
  canvas { width: 100%; height: 150px; }
  label { display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; font-size: 16px; }
  input { width: 96px; font-size: 18px; padding: 8px; text-align: right;
          border: 1px solid #9aa7b3; border-radius: 8px; }
  button { width: 100%; font-size: 16px; padding: 12px 4px; border: 2px solid #1f4e79;
           border-radius: 10px; background: #1f4e79; color: #fff; margin-top: 4px; }
  button.claro { background: #fff; color: #1f4e79; }
  .aviso { font-size: 14px; min-height: 18px; margin-top: 8px; text-align: center; }
  small { color: #5a6875; }
</style>
</head>
<body>
<main>
  <h1>Nível do reservatório</h1>

  <div class="cartao" id="estado">
    <div id="tanque"><div id="agua"></div><div id="marca"></div></div>
    <div>
      <div id="nivel">...</div>
      <div id="volume"></div>
      <div id="frase"></div>
    </div>
  </div>

  <div class="cartao">
    <div class="linha"><span>Coluna acima da ponta do tubo</span><b id="prof">–</b></div>
    <div class="linha"><span>Pressão medida</span><b id="pa">–</b></div>
    <div class="linha"><span>Falta para a marca de cheio</span><b id="falta">–</b></div>
    <div class="linha"><span>Leitura bruta</span><b id="bruto">–</b></div>
    <div class="linha"><span>Zero</span><b id="zero">–</b></div>
    <div class="linha"><span>Contagens por cm</span><b id="sens">–</b></div>
  </div>

  <div class="cartao">
    <h2>Últimas leituras (cm)</h2>
    <canvas id="grafico" width="800" height="300"></canvas>
  </div>

  <div class="cartao">
    <h2>Calibração</h2>
    <p><small>1. Com a ponta do tubo fora d'água, toque em Zerar.<br>
      2. Mergulhe a ponta, meça com a régua a distância da ponta até a superfície e
      toque em Calibrar.</small></p>
    <button onclick="pedir('/zerar', 'avisoCal', 'Zero gravado.')">
      Zerar (tubo fora d'água)</button>
    <label style="margin-top:12px">Profundidade da ponta (cm)
      <input id="cm" type="number" value="20" min="2" max="400" step="0.5"></label>
    <button onclick="calibrar()">Calibrar nesta profundidade</button>
    <button class="claro" onclick="pedir('/apagar', 'avisoCal', 'Calibração apagada.')">
      Apagar a calibração</button>
    <div class="aviso" id="avisoCal"></div>
  </div>

  <div class="cartao">
    <h2>Reservatório</h2>
    <label>Ponta do tubo acima do fundo (cm)
      <input id="ponta" type="number" min="0" max="100" step="0.5"></label>
    <label>Litros por cm de altura
      <input id="lpc" type="number" min="0.01" max="100" step="0.01"></label>
    <label>Nível mínimo (cm)
      <input id="min" type="number" min="0" max="400" step="0.5"></label>
    <label>Marca de cheio (cm)
      <input id="cheio" type="number" min="1" max="400" step="0.5"></label>
    <button onclick="reservatorio()">Salvar o reservatório</button>
    <div class="aviso" id="avisoRes"></div>
  </div>
</main>

<script>
  const el = (id) => document.getElementById(id);
  const pt = (n, casas) => n.toFixed(casas).replace(".", ",");
  const hist = [];              // ultimas 150 leituras do nivel, em cm
  let faixa = [0, 0], preencheu = false;

  const FRASES = {
    espera: ["", "Aguardando a primeira medida"],
    falha:  ["fora", "Sensor sem resposta: confira os fios"],
    fim:    ["fora", "No fim da escala do sensor"],
    semcal: ["", "Sem calibrar: o número ainda não é medida"],
    ponta:  ["fora", "Água abaixo da ponta do tubo"],
    baixo:  ["baixo", "Abaixo do mínimo: hora de repor"],
    alto:   ["alto", "Acima da marca de cheio"],
    ok:     ["ok", "Nível dentro do esperado"]
  };

  // d = resposta do ESP32, por exemplo:
  // {"nivel":23.4,"prof":21.4,"vol":28.1,"pa":2093,"bruto":1187240,"zero":91250,
  //  "sens":51214,"cal":1,"ponta":2.0,"lpc":1.200,"min":24.0,"cheio":30.0,"sit":"ok"}
  function mostrar(d) {
    const f = FRASES[d.sit] || FRASES.espera;
    const semMedida = d.sit == "espera" || d.sit == "falha";
    el("estado").className = "cartao " + f[0];
    el("nivel").innerHTML = semMedida ? "..." : pt(d.nivel, 1) + " <small>cm</small>";
    el("volume").textContent = semMedida ? "" : pt(d.vol, 1) + " litros";
    el("frase").textContent = f[1];
    const cheio = Math.max(0, Math.min(1, d.nivel / (d.cheio * 1.15)));
    el("agua").style.height = (semMedida ? 0 : cheio * 100) + "%";
    el("marca").style.bottom = (d.min / (d.cheio * 1.15) * 100) + "%";
    el("prof").textContent = pt(d.prof, 1) + " cm";
    el("pa").textContent = pt(d.pa / 1000, 2) + " kPa";
    el("falta").textContent = pt(Math.max(0, (d.cheio - d.nivel) * d.lpc), 1) + " L";
    el("bruto").textContent = d.bruto;
    el("zero").textContent = d.zero;
    el("sens").textContent = d.sens + (d.cal ? "" : " (padrão)");
    faixa = [d.min, d.cheio];
    if (!preencheu) {
      el("ponta").value = d.ponta; el("lpc").value = d.lpc;
      el("min").value = d.min; el("cheio").value = d.cheio; preencheu = true;
    }
  }

  function desenhar() {
    const c = el("grafico").getContext("2d"), W = 800, H = 300, M = 60;
    c.clearRect(0, 0, W, H);
    const todos = hist.concat(faixa);
    const mn = Math.min(...todos) - 1, mx = Math.max(...todos) + 1;
    const y = (v) => H - 24 - (v - mn) / (mx - mn) * (H - 44);
    c.fillStyle = "#e3f2e4";                              // do minimo ate a marca de cheio
    c.fillRect(M, y(faixa[1]), W - M, y(faixa[0]) - y(faixa[1]));
    c.fillStyle = "#5a6875"; c.font = "24px sans-serif";
    c.fillText(pt(mx, 0), 4, 30); c.fillText(pt(mn, 0), 4, H - 20);
    if (hist.length < 2) return;
    c.strokeStyle = "#1f4e79"; c.lineWidth = 4; c.beginPath();
    hist.forEach((v, i) => {
      const x = M + i / 149 * (W - M - 6);
      if (i) c.lineTo(x, y(v)); else c.moveTo(x, y(v));
    });
    c.stroke();
  }

  async function pedir(rota, aviso, texto) {
    try {
      const r = await fetch(rota);
      if (aviso) el(aviso).textContent = r.ok ? texto : "Recusado: confira o valor e o tubo.";
      if (!r.ok) return;
      const d = await r.json();
      mostrar(d);
      if (rota == "/dados" && d.sit != "espera" && d.sit != "falha") {
        hist.push(d.nivel);
        if (hist.length > 150) hist.shift();
      }
      desenhar();
    } catch (e) {
      el("estado").className = "cartao fora";
      el("frase").textContent = "SEM CONTATO com o ESP32";
    }
  }

  function calibrar() {
    const cm = el("cm").value;
    pedir("/calibrar?cm=" + cm, "avisoCal", "Calibrado em " + cm + " cm.");
  }
  function reservatorio() {
    const rota = "/reservatorio?ponta=" + el("ponta").value + "&lpc=" + el("lpc").value +
                 "&min=" + el("min").value + "&cheio=" + el("cheio").value;
    pedir(rota, "avisoRes", "Reservatório salvo.");
  }

  pedir("/dados");
  setInterval(() => pedir("/dados"), 2000);
</script>
</body>
</html>
)HTML";
