const path = require("path");
const { salvar } = require("./lib");
const saida = path.join(__dirname, "..", "saida");
require("fs").mkdirSync(saida, { recursive: true });
(async () => {
  await salvar(require("./guia-aluno"), path.join(saida, "Guia-do-Aluno-Qualidade-do-Ar.docx"));
  await salvar(require("./guia-professor"), path.join(saida, "Guia-do-Professor-Qualidade-do-Ar.docx"));
})().catch((e) => { console.error(e); process.exit(1); });
