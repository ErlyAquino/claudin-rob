// Uso: node gerar.js [completo|fisica]   (perfis em PERFIS abaixo)
// Gera, a partir de questoes/qNNN.md:
//   ../ENEM-2026-dia2-amarelo.md   (prova completa em Markdown)
//   ../slides.html                 (slides 16:9, uma questão ampliada por slide; paginação automática no navegador)
// Depois: bash gerar_pdf.sh  (Edge/Chrome headless -> ../ENEM-2026-dia2-amarelo-slides.pdf)
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const katex = require("katex");

const BASE = path.resolve(__dirname, "..");
const QDIR = path.join(BASE, "questoes");
const PERFIS = {
  completo: {
    questoes: null, md: "ENEM-2026-dia2-amarelo.md", html: "slides.html",
    titulo: "ENEM 2026 · 2º dia", sub: "Caderno 5 · Amarelo", linha: "Ciências da Natureza (91–135) · Matemática (136–180)",
    secao: null,
  },
  // Questões de Ciências da Natureza que envolvem conceitos de Física (numeração original do caderno)
  fisica: {
    questoes: [91, 92, 94, 95, 96, 99, 104, 111, 113, 114, 118, 121, 128, 130, 133],
    md: "ENEM-2026-dia2-fisica.md", html: "slides-fisica.html",
    titulo: "Física · ENEM 2026", sub: "2º dia · Caderno 5 · Amarelo", linha: "Questões de Ciências da Natureza que envolvem Física — numeração original",
    secao: "Ciências da Natureza e suas Tecnologias — Física",
  },
};
const PERFIL = process.argv[2] || "completo";
const P = PERFIS[PERFIL];
if (!P) throw new Error("perfil desconhecido: " + PERFIL);
const arquivos = fs.readdirSync(QDIR).filter((f) => /^q\d{3}\.md$/.test(f)).sort()
  .filter((f) => !P.questoes || P.questoes.includes(+f.slice(1, 4)));

// ---------- Markdown completo ----------
const cab = `# ENEM 2026 — 2º dia — Caderno 5 · Amarelo

**Prova de Ciências da Natureza e suas Tecnologias** (questões 91 a 135) e
**Prova de Matemática e suas Tecnologias** (questões 136 a 180).

Transcrição do caderno escaneado (fonte: "ENEM 2 dia - Prova Amarela Anglo Resolve.pdf"). Figuras recortadas da prova
original em \`imagens/\`. Fórmulas em LaTeX (\`$...$\`).

`;
let md = cab;
if (P.secao) md = `# Física · ENEM 2026 — 2º dia — Caderno 5 · Amarelo

Questões da **Prova de Ciências da Natureza e suas Tecnologias** que envolvem conceitos de Física, com a
**numeração original** do caderno: ${P.questoes.join(", ")}.

Transcrição do caderno escaneado (fonte: "ENEM 2 dia - Prova Amarela Anglo Resolve.pdf"). Figuras recortadas da prova
original em \`imagens/\`. Fórmulas em LaTeX (\`$...$\`).

---

`;
for (const f of arquivos) {
  const n = +f.slice(1, 4);
  if (!P.secao && n === 91) md += "\n---\n\n# Ciências da Natureza e suas Tecnologias — Questões de 91 a 135\n\n";
  if (!P.secao && n === 136) md += "\n---\n\n# Matemática e suas Tecnologias — Questões de 136 a 180\n\n";
  md += fs.readFileSync(path.join(QDIR, f), "utf8").trim() + "\n\n";
}
fs.writeFileSync(path.join(BASE, P.md), md);

// ---------- Matemática: protege $...$ antes do marked (regra do pandoc) ----------
function renderMath(src) {
  const store = [];
  const put = (html) => `\u0000M${store.push(html) - 1}\u0000`;
  // texto alternativo de imagem não leva matemática/markup
  src = src.replace(/!\[([^\]]*)\]/g, (_, alt) => "![" + alt.replace(/[$*_\\{}]/g, "") + "]");
  src = src.replace(/\\\$/g, () => put("$"));
  src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => put(katex.renderToString(t, { displayMode: true, throwOnError: false })));
  src = src.replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, t) =>
    put(katex.renderToString(t, { throwOnError: false })));
  return { src, store };
}
function md2html(src) {
  const { src: s, store } = renderMath(src);
  let html = marked.parse(s);
  return html.replace(/\u0000M(\d+)\u0000/g, (_, i) => store[+i]);
}

// ---------- Slides ----------
function questaoHTML(f) {
  const raw = fs.readFileSync(path.join(QDIR, f), "utf8");
  const n = +f.slice(1, 4);
  const corpo = raw.replace(/^##\s*Quest[ãa]o\s*\d+\s*\n/i, "");
  let html = md2html(corpo);
  // marca as alternativas (parágrafos que começam com **A)** … **E)**)
  html = html.replace(/<p><strong>([A-E])\)<\/strong>\s*([\s\S]*?)<\/p>/g, (_, L, c) =>
    `<div class="alt${/<img/.test(c) ? " alt-img" : ""}"><span class="letra">${L}</span><div class="alt-c">${c}</div></div>`);
  // agrupa alternativas consecutivas
  html = html.replace(/((?:<div class="alt[^"]*">[\s\S]*?<\/div><\/div>\s*)+)/g, (g) =>
    `<div class="alts${/alt-img/.test(g) ? " alts-img" : ""}">${g}</div>`);
  const area = n <= 135 ? "Ciências da Natureza e suas Tecnologias" : "Matemática e suas Tecnologias";
  return `<section class="q" data-n="${n}" data-area="${area}"><div class="fonte-q">${html}</div></section>`;
}

const qs = arquivos.map(questaoHTML).join("\n");
const page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${P.titulo} — ${P.sub} (slides)</title>
<link rel="stylesheet" href="gerador/node_modules/katex/dist/katex.min.css">
<style>
@page { size: 1280px 720px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: "Segoe UI", Calibri, Carlito, "Liberation Sans", sans-serif; color: #1b1f24; }
.slide { width: 1280px; height: 720px; position: relative; overflow: hidden; page-break-after: always; break-after: page; }
.slide .barra { position: absolute; left: 0; top: 0; right: 0; height: 64px; background: #1d3557; color: #fff;
  display: flex; align-items: center; padding: 0 40px; gap: 20px; }
.barra .num { font-size: 32px; font-weight: 700; letter-spacing: .5px; }
.barra .area { font-size: 18px; opacity: .85; margin-left: auto; }
.barra .cont { font-size: 18px; background: #e9c46a; color: #1d3557; border-radius: 6px; padding: 2px 10px; font-weight: 600; }
.slide .rod { position: absolute; left: 40px; right: 40px; bottom: 10px; font-size: 13px; color: #8a929c;
  display: flex; justify-content: space-between; }
.corpo { position: absolute; left: 48px; right: 48px; top: 82px; bottom: 34px; overflow: hidden; }
.corpo p { margin: 0 0 .45em; line-height: 1.32; text-align: justify; hyphens: auto; }
.corpo blockquote { margin: 0 0 .45em; padding: 0; border: 0; text-align: right; font-size: .62em; color: #555; }
.corpo blockquote p { text-align: right; }
.corpo img { display: block; margin: .25em auto .45em; max-width: 100%; max-height: var(--imgmax, 430px); object-fit: contain; }
.corpo table { border-collapse: collapse; margin: .2em auto .5em; font-size: 1em; }
.corpo th, .corpo td { border: 1.5px solid #555; padding: .15em .6em; text-align: center; }
.corpo th { background: #e8eef6; }
.corpo ul, .corpo ol { margin: 0 0 .45em 1.2em; padding: 0; line-height: 1.3; }
.corpo.lado { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); gap: 34px; align-items: start; }
.corpo.lado .esq p { text-align: left; }
.corpo.lado .dir { display: flex; flex-direction: column; justify-content: center; min-height: 100%; }
.corpo.lado .dir img { max-height: var(--imgmax); width: auto; max-width: 100%; }
.corpo.duas { column-count: 2; column-gap: 44px; column-fill: auto; }
.corpo.duas > * { break-inside: avoid; } .corpo.duas p { text-align: left; }
.corpo.duas .alts { break-inside: auto; } .corpo.duas .alt { break-inside: avoid; }
.alts { display: flex; flex-direction: column; gap: .18em; margin-top: .2em; }
.alt { display: flex; align-items: baseline; gap: .55em; }
.letra { flex: none; display: inline-flex; width: 1.45em; height: 1.45em; border-radius: 50%; background: #1d3557; color: #fff;
  align-items: center; justify-content: center; font-weight: 700; font-size: .8em; transform: translateY(-.08em); }
.alt-c p, .alt-c { margin: 0; }
.alts-img { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: .4em 1.4em; }
.alts-img .alt { align-items: center; }
.alts-img img { max-height: var(--altmax, 230px); margin: 0; }
.katex { font-size: 1.05em; }
.capa { display: flex; flex-direction: column; justify-content: center; align-items: center; background: #1d3557; color: #fff; text-align: center; }
.capa h1 { font-size: 64px; margin: 0 0 10px; } .capa h2 { font-size: 30px; font-weight: 400; margin: 0 0 6px; }
.capa p { font-size: 22px; opacity: .85; }
.sec { display: flex; justify-content: center; align-items: center; background: #e9c46a; color: #1d3557; font-size: 46px; font-weight: 700; text-align: center; padding: 0 80px; }
#fonte { position: absolute; left: -99999px; top: 0; }
</style></head><body>
<div class="slide capa"><h1>${P.titulo}</h1><h2>${P.sub}</h2>
<p>${P.linha}</p><p style="font-size:16px">Questões ampliadas — transcrição do caderno original</p></div>
<div id="fonte">${qs}</div>
<div id="saida"></div>
<script>
// Paginação: tenta caber a questão inteira num slide reduzindo a fonte; se não couber, divide em blocos.
const MAX = 30, MIN = 23, MIN_SPLIT = 23;
const saida = document.getElementById('saida');
const SECAO = ${JSON.stringify(P.secao)};
function novoSlide(q, parte) {
  const s = document.createElement('div'); s.className = 'slide';
  s.innerHTML = '<div class="barra"><span class="num">Questão ' + q.dataset.n + '</span>' +
    (parte > 1 ? '<span class="cont">continuação</span>' : '') + '<span class="area">' + q.dataset.area + '</span></div>' +
    '<div class="corpo"></div><div class="rod"><span>ENEM 2026 · 2º dia · Caderno 5 · Amarelo</span><span></span></div>';
  saida.appendChild(s); return s;
}
const cabe = (c) => c.scrollHeight <= c.clientHeight + 1 && c.scrollWidth <= c.clientWidth + 1;
function tentar(corpo, fs, imgmax, altmax) {
  corpo.style.fontSize = fs + 'px'; corpo.style.setProperty('--imgmax', imgmax + 'px'); corpo.style.setProperty('--altmax', altmax + 'px');
  return cabe(corpo);
}
const ehFig = (b) => b.tagName === 'P' && b.querySelector('img') && b.textContent.trim() === '';
// monta o corpo num dos modos: '1' (coluna única), 'lado' (texto à esquerda, figuras à direita), 'duas' (2 colunas)
function montar(corpo, blocos, modo) {
  corpo.innerHTML = ''; corpo.className = 'corpo' + (modo === '1' ? '' : ' ' + modo);
  if (modo === 'lado') {
    const e = document.createElement('div'), d = document.createElement('div'); e.className = 'esq'; d.className = 'dir';
    blocos.forEach(b => (ehFig(b) ? d : e).appendChild(b.cloneNode(true)));
    corpo.append(e, d);
  } else blocos.forEach(b => corpo.appendChild(b.cloneNode(true)));
}
function caber(corpo, blocos, minimo) {
  const nf = blocos.filter(ehFig).length, temTexto = blocos.some(b => !ehFig(b));
  const larga = blocos.filter(ehFig).some(b => { const i = b.querySelector('img'); return i.naturalWidth / i.naturalHeight > 1.5; });
  const planos = [];
  for (let fs = MAX; fs >= 26; fs--) planos.push(['1', fs, 560, 300], ['1', fs, 460, 240], ['1', fs, 400, 220]);
  if (nf && temTexto && !larga) for (let fs = MAX; fs >= minimo; fs--) for (const al of [230, 200, 180]) planos.push(['lado', fs, Math.floor(590 / nf) - 16, al]);
  if (!nf) for (let fs = 27; fs >= minimo; fs--) planos.push(['duas', fs, 400, 210]);
  for (let fs = 25; fs >= minimo; fs--) planos.push(['1', fs, 360, 200], ['1', fs, 300, 180]);
  let modoAtual = '';
  for (const [modo, fs, im, al] of planos) {
    if (modo !== modoAtual) { montar(corpo, blocos, modo); modoAtual = modo; }
    if (tentar(corpo, fs, im, al)) return true;
  }
  return false;
}
function paginar() {
  const qs = [...document.querySelectorAll('#fonte section.q')];
  let lastArea = '';
  for (const q of qs) {
    if (q.dataset.area !== lastArea) {
      const s = document.createElement('div'); s.className = 'slide sec';
      s.textContent = SECAO || (q.dataset.area + ' — Questões ' + (q.dataset.n == 91 ? '91 a 135' : '136 a 180'));
      saida.appendChild(s); lastArea = q.dataset.area;
    }
    const blocos = [...q.querySelector('.fonte-q').children];
    let s = novoSlide(q, 1), corpo = s.querySelector('.corpo');
    if (caber(corpo, blocos, MIN)) continue;
    // dividir: parte 1 = texto-base; parte 2 = comando (último parágrafo antes das alternativas) + alternativas
    const ia = blocos.findIndex(b => b.classList && b.classList.contains('alts'));
    let grupos;
    if (ia > 1) {
      const ehTexto = (b) => b.tagName === 'P' && !b.querySelector('img');
      const ic = ehTexto(blocos[ia - 1]) ? ia - 1 : ia; // comando vai junto com as alternativas
      grupos = [blocos.slice(0, ic), blocos.slice(ic)];
    } else grupos = [blocos];
    s.remove(); let parte = 0;
    for (const g of grupos) {
      parte++; s = novoSlide(q, parte); corpo = s.querySelector('.corpo');
      if (caber(corpo, g, MIN_SPLIT)) continue;
      // ainda não coube: fluxo bloco a bloco com fonte fixa
      montar(corpo, [], '1'); tentar(corpo, MIN_SPLIT, 560, 290);
      for (const b of g) {
        const c = b.cloneNode(true); corpo.appendChild(c);
        if (!cabe(corpo) && corpo.children.length > 1) {
          corpo.removeChild(c); parte++;
          s = novoSlide(q, parte); corpo = s.querySelector('.corpo'); tentar(corpo, MIN_SPLIT, 560, 290); corpo.appendChild(c);
        }
      }
    }
  }
  document.querySelectorAll('#saida .slide').forEach((s, i, a) => { const r = s.querySelector('.rod span:last-child'); if (r) r.textContent = (i + 2) + ' / ' + (a.length + 1); });
  document.getElementById('fonte').remove();
  // marca slides que ainda transbordam (para conferência)
  window.__transbordam = [...document.querySelectorAll('#saida .corpo')].filter(c => !cabe(c)).map(c => c.parentNode.querySelector('.num').textContent);
  document.title += window.__transbordam.length ? ' [transbordam: ' + window.__transbordam.join(', ') + ']' : '';
  document.body.dataset.pronto = '1';
}
window.addEventListener('load', () => document.fonts.ready.then(paginar));
</script></body></html>`;
fs.writeFileSync(path.join(BASE, P.html), page);
console.log(`${arquivos.length} questões -> ${P.md} e ${P.html}`);
