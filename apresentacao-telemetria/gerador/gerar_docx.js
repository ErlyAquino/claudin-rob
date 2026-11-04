// Apostila DOCX da apresentação: capa + um slide por página (imagem) com as notas do apresentador.
// Uso: node gerar_docx.js <pasta com slide-NN.png>   (gerar_tudo.sh chama depois de renderizar o PDF)
const fs = require("fs"), path = require("path");
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, PageBreak, Footer, PageNumber, LineRuleType, PageOrientation } = require("docx");

const SAIDA = path.join(__dirname, "..", "saida");
const PASTA_IMG = process.argv[2];
const slides = JSON.parse(fs.readFileSync(path.join(SAIDA, "slides.json"), "utf8"));
const LOGOS = path.join(__dirname, "..", "imagens");
const NAVY = "0B2B3A", TEAL = "2EC4B6", CINZA = "595959";
const PAGE_W = 16838, PAGE_H = 11906, MARG = 1000;            // A4 paisagem
const CONTENT_W = PAGE_W - 2 * MARG;
const dim = (b) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });
const png = (f) => fs.readFileSync(f);

const filhos = [];
// ---- capa
const logos = ["logo espaco cria.png", "ete.png", "nct.png", "seepe.png", "FACEPE.png"].map((f) => path.join(LOGOS, f)).filter(fs.existsSync);
const runsLogos = logos.map((f) => { const b = png(f); const d = dim(b); const h = 60, w = Math.round(d.w * h / d.h); return new ImageRun({ type: "png", data: b, transformation: { width: w, height: h } }); });
filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: runsLogos.flatMap((r, i) => (i ? [new TextRun("      "), r] : [r])) }));
filhos.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "APOSTILA DA APRESENTAÇÃO", bold: true, color: TEAL, size: 24, characterSpacing: 40 })] }));
filhos.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Rede de Telemetria do Espaço CRIA", bold: true, color: NAVY, size: 60 })] }));
filhos.push(new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "Plataforma aberta de monitoramento para projetos de IoT — ETE Epitácio Pessoa · FACEPE / Espaços CRIA 2026", color: CINZA, size: 28 })] }));
filhos.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Coordenação: Erly José da Costa Aquino · Professor auxiliar: Richardson Robério da Silva Santos", size: 22 })] }));
filhos.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Estudantes bolsistas: Dayvyd Carlos · Neemias Vicente · Isabel Gabriely Demesio Florêncio · Douglas Edgar da Silva", size: 22 })] }));
filhos.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Esta apostila reproduz os 29 slides (a versão interativa é o arquivo .pptx/.odp) e traz, sob cada um, as notas do apresentador.", size: 22, color: CINZA })] }));
filhos.push(new Paragraph({ children: [new PageBreak()] }));
// ---- um slide por página
slides.forEach((s, i) => {
  const arq = path.join(PASTA_IMG, `slide-${String(s.n).padStart(2, "0")}.png`);
  filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 0, after: 120 }, children: [new TextRun({ text: `Slide ${s.n} — ${s.titulo}`, color: NAVY })] }));
  if (fs.existsSync(arq)) {
    const b = png(arq); const d = dim(b); const w = Math.round(CONTENT_W / 20 * 0.72), h = Math.round(w * d.h / d.w);
    filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: "png", data: b, transformation: { width: w, height: h } })] }));
  }
  filhos.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: s.secao + "  ·  notas do apresentador", bold: true, color: TEAL, size: 18 })] }));
  filhos.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: s.notas || "(sem notas)", size: 21 })] }));
  if (i < slides.length - 1) filhos.push(new Paragraph({ children: [new PageBreak()] }));
});

const doc = new Document({
  creator: "Espaço CRIA", title: "Apostila — Rede de Telemetria do Espaço CRIA",
  styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 264, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [{ id: "Normal", name: "Normal", quickFormat: true, run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 264, lineRule: LineRuleType.AUTO } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: NAVY, font: "Calibri" }, paragraph: { outlineLevel: 1 } }] },
  sections: [{ properties: { page: { size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE }, margin: { top: MARG, bottom: MARG, left: MARG, right: MARG } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Rede de Telemetria do Espaço CRIA · apostila da apresentação · página ", size: 16, color: CINZA }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CINZA })] })] }) },
    children: filhos }],
});
Packer.toBuffer(doc).then((buf) => { const f = path.join(SAIDA, "Telemetria-CRIA-Apresentacao-Apostila.docx"); fs.writeFileSync(f, buf); console.log("gerado:", f, Math.round(buf.length / 1024), "KB"); });
