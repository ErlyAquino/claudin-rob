// Tutorial curto: conversor de nivel logico bidirecional de 4 canais (BSS138), 5 V <-> 3,3 V - para que serve, quando usar
// e quando nao usar, no contexto da telemetria-cria (no horta/no1) e dos sensores da aula-agua.
// Gera ../../saida/Tutorial-Conversor-de-Nivel-Logico.docx (gerar_tutorial.sh faz as figuras e converte para ODT e PDF).
const path = require("path");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Tutorial-Conversor-de-Nivel-Logico.docx");
const ESQ = (n) => path.join(AQUI, "..", "..", "esquemas", "saida", n + ".png");
const IMG = (n) => path.join(AQUI, n);
const VERDE = "E8F5E9", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Tutorial",
    titulo: "Conversor de nível lógico 5 V ↔ 3,3 V: para que serve e quando usar",
    subtitulo: "A plaquinha de 4 canais que deixa o ESP32, de 3,3 V, conversar com módulos de 5 V: como funciona, quando é necessária, quando um divisor resolve, quando ela não serve, e onde entra na Rede de Telemetria do Espaço CRIA",
    info: [
      "**Peças:** ESP32 DevKit V1, conversor de nível lógico bidirecional de 4 canais (BSS138) e um módulo I²C alimentado em 5 V (aqui, o ADS1115)",
      "**Sketch:** `11_scanner_i2c_esp32`",
      "Espaço CRIA — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // ---------------------------------------------------------------
  H1("1. Em poucas palavras"),
  P("O ESP32 trabalha em **3,3 V**. Vários módulos do laboratório trabalham em **5 V**. Um fio de dados que chega a 5 V num pino do ESP32 pode queimá‑lo: o limite do pino é 3,6 V. O **conversor de nível lógico** fica no meio do caminho e faz com que cada lado veja só a sua tensão: 3,3 V do lado do ESP32, 5 V do lado do módulo, com os dados passando nos dois sentidos."),
  NOTA("A regra de bolso", [
    "**Use o conversor** quando o fio é digital, leva dados nos dois sentidos e um dos lados está em 5 V. O caso típico é o **I²C** (fios SDA e SCL) com um módulo alimentado em 5 V.",
    "**Use um divisor de 1 kΩ e 2 kΩ** quando o fio é digital e só o módulo de 5 V fala (ECHO do HC‑SR04, pulsos do sensor de vazão).",
    "**Não use o conversor em sinal analógico** (pH, sensores de gás MQ). Ele só conhece nível alto e nível baixo.",
    "**Não use nada** quando o módulo já funciona em 3,3 V. É o caso da maior parte dos sensores da bancada.",
  ], VERDE),
  ESPACO(),
  NOTA("Três avisos", [
    "**Nada deste tutorial foi testado em hardware.** O sketch compila e o esquema foi conferido pino a pino com a documentação, mas nenhuma placa foi ligada.",
    "**O anúncio da compra não pôde ser aberto** (o site pede login). Pelo título, “10x conversor de nível lógico bidirecional I2C 5V 3.3V”, o texto assume a plaquinha comum de 4 canais com transistores BSS138 e pinos HV, LV, GND, HV1 a HV4 e LV1 a LV4. Confira a serigrafia da sua placa.",
    "**O conversor não é fonte nem isolador.** Ele não transforma 5 V em 3,3 V para alimentar nada, e os dois lados continuam com o GND em comum.",
  ], VERMELHO),

  // ---------------------------------------------------------------
  H1("2. O problema: dois mundos de tensão"),
  P("Num circuito digital, nível alto é a tensão de alimentação do chip e nível baixo é 0 V. O Arduino Uno é alimentado em 5 V, e por isso muitos módulos foram feitos para 5 V. O ESP32 é alimentado em 3,3 V."),
  TAB(["Sentido", "O que acontece", "Risco"], [
    ["Módulo de 5 V → ESP32", "o pino do ESP32 recebe 5 V; o máximo que ele aceita é 3,6 V", "**dano ao ESP32**, na hora ou aos poucos"],
    ["ESP32 → módulo de 5 V", "o módulo recebe 3,3 V como nível alto", "nenhum para as peças. Alguns módulos entendem, outros ficam no limite"],
    ["I²C com pull‑up em 5 V", "os resistores do módulo puxam SDA e SCL para 5 V, e esses fios vão direto aos pinos do ESP32", "**dano ao ESP32**, mesmo sem nenhum dado passando"],
  ], [0.24, 0.48, 0.28]),
  ESPACO(),
  P("O terceiro caso merece atenção. No barramento I²C ninguém “empurra” a linha para o nível alto: os chips só a **puxam para 0 V**, e quem a leva de volta ao nível alto é um resistor de **pull‑up** ligado à alimentação. É o que se chama saída em dreno aberto. Se o pull‑up está num módulo alimentado em 5 V, a linha em repouso fica em 5 V."),

  // ---------------------------------------------------------------
  H1("3. O módulo"),
  ...FIGURA(IMG("pinagem.png"), "A plaquinha de 4 canais vista de cima. Uma fileira é o lado de 5 V, a outra o de 3,3 V; cada canal liga um pino HV ao pino LV de mesmo número.", 1.2),
  TAB(["Pino", "Liga em", "Função"], [
    ["HV", "5 V (VIN do ESP32 pela USB, ou a fonte de 5 V)", "referência do lado alto. **Tem de ser ligado**"],
    ["LV", "3V3 do ESP32", "referência do lado baixo. **Tem de ser ligado**"],
    ["GND (dois pinos)", "GND comum a tudo", "os dois são o mesmo ponto; basta um fio"],
    ["LV1 a LV4", "GPIOs do ESP32", "um fio de dados por canal"],
    ["HV1 a HV4", "pinos de dados do módulo de 5 V", "o par de cada LV"],
  ], [0.20, 0.44, 0.36]),
  ESPACO(),
  H2("3.1 Como um canal funciona"),
  P("Cada canal tem um transistor MOSFET **BSS138** e dois resistores de 10 kΩ, um para cada alimentação. O circuito vem de uma nota de aplicação da Philips (hoje NXP) para o próprio barramento I²C."),
  ...FIGURA(IMG("canal_bss138.png"), "Um canal. A porta (G) do transistor fica presa em 3,3 V; a fonte (S) é o lado do ESP32 e o dreno (D) o lado de 5 V. Os três quadros mostram o que acontece em cada situação.", 1.2),
  P("O ponto central: **o nível alto de cada lado é dado pelo resistor daquele lado**, e não pelo outro lado. O transistor só transmite o nível baixo, em qualquer sentido. Por isso o lado do ESP32 nunca passa de 3,3 V, e por isso o circuito combina tão bem com o I²C, que já funciona puxando a linha para baixo."),
  H2("3.2 Limites"),
  TAB(["Limite", "O que significa na prática"], [
    ["**Velocidade**", "a subida do sinal é feita por um resistor de 10 kΩ, e é lenta. Serve para o I²C a 100 kHz e, com fios curtos, a 400 kHz. **Não serve** para fita de LED endereçável, cartão SD ou SPI rápido"],
    ["**Corrente**", "o nível alto vem de 10 kΩ: menos de 0,5 mA. O canal não acende LED nem aciona carga; ele só leva informação"],
    ["**Só digital**", "uma tensão intermediária (2,5 V do sensor de pH, por exemplo) não sai reduzida na proporção do outro lado. Para sinal analógico, divisor resistivo ou ADS1115"],
    ["**Não converte alimentação**", "HV e LV são entradas. É preciso levar 5 V a um e 3,3 V ao outro"],
    ["**Não isola**", "o GND é comum. Ruído e fuga de corrente passam de um lado ao outro"],
    ["**LV menor que HV**", "o lado LV é sempre o de tensão mais baixa. Trocados, o ESP32 fica exposto aos 5 V"],
  ], [0.26, 0.74]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("4. Quando usar e quando não usar"),
  ...FIGURA(IMG("decisao.png"), "Preciso de conversor? Quatro perguntas, na ordem.", 1.05),
  TAB(["Situação", "Exemplos", "Solução"], [
    ["I²C ou outro fio de mão dupla entre 5 V e 3,3 V", "ADS1115, LCD com PCF8574 ou DS3231 **alimentados em 5 V**; 1‑Wire com pull‑up em 5 V", "**conversor**, um canal por fio de dados"],
    ["Fio digital de mão única, do módulo de 5 V para o ESP32", "ECHO do HC‑SR04, pulsos do YF‑S201", "**divisor 1 kΩ / 2 kΩ** (5 V viram 3,3 V). Um canal livre do conversor também serve"],
    ["Sinal analógico de módulo de 5 V", "Po do pH‑4502C, AO do MQ‑2 e do MQ‑135", "**conversor não serve.** Divisor resistivo até a entrada analógica, ou ADS1115"],
    ["Módulo que funciona em 3,3 V", "BH1750, ADS1115, DS3231 e HX710B no 3V3; DS18B20 com pull‑up no 3V3; sensor de condutividade (TDS)", "**nada.** Alimente em 3,3 V e ligue direto"],
    ["Fio de mão única, do ESP32 para o módulo de 5 V", "entrada do módulo de relés, TRIG do HC‑SR04", "em geral **direto**. Se o módulo não reconhecer os 3,3 V, um canal do conversor"],
    ["Módulo de 5 V que já fala em 3,3 V", "serial do sensor de CO₂ MH‑Z19", "**direto.** A alimentação é 5 V, mas os pinos de dados são de 3,3 V"],
  ], [0.30, 0.36, 0.34]),
  ESPACO(),
  P("Antes de pôr o conversor, vale a pergunta mais barata: **o módulo funciona em 3,3 V?** Muitos funcionam, e alimentá‑los pelo pino 3V3 do ESP32 resolve tudo sem peça extra. O conversor é para quando o módulo **precisa** dos 5 V."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("5. No projeto: a Rede de Telemetria"),
  H2("5.1 Onde o conversor entra no nó horta/no1"),
  P("O nó `horta/no1` mede a solução nutritiva da bancada hidropônica. A montagem documentada em `firmware/horta-no1/README.md` usa **um conversor de 4 canais, com três canais ocupados**."),
  ...FIGURA(IMG("barramento_no1.png"), "O conversor no nó horta/no1, conforme o README do firmware. Canais 1 e 2: I²C até o ADS1115. Canal 3: pulsos do sensor de vazão. O quarto canal fica livre.", 1.25),
  P("**Por que o ADS1115 está em 5 V.** As saídas do pH‑4502C e do sensor de pressão do nó passam de 3,3 V, e o ADS1115 só mede tensões até a sua própria alimentação. Alimentado em 5 V, ele lê os dois sensores inteiros. O preço é que o I²C dele também vai a 5 V: os resistores de pull‑up da plaquinha estão ligados ao VDD, e o chip passa a exigir 3,5 V para reconhecer nível alto (70 % da alimentação). Daí o conversor em SDA e SCL."),
  P("**Um barramento, dois lados.** O relógio DS3231 do mesmo nó está alimentado em 3,3 V e fica do lado LV, direto nos GPIOs 21 e 22. O conversor separa o barramento em dois trechos, e os módulos dos dois trechos se enxergam normalmente."),
  P("**A alternativa sem conversor.** O sketch `01c_ph4502c_esp32_ads1115_web`, da aula de água, alimenta o ADS1115 em 3,3 V e põe um divisor 1 kΩ / 2 kΩ na saída do sensor de pH. Funciona com menos peças, mas cada sensor de 5 V precisa do seu divisor, e os resistores entram na conta da calibração."),
  H2("5.2 Sensor por sensor"),
  TAB(["Módulo", "Alimentação e sinal", "Conversor?", "Como ligar"], [
    ["ADS1115 no `horta/no1`", "5 V; I²C", "**sim**", "canais 1 e 2: SDA (GPIO 21) e SCL (GPIO 22)"],
    ["ADS1115 em 3,3 V (sketch `01c`)", "3,3 V; I²C", "não", "direto; divisor só na saída do sensor de pH"],
    ["pH‑4502C", "5 V; analógico (Po)", "**não serve**", "Po no A0 do ADS1115 em 5 V, ou divisor 1 kΩ / 2 kΩ até o GPIO 34"],
    ["Sensor de condutividade (TDS)", "3,3 V, pelo GPIO 32; analógico de 0 a 2,3 V", "não", "direto no A1 do ADS1115 ou no GPIO 34"],
    ["Sensor de pressão analógico do `horta/no1`", "5 V; analógico", "**não serve**", "A2 do ADS1115 em 5 V"],
    ["HX710B (pressão, aula de água)", "3,3 V; dois fios digitais", "não", "direto: GPIO 18 e GPIO 19"],
    ["DS18B20", "3,3 V; 1‑Wire", "não", "GPIO 4, com 4,7 kΩ até o 3,3 V"],
    ["YF‑S201 (vazão)", "5 V; pulsos, só saída", "opcional", "`horta/no1`: canal 3 até o GPIO 27. Sketch `02b`: divisor 1 kΩ / 2 kΩ. As duas valem"],
    ["BH1750 (luz, `horta/no2`)", "3,3 V; I²C", "não", "direto nos GPIOs 21 e 22"],
    ["DS3231 (relógio)", "3,3 V; I²C", "não", "direto, no lado LV. Alimentado em 5 V, iria para o lado HV"],
    ["Módulo de relés", "5 V; entrada IN", "não", "IN1 direto no GPIO 26, como no projeto (ver nota abaixo)"],
    ["Boia de nível", "contato ao GND", "não", "GPIO 25 com o pull‑up interno"],
    ["MQ‑2 e MQ‑135 (nó do ar)", "5 V; analógico", "**não serve**", "divisor 100 kΩ / 200 kΩ, como no `no-ar`"],
  ], [0.25, 0.25, 0.14, 0.36]),
  ESPACO(),
  NOTA("O que foi assumido", [
    "A tabela segue os README e os comentários dos programas da telemetria‑cria e os sketches da aula de água. **A montagem física da bancada não foi vista:** se o ADS1115 do nó real estiver em 3,3 V, ou o DS3231 em 5 V, a linha correspondente muda.",
    "**Módulo de relés.** O projeto liga IN1 direto ao GPIO 26, e os relatos são de que os módulos optoacoplados aceitam 3,3 V. Isso não foi testado aqui. Se o relé não desligar com o pino em nível alto, o quarto canal do conversor (LV4 no GPIO 26, HV4 no IN1) leva o nível alto a 5 V.",
  ]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("6. Montagem com o ESP32"),
  P("O exemplo repete o trecho de I²C do `horta/no1`: ESP32, conversor e ADS1115 alimentado em 5 V. A trilha vermelha da protoboard recebe os 5 V do pino VIN (com o ESP32 ligado pela USB) e a azul o GND."),
  ...FIGURA(ESQ("11_conversor_nivel_ads1115_esp32"), "ESP32, conversor de nível e ADS1115 em 5 V. Fileira de baixo do conversor (LV) para o ESP32; fileira de cima (HV) para a protoboard. Azul: SDA. Verde: SCL. Laranja: 3,3 V. Vermelho: 5 V.", 1.3),
  TAB(["Pino do conversor", "Vai para", "Cor na figura"], [
    ["LV", "3V3 do ESP32", "laranja"],
    ["GND (lado LV)", "GND do ESP32", "preto"],
    ["LV1", "GPIO 21 (SDA)", "azul"],
    ["LV2", "GPIO 22 (SCL)", "verde"],
    ["HV", "trilha de 5 V (VIN)", "vermelho"],
    ["GND (lado HV)", "trilha de GND", "preto"],
    ["HV1", "SDA do ADS1115", "azul"],
    ["HV2", "SCL do ADS1115", "verde"],
  ], [0.30, 0.44, 0.26]),
  ESPACO(),
  P("No ADS1115: VDD na trilha de 5 V, GND e ADDR na trilha de GND (endereço `0x48`). As fileiras do conversor ficam a 0,4 polegada uma da outra e não encaixam atravessadas no vão central da protoboard; por isso ele aparece solto, com jumpers. Soldar a barra de pinos e usar jumpers fêmea resolve."),
  H2("6.1 Conferir com o scanner I²C"),
  P("O sketch `11_scanner_i2c_esp32` pergunta a cada endereço do barramento se há alguém ali e lista quem respondeu. Com a montagem certa, o Monitor Serial (115200 baud) mostra:"),
  CODIGO(`Scanner I2C - SDA no GPIO 21, SCL no GPIO 22, 100 kHz
  0x48  ADS1115 (conversor A/D)
  1 modulo(s) no barramento.`, { arquivo: false, titulo: "saída esperada no Monitor Serial" }),
  ESPACO(),
  P("Se o módulo responde, o conversor está passando os dados nos dois sentidos: a pergunta foi do ESP32 ao módulo, e a resposta voltou. Com um multímetro dá para completar a conferência com o barramento parado: perto de 3,3 V em LV1 e LV2, perto de 5 V em HV1 e HV2."),

  // ---------------------------------------------------------------
  H1("7. Erros comuns"),
  TAB(["Erro", "Sintoma", "Correção"], [
    ["**HV ou LV sem ligar.** Só os fios de dados foram postos", "o scanner não acha nada, ou o barramento trava", "5 V no HV **e** 3,3 V no LV. Sem as duas referências o canal não funciona"],
    ["**GND não comum**", "leituras erráticas ou nenhum módulo", "GND do ESP32, do conversor, do módulo e da fonte de 5 V no mesmo ponto"],
    ["**Lados invertidos.** ESP32 no HV, módulo no LV", "pode até funcionar por um tempo; os pinos do ESP32 ficam em 5 V", "ESP32 sempre nos pinos LV. Confira com o multímetro antes de ligar o ESP32"],
    ["**Uso em sinal analógico**", "a leitura do pH ou do MQ não faz sentido", "divisor resistivo ou ADS1115 (seção 4)"],
    ["**Canais trocados.** SDA em LV1 e saindo em HV2", "o scanner não acha nada", "o par é sempre de mesmo número: LV1 com HV1"],
    ["**Módulo de 5 V ligado direto** “porque funcionou”", "funciona, e o ESP32 vai sendo castigado", "meça SDA e SCL em repouso. Acima de 3,6 V, falta o conversor"],
    ["**Fios longos ou 400 kHz**", "erros de leitura de vez em quando", "fios curtos, 100 kHz, um conversor só no barramento"],
  ], [0.34, 0.30, 0.36]),

  // ---------------------------------------------------------------
  H1("8. O que não foi verificado e fontes"),
  UL([
    "**Hardware:** nada foi montado. Falta gravar o scanner, ver o `0x48` e medir as tensões dos dois lados.",
    "**O anúncio:** não abriu sem login. Modelo, cor da placa e ordem dos pinos foram assumidos pelo título e pela placa mais comum com essa descrição.",
    "**Velocidade:** o limite de 400 kHz vem da nota de aplicação da NXP; nenhuma medida foi feita com estas placas e estes fios.",
    "**A bancada real:** a tabela da seção 5.2 segue a documentação da telemetria‑cria, não uma inspeção da montagem.",
  ]),
  H2("Fontes"),
  UL([
    "NXP Semiconductors. AN10441: Level shifting techniques in I²C‑bus design. 2007. É a origem do circuito de um MOSFET por linha.",
    "NXP Semiconductors. UM10204: I²C‑bus specification and user manual.",
    "SparkFun. Bi‑Directional Logic Level Converter Hookup Guide (placa BOB‑12009, da qual os módulos genéricos são cópia).",
    "onsemi. BSS138: N‑Channel Logic Level Enhancement Mode Field Effect Transistor (folha de dados).",
    "Texas Instruments. ADS1115 (folha de dados): alimentação de 2,0 a 5,5 V e nível alto de entrada a partir de 0,7 × VDD.",
    "Espressif. ESP32 Series Datasheet: limites de tensão dos pinos.",
    "Telemetria‑cria: `firmware/horta-no1/README.md`, `firmware/horta-no2/horta-no2.ino` e `firmware/no-ar/no-ar.ino`.",
    "Peça do Fritzing: “I2C level shifter bidirectional”, da biblioteca do próprio programa.",
  ]),
];

module.exports = DOC({ titulo: "Conversor de nível lógico 5 V ↔ 3,3 V: para que serve e quando usar", rodape: "Tutorial — Conversor de nível lógico 5 V ↔ 3,3 V — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
