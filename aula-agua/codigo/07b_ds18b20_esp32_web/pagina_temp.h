/*
  pagina_temp.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pede /dados a cada 2 s e manda o ajuste (/ajustar?ref=0, /zerar), a faixa desejada
  (/faixa?min=20&max=26) e o pedido de recomecar a minima e a maxima (/extremos).
*/
#pragma once

const char PAGINA_TEMP[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Temperatura da solução</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #eef3f7; color: #1b2b3a }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 4px 0 14px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .cartao { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px;
            box-shadow: 0 1px 4px #0002; }
  #estado { text-align: center; color: #fff; background: #7a8794; }
  #estado.ok { background: #2e7d32; }
  #estado.fria { background: #1f6fb2; }
  #estado.quente { background: #c55a11; }
  #estado.fora { background: #b3261e; }
  #temp { font-size: 48px; font-weight: bold; }
  #temp small { font-size: 20px; color: #fff; }
  #frase { font-size: 17px; margin-top: 4px; }
  .linha { display: flex; justify-content: space-between; padding: 6px 0;
           border-bottom: 1px solid #e3e9ee; font-size: 16px; }
  .linha:last-child { border-bottom: 0; }
  .linha b { font-weight: 600; }
  #rom { font-size: 12px; font-family: monospace; }
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
  <h1>Temperatura da solução</h1>

  <div class="cartao" id="estado">
    <div id="temp">...</div>
    <div id="frase"></div>
  </div>

  <div class="cartao">
    <div class="linha"><span>Mínima</span><b id="tmin">–</b></div>
    <div class="linha"><span>Máxima</span><b id="tmax">–</b></div>
    <div class="linha"><span>Leitura do sensor, sem ajuste</span><b id="bruta">–</b></div>
    <div class="linha"><span>Ajuste</span><b id="ajuste">–</b></div>
    <div class="linha"><span>Sensor</span><b id="rom">–</b></div>
    <button class="claro"
            onclick="pedir('/extremos', 'avisoExt', 'Mínima e máxima recomeçadas.')">
      Recomeçar a mínima e a máxima</button>
    <div class="aviso" id="avisoExt"></div>
  </div>

  <div class="cartao">
    <h2>Últimas leituras (°C)</h2>
    <canvas id="grafico" width="800" height="300"></canvas>
  </div>

  <div class="cartao">
    <h2>Faixa desejada (°C)</h2>
    <label>Mínimo <input id="min" type="number" min="0" max="50" step="0.5"></label>
    <label>Máximo <input id="max" type="number" min="0" max="50" step="0.5"></label>
    <button onclick="faixa()">Salvar a faixa</button>
    <div class="aviso" id="avisoFaixa"></div>
  </div>

  <div class="cartao">
    <h2>Ajuste do sensor</h2>
    <p><small>Sensor no banho de gelo, ou ao lado de um termômetro de confiança, com a leitura
       parada há 2 minutos.</small></p>
    <label>Temperatura verdadeira (°C)
      <input id="ref" type="number" value="0" step="0.1"></label>
    <button onclick="ajustar()">Ajustar para este valor</button>
    <button class="claro" onclick="pedir('/zerar', 'avisoAj', 'Ajuste apagado.')">
      Apagar o ajuste</button>
    <div class="aviso" id="avisoAj"></div>
  </div>
</main>

<script>
  const el = (id) => document.getElementById(id);
  const pt = (n, casas) => n.toFixed(casas).replace(".", ",");
  const hist = [];              // ultimas 150 leituras, em C
  let faixaAtual = [0, 0], preencheu = false;

  const FRASES = {
    sem:     ["fora", "Sensor sem resposta: confira os fios e o resistor"],
    critica: ["fora", "Quente demais: risco para as raízes"],
    fria:    ["fria", "Abaixo da faixa desejada"],
    quente:  ["quente", "Acima da faixa: sombreie o reservatório"],
    ok:      ["ok", "Dentro da faixa desejada"]
  };

  // d = resposta do ESP32, por exemplo:
  // {"t":24.31,"bruta":24.56,"ajuste":-0.25,"tmin":23.9,"tmax":24.6,"min":20.0,"max":26.0,
  //  "critica":30,"sit":"ok","rom":"28-7A-4C-1E-0F-00-00-A1","bits":12}
  function mostrar(d) {
    const f = FRASES[d.sit] || FRASES.sem;
    const sem = d.sit == "sem";
    el("estado").className = "cartao " + f[0];
    el("temp").innerHTML = sem ? "– –" : pt(d.t, 1) + " <small>°C</small>";
    el("frase").textContent = f[1];
    el("tmin").textContent = sem ? "–" : pt(d.tmin, 1) + " °C";
    el("tmax").textContent = sem ? "–" : pt(d.tmax, 1) + " °C";
    el("bruta").textContent = sem ? "–" : pt(d.bruta, 2) + " °C";
    el("ajuste").textContent = (d.ajuste > 0 ? "+" : "") + pt(d.ajuste, 2) + " °C";
    el("rom").textContent = d.rom;
    faixaAtual = [d.min, d.max];
    if (!preencheu) { el("min").value = d.min; el("max").value = d.max; preencheu = true; }
  }

  function desenhar() {
    const c = el("grafico").getContext("2d"), W = 800, H = 300, M = 70;
    c.clearRect(0, 0, W, H);
    const todos = hist.concat(faixaAtual);
    const mn = Math.min(...todos) - 1, mx = Math.max(...todos) + 1;
    const y = (v) => H - 24 - (v - mn) / (mx - mn) * (H - 44);
    c.fillStyle = "#e3f2e4";                              // a faixa desejada, em verde claro
    c.fillRect(M, y(faixaAtual[1]), W - M, y(faixaAtual[0]) - y(faixaAtual[1]));
    c.fillStyle = "#5a6875"; c.font = "24px sans-serif";
    c.fillText(pt(mx, 1), 4, 30); c.fillText(pt(mn, 1), 4, H - 20);
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
      if (aviso) el(aviso).textContent = r.ok ? texto : "Recusado: confira o valor e o sensor.";
      if (!r.ok) return;
      const d = await r.json();
      mostrar(d);
      if (rota == "/dados" && d.sit != "sem") {
        hist.push(d.t);
        if (hist.length > 150) hist.shift();
      }
      desenhar();
    } catch (e) {
      el("estado").className = "cartao fora";
      el("frase").textContent = "SEM CONTATO com o ESP32";
    }
  }

  function faixa() {
    const rota = "/faixa?min=" + el("min").value + "&max=" + el("max").value;
    pedir(rota, "avisoFaixa", "Faixa salva.");
  }
  function ajustar() {
    const ref = el("ref").value;
    pedir("/ajustar?ref=" + ref, "avisoAj", "Ajustado para " + ref.replace(".", ",") + " °C.");
  }

  pedir("/dados");
  setInterval(() => pedir("/dados"), 2000);
</script>
</body>
</html>
)HTML";
