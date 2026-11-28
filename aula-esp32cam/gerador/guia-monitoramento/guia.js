// Guia rapido: camera de monitoramento com ESP32-CAM (montagem e alimentacao).
// Gera ../../saida/Guia-Montagem-Camera-Monitoramento-ESP32-CAM.docx (gerar.sh converte para PDF).
// Esquemas: ../../esquemas/saida/01_gravacao_ftdi.png e
//           ../../esquemas/saida-monitoramento/04_camera_monitoramento.png (python esquemas.py --monitoramento).
// Usa o lib.js da aula-ar (versao corrigida para o LibreOffice).
const path = require("path");
const { H1, H2, P, UL, OL, TAB, NOTA, CAPA, DOC, ESPACO, FIGURA, salvar } = require("../../../aula-ar/gerador/lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas");
const FIGS = path.join(AQUI, "figuras");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-Montagem-Camera-Monitoramento-ESP32-CAM.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia rápido de montagem",
    titulo: "Câmera de Monitoramento com ESP32-CAM",
    subtitulo: "Montagem com sensor de presença (PIR), gravação no microSD e vídeo ao vivo pelo Wi-Fi. Inclui a escolha do módulo de energia",
    info: [
      "**Placa:** ESP32-CAM AI-Thinker  •  **Sketch:** `aula-esp32cam/codigo/02_cam_seguranca_sd`",
      "Espaço CRIA — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),

  H1("1. O que vamos montar"),
  P("Uma câmera que fica ligada na tomada e faz três coisas: mostra o vídeo ao vivo numa página web, tira uma foto sempre que o sensor de presença (PIR) detecta movimento, e grava essas fotos no cartão microSD. Um LED verde indica que a câmera está funcionando."),
  P("A ESP32-CAM não tem porta USB. O programa é gravado uma vez, com um adaptador USB-serial CH340 (seções 4 e 5); depois disso, a placa trabalha sozinha, alimentada pela fonte (seção 6)."),

  H1("2. Alimentação: qual módulo de energia usar"),
  P("A alimentação é a causa mais comum de defeito na ESP32-CAM. A placa consome, em valores típicos, cerca de 0,2 A transmitindo vídeo e 0,3 A com o LED de flash aceso, com picos curtos maiores cada vez que o Wi-Fi transmite. Se a tensão cair nesses picos, a placa reinicia sozinha, a imagem sai com faixas ou a câmera não é reconhecida."),
  NOTA("Recomendação", [
    "**Fonte chaveada de 5 V e 2 A (ou mais), ligada no pino 5V da placa, com um capacitor eletrolítico de 470 µF entre o 5 V e o GND, perto da placa.**",
    "A fonte de 5 V e 6 A do laboratório (DAKE ZSQH030-5V) serve e pode alimentar várias câmeras. Ligada ao nobreak, a câmera continua funcionando quando falta energia.",
  ], VERDE),
  ESPACO(),
  TAB(["Opção", "Quando usar", "Limitação"], [
    ["**Fonte de 5 V e 2 A ou mais + capacitor de 470 µF** (recomendada)", "Câmera fixa, perto de uma tomada", "Cabo de 5 V curto: com mais de 2 m de fio fino, a tensão cai na placa"],
    ["**Conversor step-down (LM2596 ou MP1584) com fonte de 12 V**", "Câmera longe da tomada: os 12 V vão pelo cabo e o conversor, ao lado da câmera, baixa para 5 V", "Ajuste o conversor para 5,0 a 5,2 V com o multímetro **antes** de ligar a placa"],
    ["**Base ESP32-CAM-MB (micro-USB) com carregador de celular de 5 V e 2 A**", "Só vídeo ao vivo, sem PIR nem LED", "A base ocupa os pinos da placa: não sobra onde ligar o sensor"],
    ["**Módulo de protoboard MB102**", "Teste rápido na bancada", "Regulador linear de até 0,7 A que esquenta; precisa de 6,5 a 12 V na entrada. Não é indicado para ficar ligado o dia todo"],
    ["**Bateria 18650 + carregador TP4056 + elevador de tensão para 5 V (MT3608)**", "Lugar sem tomada", "Autonomia de poucas horas com vídeo contínuo; exige bateria com proteção"],
    ["**Adaptador USB-serial ou porta USB do computador**", "Somente para gravar o programa", "Corrente insuficiente: a placa reinicia quando o Wi-Fi ou o flash ligam"],
  ], [0.36, 0.3, 0.34]),
  ESPACO(),
  UL([
    "**Alimente sempre pelo pino 5V**, nunca pelo 3V3. O regulador da própria placa gera os 3,3 V.",
    "**O capacitor de 470 µF** (10 V ou mais) fornece a corrente dos picos do Wi-Fi. Ele tem polaridade: a faixa clara no corpo marca o terminal negativo.",
    "**GND comum:** o negativo da fonte, o GND da placa e o GND do PIR ficam todos na mesma trilha.",
  ]),

  H1("3. Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32-CAM AI-Thinker com câmera OV2640 ou OV3660", ""],
    ["1", "Adaptador USB-serial CH340 (módulo HW-193)", "Só para gravar o programa; seção 4"],
    ["4", "Jumpers fêmea-fêmea", "Do CH340 para a ESP32-CAM"],
    ["1", "Fonte de 5 V e 2 A ou mais", "Seção 2"],
    ["1", "Capacitor eletrolítico de 470 µF, 10 V ou mais", "Tem polaridade"],
    ["1", "Sensor de presença PIR HC-SR501", ""],
    ["1", "LED verde e 1 resistor de 220 Ω", "LED de status"],
    ["1", "Cartão microSD de até 32 GB, formatado em FAT32", "Vai no encaixe da própria placa"],
    ["1", "Protoboard de 400 furos e jumpers", "Macho-fêmea para a ESP32-CAM"],
  ], [0.08, 0.54, 0.38]),

  H1("4. O adaptador USB-serial CH340"),
  P("A ESP32-CAM não tem porta USB. O adaptador CH340 (módulo HW-193) faz a ponte: de um lado entra na porta USB do computador; do outro, conversa com a placa por dois fios de dados (TXD e RXD) e ainda fornece os 5 V da USB para a gravação."),
  ...FIGURA(path.join(FIGS, "ch340-pinagem.png"), "Pinagem do adaptador CH340 (HW-193), com os dois jumpers amarelos: o S1, que escolhe a tensão dos sinais, e o que vem de fábrica entre RXD e TXD.", 0.85),
  TAB(["Pino do CH340", "Função", "Liga na ESP32-CAM"], [
    ["GND", "Terra (negativo)", "GND"],
    ["RXD", "Entrada de dados do adaptador", "U0T (GPIO 1), a saída de dados da placa"],
    ["TXD", "Saída de dados do adaptador", "U0R (GPIO 3), a entrada de dados da placa"],
    ["3V3", "Saída de 3,3 V, de pouca corrente", "**Não usar**"],
    ["5V", "Saída de 5 V, vinda da USB", "5V"],
  ], [0.2, 0.36, 0.44]),
  ESPACO(),
  UL([
    "**A energia sai do pino 5V, nunca do 3V3.** Ligada no 3V3, a ESP32-CAM aceita a gravação, mas depois reinicia sem parar (`Brownout detector was triggered`) e o Wi-Fi não aparece. Na placa, o fio entra no pino **5V**, não no VCC.",
    "**Os fios de dados são cruzados:** o TXD de um lado vai no receptor do outro. TXD do CH340 no U0R da placa; RXD do CH340 no U0T.",
    "**Jumper S1 em 3V3.** Ele define a tensão dos sinais TXD e RXD. Os pinos da ESP32-CAM trabalham em 3,3 V; por isso o jumper fica unindo o pino do meio ao lado marcado 3V3. O pino 5V do adaptador continua fornecendo 5 V nas duas posições.",
    "**Retire o jumper entre RXD e TXD.** Ele vem de fábrica para um teste do próprio adaptador (o que o computador envia volta para ele). Com esse jumper no lugar, a gravação não funciona.",
    "**CTS e RTS** não têm pinos soldados neste módulo. Por isso a placa não entra sozinha no modo de gravação: é preciso o jumper no IO0 e o botão RST (seção 5).",
    "**No Linux não é preciso instalar driver.** Ao ligar o adaptador, aparece a porta `/dev/ttyUSB0`. O usuário precisa estar no grupo `dialout`.",
  ]),
  NOTA("O CH340 serve para gravar, não para alimentar a câmera em uso", "A porta USB do computador entrega cerca de 0,5 A, o bastante para gravar o programa e ver as mensagens no Monitor Serial. Com o Wi-Fi e o flash ligados, a placa pode reiniciar. Na câmera montada, a alimentação é a da seção 2.", AZUL),

  H1("5. Gravação do programa"),
  ...FIGURA(path.join(ESQ, "saida", "01_gravacao_ftdi.png"), "Ligação para gravar. O desenho mostra um adaptador USB-serial de outro modelo; no CH340, use os pinos com os mesmos nomes (tabela abaixo). O jumper amarelo entre IO0 e GND fica só durante a gravação.", 0.7),
  TAB(["CH340", "ESP32-CAM", "Fio"], [
    ["TXD", "U0R (GPIO 3)", "Verde"],
    ["RXD", "U0T (GPIO 1)", "Azul"],
    ["5V", "5V", "Vermelho"],
    ["GND", "GND", "Preto"],
    ["—", "IO0 ligado ao GND, só para gravar", "Amarelo"],
  ], [0.34, 0.4, 0.26]),
  ESPACO(),
  OL([
    "Confira os jumpers do CH340: S1 em 3V3 e **nenhum** jumper entre RXD e TXD (seção 4).",
    "Com o adaptador fora do computador, faça as ligações da tabela, com o jumper entre **IO0 e GND**. Depois ligue o adaptador à porta USB.",
    "No Arduino IDE, abra `aula-esp32cam/codigo/02_cam_seguranca_sd`, escolha a placa **AI Thinker ESP32-CAM** e a porta do adaptador, e grave. Pelo terminal: `arduino-cli compile --fqbn esp32:esp32:esp32cam -u -p /dev/ttyUSB0 aula-esp32cam/codigo/02_cam_seguranca_sd`.",
    "Se a gravação não começar, aperte o botão **RST** da placa e tente de novo.",
    "Terminada a gravação, **tire o jumper do IO0** e aperte RST. Com o jumper no lugar, o programa não roda.",
    "Para ver as mensagens da placa, abra o Monitor Serial em 115200 bps, com o adaptador ainda ligado. Depois desligue o adaptador e passe para a montagem da seção 6.",
  ]),

  H1("6. Montagem da câmera"),
  ...FIGURA(path.join(ESQ, "saida-monitoramento", "04_camera_monitoramento.png"), "Câmera de monitoramento: ESP32-CAM, sensor PIR, LED de status, capacitor de 470 µF e a fonte de 5 V nas trilhas de alimentação de baixo.", 0.8),
  TAB(["Bloco", "De", "Para", "Fio"], [
    ["Fonte", "+ e − da fonte de 5 V", "Trilha + (linha vermelha) e trilha − (linha azul), coluna 30", "Vermelho, preto"],
    ["Capacitor de 470 µF", "− na coluna 27, + na coluna 28", "Coluna 27 à trilha −; coluna 28 à trilha +", "Preto, vermelho"],
    ["ESP32-CAM", "5V e GND", "Trilha + e trilha −", "Vermelho, preto"],
    ["PIR HC-SR501 (colunas 10 a 12)", "VCC (10) / OUT (11) / GND (12)", "Trilha + / **IO13** / trilha −", "Vermelho, amarelo, preto"],
    ["LED verde", "Perna curta na coluna 17, perna longa na 18", "Coluna 17 à trilha −", "Preto"],
    ["Resistor de 220 Ω", "Entre as colunas 18 e 22", "Coluna 22 ao **IO12**", "Verde"],
  ], [0.2, 0.3, 0.32, 0.18]),
  ESPACO(),
  OL([
    "Com a fonte **fora da tomada**, monte o capacitor, o PIR, o LED e o resistor na protoboard, conforme a tabela.",
    "Ligue o 5V e o GND da ESP32-CAM às trilhas, o IO13 ao OUT do PIR e o IO12 ao resistor do LED.",
    "Encaixe o microSD na placa.",
    "Antes de ligar a fonte à protoboard, meça a saída dela com o multímetro: **5,0 a 5,2 V**. Confira qual fio é o positivo.",
    "Ligue a fonte às trilhas e ponha na tomada. Meça de novo entre o 5V e o GND **da placa**: não pode ficar abaixo de 4,8 V.",
  ]),
  NOTA("Pinos que não podem ser usados à vontade", [
    "**IO12** tem de estar em nível baixo quando a placa liga: por isso o LED vai do IO12 para o GND, e nunca para o 5 V ou o 3V3.",
    "**IO0** só vai ao GND durante a gravação.",
    "**IO4** é o LED de flash da própria placa. **IO2, IO14 e IO15** são usados pelo microSD.",
  ], VERMELHO),

  H1("7. Uso"),
  OL([
    "Ao ligar, a placa cria a rede Wi-Fi **Camera-ESP32** (senha `12345678`). Conecte o celular ou o computador nela.",
    "Abra **http://192.168.4.1** no navegador: aparecem o vídeo ao vivo e a galeria das fotos gravadas.",
    "Passe em frente ao PIR: a câmera tira uma foto e grava no microSD, na pasta `/fotos`. O intervalo mínimo entre duas fotos é de 5 s.",
    "O PIR precisa de cerca de 1 minuto ligado para estabilizar; nesse tempo ele pode disparar sozinho.",
  ]),
  P("Para a câmera entrar na rede da escola e gravar as fotos com data e hora, mude `MODO_AP` para `false` no início do sketch e preencha `SSID_REDE` e `SENHA_REDE`. Nesse caso, o endereço da página é o IP que aparece no Monitor Serial."),

  H1("8. Problemas comuns"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["Gravou, mas a rede não aparece; o Monitor Serial repete `Brownout detector was triggered` sem parar", "Fio de energia no pino **3V3** do CH340 (ou no VCC da ESP32-CAM) em vez do 5V", "Passe o fio para o pino **5V** dos dois lados e meça: perto de 5 V entre 5V e GND da placa"],
    ["A placa reinicia sozinha; o Monitor Serial mostra `Brownout detector was triggered`", "Tensão caindo nos picos de corrente", "Fonte de 5 V e 2 A, capacitor de 470 µF perto da placa, fios curtos"],
    ["`Camera init failed`", "Cabo flat da câmera mal encaixado ou alimentação fraca", "Reencaixe o cabo flat e feche a trava; confira os 5 V na placa"],
    ["Imagem com faixas ou travando", "Alimentação fraca ou sinal de Wi-Fi ruim", "Meça os 5 V na placa; aproxime do roteador; reduza a resolução"],
    ["Não grava o programa", "IO0 sem o jumper para o GND, TXD e RXD trocados, ou o jumper de fábrica ainda entre RXD e TXD do CH340", "Confira a tabela da seção 5 e aperte RST antes de gravar"],
    ["Programa gravado, mas nada acontece", "Jumper do IO0 ainda no lugar", "Tire o jumper e aperte RST"],
    ["Fotos não aparecem na galeria", "microSD ausente, maior que 32 GB ou fora do FAT32", "Formate em FAT32 e reencaixe"],
    ["PIR dispara o tempo todo", "Ainda estabilizando, ou sensibilidade alta", "Espere 1 minuto; ajuste os dois trimpots do PIR"],
  ], [0.34, 0.3, 0.36]),
];

module.exports = DOC({ titulo: "Guia rápido: câmera de monitoramento com ESP32-CAM", rodape: "Guia rápido: câmera de monitoramento com ESP32-CAM — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
