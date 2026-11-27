/*
  pagina_luz.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pede /dados a cada 2 s e manda a correcao do luximetro (/corrigir?ref=850, /zerar)
  e os ajustes (/ajustes?lpu=54&min=12&max=17: fonte de luz e meta de luz diaria).
*/
#pragma once

const char PAGINA_LUZ[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Luz da bancada</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #eef3f7; color: #1b2b3a }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 4px 0 14px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .cartao { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px;
            box-shadow: 0 1px 4px #0002; }
  #estado { text-align: center; color: #fff; background: #7a8794; }
  #estado.luz { background: #c98a00; }
  #estado.escuro { background: #2b3a55; }
  #estado.fora { background: #b3261e; }
  #lux { font-size: 44px; font-weight: bold; }
  #lux small { font-size: 18px; color: #fff; }
  #frase { font-size: 17px; margin-top: 4px; }
  .linha { display: flex; justify-content: space-between; padding: 6px 0;
           border-bottom: 1px solid #e3e9ee; font-size: 16px; }
  .linha:last-child { border-bottom: 0; }
  .linha b { font-weight: 600; text-align: right; }
  #meta { border-radius: 10px; padding: 10px; margin-top: 10px; text-align: center;
          font-size: 16px; background: #e3e9ee; }
  #meta.ok { background: #dff0e0; color: #1b5e20; }
  #meta.baixa { background: #dde9f6; color: #174a7c; }
  #meta.alta { background: #fbe6d4; color: #8a3c06; }
  canvas { width: 100%; height: 150px; }
  label { display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; font-size: 16px; }
  input, select { width: 96px; font-size: 18px; padding: 8px; text-align: right;
          border: 1px solid #9aa7b3; border-radius: 8px; }
  select { width: 190px; text-align: left; font-size: 16px; }
  button { width: 100%; font-size: 16px; padding: 12px 4px; border: 2px solid #1f4e79;
           border-radius: 10px; background: #1f4e79; color: #fff; margin-top: 4px; }
  button.claro { background: #fff; color: #1f4e79; }
  .aviso { font-size: 14px; min-height: 18px; margin-top: 8px; text-align: center; }
  small { color: #5a6875; }
</style>
</head>
<body>
<main>
  <h1>Luz da bancada</h1>

  <div class="cartao" id="estado">
    <div id="lux">...</div>
    <div id="frase"></div>
  </div>

  <div class="cartao">
    <div class="linha"><span>Luz útil estimada (PPFD)</span><b id="ppfd">–</b></div>
    <div class="linha"><span>Luz somada (DLI estimado)</span><b id="dli">–</b></div>
    <div class="linha"><span>Horas de luz</span><b id="horas">–</b></div>
    <div class="linha"><span>Faixa do sensor agora</span><b id="faixa">–</b></div>
    <div class="linha"><span>Fator de correção</span><b id="fator">–</b></div>
    <div id="meta"></div>
  </div>

  <div class="cartao">
    <h2>Últimas leituras (lux)</h2>
    <canvas id="grafico" width="800" height="300"></canvas>
  </div>

  <div class="cartao">
    <h2>Fonte de luz e meta diária</h2>
    <label>Fonte
      <select id="lpu">
        <option value="54">Sol (54 lx por µmol)</option>
        <option value="67">LED branco (67 lx por µmol)</option>
      </select>
    </label>
    <label>DLI mínimo (mol/m²/dia) <input id="min" type="number" min="0" max="60" step="1"></label>
    <label>DLI máximo (mol/m²/dia) <input id="max" type="number" min="0" max="60" step="1"></label>
    <button onclick="ajustes()">Salvar</button>
    <div class="aviso" id="avisoAjustes"></div>
  </div>

  <div class="cartao">
    <h2>Conferência com o luxímetro</h2>
    <p><small>Luxímetro ao lado do sensor, na mesma altura, sob a mesma luz, sem sombra.</small></p>
    <label>O luxímetro marca (lx) <input id="ref" type="number" min="50"></label>
    <button onclick="corrigir()">Corrigir para este valor</button>
    <button class="claro" onclick="pedir('/zerar', 'avisoCor', 'Correção apagada (fator = 1).')">
      Apagar a correção</button>
    <div class="aviso" id="avisoCor"></div>
  </div>
</main>

<script>
  const el = (id) => document.getElementById(id);
  const pt = (n, casas) => n.toFixed(casas).replace(".", ",");
  const milhar = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+$)/g, ".");
  const hist = [];              // ultimas 150 leituras, em lux
  let preencheu = false;

  const FRASES = {
    espera: ["", "Aguardando a primeira medida"],
    erro:   ["fora", "Sensor não responde: confira os 4 fios"],
    fim:    ["fora", "No fim da faixa do sensor"],
    escuro: ["escuro", "Escuro: noite ou painel desligado"],
    luz:    ["luz", "Há luz sobre as plantas"]
  };

  // d = resposta do ESP32, por exemplo:
  // {"lux":9120,"ppfd":136.1,"dli":5.31,"horas":11.2,"luz":10.9,"fator":1.000,
  //  "lpu":67,"min":12,"max":17,"faixa":54612,"sit":"luz"}
  function mostrar(d) {
    const f = FRASES[d.sit] || FRASES.espera;
    el("estado").className = "cartao " + f[0];
    el("lux").innerHTML = (d.sit == "erro" ? "–" : milhar(d.lux)) + " <small>lux</small>";
    el("frase").textContent = f[1];
    el("ppfd").textContent = pt(d.ppfd, 0) + " µmol/m²/s";
    el("dli").textContent = pt(d.dli, 1) + " mol/m² em " + pt(d.horas, 1) + " h";
    el("horas").textContent = pt(d.luz, 1) + " h";
    el("faixa").textContent = "até " + milhar(d.faixa) + " lx";
    el("fator").textContent = pt(d.fator, 3);
    const m = el("meta");
    if (d.horas < 23.9) {       // so compara com a meta quando ha um dia inteiro medido
      m.className = "";
      m.textContent = "A meta (" + d.min + " a " + d.max + ") só vale com 24 h de medida.";
    } else if (d.dli < d.min) {
      m.className = "baixa"; m.textContent = "Dia com pouca luz: abaixo de " + d.min + " mol/m².";
    } else if (d.dli > d.max) {
      m.className = "alta"; m.textContent = "Dia com muita luz: acima de " + d.max + " mol/m².";
    } else {
      m.className = "ok"; m.textContent = "Luz do dia dentro da meta (" + d.min + " a " + d.max + ").";
    }
    if (!preencheu) {
      el("lpu").value = d.lpu; el("min").value = d.min; el("max").value = d.max; preencheu = true;
    }
  }

  function desenhar() {
    const c = el("grafico").getContext("2d"), W = 800, H = 300, M = 110;
    c.clearRect(0, 0, W, H);
    const mx = Math.max(100, ...hist) * 1.1;
    const y = (v) => H - 24 - v / mx * (H - 44);
    c.fillStyle = "#5a6875"; c.font = "24px sans-serif";
    c.fillText(milhar(mx), 4, 30); c.fillText("0", 4, H - 20);
    if (hist.length < 2) return;
    c.strokeStyle = "#c98a00"; c.lineWidth = 4; c.beginPath();
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
      if (rota == "/dados" && d.sit != "espera" && d.sit != "erro") {
        hist.push(d.lux);
        if (hist.length > 150) hist.shift();
      }
      desenhar();
    } catch (e) {
      el("estado").className = "cartao fora";
      el("frase").textContent = "SEM CONTATO com o ESP32";
    }
  }

  function ajustes() {
    const rota = "/ajustes?lpu=" + el("lpu").value + "&min=" + el("min").value + "&max=" + el("max").value;
    pedir(rota, "avisoAjustes", "Ajustes salvos.");
  }
  function corrigir() {
    const ref = el("ref").value;
    pedir("/corrigir?ref=" + ref, "avisoCor", "Corrigido para " + ref + " lx.");
  }

  pedir("/dados");
  setInterval(() => pedir("/dados"), 2000);
</script>
</body>
</html>
)HTML";
