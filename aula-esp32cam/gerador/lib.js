// Helpers para montar os guias com docx-js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, LevelFormat, Footer, Header, PageNumber,
  TableOfContents, VerticalAlign,
} = require("docx");

const COR = { primaria: "1F4E79", acento: "C55A11", cinza: "595959", fundoCod: "F2F2F2", fundoNota: "FFF4E5", fundoTab: "DEEAF6", borda: "BFBFBF" };
const PAGE_W = 11906, MARG = 1134; // A4, 2 cm
const CONTENT_W = PAGE_W - 2 * MARG; // 9638 DXA

// --- texto com **negrito** e `codigo` inline ---
function runs(texto, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push(new TextRun({ text: texto.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: "Consolas", size: (base.size || 22) - 2, shading: { type: ShadingType.CLEAR, fill: COR.fundoCod }, ...base }));
    last = m.index + t.length;
  }
  if (last < texto.length) out.push(new TextRun({ text: texto.slice(last), ...base }));
  return out;
}

let titulos = [];            // [nivel, texto] para o sumario manual
let quebraPendente = false;  // QUEBRA() marca; o proximo H1 recebe pageBreakBefore
const H1 = (t) => { titulos.push([1, t]); const q = quebraPendente; quebraPendente = false;
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: q, children: [new TextRun(t)], spacing: { before: 360, after: 160 } }); };
const H2 = (t) => { titulos.push([2, t]); return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)], spacing: { before: 280, after: 120 } }); };
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)], spacing: { before: 200, after: 80 } });
const P = (t, opts = {}) => new Paragraph({ children: runs(t), spacing: { after: 120 }, ...opts });
const UL = (itens) => itens.map((t) => new Paragraph({ children: runs(t), numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 } }));
const OL = (itens, ref = "numeros") => itens.map((t) => new Paragraph({ children: runs(t), numbering: { reference: ref, level: 0 }, spacing: { after: 60 } }));
const QUEBRA = () => { quebraPendente = true; return []; };   // aplicada no proximo H1 (evita pagina em branco)
const QUEBRA_DURA = () => new Paragraph({ children: [new PageBreak()] });
const ESPACO = (pts = 6) => new Paragraph({ spacing: { after: pts * 20 }, children: [] });

// --- tabela ---
function TAB(cabecalho, linhas, larguras) {
  const n = cabecalho.length;
  const ws = larguras ? larguras.map((f) => Math.round(CONTENT_W * f)) : Array(n).fill(Math.round(CONTENT_W / n));
  const borda = { style: BorderStyle.SINGLE, size: 4, color: COR.borda };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const cel = (t, i, head) => new TableCell({
    width: { size: ws[i], type: WidthType.DXA }, borders: bordas, verticalAlign: VerticalAlign.CENTER,
    shading: head ? { type: ShadingType.CLEAR, fill: COR.fundoTab } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: runs(String(t), head ? { bold: true, size: 20 } : { size: 20 }), spacing: { after: 0 } })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: ws,
    rows: [new TableRow({ tableHeader: true, children: cabecalho.map((t, i) => cel(t, i, true)) }),
      ...linhas.map((l) => new TableRow({ children: l.map((t, i) => cel(t, i, false)) }))],
  });
}

// --- caixa de destaque (nota / atencao / dica) ---
function NOTA(titulo, texto, cor = COR.fundoNota) {
  const borda = { style: BorderStyle.SINGLE, size: 6, color: COR.acento };
  const paras = (Array.isArray(texto) ? texto : [texto]).map((t) => new Paragraph({ children: runs(t, { size: 20 }), spacing: { after: 40 } }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: cor },
      borders: { top: borda, bottom: borda, left: borda, right: borda }, margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({ children: [new TextRun({ text: titulo, bold: true, color: COR.acento, size: 20 })], spacing: { after: 40 } }), ...paras],
    })] })],
  });
}

// --- bloco de codigo (le arquivo .ino ou string) ---
function CODIGO(fonte, { arquivo = true, titulo } = {}) {
  const texto = arquivo ? fs.readFileSync(fonte, "utf8") : fonte;
  const linhas = texto.replace(/\r/g, "").split("\n");
  const borda = { style: BorderStyle.SINGLE, size: 4, color: COR.borda };
  const children = [];
  if (titulo) children.push(new Paragraph({ children: [new TextRun({ text: titulo, bold: true, font: "Consolas", size: 17, color: COR.primaria })], spacing: { after: 60 } }));
  linhas.forEach((l) => children.push(new Paragraph({ children: [new TextRun({ text: l.replace(/\t/g, "    ") || " ", font: "Consolas", size: 16 })], spacing: { after: 0, line: 240 } })));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ cantSplit: false, children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COR.fundoCod },
      borders: { top: borda, bottom: borda, left: borda, right: borda }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children,
    })] })],
  });
}

// --- figura (PNG) com legenda, largura ajustada ao texto ---
let numFig = 0;
function FIGURA(arquivo, legenda, larguraFrac = 1) {
  const buf = fs.readFileSync(arquivo);
  const { w, h } = dimensoesPng(buf);
  const maxW = Math.round((CONTENT_W / 20) * larguraFrac);   // DXA -> pt
  const width = Math.min(maxW, Math.round(w / 3)), height = Math.round(width * h / w);
  numFig++;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: /\.jpe?g$/i.test(arquivo) ? "jpg" : "png", data: buf, transformation: { width, height } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Figura ${numFig} — `, bold: true, size: 18, color: COR.cinza }), ...runs(legenda, { size: 18, color: COR.cinza })] }),
  ];
}

// --- capa com logos ---
function CAPA({ logosDir, titulo, subtitulo, tipo, info }) {
  numFig = 0;   // numeracao de figuras por documento
  titulos = []; quebraPendente = false;
  const arquivos = fs.readdirSync(logosDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  // todas as logos ocupam a mesma caixa (CAIXA_W x CAIXA_H pt), mantendo a proporcao de cada uma
  const n = Math.max(1, arquivos.length);
  const CAIXA_W = Math.floor((CONTENT_W / 20) / n) - 12, CAIXA_H = 84;
  const imgs = arquivos.map((f) => {
    const buf = fs.readFileSync(path.join(logosDir, f));
    const { w, h } = dimensoesPng(buf);
    const k = Math.min(CAIXA_W / w, CAIXA_H / h);
    return new ImageRun({ type: /png$/i.test(f) ? "png" : "jpg", data: buf, transformation: { width: Math.round(w * k), height: Math.round(h * k) } });
  });
  const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const bordas = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda };
  const wCel = Math.round(CONTENT_W / Math.max(1, imgs.length));
  const tabelaLogos = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: imgs.map(() => wCel),
    rows: [new TableRow({ children: imgs.map((im) => new TableCell({ width: { size: wCel, type: WidthType.DXA }, borders: bordas, verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [im] })] })) })],
  });
  const linha = new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COR.acento, space: 4 } }, spacing: { after: 200 }, children: [] });
  return [
    tabelaLogos,
    ESPACO(70),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 120 }, children: [new TextRun({ text: tipo.toUpperCase(), bold: true, color: COR.acento, size: 26, characterSpacing: 40 })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 160 }, children: [new TextRun({ text: titulo, bold: true, color: COR.primaria, size: 60 })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 240 }, children: [new TextRun({ text: subtitulo, color: COR.cinza, size: 30 })] }),
    linha,
    ...info.map((t) => new Paragraph({ spacing: { after: 80 }, children: runs(t, { size: 22, color: COR.cinza }) })),
    QUEBRA_DURA(),
  ];
}

function dimensoesPng(buf) {
  if (buf.slice(1, 4).toString() === "PNG") return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  // JPEG: procura SOF0/SOF2
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 1, h: 1 };
}

// --- documento ---
function DOC({ titulo, rodape, corpo }) {
  return new Document({
    creator: "Espaço Cria", title: titulo,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 276 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, color: COR.primaria, font: "Calibri" }, paragraph: { outlineLevel: 0, spacing: { before: 360, after: 160 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 27, bold: true, color: COR.acento, font: "Calibri" }, paragraph: { outlineLevel: 1, spacing: { before: 280, after: 120 } } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: COR.primaria, font: "Calibri" }, paragraph: { outlineLevel: 2, spacing: { before: 200, after: 80 } } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
        { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
        ...Array.from({ length: 30 }, (_, k) => ({ reference: `num${k}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] })),
      ],
    },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARG, bottom: MARG, left: MARG, right: MARG } }, titlePage: true },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: rodape, size: 16, color: COR.cinza })] })] }), first: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Página ", size: 16, color: COR.cinza }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COR.cinza })] })] }), first: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: corpo.flat(Infinity).flatMap((el) => (el === MARCA_SUMARIO ? montarSumario() : [el])),   // sumario manual; aceita UL()/OL() com ou sem spread
    }],
  });
}

const MARCA_SUMARIO = { __sumario: true };
function SUMARIO() { quebraPendente = true; return [MARCA_SUMARIO]; }
function montarSumario() {
  const linhas = titulos.filter(([n, t]) => n === 1 && t !== "Sumário").map(([n, t]) =>
    new Paragraph({ spacing: { after: 70 }, indent: { left: 200 }, children: [new TextRun({ text: t, size: 22, color: COR.primaria })] }));
  return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Sumário")], spacing: { before: 0, after: 200 } }), ...linhas];
}

async function salvar(doc, arquivo) {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(arquivo, buf);
  console.log("gerado:", arquivo, Math.round(buf.length / 1024), "KB");
}

let numRef = 0;
const OLn = (itens) => OL(itens, `num${numRef++ % 30}`);

module.exports = { H1, H2, H3, P, UL, OL: OLn, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar, COR };
