/*
  pagina_tds.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pede /dados a cada 2 s e manda a calibracao (/calibrar?ref=1413, /zerar) e a faixa
  desejada (/faixa?min=1200&max=1600).
*/
#pragma once

const char PAGINA_TDS[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Condutividade da solução</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #eef3f7; color: #1b2b3a }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 4px 0 14px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .cartao { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px;
            box-shadow: 0 1px 4px #0002; }
  #estado { text-align: center; color: #fff; background: #7a8794; }
  #estado.ok { background: #2e7d32; }
  #estado.baixa { background: #1f6fb2; }
  #estado.alta { background: #c55a11; }
  #estado.fora { background: #b3261e; }
  #ce { font-size: 44px; font-weight: bold; }
  #ce small { font-size: 18px; color: #fff; }
  #frase { font-size: 17px; margin-top: 4px; }
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
  <h1>Condutividade da solução</h1>

  <div class="cartao" id="estado">
    <div id="ce">...</div>
    <div id="frase"></div>
  </div>

  <div class="cartao">
    <div class="linha"><span>Em µS/cm</span><b id="us">–</b></div>
    <div class="linha"><span>TDS (fator 0,5)</span><b id="tds">–</b></div>
    <div class="linha"><span>Temperatura da solução</span><b id="temp">–</b></div>
    <div class="linha"><span>Tensão do sensor</span><b id="v">–</b></div>
    <div class="linha"><span>Fator de calibração K</span><b id="k">–</b></div>
  </div>

  <div class="cartao">
    <h2>Últimas leituras (mS/cm)</h2>
    <canvas id="grafico" width="800" height="300"></canvas>
  </div>

  <div class="cartao">
    <h2>Faixa desejada (µS/cm)</h2>
    <label>Mínimo <input id="min" type="number" min="0" max="3000" step="50"></label>
    <label>Máximo <input id="max" type="number" min="0" max="3000" step="50"></label>
    <button onclick="faixa()">Salvar a faixa</button>
    <div class="aviso" id="avisoFaixa"></div>
  </div>

  <div class="cartao">
    <h2>Calibração</h2>
    <p><small>Sonda e DS18B20 na solução‑padrão, leitura parada há 1 minuto.</small></p>
    <label>Valor da solução (µS/cm) <input id="ref" type="number" value="1413"></label>
    <button onclick="calibrar()">Calibrar neste valor</button>
    <button class="claro" onclick="pedir('/zerar', 'avisoCal', 'Calibração apagada (K = 1).')">
      Apagar a calibração</button>
    <div class="aviso" id="avisoCal"></div>
  </div>
</main>

<script>
  const el = (id) => document.getElementById(id);
  const pt = (n, casas) => n.toFixed(casas).replace(".", ",");
  const hist = [];              // ultimas 150 leituras, em mS/cm
  let faixaAtual = [0, 0], preencheu = false;

  const FRASES = {
    espera: ["", "Aguardando a primeira medida"],
    ar:     ["fora", "Sonda fora d'água, ou água quase sem sais"],
    fim:    ["fora", "No fim da escala do sensor"],
    baixa:  ["baixa", "Abaixo da faixa: falta nutriente"],
    alta:   ["alta", "Acima da faixa: complete com água"],
    ok:     ["ok", "Dentro da faixa desejada"]
  };

  // d = resposta do ESP32, por exemplo:
  // {"ce":1432,"tds":716,"temp":26.4,"sonda":1,"v":1.248,"k":1.021,
  //  "min":1200,"max":1600,"sit":"ok"}
  function mostrar(d) {
    const f = FRASES[d.sit] || FRASES.espera;
    el("estado").className = "cartao " + f[0];
    el("ce").innerHTML = pt(d.ce / 1000, 2) + " <small>mS/cm</small>";
    el("frase").textContent = f[1];
    el("us").textContent = d.ce + " µS/cm";
    el("tds").textContent = d.tds + " ppm";
    el("temp").textContent = pt(d.temp, 1) + " °C" + (d.sonda ? "" : " (sem DS18B20)");
    el("v").textContent = pt(d.v, 3) + " V";
    el("k").textContent = pt(d.k, 3);
    faixaAtual = [d.min / 1000, d.max / 1000];
    if (!preencheu) { el("min").value = d.min; el("max").value = d.max; preencheu = true; }
  }

  function desenhar() {
    const c = el("grafico").getContext("2d"), W = 800, H = 300, M = 60;
    c.clearRect(0, 0, W, H);
    const todos = hist.concat(faixaAtual);
    const mn = Math.min(...todos) - 0.1, mx = Math.max(...todos) + 0.1;
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
      if (aviso) el(aviso).textContent = r.ok ? texto : "Recusado: confira o valor e a sonda.";
      if (!r.ok) return;
      const d = await r.json();
      mostrar(d);
      if (rota == "/dados" && d.sit != "espera") {
        hist.push(d.ce / 1000);
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
  function calibrar() {
    const ref = el("ref").value;
    pedir("/calibrar?ref=" + ref, "avisoCal", "Calibrado em " + ref + " µS/cm.");
  }

  pedir("/dados");
  setInterval(() => pedir("/dados"), 2000);
</script>
</body>
</html>
)HTML";
