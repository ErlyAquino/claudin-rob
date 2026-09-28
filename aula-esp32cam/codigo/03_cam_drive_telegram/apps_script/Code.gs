/*
  Google Apps Script - recebe a foto do ESP32-CAM e grava no Google Drive.

  Como publicar (uma vez, com a conta Google do laboratorio):
    1. script.google.com -> Novo projeto -> cole este codigo -> salve.
    2. Crie no Drive uma pasta "ESP32-CAM" e copie o ID dela (parte final da URL da pasta) em PASTA_ID.
    3. Implantar -> Nova implantacao -> Tipo: "App da Web" -> Executar como: EU -> Quem tem acesso: "Qualquer pessoa".
    4. Autorize o acesso ao Drive. Copie a URL que termina em /exec para o sketch (URL_APPS_SCRIPT).
    5. Cada vez que mudar o codigo: Implantar -> Gerenciar implantacoes -> editar -> nova versao.

  O ESP32 faz POST com "motivo=texto&imagem=<base64 do JPEG>". Testar no navegador (GET) tambem funciona.
*/
const PASTA_ID = "COLE-AQUI-O-ID-DA-PASTA";

function doPost(e) {
  try {
    const motivo = (e.parameter.motivo || "foto").replace(/[^\w-]/g, "_");
    const base64 = e.parameter.imagem;
    if (!base64) return ContentService.createTextOutput("faltou o parametro imagem");
    const bytes = Utilities.base64Decode(base64);
    const agora = Utilities.formatDate(new Date(), "America/Recife", "yyyy-MM-dd_HH-mm-ss");
    const blob = Utilities.newBlob(bytes, "image/jpeg", agora + "_" + motivo + ".jpg");
    const pasta = DriveApp.getFolderById(PASTA_ID);
    const arquivo = pasta.createFile(blob);
    // mantem sempre uma copia chamada "ultima.jpg" = a foto mais recente (para o "quase ao vivo")
    const antigas = pasta.getFilesByName("ultima.jpg");
    while (antigas.hasNext()) antigas.next().setTrashed(true);
    pasta.createFile(blob.setName("ultima.jpg"));
    return ContentService.createTextOutput("ok " + arquivo.getName());
  } catch (erro) {
    return ContentService.createTextOutput("erro: " + erro);
  }
}

function doGet(e) {           // abrir a URL no navegador mostra que o script esta no ar
  return ContentService.createTextOutput("ESP32-CAM Drive uploader ativo. Use POST com motivo e imagem (base64).");
}
