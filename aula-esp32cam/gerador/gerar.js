const path = require("path");
const { salvar } = require("./lib");
const saida = path.join(__dirname, "..", "saida");
require("fs").mkdirSync(saida, { recursive: true });
(async () => {
  await salvar(require("./guia-aluno"), path.join(saida, "Guia-do-Aluno-ESP32-CAM.docx"));
  await salvar(require("./guia-professor"), path.join(saida, "Guia-do-Professor-ESP32-CAM.docx"));
})().catch((e) => { console.error(e); process.exit(1); });
