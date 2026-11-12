// Apresentação interativa "Física no ENEM: revisão rápida" (pptxgenjs -> PPTX; gerar_tudo.sh converte para ODP e PDF).
// node gerar_slides.js  ->  ../saida/Fisica-no-ENEM-apresentacao.pptx
// Interatividade: menu e barra de navegação clicáveis, botões "ver a resolução" e quiz com dica (slides ocultos).
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fa = require("react-icons/fa");

const FIG = (n) => path.join(__dirname, "..", "figuras", n + ".png");
const CAPA = (n) => path.join(__dirname, "..", "..", "capa", n + ".png");
const SAIDA = path.join(__dirname, "..", "saida", "Fisica-no-ENEM-apresentacao.pptx");
const DADOS = require(path.join(__dirname, "..", "..", "analise", "fisica_todas.json"));

// ---------------------------------------------------------------- cores (as mesmas do PDF)
const A = "2A78D6", B = "EB6834", C = "1BAF7A", TINTA = "16202A", CINZA = "4F5A64", CLARO = "EEF1F4", ALERTA = "C0392B", OURO = "B7791F", BR = "FFFFFF";
const SUAVE = { [A]: "E8F1FC", [B]: "FDEEE7", [C]: "E5F6EF", [OURO]: "FBF4E6", [ALERTA]: "FBEBE9", [TINTA]: CLARO, [CINZA]: CLARO };
const FONTE = "Calibri";
const W = 13.333, H = 7.5;

const SEC = {
  inicio: { nome: "Início", cor: TINTA, alvo: "menu" },
  mec: { nome: "Mecânica", cor: A, alvo: "mec" },
  ele: { nome: "Eletricidade", cor: B, alvo: "ele" },
  ond: { nome: "Ondas", cor: C, alvo: "ond" },
  treino: { nome: "Treino", cor: TINTA, alvo: "treino" },
  bolso: { nome: "Resumo", cor: OURO, alvo: "bolso" },
  analise: { nome: "Análise", cor: CINZA, alvo: "analise" },
};

function dimensoes(arq) { const b = fs.readFileSync(arq); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }

// texto com **negrito** e quebras de linha -> runs do pptxgenjs
function rt(str, base = {}) {
  const runs = [];
  const linhas = String(str).split("\n");
  linhas.forEach((ln, i) => {
    const partes = ln.split("**");
    partes.forEach((p, j) => {
      const ultimo = j === partes.length - 1;
      if (p === "" && !(ultimo && partes.length === 1)) { if (ultimo && i < linhas.length - 1 && runs.length) runs[runs.length - 1].options.breakLine = true; return; }
      const ped = p.split(/_({[^}]+}|[A-Za-z0-9]+)/);
      ped.forEach((t, k) => { if (t === "") return; runs.push({ text: k % 2 ? t.replace(/[{}]/g, "") : t, options: { ...base, bold: j % 2 === 1 || base.bold === true, ...(k % 2 ? { subscript: true } : {}), breakLine: false } }); });
      if (ultimo && i < linhas.length - 1) runs[runs.length - 1].options.breakLine = true;
    });
    if (ln === "" && i < linhas.length - 1) runs.push({ text: " ", options: { ...base, breakLine: true } });
  });
  return runs;
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: FONTE, bodyFontFace: FONTE };
  pres.author = "Espaço Cria"; pres.title = "Física no ENEM: revisão rápida"; pres.lang = "pt-BR";

  // ---- ícones e imagem transparente (área clicável)
  async function icone(nome, cor, px = 256) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Fa[nome], { color: "#" + cor, size: px }));
    const buf = await sharp(Buffer.from(svg)).resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return "image/png;base64," + buf.toString("base64");
  }
  const nomes = { carro: "FaCarSide", raio: "FaBolt", onda: "FaWaveSquare", lapis: "FaPencilAlt", bolso: "FaClipboardList", grafico: "FaChartBar", ideia: "FaLightbulb",
    enem: "FaGraduationCap", alerta: "FaExclamationTriangle", check: "FaCheckCircle", cerebro: "FaBrain", casa: "FaHome", olho: "FaEye", onibus: "FaBus",
    carrinho: "FaShoppingCart", troca: "FaExchangeAlt", fogo: "FaFire", lupa: "FaSearch", relogio: "FaClock", refazer: "FaRedoAlt", colher: "FaUtensilSpoon",
    sol: "FaSun", ciclo: "FaSyncAlt", mapa: "FaMapMarkedAlt", chuveiro: "FaShower", estrela: "FaStar", seta: "FaArrowRight", duvida: "FaQuestionCircle" };
  const IC = {};
  for (const [k, n] of Object.entries(nomes)) { IC[k] = await icone(n, BR); IC[k + "_t"] = await icone(n, TINTA); }
  IC.check_c = await icone("FaCheckCircle", C); IC.alerta_a = await icone("FaExclamationTriangle", ALERTA); IC.ideia_o = await icone("FaLightbulb", OURO);
  const TRANSP = "image/png;base64," + (await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()).toString("base64");

  // ---------------------------------------------------------------- registro dos slides (2 passadas: números antes, conteúdo depois)
  const LISTA = [];                       // {id, sec, titulo, build, oculto, notas}
  const N = {};
  const slide = (id, sec, titulo, build, extra = {}) => LISTA.push({ id, sec, titulo, build, ...extra });

  // ---------------------------------------------------------------- helpers de desenho
  const T = (s, str, x, y, w, h, o = {}) => s.addText(Array.isArray(str) ? str : rt(str, {}), { x, y, w, h, fontFace: FONTE, fontSize: 18, color: TINTA, margin: 0, valign: "top", isTextBox: true, paraSpaceAfter: 4, ...o });
  const clique = (s, x, y, w, h, alvo, dica) => s.addImage({ data: TRANSP, x, y, w, h, hyperlink: { slide: N[alvo], tooltip: dica || "Abrir" } });
  const circ = (s, chave, x, y, d, cor) => { s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: cor }, line: { color: cor, width: 0 } }); s.addImage({ data: IC[chave], x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5 }); };
  function fig(s, nome, x, y, w, h, o = {}) {
    const m = dimensoes(FIG(nome)); let iw = w, ih = w * m.h / m.w; if (ih > h) { ih = h; iw = h * m.w / m.h; }
    const px = x + (w - iw) / 2, py = o.topo ? y : y + (h - ih) / 2;
    s.addImage({ path: FIG(nome), x: px, y: py, w: iw, h: ih, ...(o.alvo ? { hyperlink: { slide: N[o.alvo], tooltip: o.dica || "Abrir" } } : {}) });
    return { x: px, y: py, w: iw, h: ih };
  }
  // caixa com etiqueta (o mesmo desenho das caixas do PDF)
  function caixa(s, { x, y, w, h, cor = A, titulo, ic, fundo }) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fundo || SUAVE[cor] || CLARO }, line: { color: cor, width: 1 }, rectRadius: 0.1 });
    if (titulo) {
      const lw = Math.min(w - 0.4, 0.42 + titulo.length * 0.112 + (ic ? 0.3 : 0));
      s.addShape(pres.ShapeType.roundRect, { x: x + 0.22, y: y - 0.2, w: lw, h: 0.4, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.08 });
      if (ic) s.addImage({ data: IC[ic], x: x + 0.34, y: y - 0.11, w: 0.22, h: 0.22 });
      T(s, titulo, x + 0.34 + (ic ? 0.32 : 0), y - 0.2, lw - 0.3, 0.4, { fontSize: 14, bold: true, color: BR, valign: "middle" });
    }
    return { x: x + 0.3, y: y + (titulo ? 0.35 : 0.22), w: w - 0.6, h: h - (titulo ? 0.5 : 0.44) };
  }
  function botao(s, texto, x, y, w, h, cor, alvo, o = {}) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: o.vazado ? BR : cor }, line: { color: cor, width: 1.5 }, rectRadius: 0.12, shadow: o.vazado ? undefined : { type: "outer", color: "000000", blur: 4, offset: 2, angle: 90, opacity: 0.18 } });
    T(s, texto, x + 0.15, y, w - 0.3, h, { fontSize: o.tam || 16, bold: true, color: o.vazado ? cor : BR, align: o.align || "center", valign: "middle" });
    clique(s, x, y, w, h, alvo, o.dica || texto);
  }
  // cabeçalho, rodapé e barra de navegação
  function moldura(s, sec, titulo, o = {}) {
    const cor = SEC[sec].cor;
    s.background = { color: BR };
    if (!o.semChip) {
      s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 0.33, w: 0.5 + (o.chip || SEC[sec].nome).length * 0.105, h: 0.32, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.08 });
      T(s, (o.chip || SEC[sec].nome).toUpperCase(), 0.5, 0.33, 0.5 + (o.chip || SEC[sec].nome).length * 0.105, 0.32, { fontSize: 10.5, bold: true, color: BR, align: "center", valign: "middle", charSpacing: 1 });
    }
    if (titulo) T(s, titulo, 0.5, 0.72, 12.33, 0.72, { fontSize: 29, bold: true, color: TINTA, valign: "middle" });
    navegacao(s, sec, false);
  }
  function navegacao(s, sec, escuro) {
    const itens = Object.entries(SEC); const bw = 1.22, x0 = W - 0.5 - 0.55 - itens.length * bw, y = H - 0.5;
    T(s, "Física no ENEM · revisão rápida", 0.5, y, 3.2, 0.32, { fontSize: 10, color: escuro ? "B9C2CB" : CINZA, valign: "middle" });
    itens.forEach(([k, v], i) => {
      const at = k === sec, x = x0 + i * bw;
      if (at) s.addShape(pres.ShapeType.roundRect, { x: x + 0.04, y, w: bw - 0.08, h: 0.32, fill: { color: escuro ? BR : v.cor }, line: { color: escuro ? BR : v.cor, width: 0 }, rectRadius: 0.08 });
      T(s, v.nome, x, y, bw, 0.32, { fontSize: 10.5, bold: at, color: at ? (escuro ? TINTA : BR) : (escuro ? "D5DBE1" : CINZA), align: "center", valign: "middle" });
      clique(s, x, y, bw, 0.32, v.alvo, "Ir para " + v.nome);
    });
    s.slideNumber = { x: W - 1.0, y, w: 0.5, h: 0.32, fontFace: FONTE, fontSize: 10, color: escuro ? "B9C2CB" : CINZA, align: "right" };
  }
  function listar(s, itens, x, y, w, h, o = {}) {
    const tam = o.fontSize || 17, porLinha = (w - 0.3) / (tam * 0.0068);
    const nl = itens.map((t) => Math.max(1, Math.ceil(t.split("**").join("").length / porLinha)));
    const alt = tam * 1.22 / 72, gap = o.gap === undefined ? 0.14 : o.gap, total = nl.reduce((p, n) => p + n * alt, 0) + gap * (itens.length - 1);
    const k = Math.min(1.25, h / total); let yy = y;
    itens.forEach((t, i) => { const hi = nl[i] * alt * k;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.04, y: yy + alt * 0.5 - 0.045, w: 0.09, h: 0.09, fill: { color: o.cor || TINTA }, line: { color: o.cor || TINTA, width: 0 } });
      T(s, t, x + 0.3, yy, w - 0.3, hi, { fontSize: tam, paraSpaceAfter: 0 }); yy += hi + gap * k; });
  }

  // ---------------------------------------------------------------- modelos de slide
  // abertura de assunto: fundo colorido, partes clicáveis
  function abertura(id, sec, num, titulo, frase, ic, partes) {
    slide(id, sec, titulo, (s) => {
      const cor = SEC[sec].cor; s.background = { color: cor };
      T(s, num, 0.9, 1.35, 8, 0.4, { fontSize: 15, bold: true, color: BR, charSpacing: 2 });
      T(s, titulo, 0.9, 1.8, 9.2, 1.5, { fontSize: 48, bold: true, color: BR, valign: "middle" });
      T(s, frase, 0.9, 3.35, 8.6, 1.1, { fontSize: 20, color: BR });
      s.addShape(pres.ShapeType.ellipse, { x: 10.2, y: 1.3, w: 2.3, h: 2.3, fill: { color: BR, transparency: 82 }, line: { color: BR, width: 0, transparency: 100 } });
      s.addImage({ data: IC[ic], x: 10.78, y: 1.88, w: 1.15, h: 1.15 });
      T(s, "Escolha uma parte ou avance:", 0.9, 4.7, 6, 0.35, { fontSize: 13, color: BR });
      const bw = (W - 1.8 - (partes.length - 1) * 0.22) / partes.length;
      partes.forEach(([rot, alvo], i) => {
        const x = 0.9 + i * (bw + 0.22);
        s.addShape(pres.ShapeType.roundRect, { x, y: 5.1, w: bw, h: 0.95, fill: { color: BR }, line: { color: BR, width: 0 }, rectRadius: 0.12 });
        T(s, rot, x + 0.15, 5.1, bw - 0.3, 0.95, { fontSize: 15.5, bold: true, color: cor, align: "center", valign: "middle" });
        clique(s, x, 5.1, bw, 0.95, alvo, rot);
      });
      navegacao(s, sec, true);
    });
  }
  // questão real do ENEM: slide do desafio + slide da resolução
  function enem(id, sec, ref, q) {
    const cor = SEC[sec].cor;
    slide(id, sec, "Caiu no ENEM · " + ref, (s) => {
      moldura(s, sec, "Caiu no ENEM · " + ref, { chip: SEC[sec].nome + " · questão real" });
      const a = caixa(s, { x: 0.5, y: 1.85, w: 12.33, h: 3.35, cor: TINTA, titulo: "A situação" + (q.nivel ? " · " + q.nivel : ""), ic: "enem", fundo: CLARO });
      T(s, q.situacao, a.x, a.y + 0.05, a.w, a.h, { fontSize: q.tam || 21 });
      s.addImage({ data: IC.ideia_o, x: 0.55, y: 5.62, w: 0.4, h: 0.4 });
      T(s, "**Pense antes de avançar.** " + q.dica, 1.1, 5.5, 7.6, 0.9, { fontSize: 16, color: CINZA, valign: "middle" });
      botao(s, "Ver a resolução  ▶", 9.4, 5.55, 3.43, 0.75, cor, id + "r");
    }, { notas: "Leia a situação com a turma e peça um palpite antes de clicar em 'Ver a resolução'. " + (q.notas || "") });
    slide(id + "r", sec, "Resolução · ENEM " + ref, (s) => {
      moldura(s, sec, "Resolução · ENEM " + ref, { chip: SEC[sec].nome + " · questão real" });
      const larga = q.figLarga; const lw = q.fig && !larga ? 7.5 : 12.33;
      const linhas = q.passos.map((p) => p);
      T(s, linhas.flatMap((p, i) => { const r = rt(p, {}); r[r.length - 1].options.breakLine = i < linhas.length - 1; return r; }), 0.5, 1.65, lw, larga ? 1.9 : 3.3, { fontSize: q.tamPassos || 18, paraSpaceAfter: larga ? 4 : 9 });
      s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 5.05, w: lw, h: 0.62, fill: { color: SUAVE[C] }, line: { color: C, width: 1 }, rectRadius: 0.1 });
      s.addImage({ data: IC.check_c, x: 0.65, y: 5.2, w: 0.32, h: 0.32 });
      T(s, "**Resposta:** " + q.resposta, 1.1, 5.05, lw - 0.7, 0.62, { fontSize: 18, color: "0E6B4A", valign: "middle" });
      if (q.erro) { s.addImage({ data: IC.alerta_a, x: 0.65, y: 5.88, w: 0.3, h: 0.3 }); T(s, "**Onde o aluno erra:** " + q.erro, 1.1, 5.78, lw > 8 ? 8.1 : lw - 0.7, 0.9, { fontSize: 14.5, color: ALERTA, valign: "middle" }); }
      if (larga) fig(s, q.fig, 0.5, 3.55, 12.33, 1.4);
      else if (q.fig) { s.addShape(pres.ShapeType.roundRect, { x: 8.3, y: 1.65, w: 4.53, h: 4.0, fill: { color: BR }, line: { color: "D5DBE1", width: 1 }, rectRadius: 0.08 }); fig(s, q.fig, 8.45, 1.8, 4.23, 3.7); }
      botao(s, "◀  Voltar à situação", q.fig && !larga ? 8.3 : 9.4, 5.9, q.fig && !larga ? 4.53 : 3.43, 0.55, cor, id, { vazado: true, tam: 13 });
    });
  }
  // pegadinhas
  function pegadinhas(id, sec, titulo, itens) {
    slide(id, sec, titulo, (s) => {
      moldura(s, sec, titulo);
      const a = caixa(s, { x: 0.5, y: 1.85, w: 12.33, h: 4.85, cor: ALERTA, titulo: "Cuidado na hora da prova", ic: "alerta" });
      listar(s, itens, a.x, a.y + 0.1, a.w, a.h - 0.15, { fontSize: itens.length > 5 ? 16 : 18.5, cor: ALERTA });
    });
  }
  // quiz: questão clicável + dica (oculta) + resposta comentada
  function quiz(n, sec, tema, inspirada, q) {
    const cor = SEC[sec].cor, id = "q" + n;
    slide(id, "treino", "Questão " + n, (s) => {
      moldura(s, "treino", "Questão " + n + " · " + tema, { chip: "Treino · clique na alternativa" });
      const a = caixa(s, { x: 0.5, y: 1.8, w: 6.3, h: 2.75, cor, titulo: inspirada, fundo: BR });
      T(s, q.enunciado, a.x, a.y + 0.02, a.w, a.h, { fontSize: 16.5 });
      fig(s, q.fig, 0.5, 4.72, 6.3, 2.0);
      q.alternativas.forEach((alt, i) => {
        const y = 1.6 + i * 1.0, x = 7.2, w = 5.63, h = 0.84;
        s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: BR }, line: { color: cor, width: 1.5 }, rectRadius: 0.12 });
        s.addShape(pres.ShapeType.ellipse, { x: x + 0.17, y: y + 0.17, w: 0.5, h: 0.5, fill: { color: cor }, line: { color: cor, width: 0 } });
        T(s, "ABCDE"[i], x + 0.17, y + 0.17, 0.5, 0.5, { fontSize: 17, bold: true, color: BR, align: "center", valign: "middle" });
        T(s, alt, x + 0.85, y, w - 1.0, h, { fontSize: alt.length > 45 ? 14.5 : 17, valign: "middle" });
        clique(s, x, y, w, h, i === q.correta ? id + "r" : id + "d", "Marcar " + "ABCDE"[i]);
      });
    }, { notas: "Clique na alternativa escolhida pela turma. A errada abre uma dica (slide oculto); a certa abre a resposta comentada." });
    slide(id + "r", "treino", "Questão " + n + " · resposta", (s) => {
      moldura(s, "treino", "Questão " + n + " · resposta " + "ABCDE"[q.correta], { chip: "Treino · gabarito comentado" });
      s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.65, w: 12.33, h: 0.7, fill: { color: SUAVE[C] }, line: { color: C, width: 1 }, rectRadius: 0.1 });
      s.addImage({ data: IC.check_c, x: 0.68, y: 1.82, w: 0.36, h: 0.36 });
      T(s, "**Isso mesmo!** Alternativa " + "ABCDE"[q.correta] + ": " + q.resposta + ".", 1.2, 1.65, 11.4, 0.7, { fontSize: 19, color: "0E6B4A", valign: "middle" });
      T(s, q.comentario.flatMap((p, i) => { const r = rt(p, {}); r[r.length - 1].options.breakLine = i < q.comentario.length - 1; return r; }), 0.5, 2.6, 12.33, 2.4, { fontSize: 18, paraSpaceAfter: 9 });
      const a = caixa(s, { x: 0.5, y: 5.2, w: 12.33, h: 1.3, cor: ALERTA, titulo: "Se você marcou outra", ic: "alerta" });
      T(s, q.distratores, a.x, a.y - 0.02, a.w, a.h, { fontSize: 14.5, valign: "middle" });
      if (n < 6) botao(s, "Próxima questão  ▶", 9.9, 0.75, 2.93, 0.6, cor, "q" + (n + 1), { tam: 14 });
      else botao(s, "Resumo de bolso  ▶", 9.9, 0.75, 2.93, 0.6, OURO, "bolso", { tam: 14 });
    });
    slide(id + "d", "treino", "Questão " + n + " · dica", (s) => {
      moldura(s, "treino", "Ainda não. Vale uma dica?", { chip: "Treino · questão " + n });
      const a = caixa(s, { x: 1.6, y: 2.2, w: 10.13, h: 2.5, cor: OURO, titulo: "Dica", ic: "ideia" });
      T(s, q.dica, a.x, a.y + 0.05, a.w, a.h, { fontSize: 22, valign: "middle" });
      botao(s, "↺  Tentar de novo", 2.6, 5.2, 3.8, 0.85, cor, id);
      botao(s, "Ver a resposta comentada", 6.93, 5.2, 3.8, 0.85, cor, id + "r", { vazado: true });
    }, { oculto: true });
  }
  // cartão de fórmula simples (texto)
  function cartao(s, { x, y, w, h, cor, titulo, formula, texto, tamF = 30 }) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: BR }, line: { color: cor, width: 1.25 }, rectRadius: 0.1 });
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.5, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.1 });
    T(s, titulo, x + 0.2, y, w - 0.4, 0.5, { fontSize: 15, bold: true, color: BR, valign: "middle" });
    if (formula) T(s, formula, x + 0.15, y + 0.62, w - 0.3, 0.85, { fontSize: tamF, italic: true, align: "center", valign: "middle", fontFace: "Cambria" });
    if (texto) T(s, texto, x + 0.25, y + (formula ? 1.55 : 0.7), w - 0.5, h - (formula ? 1.7 : 0.85), { fontSize: 14.5, color: TINTA });
  }

  // ================================================================ CAPA
  // identidade visual do cartaz "Aulão de Véspera": fundo e logos em ../../capa (capa/gerar_capa.py)
  slide("capa", "inicio", "Física no ENEM", (s) => {
    const AZ = "0B6FC6", CI = "0A9CCB", AM = "DBEE26", CART = "DCE8F3", AZE = "0A4A8F";
    s.background = { path: CAPA("fundo-slide") };
    const logo = (nome, x, y, w, h) => { const m = dimensoes(CAPA(nome)); let iw = w, ih = w * m.h / m.w; if (ih > h) { ih = h; iw = h * m.w / m.h; } s.addImage({ path: CAPA(nome), x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih }); };
    // esquerda: título, cartão do material com a logo do ENEM, chamada e assuntos clicáveis
    T(s, "AULÃO", 1.2, 0.72, 6.3, 1.45, { fontSize: 96, bold: true, color: BR, valign: "middle", fontFace: "Arial" });
    T(s, "de Véspera", 1.25, 2.12, 6.3, 0.5, { fontSize: 27, bold: true, color: BR, valign: "middle" });
    s.addShape(pres.ShapeType.roundRect, { x: 1.2, y: 2.82, w: 6.3, h: 1.4, fill: { color: CART }, line: { color: CART, width: 0 }, rectRadius: 0.25 });
    T(s, "FÍSICA NO ENEM", 1.5, 2.95, 3.7, 0.62, { fontSize: 27, bold: true, color: AZ, valign: "middle" });
    T(s, "REVISÃO RÁPIDA · CIÊNCIAS DA NATUREZA", 1.5, 3.55, 3.7, 0.5, { fontSize: 11.5, bold: true, color: CI, valign: "middle" });
    logo("logo-enem", 5.15, 2.92, 2.2, 1.2);
    T(s, "Os 3 assuntos que mais caem, explicados com exemplos do dia a dia", 1.2, 4.3, 6.3, 0.4, { fontSize: 13.5, color: BR, valign: "middle" });
    [["Mecânica", "mec", "carro"], ["Eletricidade", "ele", "raio"], ["Ondas", "ond", "onda"]].forEach(([n, alvo, ic], i) => {
      const x = 1.2 + i * 2.15, w = 2.0;
      s.addShape(pres.ShapeType.roundRect, { x, y: 4.78, w, h: 0.46, fill: { color: AM }, line: { color: AM, width: 0 }, rectRadius: 0.23 });
      s.addImage({ data: IC[ic + "_t"], x: x + 0.22, y: 4.9, w: 0.22, h: 0.22 });
      T(s, n, x + 0.5, 4.78, w - 0.6, 0.46, { fontSize: 13.5, bold: true, color: AZE, valign: "middle" });
      clique(s, x, 4.78, w, 0.46, alvo, "Ir para " + n);
    });
    // direita: data e professor
    s.addShape(pres.ShapeType.roundRect, { x: 8.1, y: 1.05, w: 4.0, h: 1.7, fill: { color: CART }, line: { color: CART, width: 0 }, rectRadius: 0.25 });
    T(s, "Dia 12 de Novembro", 8.1, 1.15, 4.0, 0.38, { fontSize: 14.5, color: CI, align: "center", valign: "middle" });
    T(s, "Quinta-feira", 8.1, 1.5, 4.0, 0.7, { fontSize: 31, bold: true, color: CI, align: "center", valign: "middle" });
    T(s, "7h30 · Auditório", 8.1, 2.2, 4.0, 0.4, { fontSize: 14.5, color: CI, align: "center", valign: "middle" });
    T(s, "PROFESSOR", 8.1, 3.1, 4.0, 0.35, { fontSize: 13, bold: true, color: AM, align: "center", valign: "middle", charSpacing: 5 });
    T(s, "Erly Aquino", 7.7, 3.42, 4.8, 0.95, { fontSize: 44, bold: true, color: BR, align: "center", valign: "middle" });
    T(s, "ENEM 2021–2025 · 79 questões analisadas", 8.1, 4.42, 4.0, 0.35, { fontSize: 12, color: BR, align: "center", valign: "middle" });
    T(s, "Espaço Cria", 8.1, 4.78, 4.0, 0.4, { fontSize: 13, bold: true, color: BR, align: "center", valign: "middle" });
    // logos em destaque
    s.addShape(pres.ShapeType.line, { x: 1.2, y: 5.42, w: 10.9, h: 0, line: { color: BR, width: 0.75, transparency: 45 } });
    logo("logo-gre", 1.5, 5.52, 3.0, 1.25); logo("logo-pe", 5.15, 5.52, 3.0, 1.25); logo("logo-ete", 8.8, 5.52, 3.0, 1.25);
    T(s, "Clique em um assunto ou avance para começar", 1.2, 7.08, 6, 0.3, { fontSize: 11, color: BR });
  }, { notas: "Capa na identidade visual do Aulão de Véspera (GRE Metro Sul, Governo de Pernambuco, ETE Epitácio Pessoa). Apresentação interativa: os cartões, os botões e a barra de baixo são clicáveis no modo de apresentação (F5)." });

  // ================================================================ MENU
  slide("menu", "inicio", "Por onde você quer começar?", (s) => {
    moldura(s, "inicio", "Por onde você quer começar?");
    T(s, "Pouco tempo e pouca base? Este material mostra só o que mais aparece na prova e como reconhecer cada tipo de questão. Clique em um cartão.", 0.5, 1.5, 12.33, 0.75, { fontSize: 16.5, color: CINZA });
    const cards = [["raiox", "lupa", TINTA, "Raio-X da prova", "De onde vêm as 79 questões"], ["kit", "estrela", OURO, "Kit mínimo", "As 6 equações que mais resolvem"], ["mec", "carro", A, "Mecânica", "Movimento, forças e energia"], ["ele", "raio", B, "Eletricidade", "Circuitos, potência e conta de luz"],
      ["ond", "onda", C, "Ondas", "Som, luz e fenômenos"], ["treino", "lapis", TINTA, "Treino", "6 questões com dica e gabarito"], ["bolso", "bolso", OURO, "Resumo de bolso", "Para a véspera da prova"], ["analise", "grafico", CINZA, "Análise completa", "Assuntos, anos e equações"]];
    cards.forEach(([alvo, ic, cor, t, d], i) => {
      const x = 0.5 + (i % 4) * 3.11, y = 2.45 + Math.floor(i / 4) * 2.2, w = 2.95, h = 2.0;
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: SUAVE[cor] || CLARO }, line: { color: cor, width: 1.25 }, rectRadius: 0.1, shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 90, opacity: 0.12 } });
      circ(s, ic, x + 0.25, y + 0.25, 0.7, cor);
      T(s, t, x + 0.25, y + 1.05, w - 0.5, 0.4, { fontSize: 18, bold: true, color: cor === OURO ? "8A5A12" : cor, valign: "middle" });
      T(s, d, x + 0.25, y + 1.45, w - 0.5, 0.45, { fontSize: 13, color: CINZA });
      clique(s, x, y, w, h, alvo, t);
    });
  }, { notas: "Como usar: 1) olhe a figura; 2) veja como caiu no ENEM; 3) treine. Cada ideia tem um desenho e uma comparação com algo do dia a dia." });

  // ================================================================ RAIO-X
  slide("raiox", "inicio", "O raio-X da Física no ENEM", (s) => {
    moldura(s, "inicio", "O raio-X da Física no ENEM", { chip: "Raio-X" });
    T(s, "Lemos as cinco últimas provas de Ciências da Natureza (2021 a 2025): **79 questões são de Física.**", 0.5, 1.5, 12.33, 0.45, { fontSize: 17, color: CINZA });
    [["79", "questões de Física em 5 provas (cerca de 16 por ano)", TINTA], ["73%", "vêm de só 3 áreas: mecânica, eletricidade e ondas", A], ["48%", "são conceituais: dá para acertar sem fazer conta", C], ["9 em 10", "são de nível fácil ou médio", B]].forEach(([n, r, cor], i) => {
      const x = 0.5 + i * 3.11;
      s.addShape(pres.ShapeType.roundRect, { x, y: 2.1, w: 2.95, h: 1.75, fill: { color: SUAVE[cor] || CLARO }, line: { color: SUAVE[cor] || CLARO, width: 0 }, rectRadius: 0.1 });
      T(s, n, x, 2.15, 2.95, 0.9, { fontSize: 46, bold: true, color: cor, align: "center", valign: "middle" });
      T(s, r, x + 0.2, 3.05, 2.55, 0.75, { fontSize: 13, align: "center", color: TINTA });
    });
    const areas = [["Mecânica", 23, A, "mec"], ["Eletricidade e magnetismo", 20, B, "ele"], ["Ondas", 15, C, "ond"], ["Calor (termologia)", 15, "AEB6BF", "bolso"], ["Óptica", 3, "AEB6BF"], ["Física moderna", 3, "AEB6BF"]];
    areas.forEach(([n, v, cor, alvo], i) => {
      const y = 4.12 + i * 0.44;
      T(s, n, 0.5, y, 3.1, 0.36, { fontSize: 14, align: "right", valign: "middle", bold: i < 3 });
      s.addShape(pres.ShapeType.rect, { x: 3.75, y: y + 0.03, w: v * 0.2, h: 0.3, fill: { color: cor }, line: { color: cor, width: 0 } });
      T(s, v + " (" + Math.round(v / 79 * 100) + "%)", 3.75 + v * 0.2 + 0.12, y, 1.5, 0.36, { fontSize: 13.5, bold: true, valign: "middle" });
      if (alvo) clique(s, 0.5, y, 3.25 + v * 0.2, 0.36, alvo, "Abrir " + n);
    });
    T(s, "Em cor, as três áreas desta revisão (clique na barra para abrir). Ondas e calor empatam em 15 questões, por isso há um bônus de calor no resumo de bolso.", 9.2, 5.0, 3.63, 1.6, { fontSize: 13, color: CINZA });
    botao(s, "Ver a análise completa", 9.2, 4.2, 3.63, 0.6, CINZA, "analise", { tam: 14 });
  });
  slide("muda", "inicio", "O que isso muda no seu estudo", (s) => {
    moldura(s, "inicio", "O que isso muda no seu estudo", { chip: "Raio-X" });
    [["raio", B, "Comece por circuitos elétricos", "É o assunto campeão. Cai todo ano, de 1 a 3 questões.", "ele"], ["carro", A, "Movimento e forças: 14 questões", "É a base da mecânica.", "mec"],
      ["onda", C, "Ondas e som: pontos fáceis", "Quase sempre é questão de conceito ou de leitura de gráfico.", "ond"], ["mapa", OURO, "Leia a história com calma", "O ENEM gosta do dia a dia: chuveiro, pedágio, ambulância, extensão elétrica. Os dados estão na história.", "treino"]].forEach(([ic, cor, t, d, alvo], i) => {
      const x = 0.5 + (i % 2) * 6.26, y = 1.7 + Math.floor(i / 2) * 2.5, w = 6.07, h = 2.25;
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: SUAVE[cor] }, line: { color: cor, width: 1 }, rectRadius: 0.1 });
      circ(s, ic, x + 0.3, y + 0.35, 0.85, cor);
      T(s, t, x + 1.4, y + 0.3, w - 1.65, 0.55, { fontSize: 20, bold: true, valign: "middle" });
      T(s, d, x + 1.4, y + 0.9, w - 1.65, 1.2, { fontSize: 16.5, color: CINZA });
      clique(s, x, y, w, h, alvo, t);
    });
  });
  slide("kit", "inicio", "O kit mínimo: 6 equações", (s) => {
    moldura(s, "inicio", "O kit mínimo: 6 equações", { chip: "Kit mínimo" });
    T(s, "Estas seis aparecem na resolução de **33 das 58 questões** das três áreas campeãs. Se for decorar só seis, decore estas. Clique em uma para ver a explicação.", 0.5, 1.5, 12.33, 0.75, { fontSize: 16.5, color: CINZA });
    [["f005", "mov"], ["f006", "newton"], ["f007", "forcas"], ["f008", "ohm"], ["f009", "potencia"], ["f010", "vlf"]].forEach(([f, alvo], i) => {
      fig(s, f, 0.75 + (i % 3) * 4.05, 2.4 + Math.floor(i / 3) * 2.2, 3.75, 2.05, { alvo, dica: "Ver a explicação" });
    });
  });
  slide("simbolos", "inicio", "Como ler os símbolos", (s) => {
    moldura(s, "inicio", "Como ler os símbolos", { chip: "Kit mínimo" });
    const linhas = [["Δ (delta)", "variação: o valor final menos o inicial. Δs é a distância percorrida; Δt é o tempo gasto."], ["v₀", "a velocidade no começo."], ["F_R e F_at", "força resultante (o saldo de todas as forças) e força de atrito."],
      ["μ (\"mi\")", "coeficiente de atrito: um número que diz quanto o piso segura. Piso liso, μ pequeno."], ["λ (\"lambda\")", "comprimento de onda: a distância entre duas cristas."], ["ρ (\"rô\")", "resistividade: depende do material do fio."],
      ["k e m", "k (quilo) é vezes 1 000; m (mili) é dividido por 1 000. Exemplos: 5,5 kW = 5 500 W; 20 mA = 0,020 A."]];
    s.addTable(linhas.map(([a, b], i) => [{ text: rt(a, { bold: true, color: TINTA }), options: { fill: { color: i % 2 ? BR : CLARO } } }, { text: b, options: { color: TINTA, fill: { color: i % 2 ? BR : CLARO } } }]),
      { x: 0.5, y: 1.7, w: 12.33, colW: [2.4, 9.93], fontFace: FONTE, fontSize: 17, rowH: 0.66, valign: "middle", border: { type: "none" }, margin: [0.04, 0.1, 0.04, 0.14] });
  });

  // ================================================================ MECÂNICA
  abertura("mec", "mec", "ASSUNTO 1 DE 3", "Mecânica: movimento e forças", "A área que mais cai: 23 questões em 5 anos. Movimento e forças respondem por 14 delas.", "carro",
    [["Parte 1 · Movimento", "mov"], ["Parte 2 · Forças", "newton"], ["Parte 3 · Energia", "energia"], ["Pegadinhas", "mecpeg"]]);
  slide("mov", "mec", "Velocidade média", (s) => {
    moldura(s, "mec", "Parte 1 · Movimento: velocidade média");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 12.33, h: 1.55, cor: OURO, titulo: "Pense no aplicativo de mapas", ic: "ideia" });
    T(s, "O aplicativo diz: \"120 km, chegada em 2 horas\". Ele acabou de calcular a sua **velocidade média: 60 km/h**. Quase toda questão de movimento com conta é uma variação disto: **distância, tempo e velocidade**. Tendo duas, você acha a terceira.", a.x, a.y, a.w, a.h, { fontSize: 16.5, valign: "middle" });
    cartao(s, { x: 0.5, y: 3.7, w: 3.9, h: 2.95, cor: A, titulo: "Velocidade média", formula: "v = Δs ÷ Δt", texto: "distância percorrida dividida pelo tempo gasto" });
    fig(s, "f021", 4.65, 3.75, 2.4, 1.7);
    T(s, "**Tampe o que você quer achar.**\nTampou v: sobra Δs ÷ Δt.\nTampou Δs: sobra v × Δt.", 4.65, 5.5, 3.3, 1.2, { fontSize: 14 });
    const u = caixa(s, { x: 8.2, y: 3.9, w: 4.63, h: 2.75, cor: A, titulo: "Unidades" });
    T(s, "km/h para m/s: **divida por 3,6**\n(72 km/h = 20 m/s)\nHoras para minutos: **vezes 60**\n(4,8 h = 288 min)\nMinutos para horas: **divida por 60**\n(15 min = 0,25 h)", u.x, u.y, u.w, u.h, { fontSize: 14.5 });
  });
  enem("e23q124", "mec", "2023, questão 124", { situacao: "Trecho de **480 km** com **10 pedágios**. O carro anda a **100 km/h** e perde **3 min** em cada cabine. O caminhão anda a **80 km/h** e passa direto (cobrança automática).\n\nQuantos minutos o carro gasta a menos?",
    dica: "Qual equação liga distância, velocidade e tempo?", passos: ["**1. Caminhão:** Δt = 480 ÷ 80 = 6 h = 360 min.", "**2. Carro andando:** Δt = 480 ÷ 100 = 4,8 h = 288 min.", "**3. Carro parado:** 10 × 3 = 30 min. Total do carro: 288 + 30 = 318 min.", "**4. Diferença:** 360 − 318 = 42 min."],
    resposta: "42 minutos", erro: "esquecer os 30 min de parada, ou achar que 4,8 h é \"4 h e 80 min\". Uma hora tem 60 min, então 0,8 × 60 = 48 min.", fig: "f024", figLarga: true, tamPassos: 17 });
  slide("queda", "mec", "Aceleração e queda", (s) => {
    moldura(s, "mec", "Quando a velocidade muda: aceleração e queda");
    T(s, "**Aceleração** é quanto a velocidade muda a cada segundo. Na queda, quem acelera é a gravidade: **g ≈ 10 m/s²**. Um objeto em queda ganha 10 m/s de velocidade a cada segundo.", 0.5, 1.6, 8.3, 1.1, { fontSize: 17 });
    const cab = (t) => ({ text: t, options: { bold: true, color: BR, fill: { color: A } } });
    s.addTable([[cab("O problema..."), cab("use")], ["dá o tempo e pede a velocidade", { text: "v = v₀ + a·t", options: { italic: true, fontFace: "Cambria" } }], ["dá o tempo e pede a distância", { text: "Δs = v₀·t + a·t² ÷ 2", options: { italic: true, fontFace: "Cambria" } }], ["não fala em tempo", { text: "v² = v₀² + 2·a·Δs", options: { italic: true, fontFace: "Cambria" } }]],
      { x: 0.5, y: 2.85, w: 8.3, colW: [4.5, 3.8], fontFace: FONTE, fontSize: 16.5, color: TINTA, rowH: 0.5, valign: "middle", border: { type: "solid", color: "D5DBE1", pt: 0.75 }, margin: [0.04, 0.1, 0.04, 0.12] });
    const a = caixa(s, { x: 0.5, y: 5.2, w: 8.3, h: 1.5, cor: A, titulo: "Na queda, troque a por 10" });
    T(s, "Soltou do repouso? Use direto **v = 10·t** e **h = 5·t²**.\nExemplo: pedra solta cai 2 s. Velocidade: 10 × 2 = 20 m/s. Altura: 5 × 2² = 20 m.", a.x, a.y - 0.03, a.w, a.h, { fontSize: 15.5, valign: "middle" });
    fig(s, "f026", 9.2, 1.6, 3.63, 3.6);
    T(s, "Bola jogada para cima: a velocidade diminui até zerar no topo. A aceleração é sempre 10 m/s² para baixo.", 9.2, 5.3, 3.63, 1.3, { fontSize: 13.5, color: CINZA });
  });
  slide("macetemov", "mec", "Para decorar", (s) => {
    moldura(s, "mec", "Para decorar as equações do movimento");
    [["Deus Vê Tudo", "d = v · t", "distância = velocidade × tempo"], ["Vovô ateu", "v = v₀ + a·t", "velocidade = velocidade inicial + aceleração × tempo"], ["Sorvetão", "s = s₀ + v₀·t + a·t² ÷ 2", "aqui s − s₀ é o Δs, a distância percorrida"]].forEach(([n, f, d], i) => {
      const x = 0.5 + i * 4.18;
      cartao(s, { x, y: 1.9, w: 3.97, h: 3.0, cor: OURO, titulo: "Macete: " + n, formula: f, texto: d, tamF: i === 2 ? 22 : 30 });
    });
    const a = caixa(s, { x: 0.5, y: 5.35, w: 12.33, h: 1.3, cor: A, titulo: "Qual usar?" });
    T(s, "Velocidade constante: Deus Vê Tudo. Velocidade mudando e o problema dá o tempo: Vovô ateu ou Sorvetão. Não fala em tempo: v² = v₀² + 2·a·Δs.", a.x, a.y - 0.02, a.w, a.h, { fontSize: 16, valign: "middle" });
  });
  enem("e23q100", "mec", "2023, questão 100", { situacao: "O professor joga uma esfera para cima.\n\nNo ponto mais alto, como estão a **velocidade** e a **aceleração**?", dica: "A gravidade \"desliga\" em algum momento?", tam: 24,
    passos: ["**Raciocínio:** no topo a esfera para por um instante para inverter o movimento, então **v = 0**.", "Mas a gravidade não \"desliga\". A aceleração continua valendo **g, para baixo**."], resposta: "velocidade nula e aceleração diferente de zero, para baixo", tamPassos: 21, fig: "f026" });
  slide("lanc", "mec", "Lançamentos", (s) => {
    moldura(s, "mec", "Lançamentos: dois movimentos ao mesmo tempo");
    fig(s, "f029", 0.5, 1.7, 6.6, 3.7);
    const a = caixa(s, { x: 7.4, y: 1.9, w: 5.43, h: 1.95, cor: OURO, titulo: "A bola que rola da mesa", ic: "ideia" });
    T(s, "Uma bola rola da mesa e outra é solta da mesma altura, no mesmo instante. **As duas chegam juntas ao chão.** Andar para o lado não atrasa nem adianta a queda.", a.x, a.y, a.w, a.h, { fontSize: 15.5, valign: "middle" });
    listar(s, ["**Para o lado (horizontal):** velocidade constante. Use x = v · t.", "**Para baixo (vertical):** queda livre. Use h = 5·t².", "O que liga as duas contas é o **tempo**."], 7.4, 4.15, 5.43, 2.4, { fontSize: 17, cor: A });
    T(s, "A bola avança o mesmo tanto a cada instante, enquanto cai cada vez mais rápido.", 0.5, 5.6, 6.6, 0.8, { fontSize: 14, color: CINZA, align: "center" });
  });
  enem("e22q100", "mec", "2022, questão 100", { nivel: "nível difícil: se o tempo estiver curto, pule e volte depois", situacao: "Mangueira na horizontal, a **1 m do chão**. A água cai a **3 m de distância**.\n\nCom a mesma velocidade de saída, até que altura o jato sobe se a mangueira for apontada verticalmente para cima? (g = 10 m/s²)",
    dica: "Separe em dois movimentos: a queda dá o tempo; a horizontal dá a velocidade.", passos: ["**1. Queda (vertical):** h = 5·t². A altura é 1 m, então 1 = 5·t² e t² = 1 ÷ 5 = 0,2. Não precisa tirar a raiz.",
      "**2. Saída (horizontal):** v₀ = x ÷ t. Elevando os dois lados ao quadrado: v₀² = x² ÷ t² = 9 ÷ 0,2 = 45. (Dividir por 0,2 é o mesmo que multiplicar por 5.)", "**3. Subida (mangueira para cima):** a gravidade freia a água, então a = −10. No topo a velocidade é zero: 0 = v₀² − 2 · 10 · H. Daí 20·H = 45 e H = 45 ÷ 20 = 2,25 m."],
    resposta: "2,25 m", tamPassos: 17.5 });
  slide("relativa", "mec", "Velocidade relativa", (s) => {
    moldura(s, "mec", "Velocidade relativa: a escada rolante");
    fig(s, "f033", 0.5, 1.7, 6.2, 4.9);
    const a = caixa(s, { x: 7.0, y: 1.9, w: 5.83, h: 2.6, cor: OURO, titulo: "A escada rolante", ic: "ideia" });
    T(s, "Subir andando numa escada rolante que sobe: as velocidades **somam**. Tentar descer por ela: **subtraem**. Vale para o barco no rio e para o avião com vento.", a.x, a.y, a.w, a.h, { fontSize: 17, valign: "middle" });
    const b = caixa(s, { x: 7.0, y: 4.9, w: 5.83, h: 1.7, cor: TINTA, titulo: "Caiu no ENEM", ic: "enem", fundo: CLARO });
    T(s, "2024, questão 119: nadador na correnteza.\n2025, questão 126: avião com vento.", b.x, b.y, b.w, b.h, { fontSize: 16, valign: "middle" });
  });
  slide("newton", "mec", "Leis de Newton", (s) => {
    moldura(s, "mec", "Parte 2 · Forças: as leis de Newton");
    [["onibus", "1ª lei · Inércia", "O ônibus freia e você \"vai para a frente\". Ninguém empurrou. Seu corpo só **continuou como estava**.", "Sem força resultante, o corpo fica parado ou segue em linha reta com velocidade constante."],
      ["carrinho", "2ª lei · Força e aceleração", "**F_R = m · a**\nCarrinho de mercado vazio dispara com um empurrão. Cheio, o mesmo empurrão quase não o move. **Mais massa, menos aceleração.**", "F_R em newton (N), m em kg, a em m/s²."],
      ["troca", "3ª lei · Ação e reação", "Sentado numa cadeira de rodinhas, empurre a parede. **A parede empurra você de volta** e você vai para trás.", "Mesma intensidade, sentidos opostos, em corpos diferentes (por isso não se cancelam)."]].forEach(([ic, t, d, n], i) => {
      const x = 0.5 + i * 4.18, w = 3.97;
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.7, w, h: 4.95, fill: { color: SUAVE[A] }, line: { color: A, width: 1 }, rectRadius: 0.1 });
      circ(s, ic, x + w / 2 - 0.45, 1.9, 0.9, A);
      T(s, t, x + 0.2, 2.9, w - 0.4, 0.45, { fontSize: 18, bold: true, align: "center", valign: "middle" });
      T(s, d, x + 0.3, 3.4, w - 0.6, 2.1, { fontSize: 15, align: "center" });
      T(s, n, x + 0.3, 5.55, w - 0.6, 1.0, { fontSize: 12.5, color: CINZA, align: "center" });
    });
  });
  slide("forcas", "mec", "As quatro forças", (s) => {
    moldura(s, "mec", "As quatro forças que aparecem em quase toda questão");
    fig(s, "f038", 0.5, 1.7, 5.2, 4.9);
    [["Peso", ALERTA, "a Terra puxa para baixo: P = m · g (massa de 50 kg pesa 500 N)."], ["Normal", C, "o chão empurra o objeto de volta, fazendo 90° com a superfície. Em piso horizontal, N = P."],
      ["Atrito", OURO, "segura o deslizamento. Deslizando: F_at = μ · N, sem depender da velocidade nem da força do puxão. Parado: o atrito só empata com a força que tenta mover, até o máximo μ · N."], ["Tração", A, "a força que uma corda ou um cabo faz ao puxar."]].forEach(([n, cor, d], i) => {
      const y = [1.75, 2.75, 3.75, 5.75][i];
      T(s, n, 6.0, y, 1.4, 0.4, { fontSize: 18, bold: true, color: cor });
      T(s, d, 7.45, y, 5.38, i === 2 ? 1.9 : 0.95, { fontSize: 15.5 });
    });
  });
  slide("receita", "mec", "A receita de 3 passos", (s) => {
    moldura(s, "mec", "A receita de 3 passos para qualquer questão de força");
    [["1", "Desenhe", "as forças no objeto: peso, normal, atrito, corda."], ["2", "Some", "as que ajudam e subtraia as que atrapalham. O saldo é a resultante."], ["3", "Iguale", "a resultante a m · a."]].forEach(([n, t, d], i) => {
      const x = 0.5 + i * 4.18;
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.75, w: 3.97, h: 2.3, fill: { color: SUAVE[OURO] }, line: { color: OURO, width: 1 }, rectRadius: 0.1 });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: 1.95, w: 0.7, h: 0.7, fill: { color: OURO }, line: { color: OURO, width: 0 } });
      T(s, n, x + 0.25, 1.95, 0.7, 0.7, { fontSize: 24, bold: true, color: BR, align: "center", valign: "middle" });
      T(s, t, x + 1.1, 1.95, 2.7, 0.7, { fontSize: 22, bold: true, valign: "middle" });
      T(s, d, x + 0.3, 2.8, 3.4, 1.15, { fontSize: 15.5 });
      if (i < 2) s.addShape(pres.ShapeType.rightArrow, { x: x + 3.93, y: 2.7, w: 0.3, h: 0.4, fill: { color: OURO }, line: { color: OURO, width: 0 } });
    });
    const a = caixa(s, { x: 0.5, y: 4.5, w: 7.4, h: 2.15, cor: A, titulo: "Exemplo" });
    T(s, "Caixa de 10 kg, empurrão de 50 N, atrito de 20 N.\nResultante: 50 − 20 = **30 N**.\nAceleração: 30 ÷ 10 = **3 m/s²**.", a.x, a.y, a.w, a.h, { fontSize: 17, valign: "middle" });
    const b = caixa(s, { x: 8.15, y: 4.5, w: 4.68, h: 2.15, cor: ALERTA, titulo: "Atenção", ic: "alerta" });
    T(s, "**Velocidade constante ou objeto parado:** resultante zero. As forças empatam.", b.x, b.y, b.w, b.h, { fontSize: 17, valign: "middle" });
  });
  enem("e25q108", "mec", "2025, questão 108", { situacao: "Um trabalhador arrasta uma caixa rampa acima. No começo puxa com muita força. Depois puxa menos e a caixa sobe devagar, sem parar.\n\nQual gráfico mostra o **atrito** ao longo do tempo?", dica: "Do que o atrito de deslizamento depende?",
    passos: ["**Raciocínio:** a caixa está sempre deslizando, então F_at = μ · N.", "O piso é o mesmo (μ igual).", "A caixa e a rampa são as mesmas (N igual).", "Nada mudou, então o atrito também não muda."], resposta: "uma reta horizontal (atrito constante)", fig: "f040", tamPassos: 19 });
  slide("polias", "mec", "Polias", (s) => {
    moldura(s, "mec", "Polias: dividir o peso");
    fig(s, "f042", 0.5, 1.7, 6.0, 4.9);
    T(s, "A **polia fixa** só muda a direção da força: você puxa para baixo e a carga sobe.\n\nA **polia móvel** sobe junto com a carga, que fica pendurada em dois trechos de corda. Cada trecho segura **metade do peso**.", 6.9, 1.75, 5.93, 2.9, { fontSize: 18 });
    const b = caixa(s, { x: 6.9, y: 4.85, w: 5.93, h: 1.8, cor: TINTA, titulo: "Caiu em 2023, questão 109", ic: "enem", fundo: CLARO });
    T(s, "Dois aparelhos de academia, um só com polias fixas e outro com polia móvel. Para a mesma força do aluno, a carga do segundo pode ser o dobro.", b.x, b.y, b.w, b.h, { fontSize: 15, valign: "middle" });
  });
  slide("energia", "mec", "Energia", (s) => {
    moldura(s, "mec", "Parte 3 · Energia: a pista de skate");
    fig(s, "f043", 0.5, 1.7, 5.6, 3.0);
    const a = caixa(s, { x: 6.4, y: 1.9, w: 6.43, h: 2.7, cor: OURO, titulo: "A pista de skate", ic: "ideia" });
    T(s, "No alto da pista o skatista tem energia **guardada** (potencial). Ao descer, ela vira energia de **movimento** (cinética). Sem atrito, a soma das duas não muda. O que sai de uma entra na outra.", a.x, a.y, a.w, a.h, { fontSize: 16.5, valign: "middle" });
    cartao(s, { x: 0.5, y: 4.85, w: 3.97, h: 1.85, cor: A, titulo: "Cinética (de movimento)", formula: "E_c = m·v² ÷ 2", tamF: 24 });
    cartao(s, { x: 4.68, y: 4.85, w: 3.97, h: 1.85, cor: A, titulo: "Potencial (guardada)", formula: "E_p = m·g·h", tamF: 24 });
    cartao(s, { x: 8.86, y: 4.85, w: 3.97, h: 1.85, cor: A, titulo: "Potência", formula: "P = E ÷ Δt", tamF: 24 });
  }, { notas: "Dobrou a velocidade, a energia cinética fica 4 vezes maior. Quanto mais alto, mais energia guardada. Potência é energia por segundo, em watt (W)." });
  slide("energia2", "mec", "Energia na prática", (s) => {
    moldura(s, "mec", "Energia e potência na prática");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 6.07, h: 2.3, cor: A, titulo: "Desceu sem atrito, partindo do repouso?" });
    T(s, "A energia guardada vira movimento: m·g·h = m·v² ÷ 2. O m aparece dos dois lados e pode ser cortado:\n**v² = 2·g·h**", a.x, a.y, a.w, a.h, { fontSize: 16.5, valign: "middle" });
    const b = caixa(s, { x: 6.76, y: 1.9, w: 6.07, h: 2.3, cor: OURO, titulo: "Exemplo: o tobogã", ic: "ideia" });
    T(s, "Tobogã de 5 m de altura.\nv² = 2 × 10 × 5 = 100, então **v = 10 m/s**.\nVale para criança ou adulto.", b.x, b.y, b.w, b.h, { fontSize: 16.5, valign: "middle" });
    const c = caixa(s, { x: 0.5, y: 4.6, w: 6.07, h: 2.05, cor: OURO, titulo: "Potência no dia a dia", ic: "ideia" });
    T(s, "Subir a escada andando ou correndo gasta a **mesma energia**. Correndo, o tempo é menor, então a **potência é maior**.", c.x, c.y, c.w, c.h, { fontSize: 16.5, valign: "middle" });
    const d = caixa(s, { x: 6.76, y: 4.6, w: 6.07, h: 2.05, cor: A, titulo: "Guarde" });
    listar(s, ["Dobrou a velocidade, a energia cinética fica **4 vezes** maior.", "Quanto mais alto, mais energia guardada.", "Potência é energia por segundo, em watt (W)."], d.x, d.y + 0.08, d.w, d.h - 0.1, { fontSize: 15, gap: 0.08, cor: A });
  });
  enem("e21q107", "mec", "2021, questão 107", { situacao: "O mesmo carro em duas versões.\n**A gasolina:** vai de 0 a 100 km/h em 13,4 s e chega a 165 km/h.\n**A álcool:** vai de 0 a 100 km/h em 12,9 s e chega a 163 km/h.\n\nQual motor desenvolve maior potência na arrancada?", dica: "Potência é energia dividida por quê?",
    passos: ["**Raciocínio:** a energia cinética que o carro ganha de 0 a 100 km/h é a mesma nas duas versões (mesma massa, mesma velocidade final).", "Potência é energia dividida pelo tempo.", "Quem entrega a mesma energia em **menos tempo** tem **mais potência**."],
    resposta: "o motor a álcool", erro: "escolher a gasolina porque a velocidade máxima dela é maior. Potência não é energia total. É a rapidez com que a energia é entregue.", tamPassos: 19 });
  pegadinhas("mecpeg", "mec", "As pegadinhas de mecânica que o ENEM repete", ["**Velocidade zero não é aceleração zero.** No topo da subida, v = 0 e a = g.", "**Massa não é peso.** Massa é em kg. Peso é força, em newton: P = m · g.",
    "**No vácuo, tudo cai junto.** Se a folha aberta cai mais devagar que a mesma folha amassada, a culpa é da resistência do ar (2021, questão 100).", "**Velocidade constante não precisa de força \"sobrando\".** A força só empata com o atrito.",
    "**Misturar unidades:** minutos com horas, km/h com m/s, cm com m. Converta antes de fazer a conta.", "Também é mecânica, mas caiu só 1 ou 2 vezes: pressão, gravitação, colisões e equilíbrio. Deixe para depois."]);

  // ================================================================ ELETRICIDADE
  abertura("ele", "ele", "ASSUNTO 2 DE 3", "Eletricidade: circuitos e potência", "O assunto campeão do ENEM é circuitos elétricos: 11 questões em 5 anos, todo ano. Com potência e energia, são 14.", "raio",
    [["Parte 1 · Lei de Ohm", "agua"], ["Parte 2 · Série ou paralelo?", "serie"], ["Parte 3 · Potência e conta de luz", "potencia"], ["Pegadinhas", "elepeg"]]);
  slide("agua", "ele", "Eletricidade é como água no cano", (s) => {
    moldura(s, "ele", "Parte 1 · Eletricidade é como água no cano");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 12.33, h: 1.75, cor: OURO, titulo: "A caixa-d'água", ic: "ideia" });
    T(s, "A caixa-d'água lá no alto empurra a água pelo cano. Quanto **mais alta** a caixa, mais força a água tem. Se o cano tem um trecho **estreito**, passa menos água. No circuito é igual: a pilha empurra, o fio conduz e o resistor aperta a passagem.", a.x, a.y, a.w, a.h, { fontSize: 16, valign: "middle" });
    fig(s, "f054", 0.5, 3.8, 12.33, 2.45);
    T(s, "Só uma diferença: a água sai pela torneira, mas a corrente **não é gasta**. Ela só existe se o caminho for **fechado** e é a mesma antes e depois do resistor.", 0.5, 6.3, 12.33, 0.55, { fontSize: 13.5, color: CINZA, align: "center" });
  });
  slide("grandezas", "ele", "As três grandezas", (s) => {
    moldura(s, "ele", "As três grandezas da eletricidade");
    const cab = (t) => ({ text: t, options: { bold: true, color: BR, fill: { color: B } } });
    s.addTable([[cab("Grandeza"), cab("Letra"), cab("Unidade"), cab("Na comparação com a água")],
      [{ text: "Tensão", options: { bold: true } }, "U", "volt (V)", "a altura da caixa: o \"empurrão\". Também chamada de voltagem ou diferença de potencial (d.d.p.). Pilha: 1,5 V. Tomada: 127 V ou 220 V."],
      [{ text: "Corrente", options: { bold: true } }, "i", "ampère (A)", "quanta água passa por segundo."], [{ text: "Resistência", options: { bold: true } }, "R", "ohm (Ω)", "o trecho estreito do cano: dificulta a passagem."]],
      { x: 0.5, y: 1.75, w: 12.33, colW: [2.2, 1.1, 2.0, 7.03], fontFace: FONTE, fontSize: 17, color: TINTA, rowH: [0.5, 1.5, 0.75, 0.75], valign: "middle", border: { type: "solid", color: "D5DBE1", pt: 0.75 }, margin: [0.04, 0.1, 0.04, 0.12] });
    const a = caixa(s, { x: 0.5, y: 5.6, w: 12.33, h: 1.05, cor: B, titulo: "Em uma frase" });
    T(s, "A tensão **empurra**, a resistência **segura** e a corrente é **o que passa**.", a.x, a.y - 0.05, a.w, a.h, { fontSize: 18, valign: "middle" });
  });
  slide("ohm", "ele", "As leis de Ohm", (s) => {
    moldura(s, "ele", "As leis de Ohm");
    cartao(s, { x: 0.5, y: 1.7, w: 3.9, h: 2.9, cor: B, titulo: "1ª Lei de Ohm", formula: "U = R · i", texto: "Mais resistência, menos corrente (para a mesma tensão)." });
    fig(s, "f056", 4.6, 1.75, 2.5, 1.75);
    T(s, "**Macete: URI.** Tampe o que você quer achar.\nTampou R: sobra U ÷ i.\nTampou i: sobra U ÷ R.", 4.6, 3.55, 3.3, 1.2, { fontSize: 14 });
    cartao(s, { x: 8.2, y: 1.7, w: 4.63, h: 2.9, cor: B, titulo: "2ª Lei de Ohm", formula: "R = ρ · L ÷ A", texto: "L é o comprimento, A é a grossura e ρ (\"rô\") depende do material." });
    fig(s, "f058", 0.5, 4.95, 5.4, 1.7);
    const a = caixa(s, { x: 6.2, y: 5.1, w: 6.63, h: 1.55, cor: OURO, titulo: "Para lembrar", ic: "ideia" });
    T(s, "Fio **curto e grosso**: passa fácil. Fio **comprido e fino**: resiste mais. Como uma mangueira.", a.x, a.y - 0.03, a.w, a.h, { fontSize: 16, valign: "middle" });
  });
  enem("e22q128", "ele", "2022, questão 128", { situacao: "Um aplicativo de trânsito compara cada rua a um resistor. A energia gasta por carro faz o papel da **tensão (U)**. Os carros por segundo fazem o papel da **corrente (i)**. Rua mais congestionada é rua de **resistência maior**.\n\nRota 1: U = 510, i = 4.   Rota 2: U = 608, i = 4.   Rota 3: U = 575, i = 3.\nQual é a ordem, da menos para a mais congestionada?",
    tam: 19, dica: "Como achar R quando você tem U e i?", passos: ["**Rota 1:** R = 510 ÷ 4 = 127,5", "**Rota 2:** R = 608 ÷ 4 = 152", "**Rota 3:** R = 575 ÷ 3 ≈ 192", "O ENEM gosta de vestir a Lei de Ohm com outra roupa. A conta é a mesma: **R = U ÷ i**."], resposta: "rotas 1, 2, 3 (da menor para a maior resistência)", tamPassos: 20 });
  slide("serie", "ele", "Série ou paralelo?", (s) => {
    moldura(s, "ele", "Parte 2 · Série ou paralelo?");
    [["Em SÉRIE: um depois do outro", "f061", "**No dia a dia:** pisca-pisca antigo. Queimou uma lâmpada, apagam todas.", ["a **corrente é a mesma** em todos;", "a **tensão se divide** entre eles;", "R_total = R₁ + R₂ (a resistência aumenta)."]],
      ["Em PARALELO: lado a lado", "f063", "**No dia a dia:** as tomadas da sua casa. Cada aparelho liga e desliga sozinho.", ["a **tensão é a mesma** em todos;", "a **corrente se divide** (a total é a soma);", "a resistência total **diminui**. Dois iguais: R_total = R ÷ 2."]]].forEach(([t, f, d, it], i) => {
      const x = 0.5 + i * 6.26, w = 6.07;
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.65, w, h: 5.05, fill: { color: BR }, line: { color: B, width: 1.25 }, rectRadius: 0.1 });
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.65, w, h: 0.5, fill: { color: B }, line: { color: B, width: 0 }, rectRadius: 0.1 });
      T(s, t, x + 0.2, 1.65, w - 0.4, 0.5, { fontSize: 16, bold: true, color: BR, valign: "middle" });
      fig(s, f, x + 0.3, 2.25, w - 0.6, 1.75);
      T(s, d, x + 0.3, 4.1, w - 0.6, 0.75, { fontSize: 15 });
      listar(s, it, x + 0.3, 4.9, w - 0.6, 1.7, { fontSize: 15, gap: 0.08, cor: B });
    });
  });
  slide("mercado", "ele", "Paralelo e pilhas", (s) => {
    moldura(s, "ele", "Paralelo é abrir mais caixas no supermercado");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 12.33, h: 1.85, cor: OURO, titulo: "A fila do supermercado", ic: "ideia" });
    T(s, "Cada caixa novo é mais um caminho, e a fila toda anda mais rápido. Por isso a **resistência total diminui**. E por isso, quanto mais aparelhos na mesma extensão, **maior a corrente total**.", a.x, a.y, a.w, a.h, { fontSize: 17.5, valign: "middle" });
    fig(s, "f067", 0.5, 4.2, 6.0, 2.4);
    const b = caixa(s, { x: 6.8, y: 4.3, w: 6.03, h: 2.35, cor: B, titulo: "Pilhas e baterias" });
    T(s, "Em fila e no mesmo sentido (o + de uma no − da outra), as tensões **somam**. Uma pilha **invertida** joga contra: **subtrai**. Caiu duas vezes em 2022 (questões 96 e 119).", b.x, b.y, b.w, b.h, { fontSize: 15.5, valign: "middle" });
  });
  enem("e25q130", "ele", "2025, questão 130", { situacao: "Um aparelho de resistência R_C precisa de uma certa tensão, mas a fonte disponível entrega **20% a mais**.\n\nComo ligar um resistor de proteção R_P, e de quanto?", dica: "Em qual ligação a tensão se divide?", tam: 23,
    passos: ["**1. Série ou paralelo?** Em paralelo o aparelho continuaria recebendo a tensão toda. Em série a tensão se divide. **É série.**", "**2. Quanto?** Invente números: o aparelho precisa de 100 V e a fonte entrega 120 V. O resistor tem de ficar com os 20 V que sobram.",
      "A corrente é a mesma nos dois e U = R · i. Quem fica com 5 vezes menos tensão tem 5 vezes menos resistência: R_P = R_C ÷ 5.", "A mesma ideia apareceu em 2024 (questão 131): um resistor em série com cada LED para \"segurar\" a tensão que sobra da bateria."], resposta: "em série, com R_P = 0,2 · R_C", tamPassos: 17 });
  slide("potencia", "ele", "Potência e energia", (s) => {
    moldura(s, "ele", "Parte 3 · Potência é a pressa de gastar energia");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 12.33, h: 1.6, cor: OURO, titulo: "Chuveiro contra lâmpada", ic: "ideia" });
    T(s, "O chuveiro (5 500 W) gasta energia **550 vezes mais depressa** que uma lâmpada de LED (10 W). A conta de luz não cobra a potência. Cobra a **energia**, que é a potência multiplicada pelo **tempo ligado**.", a.x, a.y, a.w, a.h, { fontSize: 16, valign: "middle" });
    cartao(s, { x: 0.5, y: 3.75, w: 3.97, h: 2.95, cor: B, titulo: "Potência elétrica", formula: "P = U · i", texto: "**Macete: PIU.**\nwatt (W) = volt × ampère" });
    cartao(s, { x: 4.68, y: 3.75, w: 3.97, h: 2.95, cor: B, titulo: "Energia consumida", formula: "E = P · Δt", texto: "kWh = kW × horas.\nÉ o que a conta de luz cobra." });
    cartao(s, { x: 8.86, y: 3.75, w: 3.97, h: 2.95, cor: B, titulo: "Corrente que o aparelho puxa", formula: "i = P ÷ U", texto: "Disjuntor e fusível cortam a energia quando a corrente total passa do limite (por exemplo, 20 A)." });
  });
  slide("banho", "ele", "Quanto custa o banho?", (s) => {
    moldura(s, "ele", "Exemplo do dia a dia: quanto custa o banho?");
    T(s, "Chuveiro de **5 500 W**, banho de **15 min** por dia, **30 dias**, tarifa de **R$ 1,00 por kWh**.", 0.5, 1.6, 12.33, 0.5, { fontSize: 18 });
    [["1", "Potência em kW", "5 500 ÷ 1 000 = 5,5 kW"], ["2", "Tempo em horas", "15 min = 0,25 h por dia\nNo mês: 0,25 × 30 = 7,5 h"], ["3", "Energia", "E = 5,5 × 7,5 = 41,25 kWh"], ["4", "Custo", "41,25 × 1,00 = R$ 41,25 por mês"]].forEach(([n, t, d], i) => {
      const x = 0.5 + i * 3.11, w = 2.95;
      s.addShape(pres.ShapeType.roundRect, { x, y: 2.3, w, h: 2.0, fill: { color: SUAVE[B] }, line: { color: B, width: 1 }, rectRadius: 0.1 });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: 2.45, w: 0.5, h: 0.5, fill: { color: B }, line: { color: B, width: 0 } });
      T(s, n, x + 0.2, 2.45, 0.5, 0.5, { fontSize: 17, bold: true, color: BR, align: "center", valign: "middle" });
      T(s, t, x + 0.82, 2.45, w - 0.95, 0.5, { fontSize: 16, bold: true, valign: "middle" });
      T(s, d, x + 0.2, 3.1, w - 0.4, 1.1, { fontSize: 15 });
    });
    const a = caixa(s, { x: 0.5, y: 4.75, w: 12.33, h: 1.9, cor: OURO, titulo: "Chuveiro: inverno ou verão?", ic: "chuveiro" });
    T(s, "Na tomada, a tensão é fixa. Quem tem **menos resistência** puxa **mais corrente** e esquenta mais (P = U² ÷ R). Chuveiro na posição \"inverno\" = resistência menor = potência maior. Na lâmpada, mais potência é mais brilho.", a.x, a.y, a.w, a.h, { fontSize: 16, valign: "middle" });
  });
  enem("e25q94", "ele", "2025, questão 94", { situacao: "Uma régua de tomadas em **110 V** tem fusível de **20 A**. Ficam sempre ligados o computador (250 W) e o ar-condicionado portátil (1 100 W).\n\nA estudante tenta usar, um de cada vez e nesta ordem: impressora (660 W), cafeteira (900 W), luminária (5 W) e secador (750 W).\nQuantos desses aparelhos ela consegue usar?",
    tam: 19, dica: "Quantos watts a régua aguenta? Quanto já está em uso?", passos: ["**1. Limite da régua:** P = U · i = 110 × 20 = 2 200 W.", "**2. Já ligados:** 250 + 1 100 = 1 350 W. Sobram 850 W.", "**3. Impressora:** 660 < 850. Funciona.", "**4. Cafeteira:** 900 > 850. O fusível queima e a régua para de funcionar. Acabou."],
    resposta: "apenas 1", erro: "continuar testando a luminária e o secador depois que o fusível já queimou.", fig: "f077" });
  enem("e21q128", "ele", "2021, questão 128", { situacao: "Um carro elétrico roda **5 km com cada kWh**. Depois de uma viagem de **110 km**, é recarregado num carregador de **220 V e 20 A**.\n\nQuantas horas leva a recarga?", dica: "Ache a energia gasta e a potência do carregador.", tam: 23,
    passos: ["**1. Energia gasta:** 110 ÷ 5 = 22 kWh.", "**2. Potência do carregador:** P = 220 × 20 = 4 400 W = 4,4 kW.", "**3. Tempo:** Δt = E ÷ P = 22 ÷ 4,4 = 5 h."], resposta: "5 horas", tamPassos: 21 });
  pegadinhas("elepeg", "ele", "As pegadinhas de eletricidade que o ENEM repete", ["**kWh é energia, não potência.** E só dá certo com potência em kW e tempo em horas.", "**Aparelhos na mesma extensão estão em paralelo.** As potências (e as correntes) somam.",
    "**Mais resistência no caminho, menos corrente.** As lâmpadas que estão em série nesse caminho brilham menos (2023, questão 120).", "**Olhe a polaridade.** Pilha invertida subtrai. LED ligado ao contrário não acende.",
    "**Vai ordenar resistências?** Calcule U ÷ i (ou L ÷ A) de cada uma antes de comparar. Não decida \"no olho\"."]);

  // ================================================================ ONDAS
  abertura("ond", "ond", "ASSUNTO 3 DE 3", "Ondas: som, luz e sinais", "15 questões em 5 anos, quase todas de conceito ou de leitura de gráfico. São pontos que dá para garantir sem conta difícil.", "onda",
    [["1 · O que é onda", "ola"], ["2 · v = λ · f", "vlf"], ["3 · Som", "som"], ["4 · Fenômenos", "fenomenos"], ["5 · Luz", "espectro"], ["Pegadinhas", "ondpeg"]]);
  slide("ola", "ond", "O que é uma onda", (s) => {
    moldura(s, "ond", "Parte 1 · O que é uma onda");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 12.33, h: 1.45, cor: OURO, titulo: "A \"ola\" do estádio", ic: "ideia" });
    T(s, "Na ola, a onda dá a volta no estádio inteiro, mas **cada torcedor só levanta e senta no próprio lugar**. Onda é isso: uma perturbação que viaja e **transporta energia sem carregar matéria**.", a.x, a.y, a.w, a.h, { fontSize: 16.5, valign: "middle" });
    fig(s, "f084", 0.5, 3.5, 12.33, 3.2);
  });
  slide("anatomia", "ond", "As medidas da onda", (s) => {
    moldura(s, "ond", "As medidas da onda");
    const a = caixa(s, { x: 0.5, y: 1.9, w: 6.07, h: 4.75, cor: C, titulo: "No tempo", ic: "relogio", fundo: BR });
    T(s, "**Período (T):** o tempo de **uma** oscilação completa, em segundos.\n\n**Frequência (f):** quantas oscilações **por segundo**, em hertz (Hz).", a.x, a.y + 0.1, a.w, 2.4, { fontSize: 18 });
    T(s, "f = 1 ÷ T", a.x, a.y + 2.7, a.w, 1.0, { fontSize: 38, italic: true, align: "center", valign: "middle", fontFace: "Cambria" });
    const b = caixa(s, { x: 6.76, y: 1.9, w: 6.07, h: 4.75, cor: C, titulo: "No espaço", ic: "onda", fundo: BR });
    T(s, "**Amplitude (A):** o \"tamanho\" da onda. Mais amplitude, mais energia (som mais forte, luz mais intensa).\n\n**Comprimento de onda (λ, \"lambda\"):** a distância entre duas cristas vizinhas, em metros.", b.x, b.y + 0.1, b.w, 3.2, { fontSize: 18 });
    fig(s, "f167", b.x + 0.9, b.y + 3.3, b.w - 1.8, 0.9);
  });
  enem("e21q131", "ond", "2021, questão 131", { situacao: "Um eletrocardiograma em papel quadriculado. Cada quadrado na horizontal vale **0,2 s**. Entre dois picos seguidos há **5 quadrados**.\n\nQuantos batimentos por minuto?", dica: "O tempo entre dois picos é o período.", tam: 23,
    passos: ["**1. Período:** 5 × 0,2 = 1 s entre uma batida e a seguinte.", "**2. Frequência:** f = 1 ÷ T = 1 batida por segundo.", "**3. Um minuto tem 60 s:** 1 × 60 = 60."], resposta: "60 batimentos por minuto", fig: "f087", tamPassos: 20 });
  slide("vlf", "ond", "A equação das ondas", (s) => {
    moldura(s, "ond", "Parte 2 · A equação das ondas");
    cartao(s, { x: 0.5, y: 1.7, w: 4.6, h: 3.0, cor: C, titulo: "Equação fundamental", formula: "v = λ · f", texto: "Para a luz no vácuo: c = λ · f, com c = 300 000 km/s.", tamF: 36 });
    const a = caixa(s, { x: 5.4, y: 1.9, w: 7.43, h: 2.8, cor: OURO, titulo: "Andar é multiplicar passos", ic: "ideia" });
    T(s, "Sua velocidade ao caminhar é o **tamanho do passo** vezes o **número de passos por segundo**.\n\nNa onda, o passo é λ e os passos por segundo são f.", a.x, a.y, a.w, a.h, { fontSize: 18, valign: "middle" });
    [["v", "velocidade", "m/s"], ["λ", "comprimento de onda", "m"], ["f", "frequência", "Hz"]].forEach(([l, n, u], i) => {
      const x = 0.5 + i * 4.18;
      s.addShape(pres.ShapeType.roundRect, { x, y: 5.1, w: 3.97, h: 1.5, fill: { color: SUAVE[C] }, line: { color: SUAVE[C], width: 0 }, rectRadius: 0.1 });
      T(s, l, x + 0.2, 5.1, 1.0, 1.5, { fontSize: 44, italic: true, bold: true, color: C, align: "center", valign: "middle", fontFace: "Cambria" });
      T(s, n + "\nem " + u, x + 1.3, 5.1, 2.5, 1.5, { fontSize: 17, valign: "middle" });
    });
  });
  slide("ouro", "ond", "A regra de ouro", (s) => {
    moldura(s, "ond", "A regra de ouro das ondas");
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.65, w: 12.33, h: 1.2, fill: { color: OURO }, line: { color: OURO, width: 0 }, rectRadius: 0.1 });
    T(s, "A frequência é da fonte. A velocidade é do meio.", 0.5, 1.65, 12.33, 1.2, { fontSize: 32, bold: true, color: BR, align: "center", valign: "middle" });
    fig(s, "f092", 0.5, 3.1, 6.2, 3.5);
    T(s, "Quem decide a **frequência** é quem produz a onda (a corda, o alto-falante, a antena).\n\nQuem decide a **velocidade** é o material por onde ela passa.\n\nSe a onda troca de meio, a frequência continua a mesma. Mudam a velocidade e o comprimento de onda.", 7.0, 3.15, 5.83, 3.5, { fontSize: 17 });
  });
  enem("e21q92", "ond", "2021, questão 92", { situacao: "Um sino dos ventos tem barras do mesmo material, uma **curta** e uma **comprida**.\n\nCompare a **frequência** e a **velocidade** do som das duas.", dica: "Lembre a regra de ouro: quem decide a velocidade?", tam: 24,
    passos: ["**Velocidade:** as barras são do mesmo material e o som das duas viaja pelo mesmo ar. Mesmo meio, velocidade igual.", "**Frequência:** na barra curta \"cabe\" uma onda menor (λ menor). Com v igual, f = v ÷ λ fica maior. O som é mais agudo.", "No violão, apertar a corda numa casa encurta o trecho que vibra, e o som fica mais agudo."],
    resposta: "a barra curta tem frequência maior; as velocidades são iguais", tamPassos: 18.5 });
  slide("som", "ond", "Som", (s) => {
    moldura(s, "ond", "Parte 3 · Som");
    T(s, "O som é uma onda **mecânica**: precisa de um material para viajar (ar, água, parede). **No vácuo não há som.** No ar, anda a cerca de 340 m/s. Na água, a 1 500 m/s. Nos sólidos, mais rápido ainda.", 0.5, 1.55, 12.33, 0.95, { fontSize: 16.5 });
    fig(s, "f095", 0.5, 2.55, 12.33, 2.3);
    T(s, "**Timbre** é a \"voz\" de cada fonte: a mesma nota soa diferente no violão e na flauta.", 0.5, 4.9, 12.33, 0.4, { fontSize: 15, align: "center" });
    const a = caixa(s, { x: 0.5, y: 5.6, w: 12.33, h: 1.1, cor: ALERTA, titulo: "\"Som alto\" não é som forte", ic: "alerta" });
    T(s, "Na rua, \"som alto\" é volume grande. Na Física, **alto = agudo** e **baixo = grave**. Volume é **intensidade**. No telefone de lata (2023, questão 111), barbante mais comprido: som mais fraco, mesma frequência.", a.x, a.y - 0.08, a.w, a.h, { fontSize: 14, valign: "middle" });
  });
  slide("eco", "ond", "Eco e sonar", (s) => {
    moldura(s, "ond", "Eco e sonar: o som vai, bate e volta");
    fig(s, "f097", 0.5, 1.7, 6.3, 3.3);
    cartao(s, { x: 7.1, y: 1.7, w: 5.73, h: 3.3, cor: C, titulo: "No tempo medido, o som percorreu a distância duas vezes", formula: "d = v · t ÷ 2", texto: "d é a distância até o obstáculo; t é o tempo de ida e volta.", tamF: 36 });
    const a = caixa(s, { x: 0.5, y: 5.4, w: 12.33, h: 1.25, cor: OURO, titulo: "Onde isso aparece", ic: "ideia" });
    T(s, "É assim que o sonar mede a profundidade, o morcego se orienta no escuro e o ultrassom faz a imagem do bebê.", a.x, a.y - 0.03, a.w, a.h, { fontSize: 17, valign: "middle" });
  });
  enem("e23q135", "ond", "2023, questão 135", { situacao: "Na busca por petróleo, um pulso de som é enviado ao subsolo. Há uma camada de líquido com **450 m de espessura**. O eco do topo da camada volta em **0,5 s**. O eco do fundo volta em **1,1 s**.\n\nQual a velocidade do som no líquido?", dica: "Quanto tempo o som passa só dentro do líquido? E que distância ele percorre lá?",
    passos: ["**1. Tempo só dentro do líquido (ida e volta):** 1,1 − 0,5 = 0,6 s.", "**2. Distância dentro do líquido (ida e volta):** 2 × 450 = 900 m.", "**3. Velocidade:** v = 900 ÷ 0,6 = 1 500 m/s."], resposta: "1 500 m/s", erro: "esquecer que o som vai e volta, e usar 450 m em vez de 900 m.", tamPassos: 20 });
  slide("fenomenos", "ond", "O que as ondas fazem", (s) => {
    moldura(s, "ond", "Parte 4 · O que as ondas fazem (fenômenos)");
    T(s, "Reconhecer o fenômeno decide **7 das 15 questões** de ondas.", 0.5, 1.45, 12.33, 0.4, { fontSize: 16, color: CINZA });
    [["f099", "Reflexão", "A onda bate e volta.", "Eco, espelho, sonar."], ["f101", "Refração", "A onda muda de meio e muda de velocidade.", "O canudo que parece quebrado no copo d'água."], ["f103", "Difração", "A onda contorna obstáculos e passa por frestas.", "Você ouve quem está atrás do muro, mas não vê."],
      ["f105", "Interferência", "Duas ondas se encontram e se somam ou se cancelam.", "Fone com cancelamento de ruído (2023, questão 128)."], ["f107", "Ressonância", "Empurrar no ritmo certo faz a oscilação crescer.", "Balanço do parquinho; a taça que quebra com a nota certa (2025, questão 114)."],
      ["f109", "Efeito Doppler", "Fonte se aproximando: você percebe frequência maior. Afastando: menor.", "A sirene parece aguda ao chegar e grave ao ir embora (2024, questão 99)."]].forEach(([f, t, d, e], i) => {
      const x = 0.5 + (i % 3) * 4.18, y = 1.95 + Math.floor(i / 3) * 2.42, w = 3.97, h = 2.28;
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: BR }, line: { color: C, width: 1 }, rectRadius: 0.1 });
      fig(s, f, x + 0.15, y + 0.15, 1.25, 1.0);
      T(s, t, x + 1.5, y + 0.12, w - 1.65, 0.38, { fontSize: 17, bold: true, color: "0E6B4A", valign: "middle" });
      T(s, d, x + 1.5, y + 0.5, w - 1.65, 0.85, { fontSize: 13 });
      T(s, e, x + 0.2, y + 1.38, w - 0.4, 0.82, { fontSize: 12.5, color: CINZA });
    });
  }, { notas: "Para lembrar: reflexão volta; refração muda de meio; difração contorna; interferência soma ou cancela; ressonância faz crescer; Doppler muda o tom; absorção fica com a energia." });
  slide("espectro", "ond", "A família das ondas eletromagnéticas", (s) => {
    moldura(s, "ond", "Parte 5 · Luz e a família das ondas eletromagnéticas");
    T(s, "Luz, rádio, micro-ondas e raios X são a mesma coisa: **ondas eletromagnéticas**. Não precisam de meio (atravessam o vácuo) e, no vácuo, todas andam a **300 000 km/s**. O que muda de uma para outra é a **frequência**.", 0.5, 1.55, 12.33, 0.95, { fontSize: 16.5 });
    fig(s, "f111", 0.5, 2.6, 12.33, 2.9);
    const a = caixa(s, { x: 0.5, y: 5.75, w: 12.33, h: 0.95, cor: OURO, titulo: "Para decorar a ordem", ic: "ideia" });
    T(s, "**R**aul **M**andou **I**vo **V**er **U**ma **X**ícara **G**igante: Rádio, Micro-ondas, Infravermelho, Visível, Ultravioleta, raios X, Gama.", a.x, a.y - 0.1, a.w, a.h, { fontSize: 15.5, valign: "middle" });
  });
  enem("e23q112", "ond", "2023, questão 112", { situacao: "Num CD ou DVD, os dados ficam em cavidades minúsculas lidas por laser. A difração impede ler cavidades menores que o comprimento de onda da luz.\n\nQue cor de laser guarda mais dados no mesmo disco?", dica: "Cavidade menor pede que tipo de onda? Qual cor tem essa característica?", tam: 22,
    passos: ["**Raciocínio:** cavidade menor pede λ menor.", "No visível, o menor comprimento de onda é o do **violeta**. O maior é o do vermelho."], resposta: "violeta", tamPassos: 22 });
  pegadinhas("ondpeg", "ond", "As pegadinhas de ondas que o ENEM repete", ["**Frequência não muda quando a onda troca de meio.** Mudam a velocidade e o comprimento de onda.", "**No mesmo meio, frequência e comprimento de onda andam ao contrário.** Se um aumenta, o outro diminui (2025, questão 135).",
    "**Eco é ida e volta.** Divida a distância total por 2 (ou dobre a espessura).", "**Altura é frequência, intensidade é amplitude.** \"Som mais baixo\" na prova pode querer dizer mais grave.", "**A cor que você vê é a que o objeto reflete**, não a que ele absorve (2021, questão 120).",
    "**Gráfico** (5 das 15 questões): leia primeiro os eixos e quanto vale cada quadrado.", "**Absorção:** o material fica com a energia da onda. Raios X passam pela pele e param em ossos e metais (2024, questão 106)."]);

  // ================================================================ TREINO
  slide("treino", "treino", "Hora de treinar", (s) => {
    s.background = { color: TINTA };
    T(s, "TREINO", 0.9, 1.0, 6, 0.4, { fontSize: 15, bold: true, color: C, charSpacing: 2 });
    T(s, "Hora de treinar", 0.9, 1.4, 9, 1.1, { fontSize: 48, bold: true, color: BR, valign: "middle" });
    T(s, "Seis questões no estilo do ENEM, duas por assunto, inspiradas em questões que caíram entre 2021 e 2025. Clique na alternativa: se errar, aparece uma dica; se acertar, a resposta comentada.", 0.9, 2.55, 10.5, 1.1, { fontSize: 18, color: "D5DBE1" });
    [["1", "Movimento", A], ["2", "Forças", A], ["3", "Circuitos", B], ["4", "Potência", B], ["5", "Eco", C], ["6", "Som", C]].forEach(([n, t, cor], i) => {
      const x = 0.9 + i * 1.95, w = 1.78;
      s.addShape(pres.ShapeType.roundRect, { x, y: 4.1, w, h: 1.9, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.12 });
      T(s, n, x, 4.2, w, 1.0, { fontSize: 48, bold: true, color: BR, align: "center", valign: "middle" });
      T(s, t, x, 5.25, w, 0.5, { fontSize: 15, bold: true, color: BR, align: "center", valign: "middle" });
      clique(s, x, 4.1, w, 1.9, "q" + n, "Questão " + n);
    });
    navegacao(s, "treino", true);
  });
  quiz(1, "mec", "Mecânica · movimento", "Inspirada no ENEM 2023, questão 124", { enunciado: "Uma família vai de carro a uma cidade a 240 km de distância. O carro mantém 80 km/h na estrada, mas faz duas paradas de 15 minutos. Um ônibus sai junto, faz o mesmo trajeto a 60 km/h e não para.\nQuantos minutos antes do ônibus o carro chega ao destino?",
    fig: "f114", alternativas: ["15", "30", "45", "60", "90"], correta: 1, resposta: "30 minutos", dica: "O carro não anda o tempo todo: some o tempo parado ao tempo de viagem. E compare tudo em minutos.",
    comentario: ["**Carro:** 240 ÷ 80 = 3 h = 180 min andando, mais 2 × 15 = 30 min parado. Total: 210 min.", "**Ônibus:** 240 ÷ 60 = 4 h = 240 min.", "**Diferença:** 240 − 210 = 30 min. Ferramenta usada: Δt = Δs ÷ v."], distratores: "Se você marcou 60, esqueceu as paradas." });
  quiz(2, "mec", "Mecânica · forças", "Inspirada no ENEM 2025, questão 108, e 2023, questão 114", { enunciado: "Em um depósito, um funcionário empurra na horizontal uma caixa de 40 kg, que desliza sobre o piso com velocidade constante. O coeficiente de atrito entre a caixa e o piso é 0,25 e g = 10 m/s².\nA força que o funcionário aplica na caixa vale",
    fig: "f121", alternativas: ["zero, pois com velocidade constante não é preciso força.", "10 N.", "40 N.", "100 N.", "400 N."], correta: 3, resposta: "100 N", dica: "Velocidade constante quer dizer resultante zero: a força empata com o atrito. E o atrito usa a normal (o peso, em newton), não a massa.",
    comentario: ["**Velocidade constante:** a resultante é zero. A força do funcionário **empata** com o atrito.", "**Atrito:** o piso é horizontal, então N = P = m · g = 40 × 10 = 400 N.", "Daí F_at = μ · N = 0,25 × 400 = **100 N**."], distratores: "Se marcou A: sem força nenhuma, o atrito frearia a caixa. Se marcou 10 N, multiplicou 0,25 pela massa (40 kg) e não pelo peso (400 N)." });
  quiz(3, "ele", "Eletricidade · circuitos", "Inspirada no ENEM 2024, questão 131, e 2025, questão 130", { enunciado: "Um estudante quer acender um LED que funciona com 2 V e corrente de 20 mA, mas só tem uma fonte de 5 V. Para não queimar o LED, ele liga um resistor em série, como na figura.\nQual deve ser a resistência desse resistor?",
    fig: "f128", alternativas: ["0,15 Ω", "100 Ω", "150 Ω", "250 Ω", "350 Ω"], correta: 2, resposta: "150 Ω", dica: "Em série a tensão se divide: quanto sobra para o resistor? E passe mA para A antes de usar R = U ÷ i.",
    comentario: ["**Tensão que sobra para o resistor:** 5 − 2 = 3 V (em série, a tensão se divide).", "**Corrente:** a mesma do LED: 20 mA = 0,020 A.", "**Lei de Ohm:** R = U ÷ i = 3 ÷ 0,020 = 150 Ω."], distratores: "Se marcou 250 Ω, usou os 5 V inteiros. Se marcou 100 Ω, usou os 2 V do LED. Se marcou 0,15 Ω, esqueceu de passar mA para A (divida por 1 000)." });
  quiz(4, "ele", "Eletricidade · potência", "Inspirada no ENEM 2025, questão 94", { enunciado: "Na cozinha, uma extensão ligada em 220 V tem um disjuntor que desarma se a corrente passar de 10 A. Nela já estão funcionando a geladeira (300 W) e o micro-ondas (1 200 W).\nQual destes aparelhos ainda pode ser ligado na mesma extensão sem desarmar o disjuntor?",
    fig: "f135", alternativas: ["Liquidificador (500 W).", "Secador de cabelo (900 W).", "Ferro de passar (1 000 W).", "Fritadeira elétrica (1 500 W).", "Chaleira elétrica (1 800 W)."], correta: 0, resposta: "liquidificador", dica: "Ache primeiro o limite da extensão em watts (P = U · i). Depois desconte o que já está ligado.",
    comentario: ["**Limite da extensão:** P = U · i = 220 × 10 = 2 200 W.", "**Já em uso:** 300 + 1 200 = 1 500 W. Sobram 2 200 − 1 500 = 700 W.", "**Quem cabe em 700 W?** Só o liquidificador (500 W)."], distratores: "Se marcou outro aparelho, comparou só ele com 2 200 W e esqueceu de somar os que já estavam ligados. Na mesma extensão, as potências somam." });
  quiz(5, "ond", "Ondas · eco", "Inspirada no ENEM 2023, questão 135", { enunciado: "O sonar de um barco de pesca emite um pulso de som para o fundo do mar e recebe o eco 0,4 s depois. O som viaja na água a 1 500 m/s.\nA profundidade no local é de",
    fig: "f142", alternativas: ["3 750 m", "1 500 m", "1 200 m", "600 m", "300 m"], correta: 4, resposta: "300 m", dica: "O som vai e volta. A distância v · t é o caminho todo, não a profundidade.",
    comentario: ["**Distância total percorrida pelo som:** v · t = 1 500 × 0,4 = 600 m.", "**Eco é ida e volta**, então a profundidade é a metade: 600 ÷ 2 = 300 m."], distratores: "Se marcou 600 m, esqueceu de dividir por 2. Se marcou 1 200 m, dobrou em vez de dividir. Se marcou 3 750 m, dividiu a velocidade pelo tempo." });
  quiz(6, "ond", "Ondas · som", "Inspirada no ENEM 2021, questão 92", { enunciado: "Uma flauta de brinquedo é feita com canudos de tamanhos diferentes, tampados embaixo.\nSoprando o canudo mais curto, em comparação com o mais comprido, o som produzido tem",
    fig: "f149", alternativas: ["frequência maior (mais agudo) e a mesma velocidade no ar.", "frequência menor (mais grave) e a mesma velocidade no ar.", "frequência maior e velocidade maior no ar.", "frequência menor e velocidade menor no ar.", "a mesma frequência e velocidade maior no ar."], correta: 0, resposta: "mais agudo, mesma velocidade",
    dica: "A regra de ouro: quem decide a velocidade é o meio. E no canudo curto cabe uma onda mais curta.", comentario: ["**Velocidade:** o som dos dois canudos viaja pelo mesmo ar. A velocidade é a mesma (a velocidade é do meio).", "**Frequência:** no canudo curto cabe uma onda mais curta (λ menor). Como f = v ÷ λ, a frequência é maior. O som é mais agudo."],
    distratores: "Se marcou C, D ou E, esqueceu a regra de ouro: a velocidade é do meio, e o meio (o ar) é o mesmo. Mesmo raciocínio do sino dos ventos (ENEM 2021)." });

  // ================================================================ RESUMO DE BOLSO
  slide("bolso", "bolso", "Resumo de bolso", (s) => {
    moldura(s, "bolso", "Resumo de bolso: releia na véspera da prova");
    const col = (i, cor, ic, t, txt, alvo) => {
      const x = 0.5 + i * 4.18, w = 3.97;
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.6, w, h: 5.1, fill: { color: BR }, line: { color: cor, width: 1.25 }, rectRadius: 0.1 });
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.6, w, h: 0.5, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.1 });
      s.addImage({ data: IC[ic], x: x + 0.2, y: 1.72, w: 0.26, h: 0.26 });
      T(s, t, x + 0.6, 1.6, w - 0.8, 0.5, { fontSize: 16, bold: true, color: BR, valign: "middle" });
      T(s, txt, x + 0.22, 2.22, w - 0.44, 4.45, { fontSize: 13.5, paraSpaceAfter: 1 });
      clique(s, x, 1.6, w, 0.5, alvo, "Abrir " + t);
    };
    col(0, A, "carro", "Mecânica", "**Movimento**\nv = Δs ÷ Δt      km/h ÷ 3,6 = m/s\nQueda do repouso: h = 5·t² e v = 10·t\nSem o tempo: v² = v₀² + 2·a·Δs\nLançamento: para o lado, velocidade constante; para baixo, queda. O tempo liga os dois.\n**Forças**\nF_R = m · a      P = m · g      F_at = μ · N\nVelocidade constante: F_R = 0.\nPolia móvel: força pela metade.\n**Energia**\nE_c = m·v² ÷ 2      E_p = m·g·h      P = E ÷ Δt\nDescida sem atrito: v² = 2·g·h", "mec");
    col(1, B, "raio", "Eletricidade", "**Lei de Ohm**\nU = R · i      R = ρ · L ÷ A\n**Série** (pisca-pisca)\nmesma corrente; a tensão se divide; R_total = R₁ + R₂\n**Paralelo** (tomadas)\nmesma tensão; a corrente se divide; a resistência total diminui\nPilhas em série somam. Invertida subtrai.\n**Potência e energia**\nP = U · i      i = P ÷ U\nE = P · Δt      kWh = kW × h\nNa mesma extensão, as potências somam.\nMenos resistência na tomada, mais potência.", "ele");
    col(2, C, "onda", "Ondas", "**Equações**\nv = λ · f      f = 1 ÷ T      Eco: d = v · t ÷ 2\n**Regra de ouro**\nA frequência é da fonte. A velocidade é do meio.\n**Som**\naltura = frequência (grave ou agudo)\nintensidade = amplitude (volume)\ntimbre = \"voz\" da fonte\n**Fenômenos**\nreflexão volta; refração muda de meio; difração contorna; interferência soma ou cancela; ressonância faz crescer; Doppler muda o tom\n**Luz**\nrádio, micro-ondas, infravermelho, visível, ultravioleta, raios X, gama: a frequência aumenta e λ diminui.", "ond");
  });
  slide("calor", "bolso", "Bônus: calor", (s) => {
    moldura(s, "bolso", "Bônus · Calor, que empatou com ondas em 15 questões");
    T(s, "**Calor é energia indo do quente para o frio.**", 0.5, 1.5, 12.33, 0.45, { fontSize: 19 });
    cartao(s, { x: 0.5, y: 2.1, w: 2.95, h: 2.6, cor: CINZA, titulo: "Esquentar ou esfriar", formula: "Q = m · c · ΔT", texto: "Sem mudar de estado. Macete: \"**Q**ue **m**a**c**e**t**e\".", tamF: 22 });
    cartao(s, { x: 3.61, y: 2.1, w: 2.95, h: 2.6, cor: CINZA, titulo: "Mudar de estado", formula: "Q = m · L", texto: "Derreter, ferver: a temperatura fica parada. Macete: \"**Q**ue **m**o**l**e\".", tamF: 22 });
    T(s, "A água demora a esquentar porque seu calor específico é alto.", 0.5, 4.85, 6.06, 0.7, { fontSize: 14, color: CINZA });
    const a = caixa(s, { x: 0.5, y: 5.7, w: 6.06, h: 0.95, cor: ALERTA, titulo: "Pegadinha", ic: "alerta" });
    T(s, "Blusa e isopor não esquentam. São **isolantes**: dificultam a passagem do calor.", a.x, a.y - 0.1, a.w, a.h, { fontSize: 14, valign: "middle" });
    T(s, "Três jeitos de o calor viajar", 6.9, 2.05, 5.9, 0.45, { fontSize: 19, bold: true });
    [["colher", ALERTA, "Condução", "pelo contato. O cabo da colher esquenta na panela."], ["ciclo", A, "Convecção", "o fluido quente sobe e o frio desce. Ar-condicionado no alto, aquecedor solar."], ["sol", OURO, "Irradiação", "por ondas eletromagnéticas (infravermelho), sem precisar de meio. O calor do Sol e da lâmpada."]].forEach(([ic, cor, t, d], i) => {
      const y = 2.65 + i * 1.38;
      s.addShape(pres.ShapeType.roundRect, { x: 6.9, y, w: 5.93, h: 1.25, fill: { color: SUAVE[cor] }, line: { color: SUAVE[cor], width: 0 }, rectRadius: 0.1 });
      circ(s, ic, 7.1, y + 0.25, 0.75, cor);
      T(s, "**" + t + ":** " + d, 8.05, y, 4.65, 1.25, { fontSize: 15, valign: "middle" });
    });
  });

  // ================================================================ ANÁLISE
  slide("analise", "analise", "Análise completa", (s) => {
    moldura(s, "analise", "Análise completa: os 20 assuntos, do que mais cai ao que menos cai");
    fig(s, "f170", 0.5, 1.6, 8.0, 5.1);
    const a = caixa(s, { x: 8.8, y: 1.9, w: 4.03, h: 2.6, cor: CINZA, titulo: "Para o professor", fundo: CLARO });
    T(s, "Os números por trás do material: 79 questões de Física classificadas uma a uma, com assunto, tipo e equações usadas na resolução.", a.x, a.y, a.w, a.h, { fontSize: 14.5, valign: "middle" });
    botao(s, "Ano a ano  ▶", 8.8, 4.75, 4.03, 0.55, CINZA, "anoano", { tam: 14 });
    botao(s, "Equações que resolvem  ▶", 8.8, 5.42, 4.03, 0.55, CINZA, "eqmec", { tam: 14 });
    botao(s, "Conta ou conceito?  ▶", 8.8, 6.09, 4.03, 0.55, CINZA, "tipo", { tam: 14 });
  });
  slide("anoano", "analise", "Ano a ano", (s) => {
    moldura(s, "analise", "Ano a ano: quantas questões por área");
    const anos = [2021, 2022, 2023, 2024, 2025];
    const areas = [["Mecânica", "Mecânica", A], ["Eletricidade e magnetismo", "Eletricidade e magnetismo", B], ["Ondas", "Ondulatória", C], ["Calor (termologia)", "Termologia", CINZA], ["Óptica", "Óptica", CINZA], ["Física moderna", "Física moderna", CINZA]];
    const conta = (ar, an) => DADOS.filter((q) => q.area === ar && q.ano === an).length;
    const mistura = (cor, n) => { const t = Math.min(1, n * 0.11); return [0, 2, 4].map((k) => Math.round(255 - (255 - parseInt(cor.slice(k, k + 2), 16)) * t).toString(16).padStart(2, "0")).join("").toUpperCase(); };
    const cab = (t) => ({ text: t, options: { bold: true, color: BR, fill: { color: TINTA }, align: "center" } });
    const linhas = [[{ ...cab("Área"), options: { ...cab("Área").options, align: "left" } }, ...anos.map((a) => cab(String(a))), cab("Total")]];
    areas.forEach(([rot, chave, cor]) => { const v = anos.map((a) => conta(chave, a)); linhas.push([{ text: rot, options: { bold: true } }, ...v.map((n) => ({ text: String(n), options: { align: "center", fill: { color: mistura(cor, n) }, color: n >= 6 ? BR : TINTA } })), { text: String(v.reduce((x, y) => x + y, 0)), options: { bold: true, align: "center" } }]); });
    const tot = anos.map((a) => DADOS.filter((q) => q.ano === a).length);
    linhas.push([{ text: "Física na prova", options: { bold: true, fill: { color: CLARO } } }, ...tot.map((n) => ({ text: String(n), options: { bold: true, align: "center", fill: { color: CLARO } } })), { text: String(DADOS.length), options: { bold: true, align: "center", fill: { color: CLARO } } }]);
    s.addTable(linhas, { x: 0.5, y: 1.7, w: 12.33, colW: [4.23, 1.35, 1.35, 1.35, 1.35, 1.35, 1.35], fontFace: FONTE, fontSize: 17, color: TINTA, rowH: 0.52, valign: "middle", border: { type: "solid", color: "D5DBE1", pt: 0.75 }, margin: [0.04, 0.1, 0.04, 0.12] });
    T(s, "Ondas e calor empatam em 15 questões. Ondas ficou com o 3º lugar porque também aparece como segundo assunto em questões de outras áreas (18 aparições no total, contra 16 de calor).", 0.5, 6.05, 12.33, 0.7, { fontSize: 14, color: CINZA });
  });
  [["eqmec", "Mecânica", "f184", A, "Desenhar as forças vem antes de qualquer conta: abre todas as 7 questões de leis de Newton.", "newton"], ["eqele", "Eletricidade", "f194", B, "Ler o circuito (série, paralelo, caminho fechado) decide 10 das 20 questões.", "serie"], ["eqond", "Ondas", "f203", C, "Reconhecer o fenômeno vale mais que qualquer equação: 7 das 15 questões.", "fenomenos"]].forEach(([id, nome, f, cor, obs, alvo], i, arr) => {
    slide(id, "analise", "Equações que resolvem · " + nome, (s) => {
      moldura(s, "analise", "As equações que resolvem as questões · " + nome);
      fig(s, f, 0.5, 1.6, 8.3, 5.1);
      const a = caixa(s, { x: 9.1, y: 1.9, w: 3.73, h: 2.5, cor, titulo: "Como ler" });
      T(s, "Para cada questão, anotamos as equações e ideias que aparecem na resolução. A barra mostra em quantas questões cada uma aparece.", a.x, a.y, a.w, a.h, { fontSize: 13.5, valign: "middle" });
      const b = caixa(s, { x: 9.1, y: 4.75, w: 3.73, h: 1.3, cor: OURO, titulo: "Destaque", ic: "ideia" });
      T(s, obs, b.x, b.y - 0.05, b.w, b.h, { fontSize: 13, valign: "middle" });
      botao(s, "Rever no resumo  ▶", 9.1, 6.2, 3.73, 0.5, cor, alvo, { tam: 13 });
    });
  });
  slide("tipo", "analise", "Conta ou conceito?", (s) => {
    moldura(s, "analise", "Conta ou conceito? O tipo de questão em cada área");
    fig(s, "f204", 0.5, 1.7, 12.33, 2.6);
    [["48%", "das 79 questões são conceituais (38): dá para acertar sem conta", C], ["38%", "pedem cálculo (30), quase sempre com uma ou duas equações do kit", A], ["14%", "pedem leitura de gráfico ou tabela (11)", OURO]].forEach(([n, d, cor], i) => {
      const x = 0.5 + i * 4.18;
      s.addShape(pres.ShapeType.roundRect, { x, y: 4.6, w: 3.97, h: 2.05, fill: { color: SUAVE[cor] }, line: { color: SUAVE[cor], width: 0 }, rectRadius: 0.1 });
      T(s, n, x, 4.65, 3.97, 0.95, { fontSize: 44, bold: true, color: cor === OURO ? "8A5A12" : cor, align: "center", valign: "middle" });
      T(s, d, x + 0.25, 5.6, 3.47, 0.95, { fontSize: 14, align: "center" });
    });
  });
  slide("fontes", "analise", "Fontes e método", (s) => {
    moldura(s, "analise", "Fontes e método");
    listar(s, ["**Provas:** ENEM 2021 a 2025, 2º dia, caderno azul (caderno 7), questões 91 a 135 de Ciências da Natureza, com os gabaritos oficiais do INEP.",
      "**Classificação:** cada questão de Física recebeu área, assunto, assunto secundário, tipo (conceitual, cálculo ou gráfico), nível e as equações usadas na resolução.",
      "**Questões de fronteira:** algumas misturam Física com outra disciplina (Química, Biologia, Geografia e Astronomia). Duas foram anuladas pelo INEP (2024, questão 129, e 2025, questão 132). Todas estão na contagem.",
      "**Questões reais:** aparecem resumidas, com ano e número, para você conferir na prova original. As 6 questões de treino são originais, inspiradas no estilo do ENEM.",
      "**Provas e gabaritos:** página do INEP, em gov.br/inep (Provas e Gabaritos do ENEM)."], 0.5, 1.75, 12.33, 4.8, { fontSize: 16.5, gap: 0.22, cor: CINZA });
  });

  // ================================================================ FIM
  slide("fim", "inicio", "Boa prova!", (s) => {
    s.background = { color: TINTA };
    T(s, "Boa prova!", 0.9, 1.3, 11.5, 1.3, { fontSize: 60, bold: true, color: BR, valign: "middle" });
    T(s, "Leia a história com calma, desenhe a situação e procure qual das ferramentas do kit resolve. Metade das questões nem pede conta.", 0.9, 2.7, 9.5, 1.2, { fontSize: 20, color: "D5DBE1" });
    [["Rever mecânica", A, "mec"], ["Rever eletricidade", B, "ele"], ["Rever ondas", C, "ond"], ["Treinar de novo", "4F5A64", "treino"], ["Resumo de bolso", OURO, "bolso"]].forEach(([t, cor, alvo], i) => {
      const x = 0.9 + i * 2.33, w = 2.15;
      s.addShape(pres.ShapeType.roundRect, { x, y: 4.5, w, h: 1.0, fill: { color: cor }, line: { color: cor, width: 0 }, rectRadius: 0.12 });
      T(s, t, x + 0.1, 4.5, w - 0.2, 1.0, { fontSize: 15.5, bold: true, color: BR, align: "center", valign: "middle" });
      clique(s, x, 4.5, w, 1.0, alvo, t);
    });
    T(s, "Espaço Cria · material feito a partir das provas do ENEM de 2021 a 2025", 0.9, 6.1, 11, 0.4, { fontSize: 13, color: "B9C2CB" });
    navegacao(s, "inicio", true);
  });

  // ---------------------------------------------------------------- monta
  LISTA.forEach((it, i) => { N[it.id] = i + 1; });
  let secAtual = null;
  const nomesSec = { inicio: "Abertura", mec: "Mecânica", ele: "Eletricidade", ond: "Ondas", treino: "Treino", bolso: "Resumo de bolso", analise: "Análise completa" };
  for (const it of LISTA) {
    const chave = it.id === "fim" ? "Encerramento" : nomesSec[it.sec];
    if (chave !== secAtual) { pres.addSection({ title: chave }); secAtual = chave; }
    const s = pres.addSlide({ sectionTitle: chave });
    if (it.oculto) s.hidden = true;
    it.build(s);
    if (it.notas) s.addNotes(it.notas);
  }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  await pres.writeFile({ fileName: SAIDA });
  fs.writeFileSync(path.join(path.dirname(SAIDA), "slides.json"), JSON.stringify(LISTA.map((it, i) => ({ n: i + 1, id: it.id, titulo: it.titulo, oculto: !!it.oculto })), null, 1));
  console.log("ok:", LISTA.length, "slides ->", SAIDA);
})();
