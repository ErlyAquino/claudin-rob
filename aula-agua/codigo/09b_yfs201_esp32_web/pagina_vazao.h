/*
  pagina_vazao.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pede /dados a cada 2 s e manda a calibracao (/calibrar?acao=comecar,
  /calibrar?litros=5, /calibrar?acao=cancelar, /calibrar?acao=padrao), a faixa desejada com o
  tempo do alerta (/faixa?min=5&max=10&alerta=20) e o pedido de zerar o volume (/zerar).
*/
#pragma once

const char PAGINA_VAZAO[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vazão da solução</title>
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
  #q { font-size: 44px; font-weight: bold; }
  #q small { font-size: 18px; color: #fff; }
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
  #contando { display: none; }
  #pcal { font-size: 28px; font-weight: bold; text-align: center; margin: 6px 0 10px; }
</style>
</head>
<body>
<main>
  <h1>Vazão da solução</h1>

  <div class="cartao" id="estado">
    <div id="q">...</div>
    <div id="frase"></div>
  </div>

  <div class="cartao">
    <div class="linha"><span>No último segundo</span><b id="agora">–</b></div>
    <div class="linha"><span>Frequência dos pulsos</span><b id="hz">–</b></div>
    <div class="linha"><span>Volume que passou</span><b id="vol">–</b></div>
    <div class="linha"><span>Pulsos por litro</span><b id="ppl">–</b></div>
    <div class="linha"><span>Sem vazão há</span><b id="parada">–</b></div>
    <button class="claro" onclick="pedir('/zerar', 'avisoVol', 'Volume zerado.')">
      Zerar o volume</button>
    <div class="aviso" id="avisoVol"></div>
  </div>

  <div class="cartao">
    <h2>Últimas leituras (L/min)</h2>
    <canvas id="grafico" width="800" height="300"></canvas>
  </div>

  <div class="cartao">
    <h2>Faixa desejada e alerta</h2>
    <label>Mínimo (L/min) <input id="min" type="number" min="0" max="30" step="0.5"></label>
    <label>Máximo (L/min) <input id="max" type="number" min="0" max="30" step="0.5"></label>
    <label>Alerta sem vazão (min) <input id="alerta" type="number" min="0" max="600"></label>
    <p><small>0 desliga o alerta. Com o timer em 15 min ligado e 15 min desligado, use 20.
    </small></p>
    <button onclick="faixa()">Salvar</button>
    <div class="aviso" id="avisoFaixa"></div>
  </div>

  <div class="cartao">
    <h2>Calibração com o balde</h2>
    <div id="parado">
      <p><small>Bomba ligada, mangueira de saída na mão e um recipiente de volume conhecido
      ao lado. Toque no botão e, no mesmo instante, ponha a mangueira no recipiente.</small></p>
      <button onclick="pedir('/calibrar?acao=comecar', 'avisoCal', 'Contando os pulsos...')">
        Começar a contar</button>
      <button class="claro"
        onclick="pedir('/calibrar?acao=padrao', 'avisoCal', 'De volta a 450 pulsos por litro.')">
        Voltar a 450 pulsos por litro</button>
    </div>
    <div id="contando">
      <p><small>Pulsos contados. Ao chegar na marca, tire a mangueira e escreva o volume.
      </small></p>
      <div id="pcal">0</div>
      <label>Volume coletado (L) <input id="litros" type="number" value="5" step="0.1"></label>
      <button onclick="terminar()">Terminar e calcular</button>
      <button class="claro"
        onclick="pedir('/calibrar?acao=cancelar', 'avisoCal', 'Calibração cancelada.')">
        Cancelar</button>
    </div>
    <div class="aviso" id="avisoCal"></div>
  </div>
</main>

<script>
  const el = (id) => document.getElementById(id);
  const pt = (n, casas) => n.toFixed(casas).replace(".", ",");
  const hist = [];              // ultimas 150 leituras, em L/min
  let faixaAtual = [0, 0], preencheu = false;

  const FRASES = {
    espera: ["", "Aguardando as primeiras medidas"],
    parada: ["", "Sem vazão: bomba desligada?"],
    alerta: ["fora", "ALERTA: sem vazão há tempo demais"],
    baixa:  ["baixa", "Abaixo da faixa: filtro sujo ou entupimento?"],
    alta:   ["alta", "Acima da faixa desejada"],
    ok:     ["ok", "Dentro da faixa desejada"]
  };

  // d = resposta do ESP32, por exemplo:
  // {"q":7.42,"agora":7.47,"hz":56.0,"vol":123.45,"ppl":450.0,"min":5.0,"max":10.0,
  //  "alerta":20,"parada":0.0,"cal":0,"pcal":0,"sit":"ok"}
  function mostrar(d) {
    const f = FRASES[d.sit] || FRASES.espera;
    el("estado").className = "cartao " + f[0];
    el("q").innerHTML = pt(d.q, 2) + " <small>L/min</small>";
    el("frase").textContent = f[1];
    if (d.q > 0 && d.q < 1) el("frase").textContent += " (abaixo de 1 L/min o sensor erra)";
    el("agora").textContent = pt(d.agora, 2) + " L/min";
    el("hz").textContent = pt(d.hz, 1) + " Hz";
    el("vol").textContent = pt(d.vol, 2) + " L";
    el("ppl").textContent = pt(d.ppl, 1);
    el("parada").textContent = d.q > 0 ? "–" : pt(d.parada, 1) + " min";
    el("parado").style.display = d.cal ? "none" : "block";
    el("contando").style.display = d.cal ? "block" : "none";
    el("pcal").textContent = d.pcal + " pulsos";
    faixaAtual = [d.min, d.max];
    if (!preencheu) {
      el("min").value = d.min; el("max").value = d.max; el("alerta").value = d.alerta;
      preencheu = true;
    }
  }

  function desenhar() {
    const c = el("grafico").getContext("2d"), W = 800, H = 300, M = 60;
    c.clearRect(0, 0, W, H);
    const todos = hist.concat(faixaAtual);
    const mn = Math.max(0, Math.min(...todos) - 1), mx = Math.max(...todos) + 1;
    const y = (v) => H - 24 - (v - mn) / (mx - mn) * (H - 44);
    c.fillStyle = "#e3f2e4";                              // a faixa desejada, em verde claro
    c.fillRect(M, y(faixaAtual[1]), W - M, y(faixaAtual[0]) - y(faixaAtual[1]));
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
      if (aviso) el(aviso).textContent = r.ok ? texto : "Recusado: confira os valores.";
      if (!r.ok) return;
      const d = await r.json();
      mostrar(d);
      if (rota == "/dados" && d.sit != "espera") {
        hist.push(d.q);
        if (hist.length > 150) hist.shift();
      }
      desenhar();
    } catch (e) {
      el("estado").className = "cartao fora";
      el("frase").textContent = "SEM CONTATO com o ESP32";
    }
  }

  function faixa() {
    const rota = "/faixa?min=" + el("min").value + "&max=" + el("max").value +
                 "&alerta=" + el("alerta").value;
    pedir(rota, "avisoFaixa", "Salvo.");
  }
  function terminar() {
    const litros = el("litros").value;
    pedir("/calibrar?litros=" + litros, "avisoCal", "Calibrado com " + litros + " L.");
  }

  pedir("/dados");
  setInterval(() => pedir("/dados"), 2000);
</script>
</body>
</html>
)HTML";
