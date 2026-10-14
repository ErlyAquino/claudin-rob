const path = require("path");
const { salvar } = require("./lib");
const saida = path.join(__dirname, "..", "saida");
require("fs").mkdirSync(saida, { recursive: true });
(async () => {
  await salvar(require("./guia-aluno"), path.join(saida, "Guia-do-Aluno-Camera-Tapo.docx"));
  await salvar(require("./guia-professor"), path.join(saida, "Guia-do-Professor-Camera-Tapo.docx"));
})().catch((e) => { console.error(e); process.exit(1); });
