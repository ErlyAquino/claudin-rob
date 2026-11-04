// Apresentação interativa da Rede de Telemetria do Espaço CRIA (pptxgenjs).
// node gerar_slides.js  ->  ../saida/Telemetria-CRIA-Apresentacao.pptx
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fa = require("react-icons/fa");
const { applyTheme } = require(process.env.PPTX_SKILL_DIR + "/scripts/apply_theme.js");

const IMG = (n) => path.join(__dirname, "..", "imagens", n);
const PECA = (n) => path.join(__dirname, "..", "imagens", "pecas", n + ".png");
const SAIDA = path.join(__dirname, "..", "saida", "Telemetria-CRIA-Apresentacao.pptx");

// ------------------------------------------------------------------ tema "Campo & Circuito"
const THEME = {
  name: "Campo e Circuito", headFontFace: "Arial", bodyFontFace: "Calibri",
  colors: { dk1: "1B2A33", lt1: "FFFFFF", dk2: "0B2B3A", lt2: "EEF3F5", accent1: "2EC4B6", accent2: "6DB33F", accent3: "F2A541",
    accent4: "E05A47", accent5: "3D7EA6", accent6: "8C9BA5", hlink: "2EC4B6", folHlink: "6DB33F" },
};
const K = THEME.colors;
const NAVY = K.dk2, TEAL = K.accent1, VERDE = K.accent2, AMBAR = K.accent3, VERM = K.accent4, AZUL = K.accent5, CINZA = K.accent6, TEXTO = K.dk1, CLARO = K.lt2, BRANCO = K.lt1;

// ------------------------------------------------------------------ ícones (react-icons -> PNG base64)
async function icone(nome, cor, px = 256) {
  const el = React.createElement(Fa[nome], { color: "#" + cor, size: px });
  const svg = ReactDOMServer.renderToStaticMarkup(el);
  const buf = await sharp(Buffer.from(svg)).resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ------------------------------------------------------------------ ordem dos slides (para os hyperlinks)
const ORDEM = ["capa", "equipe", "agenda",
  "sec1", "telemetria", "f1escola", "problema", "numeros",
  "sec2", "labAr", "labHorta",
  "sec3", "cerebro", "sensAr", "sensHorta1", "sensHorta2",
  "sec4", "coleta", "transporte", "armazenamento", "frontend", "arquitetura", "criterios", "metodo",
  "sec5", "habilidades", "tractian", "iot", "fim"];
const N = Object.fromEntries(ORDEM.map((k, i) => [k, i + 1]));
const SECOES = [["Projeto", "sec1"], ["Laboratórios", "sec2"], ["Hardware", "sec3"], ["Dados", "sec4"], ["E depois?", "sec5"]];

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";                 // 13.33 x 7.5 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = "Espaço CRIA — ETE Epitácio Pessoa"; pres.title = "Rede de Telemetria do Espaço CRIA";
  const W = 13.333, H = 7.5;

  // ---- ícones usados (pré-renderizados)
  const nomesIcones = {
    flag: ["FaFlagCheckered", BRANCO], satelite: ["FaSatelliteDish", TEAL], banco: ["FaDatabase", BRANCO], grafico: ["FaChartLine", BRANCO],
    wifi: ["FaWifi", BRANCO], folha: ["FaSeedling", BRANCO], vento: ["FaWind", BRANCO], chip: ["FaMicrochip", BRANCO], servidor: ["FaServer", BRANCO],
    industria: ["FaIndustry", BRANCO], foguete: ["FaRocket", BRANCO], coracao: ["FaHeartbeat", BRANCO], trator: ["FaTractor", BRANCO], cidade: ["FaCity", BRANCO],
    caminhao: ["FaShippingFast", BRANCO], raio: ["FaBolt", BRANCO], check: ["FaCheckCircle", VERDE], pessoas: ["FaUsers", BRANCO], github: ["FaGithub", BRANCO],
    agua: ["FaWater", BRANCO], sol: ["FaSun", BRANCO], relogio: ["FaClock", BRANCO], termo: ["FaThermometerHalf", BRANCO], gota: ["FaTint", BRANCO],
    toggle: ["FaToggleOn", BRANCO], camera: ["FaCamera", BRANCO], troca: ["FaExchangeAlt", BRANCO], ideia: ["FaLightbulb", BRANCO], velocimetro: ["FaTachometerAlt", BRANCO],
    engrenagem: ["FaCog", BRANCO], prancheta: ["FaClipboardCheck", BRANCO], livro: ["FaBookOpen", BRANCO], git: ["FaCodeBranch", BRANCO], alvo: ["FaBullseye", BRANCO],
    escola: ["FaSchool", BRANCO], carro: ["FaCarSide", BRANCO], radio: ["FaBroadcastTower", BRANCO], tabela: ["FaTable", BRANCO], csv: ["FaFileCsv", BRANCO],
    cadeado: ["FaLock", BRANCO], regua: ["FaRulerCombined", BRANCO], balanca: ["FaBalanceScale", BRANCO], vidro: ["FaFlask", BRANCO], bomba: ["FaFan", BRANCO],
    luz: ["FaRegLightbulb", BRANCO], onda: ["FaWaveSquare", BRANCO], nuvem: ["FaCloud", BRANCO], moedas: ["FaCoins", BRANCO], medalha: ["FaMedal", BRANCO],
    aberto: ["FaUnlockAlt", BRANCO], video: ["FaVideo", BRANCO], loop: ["FaSyncAlt", BRANCO], alerta: ["FaExclamationTriangle", BRANCO], cereb: ["FaBrain", BRANCO],
  };
  const IC = {};
  for (const [k, [nome, cor]] of Object.entries(nomesIcones)) IC[k] = await icone(nome, cor);

  // ---- layouts
  const rodape = (claro) => ({ text: { text: "Rede de Telemetria do Espaço CRIA  ·  ETE Epitácio Pessoa  ·  FACEPE / Espaços CRIA 2026",
    options: { x: 0.5, y: H - 0.42, w: 9.5, h: 0.3, fontSize: 9, color: claro ? CINZA : "9FB3BE", isTextBox: true, margin: 0 } } });
  pres.defineSlideMaster({ title: "CAPA", background: { color: NAVY }, objects: [] });
  pres.defineSlideMaster({ title: "SECAO", background: { color: NAVY }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.6, w: 11.5, h: 1.3, fontSize: 44, bold: true, color: BRANCO, align: "left", margin: 0 } } },
    { placeholder: { options: { name: "body", type: "body", x: 0.9, y: 3.95, w: 11.5, h: 1.2, fontSize: 20, color: "CFE3EA", align: "left", margin: 0 } } },
    rodape(false)],
    slideNumber: { x: W - 1.0, y: H - 0.45, w: 0.6, h: 0.3, fontSize: 10, color: "9FB3BE" } });
  pres.defineSlideMaster({ title: "CONTEUDO", background: { color: BRANCO }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: NAVY, align: "left", valign: "middle", margin: 0 } } },
    rodape(true)],
    slideNumber: { x: W - 1.0, y: H - 0.45, w: 0.6, h: 0.3, fontSize: 10, color: CINZA } });
  pres.defineSlideMaster({ title: "ESCURO", background: { color: NAVY }, objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: BRANCO, align: "left", valign: "middle", margin: 0 } } },
    rodape(false)],
    slideNumber: { x: W - 1.0, y: H - 0.45, w: 0.6, h: 0.3, fontSize: 10, color: "9FB3BE" } });

  // ---- helpers
  let secaoAtual = "Abertura";
  const resumo = [];                           // [{n, secao, titulo, notas}] -> slides.json (apostila DOCX)
  const novo = (master, titulo, notas) => {
    const s = pres.addSlide({ masterName: master, sectionTitle: secaoAtual });
    if (titulo) s.addText(titulo, { placeholder: "title" });
    if (notas) s.addNotes(notas);
    resumo.push({ n: resumo.length + 1, secao: secaoAtual, titulo: titulo || (resumo.length === 0 ? "Rede de Telemetria do Espaço CRIA" : "Encerramento"), notas: notas || "" });
    return s;
  };
  // barra de navegação interativa (hyperlinks para as seções)
  function nav(s, escuro = false, atual = null) {
    const runs = [];
    SECOES.forEach(([rotulo, chave], i) => {
      runs.push({ text: rotulo, options: { hyperlink: { slide: N[chave], tooltip: "Ir para " + rotulo }, bold: chave === atual, color: escuro ? (chave === atual ? TEAL : "CFE3EA") : (chave === atual ? TEAL : AZUL) } });
      if (i < SECOES.length - 1) runs.push({ text: "   ·   ", options: { color: escuro ? "6E8794" : CINZA } });
    });
    s.addText(runs, { x: W - 7.3, y: H - 0.42, w: 6.1, h: 0.3, fontSize: 10, align: "right", isTextBox: true, margin: 0, objectName: "navegacao" });
  }
  const circIcone = (s, chave, x, y, d, cor) => {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: cor }, line: { color: cor, width: 0 } });
    s.addImage({ data: IC[chave], x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
  };
  // cartão com ícone, título e descrição curta
  function card(s, { x, y, w, h, icone: ic, cor = TEAL, titulo, texto, fundo = CLARO, corTitulo = NAVY, corTexto = TEXTO, tam = 13 }) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fundo }, line: { color: fundo, width: 0 }, rectRadius: 0.12, objectName: "card " + titulo });
    if (ic) circIcone(s, ic, x + 0.22, y + 0.22, 0.6, cor);
    s.addText(titulo, { x: x + (ic ? 0.95 : 0.25), y: y + 0.18, w: w - (ic ? 1.15 : 0.5), h: 0.65, fontSize: 15, bold: true, color: corTitulo, valign: "middle", isTextBox: true, margin: 0 });
    s.addText(texto, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: h - 1.1, fontSize: tam, color: corTexto, valign: "top", isTextBox: true, margin: 0 });
  }
  // cartão compacto: ícone à esquerda, título e descrição à direita (para listas de 4 cartões baixos)
  function cardLinha(s, { x, y, w, h, icone: ic, cor = TEAL, titulo, texto, tam = 11.5 }) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12, objectName: "card " + titulo });
    circIcone(s, ic, x + 0.2, y + (h - 0.6) / 2, 0.6, cor);
    s.addText(titulo, { x: x + 0.95, y: y + 0.1, w: w - 1.1, h: 0.4, fontSize: 13.5, bold: true, color: NAVY, valign: "middle", isTextBox: true, margin: 0 });
    s.addText(texto, { x: x + 0.95, y: y + 0.5, w: w - 1.1, h: h - 0.58, fontSize: tam, color: TEXTO, valign: "top", isTextBox: true, margin: 0 });
  }
  // cartão com imagem de peça
  function cardPeca(s, { x, y, w, h, img, titulo, texto, cor = TEAL }) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12, objectName: "peca " + titulo });
    const areaH = h * 0.56;
    const meta = dimensoes(img);
    let iw = w - 0.5, ih = iw * meta.h / meta.w;
    if (ih > areaH - 0.2) { ih = areaH - 0.2; iw = ih * meta.w / meta.h; }
    s.addImage({ path: img, x: x + (w - iw) / 2, y: y + 0.15 + (areaH - 0.2 - ih) / 2, w: iw, h: ih });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + areaH + 0.02, w: 0.16, h: 0.16, fill: { color: cor }, line: { color: cor, width: 0 } });
    s.addText(titulo, { x: x + 0.5, y: y + areaH - 0.08, w: w - 0.7, h: 0.36, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(texto, { x: x + 0.25, y: y + areaH + 0.32, w: w - 0.5, h: h - areaH - 0.45, fontSize: 11.5, color: TEXTO, isTextBox: true, margin: 0, valign: "top" });
  }
  function dimensoes(arq) {
    const b = fs.readFileSync(arq);
    if (b.slice(1, 4).toString() === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + b.readUInt16BE(i + 2); }
    return { w: 4, h: 3 };
  }
  const stat = (s, x, y, w, numero, rotulo, cor = TEAL, escuro = false) => {
    s.addText(numero, { x, y, w, h: 0.9, fontSize: 40, bold: true, color: cor, align: "center", isTextBox: true, margin: 0, valign: "bottom" });
    s.addText(rotulo, { x, y: y + 0.92, w, h: 0.7, fontSize: 12.5, color: escuro ? "CFE3EA" : TEXTO, align: "center", isTextBox: true, margin: 0, valign: "top" });
  };
  const seta = (s, x, y, w, cor = CINZA) => s.addShape(pres.ShapeType.rightArrow, { x, y, w, h: 0.5, fill: { color: cor }, line: { color: cor, width: 0 } });
  const bullets = (itens, opts = {}) => itens.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < itens.length - 1, paraSpaceAfter: 6, ...opts } }));

  // ================================================================ 1. CAPA
  pres.addSection({ title: "Abertura" });
  {
    const s = novo("CAPA", null, "Capa. Projeto aprovado no Edital 19/2026 FACEPE (Espaços CRIA), processo ARC-0645-1.03/26, ETE Epitácio Pessoa, Cabo de Santo Agostinho.");
    // faixa clara com as logos (todas na capa)
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.75, fill: { color: BRANCO }, line: { color: BRANCO, width: 0 } });
    const logos = ["logo espaco cria.png", "ete.png", "nct.png", "seepe.png", "FACEPE.png"];
    const LH = 1.0, GAP = 0.5; const dims = logos.map((l) => { const d = dimensoes(IMG(l)); const k = Math.min(LH / d.h, 3.4 / d.w); return { l, w: d.w * k, h: d.h * k }; });
    const total = dims.reduce((a, d) => a + d.w, 0) + GAP * (dims.length - 1);
    let lx = (W - total) / 2;
    dims.forEach((d) => { s.addImage({ path: IMG(d.l), x: lx, y: (1.75 - d.h) / 2, w: d.w, h: d.h }); lx += d.w + GAP; });
    s.addText("PROJETO DE PESQUISA · EDITAL Nº 19/2026 FACEPE — ESPAÇOS CRIA", { x: 0.9, y: 2.25, w: 11.5, h: 0.4, fontSize: 13, color: TEAL, bold: true, charSpacing: 2, isTextBox: true, margin: 0 });
    s.addText("Rede de Telemetria do Espaço CRIA", { x: 0.9, y: 2.7, w: 11.5, h: 1.2, fontSize: 48, bold: true, color: BRANCO, isTextBox: true, margin: 0, valign: "middle" });
    s.addText("Plataforma aberta de monitoramento para projetos de IoT", { x: 0.9, y: 3.9, w: 11.5, h: 0.6, fontSize: 24, color: "CFE3EA", isTextBox: true, margin: 0 });
    s.addText([
      { text: "ETE Epitácio Pessoa · Cabo de Santo Agostinho — PE", options: { breakLine: true } },
      { text: "Coordenação: Erly José da Costa Aquino  ·  Professor auxiliar: Richardson Robério da Silva Santos", options: { breakLine: true } },
      { text: "Estudantes bolsistas: Dayvyd Carlos · Neemias Vicente · Isabel Gabriely Demesio Florêncio · Douglas Edgar da Silva" },
    ], { x: 0.9, y: 4.9, w: 11.5, h: 1.4, fontSize: 14, color: "CFE3EA", isTextBox: true, margin: 0, paraSpaceAfter: 4 });
    s.addText("Processo ARC-0645-1.03/26  ·  vigência 01/07 a 31/12/2026  ·  código MIT, textos e vídeos CC BY", { x: 0.9, y: 6.55, w: 11.5, h: 0.4, fontSize: 11, color: "9FB3BE", isTextBox: true, margin: 0 });
  }

  // ================================================================ 2. EQUIPE
  {
    const s = novo("CONTEUDO", "Quem faz o projeto", "Seis bolsas FACEPE (2 BFI-8 e 4 BFI-10) homologadas em 31/08/2026, mais dois professores voluntários. Quatro frentes com rodízio quinzenal.");
    const pessoas = [
      ["Erly José da Costa Aquino", "Coordenador geral · Física", "pessoas", NAVY],
      ["Richardson Robério da Silva Santos", "Professor auxiliar", "pessoas", AZUL],
      ["Dayvyd Carlos", "Estudante bolsista", "chip", TEAL], ["Neemias Vicente", "Estudante bolsista", "servidor", TEAL],
      ["Isabel Gabriely Demesio Florêncio", "Estudante bolsista", "folha", VERDE], ["Douglas Edgar da Silva", "Estudante bolsista", "video", VERDE],
    ];
    pessoas.forEach(([nome, papel, ic, cor], i) => {
      const col = i % 3, lin = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.55 + lin * 2.05;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.9, h: 1.85, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 });
      circIcone(s, ic, x + 0.25, y + 0.3, 0.75, cor);
      s.addText(nome, { x: x + 1.15, y: y + 0.28, w: 2.6, h: 0.8, fontSize: 13.5, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "top" });
      s.addText(papel, { x: x + 1.15, y: y + 1.1, w: 2.6, h: 0.5, fontSize: 12.5, color: TEXTO, isTextBox: true, margin: 0 });
    });
    s.addText([{ text: "Colaboradores voluntários: ", options: { bold: true } }, { text: "Prof. Ewerton (escrita técnica, mídia e licenciamento) e Profa. Fabíola (hidroponia e testes com plantas).  " },
      { text: "Gestão escolar: ", options: { bold: true } }, { text: "Adelson Cordeiro de Moura e Silvio Anderson do Nascimento Melo." }],
      { x: 0.6, y: 5.85, w: 12.1, h: 0.7, fontSize: 12.5, color: TEXTO, isTextBox: true, margin: 0 });
    nav(s);
  }

  // ================================================================ 3. AGENDA (interativa)
  {
    const s = novo("CONTEUDO", "Roteiro — clique para navegar", "Agenda interativa: cada item é um link para a seção. A barra no rodapé de todos os slides também navega.");
    const itens = [
      ["1", "O projeto", "O que é telemetria (com a Fórmula 1), o problema da escola e a plataforma", "flag", "sec1", TEAL],
      ["2", "Laboratórios de teste", "Monitor de qualidade do ar e bancada hidropônica NFT", "folha", "sec2", VERDE],
      ["3", "Hardware", "ESP32, ADS1115 e todos os sensores", "chip", "sec3", AZUL],
      ["4", "Dados", "Coleta (MQTT), armazenamento (InfluxDB) e painel web", "banco", "sec4", AMBAR],
      ["5", "E depois?", "Habilidades, indústria, startups e o caso Tractian", "foguete", "sec5", VERM],
    ];
    itens.forEach(([n, t, d, ic, chave, cor], i) => {
      const y = 1.5 + i * 1.02;
      s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 12.1, h: 0.9, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.1 });
      circIcone(s, ic, 0.8, y + 0.15, 0.6, cor);
      s.addText([{ text: n + "  " + t, options: { hyperlink: { slide: N[chave], tooltip: "Ir para " + t }, bold: true, color: NAVY, fontSize: 18 } }], { x: 1.6, y: y + 0.05, w: 4.2, h: 0.8, isTextBox: true, margin: 0, valign: "middle" });
      s.addText(d, { x: 5.9, y: y + 0.05, w: 6.6, h: 0.8, fontSize: 13.5, color: TEXTO, isTextBox: true, margin: 0, valign: "middle" });
    });
    nav(s);
  }

  // ================================================================ SEÇÃO 1
  secaoAtual = "1 · O projeto"; pres.addSection({ title: secaoAtual });
  { const s = novo("SECAO", "1 · O projeto", null); s.addText("Telemetria: medir longe, decidir perto", { placeholder: "body" }); circIcone(s, "satelite", 0.9, 1.3, 1.0, "16405A"); nav(s, true, "sec1"); }

  // 5. telemetria + F1
  {
    const s = novo("CONTEUDO", "O que é telemetria?", "Tele (longe) + metron (medida). Exemplo da F1: cerca de 300 sensores por carro e ~1,1 milhão de pontos de dados por segundo (AWS/F1). Engenheiros no muro dos boxes e na fábrica decidem estratégia em tempo real.");
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.5, w: 5.6, h: 4.9, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15 });
    s.addText([{ text: "tele", options: { color: TEAL, bold: true } }, { text: " (longe)  +  ", options: { color: "CFE3EA" } }, { text: "metron", options: { color: TEAL, bold: true } }, { text: " (medida)", options: { color: "CFE3EA" } }],
      { x: 0.9, y: 1.7, w: 5.0, h: 0.6, fontSize: 20, isTextBox: true, margin: 0 });
    s.addText("Medir uma grandeza num lugar e transmitir a medida, automaticamente, para outro lugar — onde alguém (ou um programa) acompanha, guarda e decide.",
      { x: 0.9, y: 2.35, w: 5.0, h: 1.5, fontSize: 15, color: BRANCO, isTextBox: true, margin: 0 });
    const passos = [["sensor", "termo"], ["mede", "regua"], ["transmite", "radio"], ["guarda", "banco"], ["mostra", "grafico"]];
    passos.forEach(([t, ic], i) => { const x = 0.95 + i * 1.02; circIcone(s, ic, x, 4.2, 0.62, i === 2 ? TEAL : "1E4A5F"); s.addText(t, { x: x - 0.2, y: 4.9, w: 1.0, h: 0.35, fontSize: 11, color: "CFE3EA", align: "center", isTextBox: true, margin: 0 }); });
    s.addText("sinal → número → mensagem → série temporal → painel", { x: 0.9, y: 5.5, w: 5.0, h: 0.5, fontSize: 12, italic: true, color: "9FB3BE", isTextBox: true, margin: 0 });
    // lado F1
    s.addText("Na Fórmula 1", { x: 6.6, y: 1.5, w: 6.1, h: 0.5, fontSize: 20, bold: true, color: NAVY, isTextBox: true, margin: 0 });
    stat(s, 6.6, 2.0, 3.0, "~300", "sensores em cada carro", VERM);
    stat(s, 9.7, 2.0, 3.0, "1,1 mi", "pontos de dados por segundo", VERM);
    s.addText(bullets(["Pressão dos pneus, temperatura dos freios, giro do motor, aceleração em 3 eixos, posição do acelerador…",
      "Tudo vai por rádio ao muro dos boxes e à fábrica, no mesmo instante da volta.",
      "A estratégia (pit stop, modo do motor, chuva) é decidida olhando os dados, não só o carro."]),
      { x: 6.6, y: 3.75, w: 6.1, h: 2.6, fontSize: 14, color: TEXTO, isTextBox: true, margin: 0, valign: "top" });
    nav(s, false, "sec1");
  }

  // 6. da pista para a escola
  {
    const s = novo("CONTEUDO", "Da pista para a escola", "A mesma ideia, com outro orçamento: o carro vira um nó ESP32, o rádio vira Wi-Fi + MQTT, o muro dos boxes vira o painel web, o engenheiro vira o estudante.");
    const linhas = [["Carro de F1", "Nó de medição (ESP32 + sensores)", "carro", "chip"], ["Rádio do carro", "Rede Wi‑Fi própria da telemetria + MQTT", "radio", "wifi"],
      ["Muro dos boxes", "Painel web do servidor da escola", "flag", "grafico"], ["Engenheiros de dados", "Estudantes bolsistas", "pessoas", "escola"], ["Vencer a corrida", "Cultivar 25 alfaces e respirar ar limpo", "medalha", "folha"]];
    s.addText("FÓRMULA 1", { x: 0.6, y: 1.45, w: 5.2, h: 0.4, fontSize: 13, bold: true, color: VERM, charSpacing: 2, isTextBox: true, margin: 0 });
    s.addText("ESPAÇO CRIA", { x: 7.5, y: 1.45, w: 5.2, h: 0.4, fontSize: 13, bold: true, color: TEAL, charSpacing: 2, isTextBox: true, margin: 0 });
    linhas.forEach(([a, b, ia, ib], i) => {
      const y = 1.95 + i * 0.92;
      s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 5.2, h: 0.78, fill: { color: "FBE9E6" }, line: { color: "FBE9E6", width: 0 }, rectRadius: 0.1 });
      circIcone(s, ia, 0.75, y + 0.12, 0.54, VERM); s.addText(a, { x: 1.45, y, w: 4.2, h: 0.78, fontSize: 15, color: TEXTO, isTextBox: true, margin: 0, valign: "middle" });
      seta(s, 6.15, y + 0.14, 1.0, CINZA);
      s.addShape(pres.ShapeType.roundRect, { x: 7.5, y, w: 5.2, h: 0.78, fill: { color: "E3F6F3" }, line: { color: "E3F6F3", width: 0 }, rectRadius: 0.1 });
      circIcone(s, ib, 7.65, y + 0.12, 0.54, TEAL); s.addText(b, { x: 8.35, y, w: 4.2, h: 0.78, fontSize: 15, color: TEXTO, isTextBox: true, margin: 0, valign: "middle" });
    });
    nav(s, false, "sec1");
  }

  // 7. problema -> solução
  {
    const s = novo("CONTEUDO", "O problema e a plataforma", "Cada projeto do Espaço CRIA refazia do zero a coleta, o transporte e a exibição dos dados, e o histórico se perdia. A plataforma separa a infraestrutura de telemetria dos projetos que a usam: um serviço comum da escola.");
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.5, w: 4.3, h: 4.9, fill: { color: "FBE9E6" }, line: { color: "FBE9E6", width: 0 }, rectRadius: 0.15 });
    circIcone(s, "alerta", 0.85, 1.75, 0.7, VERM);
    s.addText("Antes", { x: 1.7, y: 1.75, w: 3.0, h: 0.7, fontSize: 22, bold: true, color: VERM, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(bullets(["Cada equipe refazia coleta, transporte e exibição", "Leituras só num display local", "Acabou o experimento, acabou o dado", "Nada para comparar semana a semana"]),
      { x: 0.85, y: 2.65, w: 3.8, h: 3.6, fontSize: 15.5, color: TEXTO, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 12 });
    seta(s, 5.1, 3.7, 0.8, CINZA);
    s.addText("A plataforma: um serviço de TIC comum da escola", { x: 6.1, y: 1.5, w: 6.6, h: 0.5, fontSize: 18, bold: true, color: NAVY, isTextBox: true, margin: 0 });
    const pecas = [["Servidor da escola", "Mosquitto (MQTT) + InfluxDB + painel web, na rede local, sem internet e sem serviço pago", "servidor", AZUL],
      ["Biblioteca‑padrão CriaTelemetria", "O ESP32 conecta, reconecta, formata, publica e guarda na flash o que não conseguiu enviar", "chip", TEAL],
      ["Catálogo de tópicos", "O endereço e o formato de cada mensagem: cria/{projeto}/{no}/{grandeza}", "livro", VERDE]];
    pecas.forEach(([t, d, ic, cor], i) => card(s, { x: 6.1, y: 2.1 + i * 1.47, w: 6.6, h: 1.35, icone: ic, cor, titulo: t, texto: d, tam: 12.5 }));
    nav(s, false, "sec1");
  }

  // 8. números
  {
    const s = novo("ESCURO", "O projeto em números", "Dados do Termo de Outorga e do relatório parcial (mythos-fomento): R$ 41.646 concedidos, 6 bolsas, 6 meses, 13 oficinas, TRL 3 para 7, 2 projetos-teste, 6 critérios de aceitação.");
    const nums = [["R$ 41,6 mil", "concedidos pela FACEPE", AMBAR], ["6", "bolsistas (2 professores, 4 estudantes)", TEAL], ["6 meses", "de vigência (jul–dez 2026)", TEAL],
      ["13", "oficinas de formação técnica", VERDE], ["TRL 3 → 7", "da prova de conceito à operação", AMBAR], ["2", "laboratórios de teste: ar e horta", VERDE],
      ["8", "grandezas medidas na horta", TEAL], ["< 1 %", "de perda de pacotes em 24 h (meta)", VERDE]];
    nums.forEach(([n, r, cor], i) => { const col = i % 4, lin = Math.floor(i / 4); stat(s, 0.6 + col * 3.05, 1.95 + lin * 2.1, 2.95, n, r, cor, true); });
    nav(s, true, "sec1");
  }

  // ================================================================ SEÇÃO 2
  secaoAtual = "2 · Laboratórios"; pres.addSection({ title: secaoAtual });
  { const s = novo("SECAO", "2 · Laboratórios de teste", null); s.addText("Um caso simples (o ar da sala) e um caso difícil (a horta)", { placeholder: "body" }); circIcone(s, "folha", 0.9, 1.3, 1.0, "16405A"); nav(s, true, "sec2"); }

  // 10. lab ar
  {
    const s = novo("CONTEUDO", "Laboratório 1 — Monitor de qualidade do ar", "Reconstrói em ESP32 o monitor que a escola tinha em Arduino. MQ-2 e MQ-135 (Rs/R0, relativos), MH-Z19C (CO2 em ppm), DHT22. Referência ANVISA RE 9/2003: 1000 ppm de CO2.");
    s.addImage({ path: PECA("mhz19c"), x: 0.9, y: 1.7, w: 3.2, h: 3.2 * 419 / 600 });
    s.addImage({ path: PECA("mq"), x: 1.2, y: 4.2, w: 1.3, h: 1.3 * 600 / 383 });
    s.addImage({ path: PECA("dht22_corte"), x: 2.85, y: 4.25, w: 0.95, h: 0.95 * 330 / 182 });
    s.addText("Nó cria/ar/no1", { x: 0.7, y: 6.35, w: 3.6, h: 0.35, fontSize: 11, italic: true, color: CINZA, isTextBox: true, margin: 0 });
    const itens = [["CO₂ por infravermelho", "MH‑Z19C: 400–5000 ppm. Acima de 1000 ppm a sala está mal ventilada (ANVISA RE 9/2003)", "vento", AMBAR],
      ["Gás e fumaça", "MQ‑2 (GLP, fumaça) e MQ‑135 (“ar viciado”): leitura relativa Rs/R0, calibrada em ar limpo", "alerta", VERM],
      ["Temperatura e umidade", "DHT22: ajuda a interpretar os MQ, que variam com o clima", "termo", AZUL],
      ["Por que é o caso simples", "Poucos sensores, leitura direta, sem soluções‑padrão para calibrar — valida a plataforma de ponta a ponta", "check", VERDE]];
    itens.forEach(([t, d, ic, cor], i) => cardLinha(s, { x: 4.9, y: 1.5 + i * 1.25, w: 7.8, h: 1.15, icone: ic, cor, titulo: t, texto: d, tam: 12 }));
    nav(s, false, "sec2");
  }

  // 11. lab horta
  {
    const s = novo("CONTEUDO", "Laboratório 2 — Bancada hidropônica NFT", "25 posições de alface em NFT (lâmina de nutrientes). Três nós: no1 solução nutritiva (pH, condutividade, temperatura, vazão, pressão, nível, bomba), no2 ambiente (umidade, iluminância), no3 câmera (time-lapse). Caso difícil: 8 grandezas correlacionadas (as seis do no1 + umidade e iluminância do no2; bomba e temperatura do ar são complementares), ambiente úmido, calibração real.");
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.5, w: 4.0, h: 4.9, fill: { color: "EAF6E3" }, line: { color: "EAF6E3", width: 0 }, rectRadius: 0.15 });
    circIcone(s, "folha", 0.85, 1.75, 0.8, VERDE);
    s.addText("NFT = técnica do filme de nutrientes", { x: 1.85, y: 1.75, w: 2.6, h: 0.8, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(bullets(["25 plantas de alface em calhas inclinadas", "A bomba faz a solução circular do reservatório pelas calhas e voltar", "Ciclo de 30–45 dias: a fonte dos dados densos que validam a plataforma", "A solução precisa de pH ~5,5–6,5 e condutividade ~1500 µS/cm"]),
      { x: 0.85, y: 2.75, w: 3.5, h: 3.5, fontSize: 14, color: TEXTO, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 10 });
    const nos = [["no1 · solução nutritiva", "pH · condutividade · temperatura da solução · vazão · pressão · nível (boia) · bomba (relé). Leva o relógio DS3231 e corta a bomba se a solução baixar", "vidro", TEAL],
      ["no2 · ambiente da bancada", "umidade e temperatura do ar (DHT22) · iluminância (BH1750) para o fotoperíodo", "sol", AMBAR],
      ["no3 · câmera", "ESP32‑CAM fotografa o cultivo para o time‑lapse; as fotos vão por HTTP, não pelo MQTT", "camera", AZUL]];
    nos.forEach(([t, d, ic, cor], i) => card(s, { x: 4.9, y: 1.5 + i * 1.65, w: 7.8, h: 1.52, icone: ic, cor, titulo: t, texto: d, tam: 12.5 }));
    nav(s, false, "sec2");
  }

  // ================================================================ SEÇÃO 3
  secaoAtual = "3 · Hardware"; pres.addSection({ title: secaoAtual });
  { const s = novo("SECAO", "3 · Hardware", null); s.addText("O cérebro, o conversor e os sensores de cada nó", { placeholder: "body" }); circIcone(s, "chip", 0.9, 1.3, 1.0, "16405A"); nav(s, true, "sec3"); }

  // 13. cérebro
  {
    const s = novo("CONTEUDO", "O cérebro de cada nó: ESP32 + ADS1115", "ESP32: Wi-Fi integrado, dois núcleos, barato. ADS1115: conversor A/D de 16 bits por I2C, porque o ADC interno do ESP32 é não linear e ruidoso — pH e condutividade exigem resolução fina. Conversor de nível lógico quando o ADS1115 é alimentado em 5 V.");
    s.addImage({ path: PECA("esp32"), x: 0.9, y: 1.55, w: 2.0, h: 2.0 * 600 / 321 });
    s.addImage({ path: PECA("ads1115"), x: 3.3, y: 1.55 + 2.0 * 600 / 321 - 2.6 * 1000 / 1375, w: 2.6, h: 2.6 * 1000 / 1375 });
    s.addText("ESP32 DevKit V1", { x: 0.6, y: 5.4, w: 2.6, h: 0.35, fontSize: 12, bold: true, color: NAVY, align: "center", isTextBox: true, margin: 0 });
    s.addText("ADS1115 (16 bits, I2C)", { x: 3.3, y: 5.4, w: 2.6, h: 0.35, fontSize: 12, bold: true, color: NAVY, align: "center", isTextBox: true, margin: 0 });
    const itens = [["ESP32", "Wi‑Fi e Bluetooth no chip, 2 núcleos, 3,3 V. Programado em C++ (Arduino) com a biblioteca CriaTelemetria", "wifi", TEAL],
      ["Por que um A/D externo", "O ADC do ESP32 tem 12 bits, é não linear e ruidoso, e o ADC2 nem funciona com o Wi‑Fi ligado. O ADS1115 tem 16 bits (32 768 níveis na faixa positiva, 8× o ESP32), ganho programável e envia o número pronto por I2C", "regua", AZUL],
      ["Níveis de tensão", "Sensores de 5 V (MQ, pH) → divisor de tensão ou ADS1115 em 5 V com conversor de nível no I2C. GPIO 21/22 reservados ao I2C", "raio", AMBAR]];
    itens.forEach(([t, d, ic, cor], i) => card(s, { x: 6.4, y: 1.5 + i * 1.65, w: 6.3, h: 1.52, icone: ic, cor, titulo: t, texto: d, tam: 12 }));
    nav(s, false, "sec3");
  }

  // 14. sensores do ar
  {
    const s = novo("CONTEUDO", "Sensores do monitor de ar", "Quatro sensores do nó de ar. Imagens dos esquemas Fritzing das aulas do Espaço CRIA.");
    const cs = [[PECA("dht22_corte"), "DHT22 / AM2302", "Temperatura (±0,5 °C) e umidade (±2 %). Sensor capacitivo + termistor; 1 fio de dados", AZUL],
      [PECA("mq"), "MQ‑2", "Gás inflamável (GLP, H₂) e fumaça. SnO₂ aquecido a ~300 °C: a resistência cai com o gás", VERM],
      [PECA("mq"), "MQ‑135", "“Ar viciado”: NH₃, álcool, benzeno, fumaça. Sensível também a CO₂, mas sem dar concentração — por isso o MH‑Z19C", AMBAR],
      [PECA("mhz19c"), "MH‑Z19C", "CO₂ real, 400–5000 ppm, por absorção de infravermelho (NDIR). UART 9600 baud, aquece em 1 min", TEAL]];
    cs.forEach(([img, t, d, cor], i) => cardPeca(s, { x: 0.6 + i * 3.1, y: 1.6, w: 2.95, h: 4.5, img, titulo: t, texto: d, cor }));
    nav(s, false, "sec3");
  }

  // 15. sensores da horta I
  {
    const s = novo("CONTEUDO", "Sensores da horta — a solução nutritiva", "Nó no1: pH-4502C pelo ADS1115 (calibrado com tampões 4 e 7), condutividade/TDS pelo ADS1115 (compensada por temperatura), DS18B20 à prova d'água, YF-S201 (pulsos por litro).");
    const cs = [[PECA("ph"), "pH‑4502C + eletrodo", "Acidez da solução (pH 0–14). Eletrodo de vidro, equação de Nernst: 59 mV por pH. Lido pelo ADS1115; meta ±0,2 pH", TEAL],
      [null, "Condutividade (TDS)", "Quantidade de sais, em µS/cm — o “alimento” disponível. Lido pelo ADS1115 e compensado pela temperatura; meta ±5 %", VERDE],
      [PECA("ds18b20"), "DS18B20", "Temperatura da solução, sonda de inox à prova d'água. 1‑Wire; usada para compensar a condutividade", AZUL],
      [PECA("yfs201_corte"), "YF‑S201", "Vazão da recirculação (L/min). Turbina + ímã + sensor Hall: ~450 pulsos por litro", AMBAR]];
    cs.forEach(([img, t, d, cor], i) => {
      const x = 0.6 + i * 3.1;
      const Y = 1.6, HH = 4.5, AH = HH * 0.56;
      if (img) cardPeca(s, { x, y: Y, w: 2.95, h: HH, img, titulo: t, texto: d, cor });
      else { s.addShape(pres.ShapeType.roundRect, { x, y: Y, w: 2.95, h: HH, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 }); circIcone(s, "onda", x + 0.85, Y + 0.55, 1.25, cor);
        s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: Y + AH + 0.02, w: 0.16, h: 0.16, fill: { color: cor }, line: { color: cor, width: 0 } });
        s.addText(t, { x: x + 0.5, y: Y + AH - 0.08, w: 2.25, h: 0.36, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
        s.addText(d, { x: x + 0.25, y: Y + AH + 0.32, w: 2.45, h: HH - AH - 0.45, fontSize: 11.5, color: TEXTO, isTextBox: true, margin: 0, valign: "top" }); }
    });
    nav(s, false, "sec3");
  }

  // 16. sensores da horta II
  {
    const s = novo("CONTEUDO", "Sensores da horta — ambiente, nível e atuadores", "Pressão da linha da bomba (0–1,2 MPa, ADS1115), boia de nível (protege a bomba: corta em ~7 s, religa em ~1 min), DHT22 e BH1750 no no2, ESP32-CAM no no3, RTC DS3231 e módulo relé.");
    const cs = [[null, "velocimetro", "Pressão da linha", "Sensor 0–1,2 MPa, em kPa, pelo ADS1115: mostra se a bomba está empurrando", AMBAR],
      [null, "toggle", "Boia de nível", "Estado 1/0. Solução abaixo da boia → o nó corta a bomba (proteção) e religa quando volta", VERM],
      [PECA("dht22_corte"), null, "DHT22 + BH1750", "Umidade e temperatura do ar; iluminância em lux (fotoperíodo) — nó no2", AZUL],
      [PECA("esp32cam"), null, "ESP32‑CAM", "Fotos do cultivo para o time‑lapse (nó no3), enviadas por HTTP e guardadas por dia", TEAL],
      [null, "relogio", "RTC DS3231", "Hora certa depois de um corte de energia sem rede (bateria CR2032)", VERDE],
      [PECA("rele"), null, "Módulo relé", "Liga e corta a bomba pelo contato NF: sem o nó, a bomba continua ligada", NAVY]];
    cs.forEach(([img, ic, t, d, cor], i) => {
      const col = i % 3, lin = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.5 + lin * 2.5, w = 3.9, h = 2.35;
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 });
      if (img) { const m = dimensoes(img); let ih = 1.5, iw = ih * m.w / m.h; if (iw > 1.25) { iw = 1.25; ih = iw * m.h / m.w; } s.addImage({ path: img, x: x + 0.25 + (1.25 - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih }); }
      else circIcone(s, ic, x + 0.45, y + 0.7, 0.9, cor);
      s.addText(t, { x: x + 1.75, y: y + 0.25, w: w - 1.95, h: 0.6, fontSize: 14, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
      s.addText(d, { x: x + 1.75, y: y + 0.9, w: w - 1.95, h: h - 1.05, fontSize: 11.5, color: TEXTO, isTextBox: true, margin: 0 });
    });
    nav(s, false, "sec3");
  }

  // ================================================================ SEÇÃO 4
  secaoAtual = "4 · Dados"; pres.addSection({ title: secaoAtual });
  { const s = novo("SECAO", "4 · Dados", null); s.addText("Do sensor ao painel: coleta, transporte, armazenamento e frontend", { placeholder: "body" }); circIcone(s, "banco", 0.9, 1.3, 1.0, "16405A"); nav(s, true, "sec4"); }

  // 18. coleta
  {
    const s = novo("CONTEUDO", "Coleta: do sensor à mensagem", "Cada leitura vira uma linha JSON publicada num tópico MQTT. seq e boot permitem medir perda de pacotes; t (ms) permite medir latência. A biblioteca guarda em flash as leituras que não puder enviar e reenvia quando a rede volta.");
    const etapas = [["Sensor", "sinal analógico ou digital", "termo", AZUL], ["ESP32 lê", "ADC, I2C, UART ou pulsos", "chip", TEAL], ["Biblioteca formata", "nome, valor, unidade, hora", "engrenagem", VERDE], ["Publica", "Wi‑Fi → MQTT a cada 10 s", "wifi", AMBAR]];
    etapas.forEach(([t, d, ic, cor], i) => { const x = 0.6 + i * 3.15; circIcone(s, ic, x + 0.95, 1.5, 1.0, cor); s.addText(t, { x, y: 2.6, w: 2.9, h: 0.4, fontSize: 16, bold: true, color: NAVY, align: "center", isTextBox: true, margin: 0 }); s.addText(d, { x, y: 3.0, w: 2.9, h: 0.5, fontSize: 12, color: TEXTO, align: "center", isTextBox: true, margin: 0 }); if (i < 3) seta(s, x + 2.95, 1.75, 0.45, CINZA); });
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 3.75, w: 12.1, h: 2.65, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15 });
    s.addText("tópico", { x: 0.9, y: 3.9, w: 2, h: 0.35, fontSize: 11, bold: true, color: TEAL, charSpacing: 2, isTextBox: true, margin: 0 });
    s.addText("cria/horta/no1/ph", { x: 0.9, y: 4.25, w: 5.5, h: 0.5, fontSize: 22, fontFace: "Courier New", color: BRANCO, isTextBox: true, margin: 0 });
    s.addText("cria / {projeto} / {no} / {grandeza}", { x: 0.9, y: 4.8, w: 5.5, h: 0.4, fontSize: 13, color: "9FB3BE", isTextBox: true, margin: 0 });
    s.addText("mensagem (JSON)", { x: 6.7, y: 3.9, w: 3, h: 0.35, fontSize: 11, bold: true, color: TEAL, charSpacing: 2, isTextBox: true, margin: 0 });
    s.addText('{"valor": 6.12, "unidade": "pH",\n "seq": 1834, "boot": 7,\n "t": 1792345678123}', { x: 6.7, y: 4.25, w: 5.8, h: 1.3, fontSize: 15, fontFace: "Courier New", color: BRANCO, isTextBox: true, margin: 0, valign: "top" });
    s.addText([{ text: "seq ", options: { bold: true, color: TEAL } }, { text: "numera as leituras (perda de pacotes)   " }, { text: "boot ", options: { bold: true, color: TEAL } }, { text: "conta reinícios   " }, { text: "t ", options: { bold: true, color: TEAL } }, { text: "hora em ms (latência)" }],
      { x: 0.9, y: 5.75, w: 11.5, h: 0.5, fontSize: 12.5, color: "CFE3EA", isTextBox: true, margin: 0 });
    nav(s, false, "sec4");
  }

  // 19. transporte
  {
    const s = novo("CONTEUDO", "Transporte: MQTT com Mosquitto", "Publicar/assinar: o nó publica num tópico, o servidor assina cria/#. Senha e ACL por projeto (quem pode publicar onde). Arduinos legados entram pela USB através do gateway em Python, que envia por HTTP com a senha do projeto.");
    circIcone(s, "chip", 0.9, 2.2, 1.1, TEAL); s.addText("Nós ESP32\npublicam", { x: 0.5, y: 3.4, w: 1.9, h: 0.7, fontSize: 12, align: "center", color: TEXTO, isTextBox: true, margin: 0 });
    seta(s, 2.6, 2.5, 1.2, CINZA);
    s.addShape(pres.ShapeType.roundRect, { x: 4.0, y: 1.55, w: 3.6, h: 2.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15 });
    circIcone(s, "troca", 5.25, 1.75, 1.1, "1E4A5F"); s.addText("Mosquitto\nbroker MQTT", { x: 4.1, y: 2.95, w: 3.4, h: 0.9, fontSize: 15, bold: true, color: BRANCO, align: "center", isTextBox: true, margin: 0 });
    seta(s, 7.8, 2.5, 1.2, CINZA);
    circIcone(s, "servidor", 9.5, 2.2, 1.1, AZUL); s.addText("Servidor assina\ncria/#", { x: 9.1, y: 3.4, w: 1.9, h: 0.7, fontSize: 12, align: "center", color: TEXTO, isTextBox: true, margin: 0 });
    circIcone(s, "grafico", 11.4, 2.2, 1.1, VERDE); s.addText("Painel\nao vivo", { x: 11.0, y: 3.4, w: 1.9, h: 0.7, fontSize: 12, align: "center", color: TEXTO, isTextBox: true, margin: 0 });
    const itens = [["Publicar / assinar", "O nó não sabe quem lê; o servidor não sabe quantos nós existem. Acoplamento mínimo", "radio", TEAL],
      ["Senha e ACL por projeto", "O usuário ar só publica em cria/ar/#; o usuário horta só em cria/horta/#", "cadeado", AMBAR],
      ["Caminho USB para o Arduino", "Placas sem rede mandam JSON pela USB; o gateway em Python envia por HTTP com a senha do projeto", "troca", AZUL]];
    itens.forEach(([t, d, ic, cor], i) => card(s, { x: 0.6 + i * 4.1, y: 4.45, w: 3.9, h: 1.95, icone: ic, cor, titulo: t, texto: d, tam: 11.5 }));
    nav(s, false, "sec4");
  }

  // 20. armazenamento
  {
    const s = novo("CONTEUDO", "Armazenamento: séries temporais", "InfluxDB 2: banco feito para séries temporais (valor + hora). chrony dá a hora certa aos nós (NTP local) porque a rede não tem internet; sem hora certa o servidor recusa a leitura. Exportação em CSV no padrão brasileiro. Backup do banco em servidor/base/backup.");
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.5, w: 5.0, h: 4.9, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15 });
    circIcone(s, "banco", 0.9, 1.75, 0.8, "1E4A5F");
    s.addText("InfluxDB 2", { x: 1.9, y: 1.75, w: 3.5, h: 0.8, fontSize: 24, bold: true, color: BRANCO, isTextBox: true, margin: 0, valign: "middle" });
    s.addText("Uma série temporal é uma lista de pares (hora, valor). O banco guarda milhões deles, comprime e responde rápido a perguntas como “o CO₂ das últimas 24 h”.",
      { x: 0.9, y: 2.75, w: 4.4, h: 1.6, fontSize: 15, color: "CFE3EA", isTextBox: true, margin: 0 });
    s.addText("Uma leitura, como o banco a guarda:", { x: 0.9, y: 4.35, w: 4.4, h: 0.35, fontSize: 12, italic: true, color: "9FB3BE", isTextBox: true, margin: 0 });
    s.addText([{ text: "medição  ", options: { color: TEAL, bold: true } }, { text: "horta/no1/ph", options: { breakLine: true } }, { text: "hora     ", options: { color: TEAL, bold: true } }, { text: "2026-11-20 14:02:10", options: { breakLine: true } }, { text: "valor    ", options: { color: TEAL, bold: true } }, { text: "6,12 pH" }],
      { x: 0.9, y: 4.75, w: 4.4, h: 1.4, fontSize: 14, fontFace: "Courier New", color: BRANCO, isTextBox: true, margin: 0 });
    const itens = [["Hora certa sem internet", "O servidor é também o relógio da rede (chrony/NTP). O nó só publica depois de acertar a hora; o DS3231 cobre quedas de energia", "relogio", AMBAR],
      ["Fila na memória flash", "Se o Wi‑Fi cair, a biblioteca guarda as leituras e reenvia depois, com a hora original e a marca fila:1", "loop", TEAL],
      ["CSV para a planilha", "Qualquer período exportado em CSV no padrão brasileiro (ponto e vírgula, vírgula decimal): abre no LibreOffice", "csv", VERDE]];
    itens.forEach(([t, d, ic, cor], i) => card(s, { x: 5.9, y: 1.5 + i * 1.65, w: 6.8, h: 1.52, icone: ic, cor, titulo: t, texto: d, tam: 12 }));
    nav(s, false, "sec4");
  }

  // 21. frontend
  {
    const s = novo("CONTEUDO", "Frontend: o painel web da escola", "Node.js com Fastify e Socket.IO: o servidor recebe do MQTT, grava no InfluxDB e empurra ao navegador por WebSocket. Meta: menos de 2 s entre a leitura no nó e o gráfico. Um cartão por grandeza, estado on-line/off-line de cada nó, CSV por nó e por período.");
    const m = dimensoes(IMG("painel-geral-corte.jpg")); const pw = 7.9, ph = pw * m.h / m.w;
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.45, w: pw + 0.2, h: ph + 0.2, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 });
    s.addImage({ path: IMG("painel-geral-corte.jpg"), x: 0.6, y: 1.55, w: pw, h: ph, rounding: false });
    s.addText("Painel ao vivo (projeto teste): um cartão por grandeza, gráfico da última hora, estado do nó e CSV", { x: 0.6, y: 1.65 + ph + 0.1, w: pw, h: 0.4, fontSize: 11, italic: true, color: CINZA, isTextBox: true, margin: 0 });
    const itens = [["Node.js + Fastify", "Servidor HTTP e rotas da API (/api/historico, /api/imagens, saúde)", "servidor", AZUL],
      ["Socket.IO (WebSocket)", "O servidor empurra cada leitura ao navegador: nada de recarregar a página", "raio", TEAL],
      ["HTML, CSS e JavaScript", "Painel sem framework pesado: roda no computador da escola e no celular", "grafico", VERDE],
      ["< 2 s de latência", "Da leitura no nó ao gráfico — um dos seis critérios de aceitação", "velocimetro", AMBAR]];
    itens.forEach(([t, d, ic, cor], i) => cardLinha(s, { x: 9.0, y: 1.45 + i * 1.25, w: 3.8, h: 1.15, icone: ic, cor, titulo: t, texto: d, tam: 10.5 }));
    nav(s, false, "sec4");
  }

  // 22. arquitetura
  {
    const s = novo("CONTEUDO", "A arquitetura completa", "Diagrama do repositório telemetria-cria (tutoriais/imagens/arquitetura.svg). Tudo roda na rede local da escola, num computador Linux com no-break e IP fixo.");
    const m = dimensoes(IMG("arquitetura.png")); let aw = 12.1, ah = aw * m.h / m.w; if (ah > 5.0) { ah = 5.0; aw = ah * m.w / m.h; }
    s.addImage({ path: IMG("arquitetura.png"), x: (W - aw) / 2, y: 1.45 + (5.0 - ah) / 2, w: aw, h: ah });
    s.addText("Tudo na rede local da escola: sem internet e sem serviço pago. Diagrama do repositório telemetria‑cria (tutoriais/imagens/arquitetura.svg).", { x: 0.6, y: 6.5, w: 12.1, h: 0.4, fontSize: 11.5, italic: true, color: CINZA, align: "center", isTextBox: true, margin: 0 });
    nav(s, false, "sec4");
  }

  // 23. critérios
  {
    const s = novo("ESCURO", "Quando a plataforma está pronta? Seis critérios", "Teste de aceitação declarado de antemão no plano de trabalho. Resultados em validacao/relatorio-validacao.md.");
    const cs = [["< 1 %", "de perda de pacotes em 24 h de operação contínua", "check"], ["< 2 s", "de latência do nó ao painel, publicando a cada 10 s", "velocimetro"],
      ["± 0,2 pH", "frente a um tampão de verificação não usado na calibração", "vidro"], ["± 5 %", "na condutividade frente a solução‑padrão", "balanca"],
      ["≥ 95 %", "de disponibilidade do servidor, com no‑break", "servidor"], ["30 min", "para alguém de fora pôr um sensor novo publicando, só com a biblioteca e o catálogo", "pessoas"]];
    cs.forEach(([n, d, ic], i) => {
      const col = i % 3, lin = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.55 + lin * 2.45;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.9, h: 2.3, fill: { color: "16405A" }, line: { color: "16405A", width: 0 }, rectRadius: 0.12 });
      circIcone(s, ic, x + 0.25, y + 0.25, 0.65, TEAL);
      s.addText(n, { x: x + 1.05, y: y + 0.2, w: 2.7, h: 0.75, fontSize: 28, bold: true, color: BRANCO, isTextBox: true, margin: 0, valign: "middle" });
      s.addText(d, { x: x + 0.25, y: y + 1.05, w: 3.4, h: 1.15, fontSize: 12.5, color: "CFE3EA", isTextBox: true, margin: 0 });
    });
    nav(s, true, "sec4");
  }

  // 24. método
  {
    const s = novo("CONTEUDO", "Como trabalhamos", "Aprendizagem baseada em projetos com entrega real para terceiros. Quatro frentes com rodízio quinzenal, caderno de projeto versionado em Git, 13 oficinas (Git, ESP32, MQTT, ADS1115, impressão 3D...), decisões técnicas registradas em decisoes/.");
    const frentes = [["Firmware e nós", "chip", TEAL], ["Servidor e painel", "servidor", AZUL], ["Horta e instrumentação", "folha", VERDE], ["Documentação e mídia", "video", AMBAR]];
    frentes.forEach(([t, ic, cor], i) => { const x = 0.6 + i * 3.1; s.addShape(pres.ShapeType.roundRect, { x, y: 1.5, w: 2.95, h: 2.2, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 }); circIcone(s, ic, x + 1.03, 1.75, 0.9, cor); s.addText(t, { x: x + 0.15, y: 2.75, w: 2.65, h: 0.8, fontSize: 15, bold: true, color: NAVY, align: "center", isTextBox: true, margin: 0, valign: "middle" }); });
    s.addText("4 frentes com rodízio a cada quinzena: ninguém termina dominando uma camada só", { x: 0.6, y: 3.85, w: 12.1, h: 0.4, fontSize: 13, italic: true, color: CINZA, align: "center", isTextBox: true, margin: 0 });
    const itens = [["13 oficinas de formação", "Método e Git · ESP32 · MQTT e ADS1115 · servidor · calibração · impressão 3D (8 sábados) · vídeo", "livro", VERDE],
      ["Caderno + repositório Git", "Cada decisão técnica num arquivo com data, motivo e o que se perde. Código MIT, textos CC BY", "git", NAVY],
      ["Validação numérica", "Calibração contra soluções‑padrão e teste de aceitação de 24 h antes de dizer “pronto”", "prancheta", AMBAR]];
    itens.forEach(([t, d, ic, cor], i) => card(s, { x: 0.6 + i * 4.1, y: 4.4, w: 3.9, h: 2.0, icone: ic, cor, titulo: t, texto: d, tam: 12 }));
    nav(s, false, "sec4");
  }

  // ================================================================ SEÇÃO 5
  secaoAtual = "5 · E depois?"; pres.addSection({ title: secaoAtual });
  { const s = novo("SECAO", "5 · E depois?", null); s.addText("O que estas habilidades valem na indústria e nas startups", { placeholder: "body" }); circIcone(s, "foguete", 0.9, 1.3, 1.0, "16405A"); nav(s, true, "sec5"); }

  // 26. habilidades
  {
    const s = novo("CONTEUDO", "As habilidades que o projeto ensina", "Mapa das competências desenvolvidas e de onde o mercado as usa. IoT industrial, agricultura de precisão, cidades inteligentes, energia e saúde contratam exatamente esta pilha.");
    const hab = [["Firmware embarcado", "C++ no ESP32, sensores, interrupções, I2C/UART", "chip", TEAL, "Automação industrial, IoT, robótica"],
      ["Redes e protocolos", "Wi‑Fi, MQTT, HTTP, JSON, segurança por ACL", "wifi", AZUL, "Telecom, cloud, DevOps"],
      ["Dados em série temporal", "InfluxDB, CSV, análise em Python/planilha", "banco", VERDE, "Ciência de dados, BI, manutenção"],
      ["Web em tempo real", "Node.js, Fastify, WebSocket, painéis", "grafico", AMBAR, "Desenvolvimento web, produtos SaaS"],
      ["Metrologia e calibração", "Tampões, soluções‑padrão, incerteza, critérios de aceitação", "balanca", VERM, "Laboratórios, qualidade, agro"],
      ["Método e colaboração", "Git, caderno de projeto, decisões registradas, rodízio", "git", NAVY, "Qualquer equipe de engenharia"]];
    hab.forEach(([t, d, ic, cor, onde], i) => {
      const col = i % 3, lin = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.5 + lin * 2.5, w = 3.9, h = 2.35;
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 });
      circIcone(s, ic, x + 0.25, y + 0.25, 0.6, cor);
      s.addText(t, { x: x + 1.0, y: y + 0.2, w: w - 1.2, h: 0.7, fontSize: 14.5, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
      s.addText(d, { x: x + 0.25, y: y + 1.0, w: w - 0.5, h: 0.75, fontSize: 12, color: TEXTO, isTextBox: true, margin: 0 });
      s.addText([{ text: "Onde se usa: ", options: { bold: true, color: cor } }, { text: onde }], { x: x + 0.25, y: y + 1.75, w: w - 0.5, h: 0.5, fontSize: 11, color: TEXTO, isTextBox: true, margin: 0 });
    });
    nav(s, false, "sec5");
  }

  // 27. Tractian
  {
    const s = novo("ESCURO", "Caso: Tractian — telemetria que vira empresa", "Startup brasileira fundada em 2019 (São Paulo) por Igor Marinelli e Gabriel Lameirinhas. Produto principal: Smart Trac, sensor sem fio de vibração e temperatura colado na máquina; a IA diagnostica desbalanceamento, desalinhamento, folga, falta de lubrificação. TracOS: plataforma de gestão da manutenção. Rodadas divulgadas na imprensa: R$ 17 mi (2021), R$ 80 mi (2022, fundo ligado à Siemens) e Série C de US$ 120 mi (2024). Mesma cadeia do nosso projeto: sensor → rádio → banco → painel → decisão.");
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.5, w: 5.4, h: 4.9, fill: { color: "16405A" }, line: { color: "16405A", width: 0 }, rectRadius: 0.15 });
    circIcone(s, "industria", 0.9, 1.75, 0.9, AMBAR);
    s.addText("Startup brasileira (São Paulo, 2019)", { x: 2.0, y: 1.75, w: 3.8, h: 0.9, fontSize: 16, bold: true, color: BRANCO, isTextBox: true, margin: 0, valign: "middle" });
    s.addText([{ text: "Smart Trac", options: { bold: true, color: TEAL } }, { text: " — um sensor sem fio de vibração e temperatura colado na carcaça de motores, bombas e redutores. A inteligência artificial reconhece a “assinatura” de cada falha antes de a máquina parar.", options: { breakLine: true } },
      { text: " ", options: { breakLine: true } }, { text: "TracOS", options: { bold: true, color: TEAL } }, { text: " — a plataforma que recebe os dados, abre ordens de serviço e organiza a manutenção da fábrica inteira." }],
      { x: 0.9, y: 2.85, w: 4.8, h: 3.4, fontSize: 15, color: "CFE3EA", isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 8 });
    s.addText("Manutenção preditiva: consertar antes de quebrar", { x: 6.4, y: 1.5, w: 6.3, h: 0.5, fontSize: 18, bold: true, color: BRANCO, isTextBox: true, margin: 0 });
    const cadeia = [["Sensor na máquina", "vibração e temperatura", "onda"], ["Rádio / nuvem", "dados a cada poucos minutos", "nuvem"], ["IA diagnostica", "desbalanceamento, folga, lubrificação", "cereb"], ["Ordem de serviço", "a equipe age antes da parada", "prancheta"]];
    cadeia.forEach(([t, d, ic], i) => { const y = 2.15 + i * 0.95; circIcone(s, ic, 6.4, y, 0.62, i === 2 ? AMBAR : TEAL); s.addText([{ text: t, options: { bold: true, color: BRANCO } }, { text: "  " + d, options: { color: "CFE3EA" } }], { x: 7.2, y, w: 5.5, h: 0.62, fontSize: 13.5, isTextBox: true, margin: 0, valign: "middle" }); });
    s.addText("Investimentos divulgados: R$ 17 mi (2021) · R$ 80 mi (2022, fundo ligado à Siemens) · US$ 120 mi (Série C, 2024). É a nossa cadeia sensor → rádio → banco → painel, em escala de fábrica.",
      { x: 6.4, y: 5.95, w: 6.3, h: 0.5, fontSize: 10.5, italic: true, color: "9FB3BE", isTextBox: true, margin: 0 });
    nav(s, true, "sec5");
  }

  // 28. IoT em todo lugar
  {
    const s = novo("CONTEUDO", "IoT em todo lugar", "A Internet das Coisas (Gubbi et al., 2013): objetos com sensores e conexão trocando dados. As mesmas camadas — nó, transporte, banco, painel — aparecem em todas estas áreas.");
    const areas = [["Indústria 4.0", "máquinas monitoradas, manutenção preditiva, linhas que se ajustam sozinhas", "industria", NAVY],
      ["Agricultura de precisão", "umidade do solo, pH, irrigação sob demanda, estufas e hidroponia", "trator", VERDE],
      ["Cidades inteligentes", "qualidade do ar, trânsito, iluminação, nível de rios e enchentes", "cidade", AZUL],
      ["Energia", "medidores inteligentes, painéis solares, consumo em tempo real", "raio", AMBAR],
      ["Saúde", "monitores vestíveis, leitos conectados, cadeia do frio das vacinas", "coracao", VERM],
      ["Logística", "rastreio de cargas, temperatura de contêineres, frotas", "caminhao", TEAL]];
    areas.forEach(([t, d, ic, cor], i) => {
      const col = i % 3, lin = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.5 + lin * 2.5;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.9, h: 2.35, fill: { color: CLARO }, line: { color: CLARO, width: 0 }, rectRadius: 0.12 });
      circIcone(s, ic, x + 0.25, y + 0.3, 0.8, cor);
      s.addText(t, { x: x + 1.25, y: y + 0.3, w: 2.5, h: 0.8, fontSize: 15, bold: true, color: NAVY, isTextBox: true, margin: 0, valign: "middle" });
      s.addText(d, { x: x + 0.25, y: y + 1.25, w: 3.4, h: 1.0, fontSize: 12, color: TEXTO, isTextBox: true, margin: 0 });
    });
    nav(s, false, "sec5");
  }

  // 29. fim
  {
    const s = novo("CAPA", null, "Encerramento. Repositório público sob MIT (código) e CC BY (textos, vídeos, modelos 3D) na entrega do mês 6. Perguntas.");
    circIcone(s, "aberto", 0.9, 1.2, 1.1, "16405A");
    s.addText("Tudo aberto, para a próxima equipe começar de onde paramos", { x: 0.9, y: 2.45, w: 11.5, h: 1.3, fontSize: 34, bold: true, color: BRANCO, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(bullets(["Código sob licença MIT; textos, vídeos e modelos 3D sob Creative Commons CC BY", "Biblioteca‑padrão + catálogo de tópicos: um sensor novo publicando em 30 minutos", "Quatro vídeos tutoriais, produzidos e narrados pelos estudantes, na entrega final", "Um ativo permanente do Espaço CRIA, reutilizável por projetos que ainda não existem"], { color: "CFE3EA" }),
      { x: 0.9, y: 4.0, w: 11.5, h: 2.0, fontSize: 16, color: "CFE3EA", isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 10 });
    s.addText([{ text: "Obrigado.  ", options: { bold: true, color: TEAL, fontSize: 22 } }, { text: "Rede de Telemetria do Espaço CRIA · ETE Epitácio Pessoa · FACEPE / Espaços CRIA 2026   ", options: { color: "9FB3BE" } },
      { text: "voltar ao início", options: { hyperlink: { slide: N.capa, tooltip: "Início" }, color: TEAL, underline: true } }],
      { x: 0.9, y: 6.15, w: 11.5, h: 0.6, fontSize: 12, isTextBox: true, margin: 0, valign: "middle" });
  }

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  await pres.writeFile({ fileName: SAIDA });
  await applyTheme(SAIDA, THEME);
  fs.writeFileSync(path.join(path.dirname(SAIDA), "slides.json"), JSON.stringify(resumo, null, 1), "utf8");
  console.log("gerado:", SAIDA, "slides:", ORDEM.length);
})().catch((e) => { console.error(e); process.exit(1); });
