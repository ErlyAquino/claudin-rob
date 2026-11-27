// Tutorial: sensor de pH (placa pH-4502C + sonda de vidro BNC) da aula-agua - o que e pH, instalacao, calibracao,
// erros, cuidados com a sonda e uso na hidroponia (bancada NFT do no horta/no1 da telemetria-cria).
// Gera ../../saida/Tutorial-pH-4502C-Instalacao-e-Calibracao.docx (gerar_tutorial.sh faz as figuras e converte para ODT e PDF).
// O texto de hidroponia fica em hidroponia.js.
const path = require("path");
const fs = require("fs");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Tutorial-pH-4502C-Instalacao-e-Calibracao.docx");
const ESQ = (n) => path.join(AQUI, "..", "..", "esquemas", "saida", n + ".png");
const IMG = (n) => path.join(AQUI, n);
const B = JSON.parse(fs.readFileSync(path.join(AQUI, "resumo_bancada.json"), "utf8"));   // graficos.py
const VERDE = "E8F5E9", VERMELHO = "FDECEA";
const v = (x, n = 3) => x.toFixed(n).replace(".", ",");
const hidroponia = require("./hidroponia");

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Tutorial",
    titulo: "Sensor de pH pH‑4502C: instalação, calibração e uso na hidroponia",
    subtitulo: "O que é pH e como um eletrodo de vidro o mede, a ligação da placa no Arduino Uno e no ESP32, o ajuste do offset, a calibração com soluções tampão, os erros, os cuidados com a sonda e o pH da solução nutritiva na bancada hidropônica do Espaço CRIA",
    info: [
      "**Sensor:** placa pH‑4502C + eletrodo combinado de vidro (BNC)  •  **Placas:** Arduino Uno (A0), ESP32 DevKit V1 (GPIO 34, divisor 1 kΩ / 2 kΩ) e ESP32 + ADS1115",
      "**Sketches:** `01_ph4502c_uno`, `01b_ph4502c_esp32_web`, `01c_ph4502c_esp32_ads1115_web`  •  **Na telemetria:** nó `horta/no1`",
      "Espaço CRIA — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // ---------------------------------------------------------------
  H1("1. Visão geral"),
  P("Este tutorial acompanha o sensor de pH do kit da aula de água, do zero até a medida confiável: o que é pH, como a sonda de vidro transforma acidez em tensão, como ligar a placa **pH‑4502C** no Arduino Uno e no ESP32, como calibrar com soluções tampão e como cuidar da sonda. As duas últimas partes levam o sensor para o lugar onde ele trabalha de verdade no Espaço CRIA: a **solução nutritiva da bancada hidropônica**, medida pelo nó `horta/no1` da Rede de Telemetria."),
  P("Calibrar o sensor de pH é descobrir a **reta** que liga a tensão lida pela placa ao pH do líquido. Essa reta tem dois números: a tensão em pH 7 (**V7**, o offset) e a **inclinação** (volts por unidade de pH). Os dois mudam de sonda para sonda e com a idade da sonda, por isso não existe valor de fábrica confiável: sem calibração, o erro típico é de **0,5 a 2 unidades de pH**."),
  NOTA("O caminho inteiro em cinco etapas", [
    "**Instalar (seção 5):** V+ no 5 V, G no GND, Po no A0 do Uno. No ESP32, o Po passa pelo divisor 1 kΩ / 2 kΩ antes do GPIO 34.",
    "**Passo 1 — offset da placa (seção 7, uma vez por placa):** com o BNC em curto, girar o potenciômetro mais perto do BNC até o Po marcar **2,500 V** (no ESP32, com o divisor, **1,667 V** no GPIO 34).",
    "**Passo 2 — dois pontos (seção 8, toda semana de uso):** sonda no tampão **pH 7,00**, esperar estabilizar, comando `c7`; enxaguar; sonda no tampão **pH 4,00** (ou 10,00), esperar, comando `c4` (ou `c10`). O sketch grava V7 e a inclinação na memória da placa.",
    "**Passo 3 — verificação (seção 9):** medir um terceiro tampão. O erro deve ficar em **até 0,1 pH** (Uno ou ADS1115) ou **até 0,2 pH** (ADC interno do ESP32). A inclinação deve ficar entre **85 % e 105 %** da teórica.",
    "**Usar e cuidar (seções 11 a 13):** sonda guardada molhada em KCl, recalibração periódica e, na hidroponia, pH da solução entre 5,5 e 6,5.",
  ], VERDE),
  ESPACO(),
  NOTA("Três pontos de atenção", [
    "**Os comandos do sketch supõem tampões de pH exatamente 7, 4 e 10.** Com os sachês **6,86 e 9,18**, muito comuns nos kits dessa sonda, a calibração fica errada: 0,14 pH de erro perto do neutro e 0,3 pH em pH 10 com o 6,86; mais de 1 pH com o 9,18 (seção 10.4). Use tampão 7,00 ou aplique a correção da seção 10.4.",
    "**A calibração vale para uma montagem.** Ela é gravada em volts **no pino**: trocar do Uno para o ESP32, mexer no divisor ou trocar a sonda exige calibrar de novo.",
    `**O sensor da bancada ainda não estava calibrado em ${B.data}** (seção 14): em ${B.minutos} min de leituras, a tensão no GPIO 34 ficou entre ${v(B.v_min)} e ${v(B.v_max)} V e derivou, quando o esperado em pH 7 é 1,667 V.`,
  ], VERMELHO),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("2. O que é pH"),
  H2("2.1 A água se divide em íons"),
  P("A água líquida não é feita só de moléculas H₂O inteiras. A todo instante, uma fração minúscula delas se separa em dois íons: o **H⁺** (na prática ele se prende a outra molécula e forma o hidrônio, H₃O⁺) e o **OH⁻** (hidroxila). Logo em seguida os íons se encontram e voltam a ser água. Esse vaivém se chama **autoionização**, e o equilíbrio dele obedece a uma regra simples: a 25 °C, o produto das duas concentrações é sempre o mesmo."),
  CODIGO(`H2O  <->  H+  +  OH-

[H+] x [OH-] = 1,0 x 10^-14      (a 25 C; concentracoes em mol/L)

agua pura:   [H+] = [OH-] = 10^-7 mol/L     -> 1 molecula ionizada em cada 550 milhoes
com acido:   [H+] sobe e [OH-] desce na mesma proporcao
com base:    [OH-] sobe e [H+] desce na mesma proporcao`, { arquivo: false, titulo: "a autoionização da água" }),
  ESPACO(),
  P("Um **ácido** é uma substância que, dissolvida, solta H⁺ (o ácido acético do vinagre, o cítrico do limão, o fosfórico do refrigerante de cola). Uma **base** retira H⁺ da água ou solta OH⁻ (o bicarbonato, o sabão, a soda cáustica). Como o produto é fixo, basta conhecer a concentração de H⁺ para saber tudo: se ela é maior que 10⁻⁷ mol/L, o líquido é ácido; se é menor, é básico (ou alcalino)."),
  H2("2.2 Por que um logaritmo"),
  P("A concentração de H⁺ dos líquidos comuns vai de cerca de 1 mol/L (ácido de bateria) a 10⁻¹⁴ mol/L (soda cáustica): **cem trilhões de vezes** de diferença. Para caber numa escala legível, o químico dinamarquês Søren Sørensen propôs, em 1909, guardar só o expoente, com o sinal trocado:"),
  CODIGO(`pH = -log10 [H+]                [H+] = 10^(-pH)  mol/L

[H+] = 10^-7 mol/L   ->  pH = 7        (neutro, a 25 C)
[H+] = 10^-3 mol/L   ->  pH = 3        (vinagre: 10 000 vezes mais H+ que a agua pura)
[H+] = 10^-10 mol/L  ->  pH = 10       (sabao: 1 000 vezes menos H+ que a agua pura)

pH + pOH = 14  (a 25 C),  com  pOH = -log10 [OH-]`, { arquivo: false, titulo: "a definição de pH" }),
  ESPACO(),
  ...FIGURA(IMG("escala_ph.png"), "A escala de pH. Em cima, a concentração de H⁺ correspondente; embaixo, líquidos do dia a dia (valores aproximados), a faixa da solução nutritiva da hidroponia e os três tampões usados na calibração.", 1.15),
  P("Três consequências da escala logarítmica valem para tudo o que vem depois:"),
  UL(["**Cada unidade de pH é um fator 10.** Um líquido de pH 5 tem 10 vezes mais H⁺ que um de pH 6 e 100 vezes mais que um de pH 7. Uma solução nutritiva que passa de pH 6,0 para 7,0 não ficou “um pouco” menos ácida: perdeu 90 % dos íons H⁺.",
    "**Diferenças pequenas importam.** Errar 0,3 no pH é errar por um fator 2 na concentração de H⁺ (10^0,3 ≈ 2). Por isso o critério do projeto da telemetria é ±0,2 pH.",
    "**pH não se soma nem se tira média simples.** Misturar partes iguais de um líquido de pH 4 e outro de pH 6 não dá pH 5: dá cerca de 4,3, porque quem manda é o líquido com mais H⁺."]),
  H2("2.3 Três detalhes que evitam confusão"),
  UL(["**Neutro é pH 7 só a 25 °C.** A autoionização aumenta com a temperatura: a 50 °C a água pura tem pH 6,6 e continua neutra (há tanto H⁺ quanto OH⁻). O pH de qualquer líquido muda um pouco com a temperatura, e isso é química de verdade, não erro do sensor.",
    "**A escala não acaba em 0 e 14.** São só os limites dos líquidos comuns e a faixa da nossa sonda. Ácidos concentrados têm pH negativo.",
    "**O que o eletrodo sente é a atividade do H⁺**, isto é, a concentração “efetiva”, descontado o efeito dos outros íons. Em soluções diluídas, como água de torneira e solução nutritiva, atividade e concentração são quase iguais, e a definição acima serve."]),
  H2("2.4 O que é uma solução tampão"),
  P("Uma gota de vinagre muda muito o pH de um copo de água pura, porque não há nada na água que “segure” o H⁺ a mais. Uma **solução tampão** é uma mistura de um ácido fraco com o seu sal (por exemplo, fosfatos) que absorve H⁺ ou OH⁻ adicionados e **mantém o pH quase fixo**. É por isso que os tampões servem de padrão: o de pH 7,00 continua em 7,00 mesmo que a sonda leve para dentro dele uma gota de água de enxágue. Pelo mesmo motivo, a água destilada é um péssimo líquido para testar o sensor: sem tampão e sem sais, o pH dela oscila com o gás carbônico do ar e a leitura não para."),
  P("A solução nutritiva da hidroponia tem pouco poder tampão, e as plantas trocam íons com ela o tempo todo. O pH dela **deriva ao longo dos dias** e precisa ser medido e corrigido: é o assunto da seção 12."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("3. Como a sonda de vidro mede o pH"),
  P("A sonda do kit é um **eletrodo combinado**: dois eletrodos num corpo só. Ela não mede pH diretamente. Ela é uma pequena **pilha** cuja tensão depende do pH do líquido em que está mergulhada."),
  ...FIGURA(IMG("eletrodo.png"), "Corte esquemático de um eletrodo combinado de pH (fora de escala). O fio central vem do bulbo de vidro; o segundo fio, do eletrodo de referência.", 1.0),
  H2("3.1 As duas metades da pilha"),
  UL(["**Eletrodo de medida (o bulbo).** A ponta da sonda é uma membrana de **vidro especial**, com cerca de 0,1 mm de espessura. As duas faces do vidro, quando hidratadas, formam uma camada de gel que troca íons H⁺ com o líquido encostado nela. Dentro do bulbo há uma solução de pH fixo (7); fora, a amostra. Se a amostra tem mais H⁺ que a solução interna, a face de fora fica mais “carregada” que a de dentro, e aparece uma **diferença de potencial** através do vidro.",
    "**Eletrodo de referência.** Para medir uma tensão é preciso um segundo ponto de contato com o líquido, e ele não pode depender do pH. É um fio de prata coberto de cloreto de prata (Ag/AgCl) mergulhado em **KCl 3 mol/L**, que toca a amostra por uma **junção porosa** (um pequeno diafragma cerâmico na lateral da ponta). A tensão dele é constante.",
    "**O que a placa mede** é a diferença entre os dois: pino central do BNC (vidro) menos carcaça do BNC (referência)."]),
  H2("3.2 A equação de Nernst"),
  P("A tensão dessa pilha segue a **equação de Nernst**. Para o eletrodo de pH, ela diz que a tensão é proporcional à diferença entre o pH da amostra e o pH da solução interna, e que a constante de proporcionalidade depende só da temperatura:"),
  CODIGO(`E = -(2,303 R T / F) x (pH - 7)  =  -0,19842 mV/K x T x (pH - 7)

R = 8,314 J/(mol K)   F = 96 485 C/mol   T = temperatura em kelvin (C + 273,15)   2,303 = ln 10

a 25 C:   E = -59,16 mV x (pH - 7)      pH 4 -> +177 mV     pH 7 -> 0 mV     pH 10 -> -177 mV
          faixa inteira:  pH 0 -> +414 mV ... pH 14 -> -414 mV`, { arquivo: false, titulo: "a tensão da sonda" }),
  ESPACO(),
  P("Repare em duas coisas. Primeiro, o logaritmo da definição de pH faz a tensão ser uma **reta** em função do pH: por isso a calibração é uma reta, e dois pontos bastam. Segundo, o sinal é pequeno: **59 milésimos de volt** para uma unidade inteira de pH. Um erro de 6 mV na medida já é 0,1 pH."),
  H2("3.3 Por que precisa de uma placa especial"),
  P("O vidro é um isolante. A resistência elétrica do bulbo é altíssima, da ordem de **dezenas a centenas de megaohms**. Uma pilha com resistência interna tão grande não consegue fornecer corrente: se você encostar um multímetro comum (10 MΩ) nos terminais da sonda, ele “puxa” corrente demais e a tensão desaba. Ligar a sonda direto num pino analógico do Arduino dá o mesmo resultado."),
  P("A placa pH‑4502C existe para resolver isso. O amplificador dela tem entrada de altíssima impedância, praticamente não puxa corrente do vidro, e entrega na saída um sinal forte, que qualquer conversor A/D lê. De quebra, ela **multiplica o sinal por cerca de 3** e **soma 2,5 V**, para que a faixa de −414 a +414 mV vire uma tensão sempre positiva, entre 0 e 5 V."),
  P("A mesma alta impedância explica dois comportamentos que assustam na bancada: a leitura **salta quando a mão chega perto do cabo** (o cabo funciona como antena) e **deriva sem parar quando a sonda está desligada ou seca** (a entrada fica flutuando)."),
  H2("3.4 Por que calibrar"),
  P("A equação de Nernst descreve uma sonda perfeita. Uma sonda de verdade se afasta dela de três maneiras, e as três mudam com o tempo:"),
  TAB(["O que foge do ideal", "Por quê", "Tamanho típico", "Quem corrige"], [
    ["**Offset** (ponto zero): em pH 7 a sonda não dá exatamente 0 mV", "as duas faces do vidro nunca são idênticas; o eletrodo de referência envelhece; a junção suja", "até ±30 mV (±0,5 pH)", "o ponto do tampão 7 (`c7`)"],
    ["**Inclinação** menor que 59,16 mV/pH", "o vidro envelhece e a camada de gel responde menos; sonda seca ou suja", "95–100 % nova; abaixo de 85 %, trocar", "o segundo tampão (`c4` ou `c10`)"],
    ["**Temperatura**", "a inclinação é proporcional à temperatura absoluta (0,34 % por °C)", "0,03 pH por 10 °C, por unidade de distância ao pH 7", "calibrar e medir na mesma temperatura (seção 10.2)"],
  ], [0.26, 0.34, 0.2, 0.2]),
  ESPACO(),
  P("Somam‑se a isso as imperfeições da eletrônica (a seção 4.3 mostra a cadeia inteira). A calibração com tampões corrige tudo de uma vez, porque mede o conjunto: entra um pH conhecido, sai uma tensão. E como a sonda muda com o uso, a calibração tem prazo de validade: **uma semana de uso** é a regra deste tutorial."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("4. Conhecendo a placa pH‑4502C"),
  H2("4.1 Pinagem"),
  P("Segure a placa com o **conector BNC para cima** e a face dos componentes virada para você, como na foto. A barra de **6 pinos** fica embaixo e os nomes estão impressos logo acima de cada pino, da esquerda para a direita: **To · Do · Po · G · G · V+**. Só **três** deles são usados: **V+**, **G** e **Po**."),
  ...FIGURA(path.join(AQUI, "..", "..", "imagens", "ph4502c_pinagem.jpg"), "Placa pH‑4502C do kit (foto da bancada) com a pinagem. O fio de dados sai do **Po**, o terceiro pino da esquerda para a direita.", 0.7),
  TAB(["Pino", "Nome", "Tipo", "O que é", "Ligação"], [
    ["1", "**To**", "saída analógica", "Temperatura: tensão do termistor NTC de 10 kΩ (a peça preta “103”) soldado na placa. Mede a temperatura **da placa**, não a do líquido", "não ligar"],
    ["2", "**Do**", "saída digital", "Comparador: muda de nível quando o pH cruza o limiar ajustado no potenciômetro **mais longe** do BNC (um LED da placa acompanha)", "não ligar"],
    ["3", "**Po**", "saída analógica **0 a 5 V**", "**O sinal de pH**: ≈ 2,5 V em pH 7 (depois do ajuste de offset); **cai** ~0,18 V a cada unidade de pH que sobe (pH 4 ≈ 3,0 V; pH 10 ≈ 2,0 V)", "**fio de dados** → A0 do Uno, ou divisor → GPIO 34 do ESP32"],
    ["4", "**G**", "terra", "GND do circuito analógico (referência da sonda)", "GND"],
    ["5", "**G**", "terra", "GND da alimentação. Os dois G são ligados entre si na placa: confira com o multímetro em continuidade", "GND"],
    ["6", "**V+**", "alimentação", "**5 V** contínuos (consumo de poucos mA). Com 3,3 V o amplificador não funciona direito", "5V do Uno / **VIN** do ESP32"],
  ], [0.07, 0.09, 0.17, 0.42, 0.25]),
  ESPACO(),
  H2("4.2 As outras peças da placa"),
  TAB(["Peça", "Função"], [
    ["Conector **BNC**", "entrada da sonda: pino central = sinal do vidro, carcaça = referência. Encaixe e gire até travar"],
    ["Potenciômetro azul **mais perto do BNC**", "**offset**: desloca a tensão do Po para que pH 7 dê 2,5 V. São ~25 voltas de ponta a ponta: gire devagar, com chave de fenda pequena"],
    ["Potenciômetro azul **mais longe do BNC**", "limiar do pino Do. Não muda o Po: pode deixar como está"],
    ["CI de 8 pinos marcado **4502C**", "amplificador operacional de altíssima impedância de entrada, o único capaz de “ouvir” a sonda sem descarregá‑la. É ele que dá nome à placa"],
    ["CI **LM358** e LEDs", "comparador do Do e indicadores (alimentação / limiar)"],
    ["Termistor preto “103”", "sensor de temperatura do pino To (temperatura da placa)"],
  ], [0.36, 0.64]),
  ESPACO(),
  NOTA("Não existe folha de dados oficial", ["O pH‑4502C é um módulo genérico, vendido por vários fabricantes sem folha de dados oficial; a pinagem acima vem das **marcações da própria placa** e das fichas dos revendedores, e confere com a placa do nosso kit. Há lotes com pequenas diferenças: **confie sempre no que está impresso ao lado dos pinos** e, na dúvida, meça com o multímetro (Po deve ficar perto de 2,5 V com o BNC em curto, depois do Passo 1)."]),
  ESPACO(),
  H2("4.3 Do líquido ao número: a cadeia de sinal"),
  P("O número que aparece na tela passa por cinco estágios, e cada um acrescenta um erro próprio. A calibração com tampões corrige todos de uma vez, porque mede a cadeia inteira."),
  ...FIGURA(IMG("cadeia_sinal.png"), "A cadeia de sinal, com o exemplo de um líquido de pH 4,00 e uma sonda ideal. O divisor só existe na montagem com ESP32.", 1.3),
  TAB(["Estágio", "O que faz", "Erro que acrescenta", "Quem corrige"], [
    ["1. Sonda de vidro", "gera ~59 mV por unidade de pH (Nernst), 0 mV em pH 7", "offset próprio (até ±30 mV) e perda de inclinação com a idade", "calibração de 2 pontos"],
    ["2. Amplificador da placa", "multiplica por ~3 e soma ~2,5 V", "o “2,5 V” depende do potenciômetro; o ganho varia alguns % entre placas", "potenciômetro (Passo 1) + 2 pontos"],
    ["3. Divisor 1 kΩ / 2 kΩ (só ESP32)", "multiplica por 2/3", "resistores de 5 %: o fator real fica entre 0,64 e 0,69", "2 pontos (feitos **com** o divisor)"],
    ["4. Conversor A/D", "transforma volts em número", "Uno: depende do 5 V real; ESP32: não linear e ruidoso; ADS1115: desprezível", "2 pontos (parte); média aparada (ruído)"],
    ["5. Reta no sketch", "pH = 7 + (V − V7) / inclinação", "nenhum, se V7 e inclinação estiverem certos", "é o resultado da calibração"],
  ], [0.2, 0.25, 0.32, 0.23]),
  ESPACO(),
  P("Daí vêm duas regras práticas. **Calibre na montagem em que vai medir**, com o mesmo cabo, o mesmo divisor e a mesma alimentação. E **o potenciômetro não substitui os tampões**: ele só centra o sinal da placa; quem acerta a sonda são os tampões."),
  TAB(["Líquido de referência", "E na sonda (25 °C)", "Po (Uno, A0)", "GPIO 34 (ESP32 com divisor)"], [
    ["tampão pH 4,00", "+177 mV", "3,03 V", "2,02 V"], ["tampão pH 6,86", "+8 mV", "2,52 V", "1,68 V"],
    ["**tampão pH 7,00**", "**0 mV**", "**2,50 V**", "**1,667 V**"], ["tampão pH 9,18", "−129 mV", "2,11 V", "1,41 V"],
    ["tampão pH 10,00", "−177 mV", "1,97 V", "1,31 V"],
  ], [0.28, 0.22, 0.22, 0.28]),
  ESPACO(),
  P("Esses são os valores **ideais**, para uma placa com ganho 3 exato e offset ajustado. Servem para conferir se a montagem está perto do esperado; os valores reais de cada sonda saem da calibração. Repare no sinal: nesta placa, **mais ácido = mais tensão**. A inclinação é negativa."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("5. Instalação: ligando a placa"),
  H2("5.1 Material"),
  TAB(["Item", "Quantidade", "Observação"], [
    ["Placa pH‑4502C + sonda de vidro com conector BNC", "1", "a sonda vem com uma tampa cheia de solução de armazenamento: guarde a tampa"],
    ["Arduino Uno **ou** ESP32 DevKit V1 (30 pinos) + cabo USB", "1", "o ESP32 exige o divisor"],
    ["Resistores de 1 kΩ e 2 kΩ", "1 de cada", "só para o ESP32. Sem 2 kΩ: dois de 1 kΩ em série"],
    ["Módulo ADS1115", "1", "opcional (seção 5.4): leitura mais exata no ESP32"],
    ["Protoboard e jumpers macho‑fêmea e macho‑macho", "—", "amarelo para o sinal, vermelho para 5 V, preto para GND"],
    ["Multímetro", "1", "para conferir o 5 V, o Po e o divisor antes de ligar o ESP32"],
  ], [0.46, 0.14, 0.4]),
  ESPACO(),
  NOTA("Antes de qualquer fio", ["**Desligue a USB antes de mexer nos fios.** O amplificador da placa é sensível: VCC e GND invertidos o destroem.",
    "**Água longe das placas.** Só a ponta da sonda toca o líquido. Arduino, ESP32, protoboard e a placa de pH ficam acima do nível dos copos e longe deles. Seque as mãos antes de mexer nos fios.",
    "**A sonda é de vidro.** Não bata o bulbo, não encoste no fundo do copo, não deixe secar. A tampa de armazenamento só sai na hora de medir.",
    "**O ESP32 é 3,3 V.** O Po chega a 5 V: no ESP32 ele **sempre** passa pelo divisor."]),
  ESPACO(),
  H2("5.2 No Arduino Uno"),
  P("É a montagem mais simples: três fios, sem protoboard. O Uno trabalha em 5 V, a mesma tensão da placa, e o pino A0 aguenta o Po inteiro."),
  TAB(["Placa pH‑4502C", "Arduino Uno", "Cor sugerida"], [
    ["V+", "5V", "vermelho"], ["G (qualquer um dos dois)", "GND", "preto"], ["Po", "A0", "amarelo"], ["To, Do", "não ligar", "—"], ["BNC", "sonda de vidro", "—"],
  ], [0.4, 0.3, 0.3]),
  ...FIGURA(ESQ("01_ph4502c_uno"), "pH no Uno: V+ no 5V, G no GND, Po no A0. O desenho mostra outra placa de pH (veja a nota abaixo); as três ligações são as mesmas.", 0.95),
  NOTA("O desenho mostra outra placa", ["O programa de esquemas (Fritzing) não tem o desenho da pH‑4502C. As figuras de montagem deste tutorial usam o desenho de uma placa de pH parecida, com cabo de 3 fios. **As ligações são as mesmas três: Po, G e V+**; só a aparência muda. Para a posição real dos pinos, vale a foto da seção 4.1."]),
  ESPACO(),
  H2("5.3 No ESP32, com o divisor de tensão"),
  P("O Po vai de 0 a 5 V; os pinos do ESP32 aguentam no máximo 3,6 V. O **divisor de tensão** com 1 kΩ e 2 kΩ entrega ao ESP32 **2/3** da tensão do Po (no máximo 3,33 V). O fio que vai ao ESP32 sai do **ponto do meio** (o “nó”) entre os dois resistores."),
  ...FIGURA(IMG("divisor.png"), "O caminho do sinal no ESP32: Po → 1 kΩ → nó → 2 kΩ → GND. O GPIO 34 lê a tensão do nó.", 1.2),
  TAB(["Placa pH‑4502C", "ESP32 DevKit V1", "Observação"], [
    ["V+", "**VIN** (5 V da USB)", "não use o 3V3: a placa precisa de 5 V"],
    ["G", "GND", "GND comum é obrigatório: sem ele a leitura flutua"],
    ["Po", "1 kΩ → **GPIO 34 (D34)** → 2 kΩ → GND", "o D34 liga no nó, entre os resistores"],
  ], [0.22, 0.4, 0.38]),
  ESPACO(),
  P("**Onde fica o D34.** Na placa DevKit V1 de 30 pinos, com o **conector USB para baixo** e a antena para cima, o D34 está na **fileira da esquerda**, a mesma do VIN. Contando de cima para baixo a partir do canto da antena: **EN, VP, VN, D34**. É o **4º pino**; o nome está impresso ao lado. O VIN é o **último** dessa fileira, ao lado do USB."),
  ...FIGURA(ESQ("01b_ph4502c_esp32"), "pH no ESP32: V+ no VIN (5 V), Po → 1 kΩ → GPIO 34 → 2 kΩ → GND, com o divisor na metade de baixo da protoboard.", 1.3),
  P("**Na protoboard**, passo a passo. Os números das colunas e as letras das linhas estão impressos nela; os furos de uma mesma coluna são ligados entre si de F a J em cima da canaleta e de A a E embaixo, e as duas metades não se falam."),
  OL(["**Po → 40J.** Jumper macho‑fêmea amarelo: a ponta fêmea no pino **Po** da placa de pH (o 3º da esquerda para a direita), a ponta macho no furo **40J**.",
    "**Atravessar a canaleta: 40F → 40E.** Um fio curto leva o sinal da metade de cima para a de baixo. Agora a coluna 40 de baixo (A–E) também é “Po”.",
    "**Resistor de 1 kΩ** (marrom‑preto‑vermelho) deitado na linha D: uma perna em **40D**, a outra em **44D**. A coluna 44 (A–E) passa a ser o **nó do divisor**.",
    "**Resistor de 2 kΩ** (vermelho‑preto‑vermelho) na linha C: uma perna em **44C**, a outra em **48C**.",
    "**Fechar no GND: 48A → trilha do GND (−)** com um fio preto. Sem ele o divisor não divide: o D34 receberia os 5 V inteiros.",
    "**O fio de dados: 44B → D34.** Jumper amarelo: a ponta macho no furo **44B**, na coluna do **nó**, e a outra ponta no pino **D34** do ESP32. É este o único fio de sinal que chega ao ESP32.",
    "**Alimentação:** V+ da placa de pH na trilha de 5 V (+), a que recebe o fio vermelho do **VIN** do ESP32; um G na trilha do GND (−), a que recebe o fio preto do **GND** do ESP32."]),
  NOTA("Confira com o multímetro antes de ligar o fio do D34", ["**O fio do D34 sai da coluna 44, nunca da 40.** Na coluna 40 estão os 5 V do Po sem dividir: ligados direto ao ESP32, passam do limite do pino e podem queimá‑lo.",
    "**Resistores na ordem certa:** o de **1 kΩ** do lado do Po e o de **2 kΩ** do lado do GND. Trocados, o divisor entrega só 1/3 (não queima, mas a calibração padrão não serve).",
    "**Medida de conferência** (ponta preta no GND, placa ligada, BNC em curto depois do Passo 1): ≈ **2,5 V** na coluna 40 e ≈ **1,67 V** na coluna 44. Se a coluna 44 mostrar o mesmo que a 40, falta o 2 kΩ ou o fio do GND."]),
  ESPACO(),
  NOTA("Por que justamente o GPIO 34", ["Ele pertence ao **ADC1**. Os pinos do ADC2 (GPIO 0, 2, 4, 12–15, 25–27) **param de medir quando o Wi‑Fi está ligado**, e o sketch cria uma rede Wi‑Fi.",
    "Os GPIO 34, 35, 36 (VP) e 39 (VN) são **somente entrada** e não têm resistores internos de pull‑up/pull‑down: nada dentro do ESP32 “puxa” a tensão e atrapalha a medida.",
    "Com a atenuação de 11 dB o ADC lê bem de 0,15 a 2,45 V: o pH 7 (1,67 V) cai no meio da faixa boa, e de pH 1 (2,37 V) a pH 14 (0,84 V) o sinal fica todo dentro dela."]),
  ESPACO(),
  H2("5.4 No ESP32 com o ADS1115 (leitura mais exata)"),
  P("O conversor A/D interno do ESP32 é não linear e ruidoso (seção 10.3). O **ADS1115** é um conversor externo de 16 bits, linear, que conversa por I2C: a leitura chega ao ESP32 como número. É o conversor que o nó `horta/no1` usa para o pH (seção 13). Nesta versão de bancada ele é alimentado em **3,3 V**, e por isso o Po continua passando pelo divisor: nenhuma entrada do ADS1115 pode passar de VDD + 0,3 V."),
  TAB(["De", "Para", "Observação"], [
    ["ADS1115 VDD / GND", "3V3 / GND do ESP32", "em 3,3 V o I2C já está no nível do ESP32"],
    ["ADS1115 SCL / SDA", "GPIO 22 / GPIO 21", "barramento I2C"],
    ["ADS1115 ADDR", "GND", "endereço 0x48"],
    ["Po da placa de pH", "1 kΩ → **A0 do ADS1115** → 2 kΩ → GND", "o mesmo divisor da seção 5.3"],
    ["V+ / G da placa de pH", "VIN (5 V) / GND", "igual à seção 5.3"],
  ], [0.28, 0.36, 0.36]),
  ...FIGURA(ESQ("01c_ph4502c_esp32_ads1115"), "pH lido pelo ADS1115: ADS1115 em 3,3 V (VDD, GND, SCL→22, SDA→21, ADDR→GND), Po → divisor 1 kΩ/2 kΩ → A0.", 1.3),
  P("O sketch `01c` desfaz o divisor (multiplica por 1,5) e mostra a tensão real do Po: pH 7 em ~2,5 V, igual ao Uno. Precisa da biblioteca **Adafruit ADS1X15** (o gerenciador pede para instalar junto a Adafruit BusIO; aceite)."),
  H2("5.5 Gravar o sketch e fazer o primeiro teste"),
  TAB(["Montagem", "Sketch (em `aula-agua/codigo/`)", "Placa no Arduino IDE", "Onde ler"], [
    ["Uno", "`01_ph4502c_uno`", "Arduino Uno", "Monitor Serial, 115200 baud"],
    ["ESP32 + divisor", "`01b_ph4502c_esp32_web`", "ESP32 Dev Module", "Monitor Serial e celular: rede `Agua-pH` (senha 12345678), http://192.168.4.1"],
    ["ESP32 + ADS1115", "`01c_ph4502c_esp32_ads1115_web`", "ESP32 Dev Module", "Monitor Serial e celular: rede `Agua-pH-ADS`"],
  ], [0.17, 0.3, 0.19, 0.34]),
  ESPACO(),
  CODIGO(`arduino-cli compile --fqbn arduino:avr:uno   aula-agua/codigo/01_ph4502c_uno
arduino-cli upload -p COM5 --fqbn arduino:avr:uno   aula-agua/codigo/01_ph4502c_uno
arduino-cli compile --fqbn esp32:esp32:esp32 aula-agua/codigo/01b_ph4502c_esp32_web
arduino-cli upload -p COM5 --fqbn esp32:esp32:esp32 aula-agua/codigo/01b_ph4502c_esp32_web`, { arquivo: false, titulo: "pela linha de comando (troque COM5 pela sua porta; no Linux, /dev/ttyUSB0)" }),
  ESPACO(),
  P("Abra o Monitor Serial a **115200 baud**. O sketch mostra a calibração em uso e, a cada segundo, uma linha como esta:"),
  CODIGO(`pH-4502C. Comandos: c7 (sonda em pH 7)  c4 (pH 4)  c10 (pH 10)  r (reset)
V7 = 2.500 V   inclinacao = -0.1770 V/pH
pH:7.02 V:2.497  neutro
pH:7.01 V:2.498  neutro`, { arquivo: false, titulo: "Monitor Serial (Uno)" }),
  ESPACO(),
  P("O valor que interessa na instalação é o `V:`, a tensão no pino. Faça o teste de bancada da placa **sem a sonda**:"),
  OL(["Com o BNC vazio, o `V:` fica vagando: é normal, a entrada está flutuando.",
    "Faça um **curto no BNC** (clipe entre o pino central e a carcaça). O `V:` deve **parar** num valor fixo, que não depende de nada além do potenciômetro de offset. Se parou, a placa, os fios e o conversor estão funcionando.",
    "Se o `V:` continua em 0,00 ou no máximo mesmo com o curto, o problema é de ligação: confira V+, G e o pino Po (seção 15)."]),
  P("Com a placa respondendo, siga para a preparação e os três passos da calibração."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("6. Antes de calibrar: material e preparação"),
  TAB(["Item", "Para quê", "Observação"], [
    ["Tampões pH 7,00, 4,00 (ou 4,01) e 10,00 (ou 10,01)", "os pontos conhecidos da reta", "sachê dissolvido em 250 mL de água destilada. O de pH 10 absorve CO₂ do ar e cai: use fresco"],
    ["Água destilada + papel macio", "enxaguar entre tampões", "secar **encostando**, sem esfregar (esfregar carrega o vidro de eletricidade estática)"],
    ["3 copos pequenos, rotulados", "um por tampão", "nunca devolver o tampão usado ao frasco"],
    ["Clipe ou fio curto", "curto no BNC (Passo 1)", "liga o pino central à carcaça"],
    ["Chave de fenda pequena", "potenciômetro de offset", "multivoltas: ~25 voltas de ponta a ponta"],
    ["Multímetro", "conferir Po, o divisor e o 5 V", "ponta preta sempre no GND"],
    ["Termômetro (opcional)", "saber a temperatura dos tampões", "o pH do tampão muda com a temperatura (tabela abaixo)"],
  ], [0.32, 0.26, 0.42]),
  ESPACO(),
  UL(["**Sonda hidratada.** Se ficou seca, deixe de molho na solução de armazenamento (KCl 3 mol/L) antes de calibrar; de um dia para o outro é o mais seguro. Bulbo seco responde devagar e com inclinação baixa.",
    "**Ligue 5 minutos antes.** Amplificador e sonda derivam nos primeiros minutos.",
    "**Tampões e amostras na mesma temperatura**, de preferência a ambiente (20–30 °C).",
    "**Feche o que usa a porta serial** (Monitor Serial de outra janela, gateway, ponte): só um programa fala com a placa."]),
  P("O pH verdadeiro de cada tampão depende da temperatura. Os valores abaixo são os dos tampões padrão; **prefira a tabela impressa no rótulo do seu**, quando houver."),
  TAB(["Tampão (valor a 25 °C)", "10 °C", "20 °C", "25 °C", "30 °C", "40 °C"], [
    ["4,01 (ftalato)", "4,00", "4,00", "4,01", "4,02", "4,03"], ["6,86 (fosfato)", "6,92", "6,88", "6,86", "6,85", "6,84"],
    ["7,00 (fosfato)", "7,06", "7,02", "7,00", "6,99", "6,97"], ["9,18 (bórax)", "9,33", "9,23", "9,18", "9,14", "9,07"],
    ["10,01 (carbonato)", "10,18", "10,06", "10,01", "9,97", "9,89"],
  ], [0.3, 0.14, 0.14, 0.14, 0.14, 0.14]),
  ESPACO(),
  P("Entre 20 e 30 °C os tampões de pH 4 e 7 mudam no máximo 0,02: pode ignorar. Os de pH 9 e 10 mudam até 0,09: se for usá‑los como ponto de calibração, anote a temperatura."),

  // ---------------------------------------------------------------
  H1("7. Passo 1 — ajuste do offset da placa"),
  P("Objetivo: fazer a placa entregar o meio da escala quando a sonda entrega 0 mV. Faz‑se **uma vez por placa** (ou quando alguém mexer no potenciômetro). Não precisa de sonda nem de tampão."),
  OL(["Desligue a sonda do BNC. Faça um **curto no BNC**: um clipe ou fio entre o pino central e a carcaça metálica. Isso simula 0 mV, o que uma sonda perfeita daria em pH 7.",
    "Ligue a placa e abra o Monitor Serial (115200). Observe o valor `V:` das linhas `pH:… V:…`.",
    "Gire o **potenciômetro de offset** (o azul **mais perto do BNC**) devagar até ler **V:2.500** no Uno ou no ESP32 com ADS1115, ou **V:1.667** no ESP32 com o divisor (sketch `01b`). Tolerância: ±0,02 V. São muitas voltas; se o valor não muda, continue girando no mesmo sentido.",
    "Confira com o multímetro: **2,50 V no pino Po**. No ESP32, confira também **1,67 V no nó do divisor** (onde sai o fio do D34). Se o Po marca 2,50 V e o nó não marca ~1,67 V, o problema é o divisor, não a placa.",
    "Tire o curto e encaixe a sonda (girar até travar)."]),
  NOTA("Por que este passo importa", ["Com o offset fora, a reta inteira sobe ou desce. No ESP32 isso é grave: se o Po estiver alto, as leituras de líquidos ácidos passam de **2,45 V no pino**, onde o ADC do ESP32 deixa de ser confiável, e a calibração por software não conserta uma medida saturada.",
    "O potenciômetro mais longe do BNC só ajusta o limiar do pino Do. Não mexe no Po e pode ficar como está."]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("8. Passo 2 — calibração de dois pontos"),
  H2("8.1 Os comandos"),
  P("Os comandos são os mesmos nos três sketches (Uno, ESP32 e ESP32 + ADS1115), digitados no Monitor Serial a 115200 baud:"),
  TAB(["Comando", "O que faz", "Quando usar"], [
    ["`c7`", "lê a tensão agora e grava como **V7** (tensão em pH 7)", "sonda estável no tampão **7,00**. Sempre o primeiro"],
    ["`c4`", "lê a tensão e calcula a inclinação: (V − V7) / (4 − 7)", "sonda estável no tampão **4,00 / 4,01**. Para líquidos ácidos e neutros"],
    ["`c10`", "idem, com (10 − 7)", "sonda estável no tampão **10,00 / 10,01**. Para líquidos básicos"],
    ["`r`", "volta aos valores padrão", "para recomeçar do zero"],
  ], [0.14, 0.46, 0.4]),
  ESPACO(),
  H2("8.2 O procedimento"),
  OL(["Tire a tampa de armazenamento da sonda (guarde‑a em pé, com a solução dentro). Enxágue a sonda com água destilada e seque encostando o papel.",
    "Mergulhe a ponta no tampão **pH 7,00**: bulbo e junção cobertos (2 a 3 cm de líquido), sem tocar o fundo. Mexa de leve uma vez, para soltar bolhas do bulbo, e deixe parada.",
    "**Espere estabilizar**: o valor `V:` deve variar menos de **0,005 V em 30 s**. Leva de 1 a 2 minutos. Sonda que demora mais de 3 minutos está suja ou velha.",
    "Digite `c7`. O sketch responde `V7 gravado: …`. Anote o valor na ficha (seção 16).",
    "Enxágue de novo e seque. Mergulhe no tampão **pH 4,00**, espere estabilizar do mesmo jeito.",
    "Digite `c4`. O sketch responde com a inclinação e a **saúde da sonda** (% da teórica). Anote.",
    "Enxágue. A calibração já está gravada (EEPROM no Uno, Preferences no ESP32) e sobrevive ao desligar."]),
  CODIGO(`c7
V7 gravado: 2.560
c4
inclinacao gravada: -0.1600 V/pH  (saude da sonda: 90 % da teorica)`, { arquivo: false, titulo: "exemplo de resposta do sketch do Uno" }),
  ESPACO(),
  TAB(["Resultado do `c4`", "Uno (A0) e ESP32 + ADS1115", "ESP32 (GPIO 34 com divisor)", "Significado"], [
    ["inclinação ideal", "−0,177 V/pH", "−0,118 V/pH", "100 %"],
    ["aceitável", "−0,150 a −0,186", "−0,100 a −0,124", "85 % a 105 %: sonda boa"],
    ["baixa (em módulo)", "acima de −0,150", "acima de −0,100", "sonda velha, suja ou mal hidratada; ou tampão vencido"],
    ["positiva", "> 0", "> 0", "tampões trocados (`c4` feito no pH 10): refazer"],
  ], [0.2, 0.26, 0.26, 0.28]),
  ESPACO(),
  NOTA("Qual segundo ponto escolher", ["Use o tampão do **lado em que vai medir**: pH 4 para vinagre, sucos, solução hidropônica e água de torneira; pH 10 para sabão e soluções básicas. A reta vale melhor **entre** os dois pontos da calibração.",
    "Sempre o pH 7 primeiro: o `c4`/`c10` calcula a inclinação a partir do V7 que estiver gravado."]),
  ESPACO(),
  H2("8.3 A conta da reta, feita à mão"),
  P("O que o sketch faz ao receber `c7` e `c4` é a equação de uma reta que passa por dois pontos. Vale a pena fazer a conta uma vez no caderno, com os números do exemplo acima (Uno):"),
  CODIGO(`ponto 1 (tampao 7,00):  V7 = 2,560 V
ponto 2 (tampao 4,00):  V4 = 3,040 V

inclinacao = (V4 - V7) / (4,00 - 7,00) = (3,040 - 2,560) / (-3,00) = -0,160 V/pH

saude da sonda = inclinacao / inclinacao teorica = -0,160 / -0,177 = 90 %

reta:        V  = V7 + inclinacao x (pH - 7)       (o que a placa entrega)
invertida:   pH = 7 + (V - V7) / inclinacao        (o que o sketch calcula)

amostra com V = 2,700 V:   pH = 7 + (2,700 - 2,560) / (-0,160) = 7 - 0,875 = 6,13`, { arquivo: false, titulo: "calibração de dois pontos: a conta" }),
  ESPACO(),
  ...FIGURA(IMG("reta_exemplo.png"), "A conta do exemplo, em gráfico. A reta cheia passa pelos dois tampões; a tracejada é a reta ideal. Sem calibrar, a amostra de 2,700 V seria lida como pH 5,87 em vez de 6,13.", 1.15),
  P("Com um terceiro ponto dá para conferir a reta (é o Passo 3). Se você tiver os três tampões e uma planilha, pode também ajustar a reta pelos três pontos (função `PROJ.LIN` ou a linha de tendência do gráfico): o resultado é quase o mesmo quando a sonda está boa, e a distância dos pontos à reta mostra a qualidade da calibração."),
  ...FIGURA(IMG("curva_calibracao.png"), "As retas ideais no Uno e no ESP32 com divisor, e o exemplo de uma sonda usada, com offset de +60 mV e 90 % da inclinação.", 1.15),

  // ---------------------------------------------------------------
  H1("9. Passo 3 — verificação e critérios de aceitação"),
  P("Uma calibração só vale depois de conferida com um líquido que **não** participou dela. Meça o terceiro tampão (pH 10 se calibrou com 7 e 4) e compare com a tabela:"),
  TAB(["Critério", "Aceitar", "Se não passar"], [
    ["Offset: V7 medido no tampão 7,00", "2,50 ± 0,09 V (Uno) · 1,667 ± 0,06 V (ESP32): equivale a ±30 mV na sonda", "refazer o Passo 1; se persistir, sonda contaminada ou seca"],
    ["Inclinação (saúde da sonda)", "85 % a 105 % da teórica", "limpar e reidratar a sonda; trocar os tampões; abaixo de 85 % depois disso: trocar a sonda"],
    ["Terceiro tampão", "erro ≤ 0,1 pH (Uno, ADS1115) · ≤ 0,2 pH (ADC interno do ESP32)", "repetir a calibração esperando mais tempo; conferir a temperatura dos tampões"],
    ["Tempo para estabilizar", "até 2 min", "sonda lenta: limpeza (seção 11)"],
    ["Repetição", "voltar ao tampão 7 e ler 7,00 ± 0,05", "deriva: aquecer mais tempo; conferir GND e cabo BNC"],
  ], [0.26, 0.4, 0.34]),
  ESPACO(),
  P("Depois da verificação, meça amostras de pH conhecido para ganhar confiança: vinagre (2,5–3), refrigerante de cola (2,5–3), água de torneira (6,5–7,5), água com bicarbonato (~8,3)."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("10. Temperatura, conversor A/D e outras fontes de erro"),
  H2("10.1 Por que um ponto só não basta"),
  P("Quem faz só o `c7` acerta o offset e fica com a inclinação teórica. Se a sonda tem 90 % da inclinação, o erro cresce com a distância ao pH 7: **0,3 pH em pH 4 e 0,7 pH em pH 0 ou 14** (gráfico da esquerda). O segundo ponto elimina esse erro."),
  ...FIGURA(IMG("erros.png"), "Erro de pH. Esquerda: calibração de um ponto só, para sondas com diferentes perdas de inclinação. Direita: calibração de dois pontos feita a 25 °C e usada em amostras a outras temperaturas. Faixa verde: ±0,1 pH.", 1.3),
  H2("10.2 Temperatura e como compensá‑la"),
  P("A inclinação de Nernst é proporcional à temperatura absoluta: 0,34 % por °C."),
  TAB(["Temperatura", "0 °C", "10 °C", "20 °C", "25 °C", "30 °C", "40 °C", "50 °C"], [
    ["mV por pH", "54,20", "56,18", "58,17", "59,16", "60,15", "62,13", "64,12"],
    ["relativo a 25 °C", "−8,4 %", "−5,0 %", "−1,7 %", "0", "+1,7 %", "+5,0 %", "+8,4 %"],
  ], [0.2, 0.114, 0.114, 0.114, 0.115, 0.114, 0.114, 0.115]),
  ESPACO(),
  P("Na prática: calibrando e medindo na **mesma** temperatura, o efeito some, porque a calibração mede a inclinação real daquele dia. Com 10 °C de diferença entre calibração e medida, o erro é de 0,1 pH em pH 4 e praticamente zero perto de pH 7 (gráfico da direita). Em pH 7 a sonda dá 0 mV em qualquer temperatura: a reta “gira” em torno desse ponto."),
  P("Quando a diferença de temperatura é grande, ou a exatidão pedida é maior, corrige‑se a inclinação pela razão das temperaturas absolutas. É o que os medidores de laboratório chamam de compensação automática de temperatura (ATC):"),
  CODIGO(`inclinacao(T) = inclinacao da calibracao x (T + 273,15) / (Tcal + 273,15)

pH = 7 + (V - V7) / inclinacao(T)

exemplo (Uno): calibrado a Tcal = 25 C com V7 = 2,560 V e inclinacao = -0,160 V/pH
               amostra a T = 15 C, V = 2,700 V
  inclinacao(15 C) = -0,160 x 288,15 / 298,15 = -0,1546 V/pH
  pH = 7 + 0,140 / (-0,1546) = 6,09        (sem compensar: 6,13 -> diferenca de 0,03 pH)`, { arquivo: false, titulo: "compensação de temperatura da inclinação" }),
  ESPACO(),
  UL(["**De onde vem a temperatura.** De um sensor mergulhado **no líquido**, como o DS18B20 à prova d'água (aula de sensores). O pino **To** da placa mede a temperatura da placa, não a do líquido, e não serve para isso.",
    "**Os sketches desta aula não compensam temperatura.** Entre 20 e 30 °C e perto de pH 6, o erro fica abaixo de 0,02 pH, bem menor que os outros erros do sensor. Implementar a compensação é um bom desafio: ler o DS18B20, anotar a temperatura da calibração e aplicar a fórmula acima.",
    "**A compensação corrige só a sonda.** O pH verdadeiro do líquido também muda com a temperatura (veja a tabela dos tampões, seção 6), e isso nenhuma fórmula geral corrige: registre sempre o pH **junto com a temperatura** em que foi medido."]),
  H2("10.3 O conversor A/D: Uno, ESP32 e ADS1115"),
  TAB(["Leitura", "Passo do conversor", "Em pH", "O que limita de verdade", "Exatidão esperada"], [
    ["Uno, A0 (10 bits, 5 V)", "4,9 mV", "0,028", "o “5 V” da USB (4,7–5,1 V) é a referência: calibre e meça com a mesma alimentação", "±0,1 pH"],
    ["ESP32, GPIO 34 (12 bits) + divisor", "0,8 mV", "0,007", "não linearidade do ADC, ruído do Wi‑Fi, faixa confiável só de 0,15 a 2,45 V", "±0,2 pH"],
    ["ADS1115 (16 bits, ganho 1) + divisor", "0,125 mV", "0,001", "a própria sonda e os tampões", "±0,05 pH"],
  ], [0.24, 0.13, 0.09, 0.38, 0.16]),
  ESPACO(),
  P("O passo do ESP32 é menor que o do Uno, mas a medida é pior: o conversor dele não é uma reta perfeita e a calibração de dois pontos só corrige o erro **nos dois pontos**. Os sketches `01` e `01b` reduzem o ruído com a **média aparada** (30 leituras, descartando as 5 maiores e as 5 menores); o `01c` faz a média de 8 conversões do ADS1115. Para medidas que importam, como a da horta hidropônica, o caminho é o ADS1115."),
  H2("10.4 Tampões 6,86 e 9,18: o erro escondido"),
  P("Os comandos `c7`, `c4` e `c10` supõem que o tampão vale **exatamente** 7, 4 e 10. Muitos kits trazem sachês **4,00 / 6,86 / 9,18**. O que acontece se eles forem usados sem cuidado:"),
  TAB(["Calibração feita", "pH 4,00 lido como", "pH 6,86 lido como", "pH 10,00 lido como"], [
    ["`c7` no tampão 7,00 + `c4` no 4,00 (correto)", "4,00", "6,86", "10,00"],
    ["`c7` no tampão **6,86** + `c4` no 4,00", "4,00", "**7,00** (+0,14)", "**10,29** (+0,29)"],
    ["`c7` no tampão 7,00 + `c10` no **9,18**", "**2,87** (−1,13)", "6,81", "**11,13** (+1,13)"],
  ], [0.43, 0.19, 0.19, 0.19]),
  ESPACO(),
  P("Tampão 4,01 no lugar de 4,00, ou 10,01 no lugar de 10,00, dá erro de 0,01: pode usar sem correção. **O 9,18 nunca deve ser usado com o** `c10`. Se só houver o 6,86 para o ponto neutro, calibre com `c7` (no 6,86) e `c4` (no 4,00) e corrija cada leitura:"),
  CODIGO(`pH real = 6,86 + (pH lido - 7) x (6,86 - 4,00) / 3  =  6,86 + 0,953 x (pH lido - 7)

exemplos:  lido 7,00 -> 6,86      lido 4,00 -> 4,00      lido 8,50 -> 8,29`, { arquivo: false, titulo: "correção para calibração feita com o tampão 6,86" }),
  ESPACO(),
  P("A solução definitiva é acrescentar ao sketch comandos que aceitem o valor do tampão (por exemplo `c 6.86`). Isso ainda não foi feito. A ferramenta de calibração da telemetria (seção 13.3) já aceita o valor do rótulo."),
  H2("10.5 Orçamento de incerteza"),
  TAB(["Fonte", "Tamanho típico", "Como reduzir"], [
    ["Tampões (valor nominal, idade, contaminação)", "±0,02 a ±0,05 pH", "tampão fresco; copos separados; não devolver ao frasco"],
    ["Leitura antes de estabilizar", "até ±0,2 pH", "esperar 1–2 min; critério de 0,005 V em 30 s"],
    ["Temperatura diferente da calibração", "0,03 pH por 10 °C, por unidade de distância ao pH 7", "calibrar e medir na mesma temperatura, ou compensar (10.2)"],
    ["Conversor A/D", "±0,03 (Uno) · ±0,1 a 0,2 (ESP32) · ±0,005 (ADS1115)", "média aparada; ADS1115"],
    ["Deriva da sonda entre calibrações", "0,05 a 0,1 pH por semana", "recalibrar toda semana de uso"],
    ["Divisor e alimentação (se mudarem depois de calibrar)", "até vários décimos", "não mexer na montagem; recalibrar se mexer"],
  ], [0.36, 0.32, 0.32]),
  ESPACO(),
  P("Somando o que é inevitável, o resultado realista deste sensor bem calibrado é **±0,1 pH** no Uno e no ADS1115 e **±0,2 pH** no ADC interno do ESP32. É suficiente para classificar líquidos, acompanhar um aquário ou uma solução hidropônica; não substitui um pHmetro de laboratório (±0,01)."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("11. Cuidados com a sonda e periodicidade"),
  ...hidroponia.cuidados(),
  TAB(["Quando", "O que fazer"], [
    ["Placa nova ou potenciômetro mexido", "Passo 1 (offset) + Passos 2 e 3"],
    ["Toda semana de uso; antes de uma medida importante", "Passos 2 e 3"],
    ["Troca de sonda, de placa (Uno ↔ ESP32), de divisor ou de alimentação", "Passos 2 e 3 (e o 1, se a placa mudou)"],
    ["Sonda ficou seca ou guardada por mais de um mês", "reidratar; Passos 2 e 3"],
    ["Verificação falhou ou a leitura do tampão 7 saiu de 7,00 ± 0,1", "Passos 2 e 3"],
  ], [0.55, 0.45]),

  // ---------------------------------------------------------------
  ...hidroponia.corpo(),

  // ---------------------------------------------------------------
  H1(`14. Estudo de caso: o sensor da bancada em ${B.data}`),
  P(`O ESP32 da bancada de testes estava com o sketch \`01b_ph4502c_esp32_web\`, **sem calibração gravada** (valores padrão). As leituras foram levadas ao painel da telemetria‑cria (\`cria/teste/no5\`, grandezas \`tensao\` e \`ph\`) por uma ponte serial, uma a cada 2 s. O gráfico mostra ${B.n} leituras, das ${B.inicio} às ${B.fim}. É um bom exemplo do que se vê **antes** dos Passos 1 a 3.`),
  ...FIGURA(IMG("bancada.png"), "Leituras da bancada antes de qualquer calibração. Em cima, a tensão no GPIO 34; embaixo, o pH que o sketch calcula com os valores padrão.", 1.2),
  TAB(["Medida", "Valor", "Esperado com a sonda em pH 7"], [
    ["Tensão no GPIO 34", `${v(B.v_min)} a ${v(B.v_max)} V (média ${v(B.v_med)} V)`, "≈ 1,667 V"],
    ["Tendência", `subiu de ${v(B.v_ini)} V para ${v(B.v_fim)} V em ${B.minutos} min, com saltos`, "estável dentro de 0,005 V"],
    ["Leituras acima de 2,45 V", `${B.acima_245} de ${B.n}`, "nenhuma (limite do ADC)"],
    ["pH indicado", `${v(B.ph_min, 1)} a ${v(B.ph_max, 1)}`, "≈ 7"],
  ], [0.28, 0.42, 0.3]),
  ESPACO(),
  P("**O que se pode concluir.** O pH indicado não é uma medida: há valores negativos, que não existem em líquidos comuns. A tensão está 0,6 a 0,8 V acima do esperado e não fica parada. Não foi registrado em que líquido a sonda estava (nem se estava ligada), então a causa não está determinada. As três hipóteses, com o teste que separa cada uma:"),
  TAB(["Hipótese", "Por que é plausível", "Teste"], [
    ["Po ligado **direto** ao GPIO 34, sem o divisor", "2,2–2,5 V é o que o Po entrega perto do neutro; com o divisor, o pino veria ~1,67 V", "multímetro: tensão no Po e no pino D34. Se forem iguais, falta o divisor. **Corrigir antes de tudo: sem divisor o pino pode receber até 5 V**"],
    ["Offset da placa desajustado", "com o divisor certo, 2,2–2,5 V no pino significa 3,3–3,75 V no Po", "Passo 1: BNC em curto; girar o potenciômetro até 1,667 V no pino"],
    ["Sonda desligada, seca ou fora do líquido", "a entrada da placa tem impedância altíssima; sem sonda ela flutua e **deriva**, como no gráfico", "com o BNC em curto a leitura deve parar de derivar; com a sonda em tampão 7, estabilizar em 1–2 min"],
  ], [0.26, 0.36, 0.38]),
  ESPACO(),
  P("Em qualquer dos casos, o caminho é o mesmo: conferir o divisor com o multímetro, fazer o Passo 1 e só então os Passos 2 e 3. Depois da calibração, vale gerar este gráfico de novo (`bash gerar_tutorial.sh 30`) com a sonda parada em cada tampão, para registrar a estabilidade."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("15. Solução de problemas"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`V:` em 0,00 ou no máximo, mesmo com o BNC em curto", "falta V+ ou GND; fio de dados no pino errado", "medir 5 V entre V+ e G; conferir o pino **Po** (3º da esquerda)"],
    ["`V:` não muda ao girar o potenciômetro", "potenciômetro errado (o do limiar) ou no fim do curso", "usar o mais perto do BNC; girar muitas voltas no outro sentido"],
    ["`V:` deriva sem parar", "sonda desligada, seca ou com bolha no bulbo; GND solto", "curto no BNC para testar a placa; reidratar; sacudir a sonda de leve; conferir o GND comum"],
    ["Mesma leitura em todos os tampões", "sonda quebrada, BNC mal encaixado, fio no pino errado (Do/To em vez de Po)", "conferir o pino **Po**; girar o BNC até travar; testar outra sonda"],
    ["pH sempre 7,00 (2,5 V fixo)", "BNC em curto esquecido, ou sonda em curto interno", "tirar o clipe; testar com os tampões; trocar a sonda"],
    ["Inclinação positiva", "`c4` feito no tampão básico", "refazer com os tampões certos"],
    ["Inclinação baixa (< 85 %)", "sonda velha ou suja; tampão vencido; leitura antes de estabilizar", "limpar e reidratar; tampão novo; esperar mais"],
    ["ESP32: pH perto de 0 em qualquer líquido", "fio de dados antes do resistor de 1 kΩ, ou divisor sem o 2 kΩ/GND", "medir 2,5 V no Po e 1,67 V no nó (BNC em curto)"],
    ["ESP32 e Uno discordam com a mesma sonda", "cada placa tem a sua calibração; ADC do ESP32 não linear", "calibrar em cada uma; para concordância melhor, ADS1115"],
    ["`01c`: página mostra falha do ADS1115", "SDA/SCL trocados, ADDR solto, falta de 3V3 ou GND", "conferir GPIO 21 = SDA, GPIO 22 = SCL, ADDR no GND"],
    ["Leitura salta quando a mão chega perto", "sinal de altíssima impedância capta interferência", "cabo da sonda longe de fontes e do ESP32; não segurar o cabo durante a leitura"],
    ["Leitura oscila em água destilada", "água sem sais nem tampão: pH instável e pouca condutividade", "normal; testar com tampão ou água de torneira"],
    ["Na hidroponia: pH muda quando a bomba ou o sensor de condutividade liga", "correntes na solução (laço de terra)", "seção 13.4"],
    ["Calibração “some” ao regravar", "no Uno, EEPROM apagada por outro sketch; no ESP32, flash apagada (“Erase All Flash”)", "calibrar de novo; anotar V7 e inclinação na ficha"],
  ], [0.28, 0.36, 0.36]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("16. Ficha de calibração"),
  P("Uma ficha por calibração. Guarde‑as: a queda da inclinação ao longo dos meses mostra o envelhecimento da sonda.", { spacing: { after: 80 } }),
  TAB(["Campo", "Valor"], [
    ["Data · grupo · sonda nº · placa (Uno / ESP32 / ESP32+ADS1115)", " "],
    ["Temperatura dos tampões (°C)", " "],
    ["Passo 1 — tensão com o BNC em curto (V)", " "],
    ["Tampão neutro usado (7,00 ou 6,86) · tensão estável · `c7` → V7 (V)", " "],
    ["Segundo tampão (4,00 / 10,00) · tensão estável (V)", " "],
    ["Inclinação (V/pH) · saúde da sonda (%)", " "],
    ["Verificação — terceiro tampão: valor nominal · pH lido · erro", " "],
    ["Volta ao tampão 7: pH lido", " "],
    ["Tempo para estabilizar (s) · observações", " "],
    ["Resultado: aprovada / repetir / trocar a sonda", " "],
  ], [0.62, 0.38]),

  // ---------------------------------------------------------------
  H1("17. Referências"),
  UL([
    "Módulo pH‑4502C: sem folha de dados oficial; pinagem pelas marcações da placa.",
    "Equação de Nernst e eletrodo de vidro: Skoog, West, Holler, Crouch. Fundamentos de Química Analítica, capítulo de potenciometria.",
    "Valores dos tampões padrão em função da temperatura: IUPAC, Measurement of pH. Definition, standards and procedures (Pure Appl. Chem. 74:2169, 2002).",
    "Espressif, ESP32 ADC (faixas por atenuação e limitações do ADC2 com Wi‑Fi); Texas Instruments, folha de dados do ADS1115.",
    ...hidroponia.referencias,
    "Guias Monitor de água (aula‑agua), Partes 1 e 4. Telemetria‑cria: `firmware/horta-no1` e `calibracao/README.md`.",
  ]),
];

module.exports = DOC({ titulo: "Sensor de pH pH-4502C: instalação, calibração e hidroponia", rodape: "Tutorial — Sensor de pH pH‑4502C — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
