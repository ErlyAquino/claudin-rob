/*
  pagina_web.h - pagina HTML comum a todos os monitores Wi-Fi desta sequencia (ESP32).
  Copie este arquivo para a pasta de cada sketch ESP32 (a IDE abre como uma aba).

  A pagina pede /dados a cada 2 s. O sketch responde um JSON com uma lista de grandezas:
    {"titulo":"DS18B20","itens":[{"n":"Temperatura","v":24.5,"u":"C"},...],"alerta":false}
  O primeiro item vira o grafico (ultimos 120 pontos).
*/
#pragma once

const char PAGINA_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monitor ESP32</title>
<style>
 body{font-family:sans-serif;background:#111;color:#eee;margin:0;padding:14px;text-align:center}
 .card{background:#222;border-radius:12px;padding:14px;margin:10px auto;max-width:520px}
 .grande{font-size:2.6em;font-weight:bold} .u{font-size:.5em;color:#aaa}
 .itens{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
 .item{background:#333;border-radius:8px;padding:8px 12px;min-width:110px}
 .item b{display:block;font-size:1.3em}
 #alerta{padding:8px;border-radius:8px;margin-top:8px} .ok{background:#2a2} .al{background:#c22;animation:p 1s infinite}
 @keyframes p{50%{opacity:.4}} canvas{width:100%;height:200px;background:#000;border-radius:8px}
</style></head><body>
<h2 id="titulo">Monitor</h2>
<div class="card"><div class="grande" id="principal">--</div><div id="alerta" class="ok">normal</div></div>
<div class="card"><div class="itens" id="itens"></div></div>
<div class="card"><canvas id="g" width="500" height="200"></canvas><p id="legenda">ultimas leituras</p></div>
<script>
 const hist=[]; const c=document.getElementById('g').getContext('2d');
 function desenha(){const W=500,H=200;c.clearRect(0,0,W,H);if(hist.length<2)return;
   const mn=Math.min(...hist),mx=Math.max(...hist),f=(mx-mn)||1;
   c.strokeStyle='#4af';c.lineWidth=2;c.beginPath();
   hist.forEach((v,i)=>{const x=i/119*W,y=H-8-(v-mn)/f*(H-16);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
   c.fillStyle='#888';c.font='12px sans-serif';c.fillText(mx.toFixed(1),4,12);c.fillText(mn.toFixed(1),4,H-4);}
 async function tick(){try{const d=await (await fetch('/dados')).json();
   document.getElementById('titulo').textContent=d.titulo;
   const p=d.itens[0];document.getElementById('principal').innerHTML=p.v.toFixed(1)+' <span class="u">'+p.u+'</span>';
   document.getElementById('itens').innerHTML=d.itens.slice(1).map(i=>'<div class="item">'+i.n+'<b>'+i.v.toFixed(1)+' '+i.u+'</b></div>').join('');
   const a=document.getElementById('alerta');a.textContent=d.alerta?'ALERTA: '+d.msg:'normal';a.className=d.alerta?'al':'ok';
   document.getElementById('legenda').textContent=p.n+' - ultimas '+hist.length+' leituras';
   hist.push(p.v);if(hist.length>120)hist.shift();desenha();}catch(e){}}
 setInterval(tick,2000);tick();
</script></body></html>
)HTML";
