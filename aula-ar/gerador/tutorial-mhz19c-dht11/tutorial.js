// Tutorial: ligar e testar o MH-Z19C (CO2) e o DHT11 (umidade/temperatura) no ESP32 com o sketch 05c.
// Gera ../../saida/Tutorial-MH-Z19C-DHT11-Ligacao-e-Teste.docx (o gerar_tutorial.sh converte para PDF).
// Esquemas: ../../esquemas/saida/*.png (Fritzing, esquemas.py). Resultado do teste: serial.log (captura da USB).
const path = require("path");
const fs = require("fs");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas", "saida");
const SKETCH = path.join(AQUI, "..", "..", "codigo", "05c_mhz19c_diagnostico_usb", "05c_mhz19c_diagnostico_usb.ino");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Tutorial-MH-Z19C-DHT11-Ligacao-e-Teste.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";
const v = (x, c = 1) => Number(x).toFixed(c).replace(".", ",");

// ---------- resultado do teste: lido do serial.log ("  12.3 # texto") ----------
const INFO = JSON.parse(fs.readFileSync(path.join(AQUI, "teste.json"), "utf8"));   // data, hora, porta, duracao
const linhas = fs.readFileSync(path.join(AQUI, "serial.log"), "utf8").split("\n").map((l) => l.replace(/^\s*[\d.]+ /, ""));
const co2 = [], tint = [], ur = [], tar = [], st = [];
let falhasDht = 0, semResposta = 0, versao = "?", faixa = "?", abc = "?";
for (const l of linhas) {
  let m;
  if ((m = l.match(/CO2 (\d+) ppm\s+temp (-?\d+) C/))) { co2.push(+m[1]); tint.push(+m[2]); }
  if ((m = l.match(/DHT11 umidade (\d+) %\s+temp ([\d.]+) C\s+sensacao ([\d.]+) C/))) { ur.push(+m[1]); tar.push(+m[2]); st.push(+m[3]); }
  if (/DHT11 falha/.test(l)) falhasDht++;
  if (/sem resposta valida/.test(l) && /0x86/.test(l)) semResposta++;
  if ((m = l.match(/versao do firmware: (\S+)/))) versao = m[1];
  if ((m = l.match(/faixa: (\d+) ppm/))) faixa = m[1];
  if ((m = l.match(/ABC: (\S+)/))) abc = m[1];
}
const min = (a) => Math.min(...a), max = (a) => Math.max(...a), med = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const mhzOk = co2.length > 0, dhtOk = ur.length > 0;
const reinicios = linhas.filter((l) => /ATENCAO: o sensor reiniciou/.test(l)).length;
// trecho da serial para mostrar no tutorial: cabecalho + primeiras leituras + ultimas leituras
const uteis = linhas.filter((l) => l.startsWith("#") || l.startsWith("{"));
const ini = uteis.slice(0, INFO.linhas_inicio), fim = uteis.slice(-INFO.linhas_fim);
const trecho = [...ini, "...", ...fim].join("\n");

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Tutorial",
    titulo: "MH‑Z19C + DHT11 no ESP32: ligação e teste",
    subtitulo: "Esquemas de montagem na protoboard (Fritzing) para o sensor de CO₂ MH‑Z19C e o módulo DHT11 de 3 pinos, como gravar o sketch de teste 05c e como ler o resultado no Monitor Serial",
    info: [
      "**Placa:** ESP32 DevKit V1 (30 pinos)  •  **Sketch:** `aula-ar/codigo/05c_mhz19c_diagnostico_usb`",
      `**Teste na bancada:** ${INFO.data}, ${INFO.hora}, ${INFO.duracao} pela USB (${INFO.porta})`,
      "Espaço CRIA — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // ---------------------------------------------------------------
  H1("1. O que você vai montar"),
  P("Dois sensores ligados ao mesmo ESP32, lidos por um único programa de teste (o sketch **05c**):"),
  UL([
    "**MH‑Z19C:** mede o **CO₂** do ar (400 a 5000 ppm) por infravermelho. Conversa com o ESP32 pela **serial** (UART, 9600 baud). Precisa de **5 V**.",
    "**DHT11 (módulo de 3 pinos):** mede **umidade relativa** (20 a 90 %) e **temperatura** (0 a 50 °C). Usa **um fio de dados**. Funciona em **3,3 V**.",
  ]),
  H2("1.1 Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32 DevKit V1 (30 pinos) + cabo USB de dados", "Cabo só de carga não serve"],
    ["1", "Sensor MH‑Z19C com barra de pinos (ou cabo de 7 fios)", "Barra de 9 furos na protoboard; só 4 são usados"],
    ["1", "Módulo DHT11 de 3 pinos (+, DATA/S, −)", "Já tem resistor de pull‑up e LED"],
    ["1", "Protoboard de 830 furos", "A de 400 também serve"],
    ["9", "Jumpers macho‑macho", "Sugestão de cores na seção 2"],
  ], [0.1, 0.5, 0.4]),
  ESPACO(),
  H2("1.2 Resumo das ligações"),
  TAB(["Sensor", "Pino do sensor", "ESP32", "Cor do fio no esquema"], [
    ["MH‑Z19C", "**Vin**", "**VIN** (5 V da USB)", "vermelho"],
    ["MH‑Z19C", "**GND**", "**GND**", "preto"],
    ["MH‑Z19C", "**Tx**", "**RX2** (GPIO 16)", "verde"],
    ["MH‑Z19C", "**Rx**", "**TX2** (GPIO 17)", "azul"],
    ["DHT11", "**+** (VCC)", "**3V3**", "laranja"],
    ["DHT11", "**DATA** (S, meio)", "**D4** (GPIO 4)", "amarelo"],
    ["DHT11", "**−** (GND)", "**GND**", "preto"],
  ], [0.17, 0.25, 0.3, 0.28]),
  ESPACO(),
  NOTA("Três regras que evitam quase todos os defeitos", [
    "**1.** O MH‑Z19C vai no **VIN (5 V)**, nunca no 3V3. Em 3,3 V ele liga, responde, e mede errado (5000 ppm fixo, reinícios).",
    "**2.** Serial é **cruzada**: o **Tx** do sensor vai ao **RX2** do ESP32, e o **Rx** do sensor vai ao **TX2**.",
    "**3.** O DHT11 vai no **3V3**. Assim o fio de dados fica em 3,3 V, o nível que o GPIO do ESP32 aceita.",
  ], VERDE),

  // ---------------------------------------------------------------
  ...QUEBRA(),
  H1("2. Esquemas de ligação"),
  P("Os três esquemas foram desenhados no **Fritzing** (arquivos `.fzz` em `aula-ar/esquemas/saida/`, gerados por `esquemas.py`). Monte com o **cabo USB desligado**. Nos esquemas, a trilha comprida de baixo da protoboard é a de alimentação: a linha **vermelha (+)** e a linha **azul (−)**."),

  H2("2.1 Só o DHT11"),
  ...FIGURA(path.join(ESQ, "01b_dht11_esp32.png"), "DHT11 (módulo de 3 pinos) no ESP32: + no 3V3 (laranja), DATA no D4 (amarelo), − no GND (preto). Arquivo `01b_dht11_esp32.fzz`."),
  OL([
    "Encaixe o módulo na protoboard, com os três pinos em **três colunas diferentes**.",
    "Ligue o **3V3** do ESP32 à trilha **+** e o **GND** à trilha **−**.",
    "Ligue a coluna do pino **+** à trilha + (fio laranja) e a coluna do pino **−** à trilha − (fio preto).",
    "Ligue a coluna do pino do meio (**DATA** ou **S**) ao **D4** (fio amarelo).",
  ]),
  NOTA("Confira a serigrafia do seu módulo", "A ordem dos pinos muda com o fabricante: há módulos com **S − +** ou com o − no meio. Vale o que está escrito na plaquinha. Com + e − invertidos, o DHT11 esquenta e pode queimar em segundos.", VERMELHO),

  ...QUEBRA(),
  H2("2.2 Só o MH‑Z19C"),
  ...FIGURA(path.join(ESQ, "05b_mhz19c_esp32.png"), "MH‑Z19C no ESP32: Vin no VIN = 5 V (vermelho), GND (preto), Tx do sensor no RX2 (verde), Rx do sensor no TX2 (azul). Arquivo `05b_mhz19c_esp32.fzz`."),
  OL([
    "Encaixe a barra de 9 pinos do sensor na protoboard. Da esquerda para a direita, olhando o sensor de cima como na figura: **HD, SR, Tx, Rx, Vo, PWM, AOT, GND, Vin**.",
    "Ligue o **VIN** do ESP32 à trilha **+** (agora ela é de **5 V**) e o **GND** à trilha **−**.",
    "Ligue a coluna do **Vin** do sensor à trilha + (fio vermelho) e a coluna do **GND** à trilha − (fio preto).",
    "Ligue a coluna do **Tx** do sensor ao **RX2** (fio verde) e a coluna do **Rx** ao **TX2** (fio azul).",
    "Deixe **HD, SR, Vo, PWM e AOT sem ligar**.",
  ]),
  TAB(["Pino do MH‑Z19C", "Função", "Neste tutorial"], [
    ["Vin", "Alimentação 5,0 V ± 0,1 V (pico de ~125 mA)", "VIN do ESP32"],
    ["GND", "Terra", "GND"],
    ["Tx", "Saída serial do sensor (nível 3,3 V)", "RX2 (GPIO 16)"],
    ["Rx", "Entrada serial do sensor (nível 3,3 V)", "TX2 (GPIO 17)"],
    ["PWM", "Saída em largura de pulso", "livre"],
    ["HD", "Zero por hardware (0 V por 7 s)", "livre"],
    ["AOT, SR, Vo", "Saída analógica e pinos reservados", "livres"],
  ], [0.22, 0.48, 0.3]),
  ESPACO(),
  P("Os sinais Tx e Rx do MH‑Z19C já são de **3,3 V**. Por isso, no ESP32, eles vão **direto**, sem divisor de tensão."),

  ...QUEBRA(),
  H2("2.3 Os dois juntos (montagem do teste 05c)"),
  ...FIGURA(path.join(ESQ, "05c_mhz19c_dht11_esp32.png"), "MH‑Z19C e DHT11 no mesmo ESP32. A trilha + é de 5 V (VIN) e alimenta só o MH‑Z19C. O + do DHT11 vai direto ao pino 3V3 (laranja). Arquivo `05c_mhz19c_dht11_esp32.fzz`."),
  P("É a soma dos dois esquemas anteriores, com **uma diferença**: a trilha + da protoboard fica com os **5 V** do VIN, para o MH‑Z19C. Então o **+ do DHT11 não vai mais à trilha**: ele recebe um fio direto do pino **3V3** do ESP32."),
  OL([
    "Monte o MH‑Z19C como em 2.2 (VIN e GND nas trilhas, Tx → RX2, Rx → TX2).",
    "Encaixe o DHT11 ao lado. Ligue o pino **−** à trilha − (a mesma do MH‑Z19C).",
    "Ligue o pino **+** do DHT11 **direto ao 3V3** do ESP32 (fio laranja).",
    "Ligue o pino **DATA** ao **D4** (fio amarelo).",
    "Confira os 9 fios com a tabela da seção 1.2 **antes** de ligar a USB.",
  ]),
  NOTA("Não ligue o + do DHT11 na trilha de 5 V", "Com o + em 5 V, o resistor de pull‑up do módulo leva o fio DATA a 5 V, acima do limite de 3,6 V do GPIO do ESP32.", VERMELHO),

  // ---------------------------------------------------------------
  ...QUEBRA(),
  H1("3. Gravar e rodar o teste"),
  H2("3.1 Preparar (uma vez)"),
  P("O sketch usa a biblioteca **DHT sensor library** (Adafruit), que pede a **Adafruit Unified Sensor**. O MH‑Z19C não usa biblioteca: o protocolo está escrito no próprio sketch."),
  CODIGO([
    "arduino-cli lib install \"DHT sensor library\" \"Adafruit Unified Sensor\"",
  ].join("\n"), { arquivo: false, titulo: "Terminal" }),
  ESPACO(),
  P("Na IDE do Arduino: **Ferramentas → Gerenciar bibliotecas**, procure `DHT sensor library` e instale com as dependências."),
  H2("3.2 Compilar e gravar"),
  CODIGO([
    "cd claudin-rob/aula-ar",
    "arduino-cli compile --fqbn esp32:esp32:esp32 codigo/05c_mhz19c_diagnostico_usb",
    "arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 codigo/05c_mhz19c_diagnostico_usb",
  ].join("\n"), { arquivo: false, titulo: "Terminal (Linux; no Windows troque /dev/ttyUSB0 por COM3, COM4…)" }),
  ESPACO(),
  P("Na IDE do Arduino: abra `05c_mhz19c_diagnostico_usb.ino`, escolha a placa **ESP32 Dev Module** e a porta, e clique em **Carregar**."),
  NOTA("Se a gravação falhar com \"No more data to read from the serial port\"", "Aconteceu na primeira tentativa deste teste. Feche qualquer programa que esteja usando a porta (Monitor Serial, gateway, script Python) e grave de novo. Se continuar, segure o botão **BOOT** da placa enquanto aparece `Connecting...`.", AZUL),
  H2("3.3 Abrir o Monitor Serial"),
  CODIGO("arduino-cli monitor -p /dev/ttyUSB0 -c baudrate=115200", { arquivo: false, titulo: "Terminal" }),
  ESPACO(),
  P("Na IDE: **Ferramentas → Monitor Serial**, em **115200 baud** e com **Nova linha**. O sketch faz uma leitura a cada **10 s**. Envie a letra `f` para alternar para **2 s**."),
  TAB(["Tecla", "O que faz"], [
    ["`i`", "Mostra versão do firmware, faixa de medição e estado da autocalibração (ABC)"],
    ["`f`", "Alterna o intervalo entre 10 s e 2 s"],
    ["`z`", "ZERO em 400 ppm. **Só ao ar livre**, com o sensor ligado há 20 min ou mais"],
    ["`a` / `d`", "Liga / desliga a autocalibração (ABC)"],
    ["`r`", "Reinicia o sensor"],
    ["`s`, `2`, `5`, `x`", "Span, faixa e leitura estendida: **não use** sem ler o cabeçalho do sketch"],
  ], [0.22, 0.78]),

  // ---------------------------------------------------------------
  ...QUEBRA(),
  H1("4. O que aparece na tela"),
  H2("4.1 Como ler cada linha"),
  TAB(["Linha", "Significado"], [
    ["`# cmd 0x86 -> 9 bytes: FF 86 ... (ok)`", "O ESP32 pediu a leitura e o MH‑Z19C devolveu 9 bytes com o checksum certo"],
    ["`#   CO2 612 ppm  temp 27 C  status 0x00`", "CO₂ em ppm e a temperatura **interna** do sensor (não é a do ar)"],
    ["`(aquecendo)`", "Primeiro minuto depois de ligar: o valor ainda não vale"],
    ["`#   DHT11 umidade 62 %  temp 29.1 C  sensacao 31.9 C`", "Umidade, temperatura do ar e índice de calor"],
    ["`#   DHT11 falha na leitura (N vezes)`", "O DHT11 não respondeu: veja a seção 6"],
    ["`# cmd 0x86 -> 0 bytes: (sem resposta valida)`", "O MH‑Z19C não respondeu: veja a seção 6"],
    ["`{\"no\":\"no19\",\"grandeza\":\"co2\",...}`", "A mesma leitura em JSON, para o gateway da telemetria‑cria"],
  ], [0.52, 0.48]),
  ESPACO(),
  P("Valores esperados: **400 a 500 ppm** ao ar livre, **600 a 1000 ppm** em sala ventilada com pessoas, **acima de 1500 ppm** em sala fechada e cheia. Um sopro perto do sensor leva a leitura a milhares de ppm em poucos segundos."),

  ...QUEBRA(),
  H1(`5. Resultado do teste de ${INFO.data}`),
  P(`O sketch foi compilado, gravado no ESP32 da bancada e a serial foi capturada por **${INFO.duracao}** (${INFO.hora}), com intervalo de 2 s (tecla \`f\`).`),
  TAB(["Sensor", "Resultado", "Detalhe"], [
    ["MH‑Z19C", mhzOk ? (semResposta ? "**Respondeu, com falhas**" : "**Respondeu em todas as leituras**") : "**Não respondeu**",
      mhzOk ? `${co2.length} leituras válidas, ${semResposta} sem resposta, ${reinicios} reinícios. CO₂ de **${min(co2)} a ${max(co2)} ppm** (média ${v(med(co2), 0)}). Temperatura interna ${min(tint)}–${max(tint)} °C. Firmware ${versao}, faixa ${faixa} ppm, ABC ${abc.toLowerCase()}.`
            : `${semResposta} pedidos sem resposta.`],
    ["DHT11", dhtOk ? (falhasDht ? "**Leu, com falhas**" : "**Leu em todas as tentativas**") : "**Não respondeu**",
      dhtOk ? `${ur.length} leituras válidas e ${falhasDht} falhas. Umidade ${min(ur)}–${max(ur)} %, temperatura ${v(min(tar))}–${v(max(tar))} °C, sensação ${v(min(st))}–${v(max(st))} °C.`
            : `**${falhasDht} tentativas, ${falhasDht} falhas.** Nenhuma leitura válida.`],
  ], [0.14, 0.26, 0.6]),
  ESPACO(),
  ...INFO.comentarios.map((c) => NOTA(c.titulo, c.texto, c.cor === "vermelho" ? VERMELHO : c.cor === "verde" ? VERDE : AZUL)).flatMap((n) => [n, ESPACO()]),
  CODIGO(trecho, { arquivo: false, titulo: `Monitor Serial — início e fim da captura de ${INFO.data}` }),

  // ---------------------------------------------------------------
  ...QUEBRA(),
  H1("6. Se der errado"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`DHT11 falha na leitura` sempre, LED do módulo **apagado**", "Sem alimentação", "Confira + no 3V3 e − no GND; veja se o jumper entrou até o fim"],
    ["`DHT11 falha na leitura` sempre, LED **aceso**", "Fio DATA fora do D4, ou ordem dos pinos diferente da figura", "Leia a serigrafia (+, S/DATA, −) e refaça o fio amarelo até o D4"],
    ["DHT11 lê 0 % e 0,8 °C", "Mau contato no fio DATA (os bits chegam zerados e o checksum confere)", "Reencaixe o módulo e o jumper; o sketch descarta essa leitura"],
    ["`cmd 0x86 -> 0 bytes`", "Tx/Rx trocados, fio solto ou sensor sem 5 V", "Após 3 falhas o sketch testa os pinos invertidos sozinho e avisa; confira Vin e GND"],
    ["`AVISO: o sensor só responde com TX/RX invertidos`", "Fios verde e azul trocados", "Troque os fios do RX2 e do TX2"],
    ["CO₂ preso em **5000 ppm**, reinícios", "Vin ligado no 3V3", "Passe o Vin para o **VIN** (5 V)"],
    ["CO₂ preso em **400 ppm**", "Ar limpo ou referência de zero alta demais (o sensor não mostra menos que 400)", "Sopre perto do sensor: o valor deve subir. Se não subir, faça o zero (`z`) ao ar livre após 20 min ligado"],
    ["CO₂ em **500 ppm** fixo por 1 min", "Sensor acabou de ligar", "Espere o aquecimento"],
    ["`ATENÇÃO: o sensor reiniciou ou travou`", "Queda de tensão nos 5 V (cabo USB longo, hub sem fonte)", "Use cabo curto e porta USB direta do computador"],
    ["Porta ocupada ao gravar", "Monitor Serial ou outro programa aberto", "Feche o outro programa: uma porta serial, um programa por vez"],
  ], [0.3, 0.32, 0.38]),

  // ---------------------------------------------------------------
  ...QUEBRA(),
  H1("7. Código do teste (sketch 05c)"),
  P("Arquivo `aula-ar/codigo/05c_mhz19c_diagnostico_usb/05c_mhz19c_diagnostico_usb.ino`."),
  CODIGO(SKETCH, { titulo: "05c_mhz19c_diagnostico_usb.ino" }),
];

module.exports = DOC({ titulo: "MH‑Z19C + DHT11 no ESP32: ligação e teste", rodape: "Tutorial — MH‑Z19C + DHT11 no ESP32: ligação e teste — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
