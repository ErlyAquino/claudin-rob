/*
  pagina_timer.h: a pagina que o ESP32 entrega ao celular (HTML + CSS + JavaScript num so texto).
  A pagina pergunta o estado ao ESP32 uma vez por segundo (/estado), manda os comandos dos botoes
  (/modo?m=auto|liga|desliga) e os tempos do formulario (/tempos?lig=15&des=15).
*/
#pragma once

const char PAGINA_TIMER[] PROGMEM = R"HTML(<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Timer da bomba</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #eef3f7; color: #1b2b3a }
  main { max-width: 420px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 4px 0 14px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .cartao { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 14px;
            box-shadow: 0 1px 4px #0002; }
  #estado { text-align: center; color: #fff; background: #7a8794; }
  #estado.ligada { background: #2e7d32; }
  #estado.fora { background: #b3261e; }
  #bomba { font-size: 30px; font-weight: bold; }
  #falta { font-size: 18px; margin-top: 6px; }
  #modo { font-size: 14px; margin-top: 6px; opacity: .9; }
  .botoes { display: flex; gap: 8px; }
  button { flex: 1; font-size: 16px; padding: 14px 4px; border: 2px solid #1f4e79;
           border-radius: 10px; background: #fff; color: #1f4e79; }
  button.ativo { background: #1f4e79; color: #fff; }
  label { display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; font-size: 16px; }
  input { width: 90px; font-size: 18px; padding: 8px; text-align: right;
          border: 1px solid #9aa7b3; border-radius: 8px; }
  #salvar { width: 100%; background: #c55a11; border-color: #c55a11; color: #fff; }
  #aviso { font-size: 14px; min-height: 18px; margin-top: 8px; text-align: center; }
  small { color: #5a6875; }
</style>
</head>
<body>
<main>
  <h1>Timer da bomba</h1>

  <div class="cartao" id="estado">
    <div id="bomba">...</div>
    <div id="falta"></div>
    <div id="modo"></div>
  </div>

  <div class="cartao">
    <h2>Comando</h2>
    <div class="botoes">
      <button id="auto" onclick="modo('auto')">Automático</button>
      <button id="liga" onclick="modo('liga')">Ligar</button>
      <button id="desliga" onclick="modo('desliga')">Desligar</button>
    </div>
    <p><small>Ligar e Desligar valem por <span id="max">30</span> min;
       depois o timer volta ao automático.</small></p>
  </div>

  <div class="cartao">
    <h2>Tempos do timer</h2>
    <label>Ligada (min) <input id="lig" type="number" min="1" max="720"></label>
    <label>Desligada (min) <input id="des" type="number" min="1" max="720"></label>
    <button id="salvar" onclick="salvar()">Salvar</button>
    <div id="aviso"></div>
  </div>
</main>

<script>
  let preencheu = false;       // os campos so sao preenchidos uma vez: nao atrapalha quem digita
  const el = (id) => document.getElementById(id);
  const tempo = (s) => Math.floor(s / 60) + " min " + (s % 60) + " s";

  // e = resposta do ESP32, por exemplo:
  //     {"bomba":1,"modo":"auto","falta":734,"lig":15,"des":15,"max":30}
  function mostrar(e) {
    const auto = e.modo == "auto";
    el("estado").className = "cartao" + (e.bomba ? " ligada" : "");
    el("bomba").textContent = e.bomba ? "BOMBA LIGADA" : "BOMBA DESLIGADA";
    const oQueVem = auto ? (e.bomba ? "desliga em " : "liga em ") : "volta ao automático em ";
    el("falta").textContent = oQueVem + tempo(e.falta);
    const ciclo = e.lig + " min ligada / " + e.des + " min desligada";
    el("modo").textContent = auto ? "modo automático: " + ciclo : "modo manual";
    for (const b of ["auto", "liga", "desliga"]) el(b).className = b == e.modo ? "ativo" : "";
    el("max").textContent = e.max;
    if (!preencheu) { el("lig").value = e.lig; el("des").value = e.des; preencheu = true; }
  }

  async function pedir(caminho) {              // faz o pedido ao ESP32 e mostra a resposta
    try {
      const r = await fetch(caminho);
      mostrar(await r.json());
      return r.ok;
    } catch (erro) {
      el("estado").className = "cartao fora";
      el("bomba").textContent = "SEM CONTATO";
      el("falta").textContent = "confira o Wi-Fi do celular";
      el("modo").textContent = "";
      return false;
    }
  }

  function modo(m) { pedir("/modo?m=" + m); }

  async function salvar() {
    const ok = await pedir("/tempos?lig=" + el("lig").value + "&des=" + el("des").value);
    el("aviso").textContent = ok ? "Tempos gravados na memória do ESP32."
                                 : "Use valores de 1 a 720 minutos.";
    setTimeout(() => el("aviso").textContent = "", 4000);
  }

  pedir("/estado");
  setInterval(() => pedir("/estado"), 1000);
</script>
</body>
</html>
)HTML";
