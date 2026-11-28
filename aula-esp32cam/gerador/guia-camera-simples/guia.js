// Guia: ESP32-CAM simples (so a camera ao vivo no navegador), com o codigo explicado parte por parte.
// Gera ../../saida/Guia-ESP32-CAM-Camera-Simples.docx (gerar.sh converte para PDF).
// Os trechos de codigo saem direto de ../../codigo/00_cam_simples/00_cam_simples.ino (marcadores "===== PARTE n").
// Usa o lib.js da aula-ar (versao corrigida para o LibreOffice).
const fs = require("fs");
const path = require("path");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, ESPACO, FIGURA, salvar } = require("../../../aula-ar/gerador/lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas");
const SKETCH = path.join(AQUI, "..", "..", "codigo", "00_cam_simples", "00_cam_simples.ino");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-ESP32-CAM-Camera-Simples.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

// separa o sketch nas partes marcadas com "// ===== PARTE n: ... ====="
const fonte = fs.readFileSync(SKETCH, "utf8").replace(/\r/g, "");
const partes = {};
fonte.split(/(?=^\/\/ ===== PARTE )/m).forEach((bloco) => {
  const m = bloco.match(/^\/\/ ===== PARTE (\d+)/);
  if (m) partes[m[1]] = bloco.replace(/\n+$/, "");
});
const PARTE = (n) => CODIGO(partes[n], { arquivo: false, tamanho: 15 });

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia passo a passo",
    titulo: "ESP32-CAM: a câmera ao vivo no navegador",
    subtitulo: "O programa mais simples possível: só a câmera e o Wi-Fi, sem cartão, sem sensores. Com o código explicado parte por parte",
    info: [
      "**Placa:** ESP32-CAM AI-Thinker  •  **Sketch:** `aula-esp32cam/codigo/00_cam_simples`",
      "Espaço CRIA — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),

  ...SUMARIO(),

  H1("1. A ideia"),
  P("Antes de montar a câmera de monitoramento completa (sensor de presença, cartão microSD, LED), vale testar a parte principal sozinha: **a câmera funciona e o vídeo chega ao navegador?** Este programa faz só isso. Se ele funcionar, a placa, a câmera e a alimentação estão boas, e qualquer problema do projeto completo está nas outras peças."),
  P("O caminho da imagem tem quatro etapas:"),
  OL([
    "**A câmera fotografa.** O sensor (OV2640 ou OV3660) tira uma foto de 640 × 480 pixels e já a entrega comprimida em JPEG, o mesmo formato das fotos do celular.",
    "**A placa cria uma rede Wi-Fi.** A ESP32-CAM funciona como um roteador pequeno: cria a rede **Camera-ESP32**, sem internet, só para conversar com quem se conectar a ela.",
    "**A placa vira um site.** Um servidor web dentro da placa responde no endereço **http://192.168.4.1**, como qualquer site da internet, só que dentro da rede da câmera.",
    "**O navegador mostra o vídeo.** A placa manda uma foto atrás da outra, sem parar. O navegador troca a imagem a cada foto nova, e isso aparece como vídeo.",
  ]),
  NOTA("Não abre nenhuma janela no computador", "Depois de gravar o programa, nada aparece sozinho na tela. O vídeo só é visto quando um celular ou computador entra na rede da câmera e abre o endereço no navegador.", AZUL),

  H1("2. Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32-CAM AI-Thinker com câmera OV2640 ou OV3660", "Com a antena de cerâmica (o retângulo na ponta da placa) livre"],
    ["1", "Adaptador USB-serial CH340 (módulo HW-193)", "Jumper S1 em 3V3; sem o jumper entre RXD e TXD"],
    ["5", "Jumpers fêmea-fêmea", "4 para o adaptador e 1 para unir IO0 ao GND"],
    ["1", "Cabo USB de dados", "Cabo só de carga não serve: a porta COM não aparece"],
    ["1", "Celular ou computador com Wi-Fi", "Para abrir a página da câmera"],
  ], [0.1, 0.45, 0.45]),
  P("Não precisa de cartão microSD, protoboard, sensor nem fonte externa para este teste."),

  H1("3. Ligação e gravação"),
  ...FIGURA(path.join(ESQ, "saida", "01_gravacao_ftdi.png"), "Ligação para gravar. O desenho mostra outro modelo de adaptador; no CH340, use os pinos com os mesmos nomes. O jumper amarelo entre IO0 e GND fica só durante a gravação.", 0.7),
  TAB(["CH340", "ESP32-CAM", "Fio"], [
    ["TXD", "U0R (GPIO 3)", "Verde"],
    ["RXD", "U0T (GPIO 1)", "Azul"],
    ["5V", "5V", "Vermelho"],
    ["GND", "GND", "Preto"],
    ["—", "IO0 ligado ao GND, só para gravar", "Amarelo"],
  ], [0.3, 0.44, 0.26]),
  ESPACO(),
  NOTA("Atenção: o fio de energia sai do pino 5V do CH340", [
    "O adaptador tem um pino **5V** e um pino **3V3**. A ESP32-CAM precisa dos **5 V**: ligada no 3V3, ela até aceita a gravação, que gasta pouca energia, mas depois reinicia sem parar (`Brownout detector was triggered`) e o Wi-Fi nunca aparece.",
    "Na ESP32-CAM, o fio entra no pino **5V**. O pino chamado **VCC** (ou 3V3) é uma saída e não alimenta a placa.",
    "Na dúvida, meça com o multímetro entre os pinos 5V e GND da ESP32-CAM: tem de dar perto de **5 V**.",
  ], VERMELHO),
  ESPACO(),
  H2("Pelo Arduino IDE"),
  OL([
    "Coloque o jumper entre **IO0 e GND** e ligue o adaptador no USB.",
    "Abra `aula-esp32cam/codigo/00_cam_simples/00_cam_simples.ino`.",
    "Em **Ferramentas → Placa**, escolha **AI Thinker ESP32-CAM**. Em **Ferramentas → Porta**, escolha a porta do adaptador (no Windows, algo como **COM4**).",
    "**Feche o Monitor Serial**, se estiver aberto. Com ele aberto, a gravação falha com `Could not open COM4, the port is busy`.",
    "Aperte o botão **RST** da placa e clique em **Carregar** (a seta). A barra vai até 100% e termina com `Hash of data verified`.",
  ]),
  H2("Pelo terminal (arduino-cli)"),
  CODIGO("arduino-cli compile --fqbn esp32:esp32:esp32cam aula-esp32cam/codigo/00_cam_simples\narduino-cli upload -p COM4 --fqbn esp32:esp32:esp32cam aula-esp32cam/codigo/00_cam_simples", { arquivo: false }),
  P("No Linux, a porta é `/dev/ttyUSB0` em vez de `COM4`."),
  NOTA("Onde fica o botão RST", [
    "No **verso** da placa, o lado oposto ao da câmera, perto da beira e entre as duas fileiras de pinos.",
    "Se a placa estiver espetada na protoboard, o botão fica virado para baixo. Nesse caso, **tirar e recolocar o cabo USB** faz o mesmo efeito.",
  ]),

  H1("4. Teste: abrir a câmera no navegador"),
  OL([
    "**Tire o jumper do IO0** e religue a placa (botão RST ou cabo USB). Com o jumper no lugar, a placa fica esperando gravação e o programa não roda.",
    "Confira o **LED vermelho pequeno do verso**: ele deve dar uma piscada curta por segundo. Isso mostra que o programa está rodando.",
    "No celular ou no computador, procure a rede Wi-Fi **Camera-ESP32** e entre com a senha **12345678**. O aparelho pode avisar que a rede não tem internet: escolha continuar conectado.",
    "Abra o navegador e digite **http://192.168.4.1**. Aparece o título *ESP32-CAM ao vivo* e, logo abaixo, o vídeo.",
  ]),
  H2("O que aparece no Monitor Serial"),
  P("Com o adaptador ainda ligado, abra o Monitor Serial em **115200** e religue a placa. As mensagens devem ser estas:"),
  CODIGO("ESP32-CAM simples ligando...\nCamera OK\nRede Wi-Fi: Camera-ESP32   senha: 12345678\nAbra no navegador: http://192.168.4.1\nAparelhos conectados: 0\nAparelhos conectados: 1", { arquivo: false }),
  P("A linha **Aparelhos conectados** se repete a cada 10 segundos. Quando o celular entra na rede, o número passa de 0 para 1."),
  TAB(["O LED vermelho...", "Significa"], [
    ["Dá uma piscada curta por segundo", "Tudo certo: a câmera ligou e o Wi-Fi está no ar"],
    ["Pisca muito rápido, sem parar", "A câmera não iniciou (cabo flat ou alimentação)"],
    ["Fica apagado", "O programa não está rodando: jumper do IO0 ainda no lugar, ou a placa sem energia"],
    ["Pisca, apaga e recomeça a cada poucos segundos", "A placa está reiniciando por falta de corrente (seção 7)"],
  ], [0.45, 0.55]),

  H1("5. O código, parte por parte"),
  P("O programa inteiro está num arquivo só, dividido em 8 partes marcadas com `===== PARTE`. Abaixo, cada parte com a explicação do que ela faz."),

  H2("Parte 1: bibliotecas"),
  PARTE("1"),
  P("Uma **biblioteca** é um código pronto que alguém já escreveu e que o nosso programa aproveita. O `#include` traz esse código para dentro do programa. As três vêm junto com a placa ESP32; não é preciso instalar nada:"),
  UL([
    "`WiFi.h`: liga o rádio Wi-Fi e cria a rede da câmera.",
    "`esp_camera.h`: conversa com o sensor da câmera e entrega as fotos.",
    "`esp_http_server.h`: transforma a placa num **servidor web**, o programa que responde quando o navegador pede uma página.",
  ]),

  H2("Parte 2: configurações"),
  PARTE("2"),
  P("Aqui ficam os valores que você pode mudar sem mexer no resto do programa. `const` quer dizer que o valor não muda enquanto o programa roda; `char*` é um texto; `int` é um número inteiro."),
  UL([
    "`NOME_REDE` e `SENHA_REDE`: o nome da rede Wi-Fi que a câmera cria e a senha. A senha precisa ter **pelo menos 8 caracteres**; com menos, a rede não é criada.",
    "`LED_VERMELHO = 33`: o LED pequeno do verso da placa está ligado ao pino 33. Ele é **invertido**: acende com `LOW` e apaga com `HIGH`.",
  ]),
  NOTA("Experimente", "Se várias câmeras forem ligadas na mesma sala, dê um nome diferente para cada uma, como `Camera-Grupo1`, `Camera-Grupo2`, e grave de novo.", VERDE),

  H2("Parte 3: os pinos da câmera"),
  PARTE("3"),
  P("A câmera se liga ao chip ESP32 por 16 fios, todos dentro da própria placa, pelo cabo flat. O `#define` dá um nome a cada número de pino. Esses números são **fixos** da placa AI-Thinker: estão soldados assim e não podem ser mudados."),
  TAB(["Nome", "O que o fio faz"], [
    ["`Y2` a `Y9` (8 fios)", "Os dados da imagem: 8 bits por vez, como 8 faixas de uma estrada"],
    ["`PCLK`", "O relógio dos pixels: a cada pulso, um novo pedaço da imagem está pronto nos 8 fios"],
    ["`VSYNC` e `HREF`", "Avisam onde começa uma foto nova (VSYNC) e onde começa cada linha (HREF)"],
    ["`XCLK`", "O relógio que o ESP32 envia para o sensor funcionar (20 MHz)"],
    ["`SIOD` e `SIOC`", "Um canal de comandos (parecido com o I2C) para configurar o sensor: brilho, tamanho, virar a imagem"],
    ["`PWDN`", "Liga e desliga o sensor"],
    ["`RESET = -1`", "Nesta placa, o reset da câmera não está ligado a nenhum pino; -1 quer dizer \"não usado\""],
  ], [0.3, 0.7]),

  H2("Parte 4: ligar a câmera"),
  PARTE("4"),
  P("Esta parte é uma **função**: um bloco de código com nome (`iniciarCamera`) que pode ser chamado depois. `bool` quer dizer que ela responde **verdadeiro** (`true`, deu certo) ou **falso** (`false`, deu errado)."),
  UL([
    "`camera_config_t c = {}` cria uma **ficha de configuração** vazia. As linhas seguintes preenchem a ficha.",
    "As linhas `c.pin_...` dizem em qual pino está cada fio da câmera (os nomes da Parte 3).",
    "`PIXFORMAT_JPEG`: o próprio sensor comprime a foto em JPEG. Uma foto de 640 × 480 sem compressão teria cerca de 600 KB; em JPEG fica com 20 a 40 KB, pequena o bastante para viajar pelo Wi-Fi várias vezes por segundo.",
    "`FRAMESIZE_VGA`: tamanho de 640 × 480 pixels. Outros tamanhos: `FRAMESIZE_QVGA` (320 × 240, mais rápido) e `FRAMESIZE_SVGA` (800 × 600, mais nítido e mais lento).",
    "`jpeg_quality = 12`: de 0 (melhor qualidade, arquivo maior) a 63 (pior qualidade, arquivo menor). Entre 10 e 15 é um bom equilíbrio.",
    "`fb_count = 1`: guarda 1 foto por vez na memória. `fb` vem de *frame buffer*, a área da memória onde fica a foto.",
    "`psramFound() ? ... : ...` é uma pergunta curta: *a placa tem PSRAM (memória extra de 4 MB)?* Se tem, guarda a foto lá; se não, na memória interna, que é pequena.",
    "`CAMERA_GRAB_LATEST`: sempre entrega a foto mais nova, para o vídeo não ficar atrasado.",
  ]),
  P("No fim, `esp_camera_init(&c)` liga a câmera com essa ficha. Se não der certo, a função responde `false`. Se der, ela confere o modelo do sensor: o **OV3660** entrega a imagem de cabeça para baixo, e `set_vflip` a desvira."),

  H2("Parte 5: a página"),
  PARTE("5"),
  P("É a página que o navegador recebe, escrita em **HTML**, a linguagem dos sites. Ela fica guardada dentro do programa como um texto. O `R\"HTML( ... )HTML\"` permite escrever o texto em várias linhas, sem se preocupar com aspas."),
  UL([
    "`<meta charset=\"utf-8\">`: os acentos aparecem certos.",
    "`<meta name=\"viewport\" ...>`: a página se ajusta à tela do celular.",
    "`<style>`: as cores e o tamanho. Fundo escuro (`#111`), letras claras (`#eee`), imagem que não passa da largura da tela (`max-width:100%`).",
    "`<img src=\"/video\">`: **a linha mais importante.** Ela diz ao navegador: *mostre aqui a imagem que está no endereço /video*. É aí que entra o vídeo da Parte 6.",
  ]),

  H2("Parte 6: as respostas ao navegador"),
  PARTE("6"),
  P("Quando o navegador abre um endereço, ele faz um **pedido** (*request*, por isso o `req`) ao servidor. Cada endereço tem uma função que responde:"),
  UL([
    "**`/`** (a página inicial): `responderPagina` diz que vai enviar HTML (`text/html`) e envia o texto da Parte 5.",
    "**`/video`**: `responderVideo` envia o vídeo. É chamado assim que o navegador lê a linha `<img src=\"/video\">`.",
  ]),
  P("O vídeo é um **MJPEG** (*Motion JPEG*): uma sequência de fotos JPEG enviadas uma atrás da outra pela mesma conexão. O tipo `multipart/x-mixed-replace` diz ao navegador: *vou mandar várias imagens; cada uma substitui a anterior*. Dentro do `while (true)` (repetir para sempre), a função faz 4 passos:"),
  OL([
    "`esp_camera_fb_get()` pede uma foto à câmera.",
    "Envia um **cabeçalho**: a separação `--quadro`, o tipo `image/jpeg` e o tamanho da foto em bytes (`Content-Length`). O `snprintf` monta esse texto colocando o tamanho no lugar do `%u`.",
    "Envia a foto (`foto->buf` são os bytes; `foto->len` é a quantidade de bytes).",
    "`esp_camera_fb_return(foto)` devolve a memória da foto para a câmera usar de novo. **Sem essa linha, a memória acaba depois da primeira foto e o vídeo trava.**",
  ]),
  P("Se o envio falhar (`r != ESP_OK`), é porque o navegador foi fechado: a função sai do laço e para de mandar fotos."),
  P("Por fim, `iniciarServidor` liga o servidor na **porta 80** (a porta padrão dos sites, por isso não é preciso digitar `:80` no endereço) e registra os dois endereços: `/` chama `responderPagina`, e `/video` chama `responderVideo`."),

  H2("Parte 7: setup"),
  PARTE("7"),
  P("O `setup` roda **uma vez**, logo que a placa liga. Ele chama as outras partes na ordem certa:"),
  OL([
    "`Serial.begin(115200)` abre a comunicação com o computador, para as mensagens do Monitor Serial. O 115200 é a velocidade, em bits por segundo, e precisa ser igual à escolhida no Monitor.",
    "Prepara o LED vermelho como saída (`OUTPUT`).",
    "Chama `iniciarCamera()`. O `!` quer dizer \"não\": *se a câmera **não** iniciou*, mostra o erro e fica para sempre piscando o LED rápido (a cada 0,1 s). Assim dá para ver o erro mesmo sem o computador.",
    "`WiFi.softAP(...)` cria a rede Wi-Fi. **AP** quer dizer *Access Point*, ponto de acesso: a placa faz o papel do roteador. O endereço da placa nessa rede é sempre **192.168.4.1**.",
    "`WiFi.setTxPower(WIFI_POWER_11dBm)` diminui a potência do rádio. O alcance fica em alguns metros, o suficiente para a sala, e os picos de corrente diminuem. Isso evita que a placa reinicie quando é alimentada só pelo adaptador USB.",
    "Liga o servidor web e mostra o endereço no Monitor Serial.",
  ]),

  H2("Parte 8: loop"),
  PARTE("8"),
  P("O `loop` repete **para sempre**, logo depois do `setup`. Repare que ele não cuida do vídeo: o servidor web roda numa **tarefa separada**, como um segundo programa rodando ao mesmo tempo dentro do ESP32. O loop fica livre para duas tarefas simples:"),
  UL([
    "**Piscar o LED:** aceso 0,1 s e apagado 0,9 s, 1 piscada por segundo. É o sinal de que o programa está vivo.",
    "**A cada 10 segundos,** mostrar quantos aparelhos estão conectados na rede (`softAPgetStationNum`). `millis()` é o tempo, em milissegundos, desde que a placa ligou; `static` faz a variável `ultimo` guardar seu valor de uma volta do loop para a outra.",
  ]),

  H1("6. Experimentos"),
  TAB(["Mude", "Para", "O que observar"], [
    ["`FRAMESIZE_VGA` (Parte 4)", "`FRAMESIZE_QVGA`", "Vídeo menor e mais fluido"],
    ["`FRAMESIZE_VGA` (Parte 4)", "`FRAMESIZE_SVGA`", "Imagem mais nítida e vídeo mais lento"],
    ["`jpeg_quality = 12` (Parte 4)", "`30` e depois `5`", "Com 30, a imagem fica \"quadriculada\"; com 5, mais bonita e mais lenta"],
    ["`NOME_REDE` (Parte 2)", "O nome do seu grupo", "A rede nova aparece na lista do celular"],
    ["`<h2>` da página (Parte 5)", "Outro título", "O título novo aparece acima do vídeo"],
  ], [0.33, 0.27, 0.4]),
  P("Depois de cada mudança, grave de novo: jumper no IO0, RST, Carregar; depois tire o jumper e religue a placa."),

  H1("7. Problemas comuns"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`Could not open COM4, the port is busy`", "O Monitor Serial ou outro programa está usando a porta", "Feche o Monitor Serial e o Serial Plotter; tente de novo"],
    ["A porta COM não aparece", "Cabo só de carga, ou adaptador mal encaixado", "Troque o cabo USB; confira em Ferramentas → Porta"],
    ["`Failed to connect to ESP32`", "A placa não entrou no modo de gravação", "Jumper entre IO0 e GND, aperte RST e grave de novo; confira TXD → U0R e RXD → U0T"],
    ["A rede Camera-ESP32 não aparece", "O jumper do IO0 continua no lugar", "Tire o jumper e religue a placa"],
    ["Gravou, mas a rede não aparece; o Monitor Serial repete `Brownout detector was triggered` sem parar", "Fio de energia no pino **3V3** do CH340 (ou no VCC da ESP32-CAM) em vez do 5V", "Passe o fio para o pino **5V** dos dois lados e meça: perto de 5 V entre 5V e GND da placa"],
    ["A rede aparece e some, ou o Monitor Serial mostra `Brownout detector was triggered` de vez em quando", "Falta corrente: a USB do computador não aguenta os picos do Wi-Fi", "Use uma porta USB direto no computador (sem hub) e um cabo curto; ou alimente o pino 5V com uma fonte de 5 V e 2 A, com o GND ligado também ao GND do adaptador"],
    ["LED vermelho piscando rápido; `ERRO: camera nao iniciou`", "Cabo flat da câmera solto", "Desligue, levante a trava preta do conector, encaixe o cabo até o fim e feche a trava"],
    ["A página abre, mas sem imagem", "Outro aparelho já está vendo o vídeo", "Este programa atende um vídeo por vez: feche a página no outro aparelho"],
    ["A página não abre", "O celular saiu da rede da câmera, ou o endereço está com `https`", "Confira o Wi-Fi do celular e digite `http://192.168.4.1`"],
  ], [0.32, 0.3, 0.38]),

  H1("8. O programa completo"),
  CODIGO(SKETCH, { tamanho: 14 }),
];

module.exports = DOC({ titulo: "ESP32-CAM: a câmera ao vivo no navegador", rodape: "ESP32-CAM: a câmera ao vivo no navegador — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
