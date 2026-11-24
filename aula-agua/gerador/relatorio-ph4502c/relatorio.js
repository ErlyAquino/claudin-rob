// Relatorio tecnico: como calibrar o sensor de pH (placa pH-4502C + sonda de vidro BNC) usado na aula-agua.
// Gera ../../saida/Relatorio-Calibracao-pH-4502C.docx (o gerar_relatorio.sh faz os graficos e converte para PDF).
const path = require("path");
const fs = require("fs");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Relatorio-Calibracao-pH-4502C.docx");
const B = JSON.parse(fs.readFileSync(path.join(AQUI, "resumo_bancada.json"), "utf8"));   // graficos.py
const VERDE = "E8F5E9", VERMELHO = "FDECEA";
const v = (x, n = 3) => x.toFixed(n).replace(".", ",");

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Relatório técnico",
    titulo: "Calibração do sensor de pH: placa pH‑4502C com sonda de vidro",
    subtitulo: "O que se calibra e por quê, ajuste do offset da placa, calibração de dois pontos com soluções tampão, verificação, análise dos erros (sonda, temperatura, conversor A/D) e o estado do sensor da bancada",
    info: [
      "**Sensor:** placa pH‑4502C + eletrodo combinado de vidro (BNC)  •  **Placas:** Arduino Uno (A0) e ESP32 DevKit V1 (GPIO 34, divisor 1 kΩ / 2 kΩ)",
      `**Sketches:** \`01_ph4502c_uno\`, \`01b_ph4502c_esp32_web\`, \`01c_ph4502c_esp32_ads1115_web\`  •  **Bancada:** ${B.data}, ${B.inicio}–${B.fim}, \`cria/teste/no5\``,
      "Espaço CRIA — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // ---------------------------------------------------------------
  H1("1. Resumo"),
  P("Calibrar o sensor de pH é descobrir a **reta** que liga a tensão lida pela placa ao pH do líquido. Essa reta tem dois números: a tensão em pH 7 (**V7**, o offset) e a **inclinação** (volts por unidade de pH). Os dois mudam de sonda para sonda e com a idade da sonda, por isso não existe valor de fábrica confiável: sem calibração, o erro típico é de **0,5 a 2 unidades de pH**."),
  NOTA("A calibração em três passos", [
    "**Passo 1 — offset da placa (uma vez por placa):** com o BNC em curto, girar o potenciômetro mais perto do BNC até o Po marcar **2,500 V** (no ESP32, com o divisor, **1,667 V** no GPIO 34).",
    "**Passo 2 — dois pontos (toda semana de uso):** sonda no tampão **pH 7,00**, esperar estabilizar, comando `c7`; enxaguar; sonda no tampão **pH 4,00** (ou 10,00), esperar, comando `c4` (ou `c10`). O sketch grava V7 e a inclinação na memória da placa.",
    "**Passo 3 — verificação:** medir um terceiro tampão. O erro deve ficar em **até 0,1 pH** (Uno ou ADS1115) ou **até 0,2 pH** (ADC interno do ESP32). A inclinação deve ficar entre **85 % e 105 %** da teórica.",
  ], VERDE),
  ESPACO(),
  NOTA("Três pontos de atenção encontrados nesta análise", [
    "**Os comandos do sketch supõem tampões de pH exatamente 7, 4 e 10.** Com os sachês **6,86 e 9,18**, muito comuns nos kits dessa sonda, a calibração fica errada: 0,14 pH de erro perto do neutro e 0,3 pH em pH 10 com o 6,86; mais de 1 pH com o 9,18 (seção 8.4). Use tampão 7,00 ou aplique a correção da seção 8.4.",
    "**A calibração vale para uma montagem.** Ela é gravada em volts **no pino**: trocar do Uno para o ESP32, mexer no divisor ou trocar a sonda exige calibrar de novo.",
    `**O sensor da bancada ainda não está calibrado** (seção 9): em ${B.minutos} min de leituras, a tensão no GPIO 34 ficou entre ${v(B.v_min)} e ${v(B.v_max)} V e derivou, quando o esperado em pH 7 é 1,667 V. O pH indicado (${v(B.ph_fim, 1)} a ${v(B.ph_ini, 1)}) não tem significado até o Passo 1 ser feito.`,
  ], VERMELHO),

  // ---------------------------------------------------------------
  H1("2. O que exatamente se calibra"),
  P("O número que aparece na tela passa por cinco estágios, e cada um acrescenta um erro próprio. A calibração com tampões corrige todos de uma vez, porque mede a cadeia inteira: entra um pH conhecido, sai uma tensão."),
  TAB(["Estágio", "O que faz", "Erro que acrescenta", "Quem corrige"], [
    ["1. Sonda de vidro", "gera ~59 mV por unidade de pH (Nernst), 0 mV em pH 7", "offset próprio (até ±30 mV) e perda de inclinação com a idade", "calibração de 2 pontos"],
    ["2. Amplificador da placa", "multiplica por ~3 e soma ~2,5 V", "o “2,5 V” depende do potenciômetro; o ganho varia alguns % entre placas", "potenciômetro (Passo 1) + 2 pontos"],
    ["3. Divisor 1 kΩ / 2 kΩ (só ESP32)", "multiplica por 2/3", "resistores de 5 %: o fator real fica entre 0,64 e 0,69", "2 pontos (feitos **com** o divisor)"],
    ["4. Conversor A/D", "transforma volts em número", "Uno: depende do 5 V real; ESP32: não linear e ruidoso; ADS1115: desprezível", "2 pontos (parte); média aparada (ruído)"],
    ["5. Reta no sketch", "pH = 7 + (V − V7) / inclinação", "nenhum, se V7 e inclinação estiverem certos", "é o resultado da calibração"],
  ], [0.2, 0.25, 0.32, 0.23]),
  ESPACO(),
  P("Daí vêm duas regras práticas. **Calibre na montagem em que vai medir**, com o mesmo cabo, o mesmo divisor e a mesma alimentação. E **o potenciômetro não substitui os tampões**: ele só centra o sinal da placa; quem acerta a sonda são os tampões."),

  // ---------------------------------------------------------------
  H1("3. A teoria em uma página"),
  P("O bulbo de vidro da sonda separa a solução interna (pH 7) da amostra. A diferença de concentração de H⁺ entre as duas faces gera uma tensão dada pela **equação de Nernst**:"),
  CODIGO(`E = -(2,303 R T / F) x (pH - 7)  =  -0,19842 mV/K x T x (pH - 7)

a 25 C:   E = -59,16 mV x (pH - 7)      pH 4 -> +177 mV     pH 7 -> 0 mV     pH 10 -> -177 mV

Placa pH-4502C:   Po = 2,5 V + 3 x E     ->   Po = 2,5 - 0,177 x (pH - 7)      [volts]
ESP32 (divisor):  V34 = Po x 2/3         ->   V34 = 1,667 - 0,118 x (pH - 7)   [volts]

Sketch:           pH = 7 + (V - V7) / INCLINACAO`, { arquivo: false, titulo: "do pH à tensão e de volta" }),
  ESPACO(),
  P("Repare no sinal: nesta placa, **mais ácido = mais tensão**. A inclinação é negativa."),
  TAB(["Líquido de referência", "E na sonda (25 °C)", "Po (Uno, A0)", "GPIO 34 (ESP32 com divisor)"], [
    ["tampão pH 4,00", "+177 mV", "3,03 V", "2,02 V"], ["tampão pH 6,86", "+8 mV", "2,52 V", "1,68 V"],
    ["**tampão pH 7,00**", "**0 mV**", "**2,50 V**", "**1,667 V**"], ["tampão pH 9,18", "−129 mV", "2,11 V", "1,41 V"],
    ["tampão pH 10,00", "−177 mV", "1,97 V", "1,31 V"],
  ], [0.28, 0.22, 0.22, 0.28]),
  ESPACO(),
  P("Esses são os valores **ideais**. Servem para conferir se a montagem está perto do esperado; os valores reais de cada sonda saem da calibração."),
  ...FIGURA(path.join(AQUI, "curva_calibracao.png"), "A reta de calibração. Linhas cheias: valores ideais no Uno e no ESP32. Linha tracejada: exemplo de uma sonda usada, com offset de +60 mV e 90 % da inclinação — a calibração de dois pontos encontra exatamente essa reta.", 0.95),

  // ---------------------------------------------------------------
  H1("4. Material e preparação"),
  TAB(["Item", "Para quê", "Observação"], [
    ["Tampões pH 7,00, 4,00 (ou 4,01) e 10,00 (ou 10,01)", "os pontos conhecidos da reta", "sachê dissolvido em 250 mL de água destilada; dura ~1 mês fechado. O de pH 10 absorve CO₂ do ar e cai: use fresco"],
    ["Água destilada + papel macio", "enxaguar entre tampões", "secar **encostando**, sem esfregar (esfregar carrega o vidro de eletricidade estática)"],
    ["3 copos pequenos, rotulados", "um por tampão", "nunca devolver o tampão usado ao frasco"],
    ["Clipe ou fio curto", "curto no BNC (Passo 1)", "liga o pino central à carcaça"],
    ["Chave de fenda pequena", "potenciômetro de offset", "multivoltas: ~25 voltas de ponta a ponta"],
    ["Multímetro", "conferir Po, o divisor e o 5 V", "ponta preta sempre no GND"],
    ["Termômetro (opcional)", "saber a temperatura dos tampões", "o pH do tampão muda com a temperatura (tabela abaixo)"],
  ], [0.32, 0.26, 0.42]),
  ESPACO(),
  UL(["**Sonda hidratada.** Se ficou seca, deixe 24 h na solução de armazenamento (KCl 3 M) antes de calibrar. Bulbo seco responde devagar e com inclinação baixa.",
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
  H1("5. Passo 1 — ajuste do offset da placa"),
  P("Objetivo: fazer a placa entregar o meio da escala quando a sonda entrega 0 mV. Faz‑se **uma vez por placa** (ou quando alguém mexer no potenciômetro). Não precisa de sonda nem de tampão."),
  OL(["Desligue a sonda do BNC. Faça um **curto no BNC**: um clipe ou fio entre o pino central e a carcaça metálica. Isso simula 0 mV, o que uma sonda perfeita daria em pH 7.",
    "Ligue a placa e abra o Monitor Serial (115200). Observe o valor `V:` das linhas `pH:… V:…`.",
    "Gire o **potenciômetro de offset** (o azul **mais perto do BNC**) devagar até ler **V:2.500** no Uno, ou **V:1.667** no ESP32 com o divisor. Tolerância: ±0,02 V. São muitas voltas; se o valor não muda, continue girando no mesmo sentido.",
    "Confira com o multímetro: **2,50 V no pino Po**. No ESP32, confira também **1,67 V no nó do divisor** (onde sai o fio do D34). Se o Po marca 2,50 V e o nó não marca ~1,67 V, o problema é o divisor, não a placa.",
    "Tire o curto e encaixe a sonda (girar até travar)."]),
  NOTA("Por que este passo importa", ["Com o offset fora, a reta inteira sobe ou desce. No ESP32 isso é grave: se o Po estiver alto, as leituras de líquidos ácidos passam de **2,45 V no pino**, onde o ADC do ESP32 deixa de ser confiável — e a calibração por software não conserta uma medida saturada.",
    "O potenciômetro mais longe do BNC só ajusta o limiar do pino Do. Não mexe no Po e pode ficar como está."]),

  // ---------------------------------------------------------------
  H1("6. Passo 2 — calibração de dois pontos"),
  P("Os comandos são os mesmos nos três sketches (Uno, ESP32 e ESP32 + ADS1115), digitados no Monitor Serial a 115200 baud:"),
  TAB(["Comando", "O que faz", "Quando usar"], [
    ["`c7`", "lê a tensão agora e grava como **V7** (tensão em pH 7)", "sonda estável no tampão **7,00**. Sempre o primeiro"],
    ["`c4`", "lê a tensão e calcula a inclinação: (V − V7) / (4 − 7)", "sonda estável no tampão **4,00 / 4,01**. Para líquidos ácidos e neutros"],
    ["`c10`", "idem, com (10 − 7)", "sonda estável no tampão **10,00 / 10,01**. Para líquidos básicos"],
    ["`r`", "volta aos valores padrão", "para recomeçar do zero"],
  ], [0.14, 0.46, 0.4]),
  ESPACO(),
  OL(["Enxágue a sonda com água destilada e seque encostando o papel.",
    "Mergulhe a ponta no tampão **pH 7,00** (bulbo e junção cobertos, sem tocar o fundo). Mexa de leve uma vez e deixe parada.",
    "**Espere estabilizar**: o valor `V:` deve variar menos de **0,005 V em 30 s**. Leva de 1 a 2 minutos. Sonda que demora mais de 3 minutos está suja ou velha.",
    "Digite **`c7`**. O sketch responde `V7 gravado: …`. Anote o valor na ficha (seção 12).",
    "Enxágue de novo e seque. Mergulhe no tampão **pH 4,00**, espere estabilizar do mesmo jeito.",
    "Digite **`c4`**. O sketch responde com a inclinação e a **saúde da sonda** (% da teórica). Anote.",
    "Enxágue. A calibração já está gravada (EEPROM no Uno, Preferences no ESP32) e sobrevive ao desligar."]),
  TAB(["Resultado do `c4`", "Uno (A0)", "ESP32 (GPIO 34 com divisor)", "Significado"], [
    ["inclinação ideal", "−0,177 V/pH", "−0,118 V/pH", "100 %"],
    ["aceitável", "−0,150 a −0,186", "−0,100 a −0,124", "85 % a 105 %: sonda boa"],
    ["baixa (em módulo)", "acima de −0,150", "acima de −0,100", "sonda velha, suja ou mal hidratada; ou tampão vencido"],
    ["positiva", "> 0", "> 0", "tampões trocados (`c4` feito no pH 10) — refazer"],
  ], [0.22, 0.2, 0.28, 0.3]),
  ESPACO(),
  NOTA("Qual segundo ponto escolher", ["Use o tampão do **lado em que vai medir**: pH 4 para vinagre, sucos, solução hidropônica e água de torneira; pH 10 para sabão e soluções básicas. A reta vale melhor **entre** os dois pontos da calibração.",
    "Sempre o pH 7 primeiro: o `c4`/`c10` calcula a inclinação a partir do V7 que estiver gravado."]),

  // ---------------------------------------------------------------
  H1("7. Passo 3 — verificação e critérios de aceitação"),
  P("Uma calibração só vale depois de conferida com um líquido que **não** participou dela. Meça o terceiro tampão (pH 10 se calibrou com 7 e 4) e compare com a tabela:"),
  TAB(["Critério", "Aceitar", "Se não passar"], [
    ["Offset: V7 medido no tampão 7,00", "2,50 ± 0,09 V (Uno) · 1,667 ± 0,06 V (ESP32) — equivale a ±30 mV na sonda", "refazer o Passo 1; se persistir, sonda contaminada ou seca"],
    ["Inclinação (saúde da sonda)", "85 % a 105 % da teórica", "limpar e reidratar a sonda; trocar os tampões; abaixo de 85 % depois disso: trocar a sonda"],
    ["Terceiro tampão", "erro ≤ 0,1 pH (Uno, ADS1115) · ≤ 0,2 pH (ADC interno do ESP32)", "repetir a calibração esperando mais tempo; conferir a temperatura dos tampões"],
    ["Tempo para estabilizar", "até 2 min", "sonda lenta: limpeza (seção 10)"],
    ["Repetição", "voltar ao tampão 7 e ler 7,00 ± 0,05", "deriva: aquecer mais tempo; conferir GND e cabo BNC"],
  ], [0.26, 0.4, 0.34]),
  ESPACO(),
  P("Depois da verificação, meça amostras de pH conhecido para ganhar confiança: vinagre (2,5–3), refrigerante de cola (2,5–3), água de torneira (6,5–7,5), água com bicarbonato (~8,3)."),

  // ---------------------------------------------------------------
  H1("8. Análise dos erros"),
  H2("8.1 Por que um ponto só não basta"),
  P("Quem faz só o `c7` acerta o offset e fica com a inclinação teórica. Se a sonda tem 90 % da inclinação, o erro cresce com a distância ao pH 7: **0,3 pH em pH 4 e 0,7 pH em pH 0 ou 14** (gráfico da esquerda). O segundo ponto elimina esse erro."),
  ...FIGURA(path.join(AQUI, "erros.png"), "Erro de pH. Esquerda: calibração de um ponto só, para sondas com diferentes perdas de inclinação. Direita: calibração de dois pontos feita a 25 °C e usada em amostras a outras temperaturas. Faixa verde: ±0,1 pH.", 1),
  H2("8.2 Temperatura"),
  P("A inclinação de Nernst é proporcional à temperatura absoluta: 0,34 % por °C."),
  TAB(["Temperatura", "0 °C", "10 °C", "20 °C", "25 °C", "30 °C", "40 °C", "50 °C"], [
    ["mV por pH", "54,20", "56,18", "58,17", "59,16", "60,15", "62,13", "64,12"],
    ["relativo a 25 °C", "−8,4 %", "−5,0 %", "−1,7 %", "0", "+1,7 %", "+5,0 %", "+8,4 %"],
  ], [0.2, 0.114, 0.114, 0.114, 0.115, 0.114, 0.114, 0.115]),
  ESPACO(),
  P("Na prática: calibrando e medindo na **mesma** temperatura, o efeito some, porque a calibração mede a inclinação real daquele dia. Com 10 °C de diferença entre calibração e medida, o erro é de 0,1 pH em pH 4 e praticamente zero perto de pH 7 (gráfico da direita). Os sketches não compensam temperatura; o pino **To** da placa mede a temperatura da placa, não a do líquido, e por isso não serve para compensar."),
  H2("8.3 O conversor A/D: Uno, ESP32 e ADS1115"),
  TAB(["Leitura", "Passo do conversor", "Em pH", "O que limita de verdade", "Exatidão esperada"], [
    ["Uno, A0 (10 bits, 5 V)", "4,9 mV", "0,028", "o “5 V” da USB (4,7–5,1 V) é a referência: calibre e meça com a mesma alimentação", "±0,1 pH"],
    ["ESP32, GPIO 34 (12 bits) + divisor", "0,8 mV", "0,007", "não linearidade do ADC, ruído do Wi‑Fi, faixa confiável só de 0,15 a 2,45 V", "±0,2 pH"],
    ["ADS1115 (16 bits, ganho 1) + divisor", "0,125 mV", "0,001", "a própria sonda e os tampões", "±0,05 pH"],
  ], [0.24, 0.13, 0.09, 0.38, 0.16]),
  ESPACO(),
  P("O passo do ESP32 é menor que o do Uno, mas a medida é pior: o conversor dele não é uma reta perfeita e a calibração de dois pontos só corrige o erro **nos dois pontos**. Os três sketches reduzem o ruído com a **média aparada** (30 leituras, descartando as 5 maiores e as 5 menores). Para medidas que importam — a horta hidropônica, por exemplo — o caminho é o ADS1115 (sketch `01c`), como no nó `horta/no1` da telemetria."),
  H2("8.4 Tampões 6,86 e 9,18: o erro escondido"),
  P("Os comandos `c7`, `c4` e `c10` supõem que o tampão vale **exatamente** 7, 4 e 10. Muitos kits trazem sachês **4,00 / 6,86 / 9,18**. O que acontece se eles forem usados sem cuidado:"),
  TAB(["Calibração feita", "pH 4,00 lido como", "pH 6,86 lido como", "pH 10,00 lido como"], [
    ["`c7` no tampão 7,00 + `c4` no 4,00 (correto)", "4,00", "6,86", "10,00"],
    ["`c7` no tampão **6,86** + `c4` no 4,00", "4,00", "**7,00** (+0,14)", "**10,29** (+0,29)"],
    ["`c7` no tampão 7,00 + `c10` no **9,18**", "**2,87** (−1,13)", "6,81", "**11,13** (+1,13)"],
  ], [0.43, 0.19, 0.19, 0.19]),
  ESPACO(),
  P("Tampão 4,01 no lugar de 4,00, ou 10,01 no lugar de 10,00, dá erro de 0,01: pode usar sem correção. **O 9,18 nunca deve ser usado com o `c10`.** Se só houver o 6,86 para o ponto neutro, calibre com `c7` (no 6,86) e `c4` (no 4,00) e corrija cada leitura:"),
  CODIGO(`pH real = 6,86 + (pH lido - 7) x (6,86 - 4,00) / 3  =  6,86 + 0,953 x (pH lido - 7)

exemplos:  lido 7,00 -> 6,86      lido 4,00 -> 4,00      lido 8,50 -> 8,29`, { arquivo: false, titulo: "correção para calibração feita com o tampão 6,86" }),
  ESPACO(),
  P("A solução definitiva é acrescentar ao sketch comandos que aceitem o valor do tampão (por exemplo `c 6.86`). Isso ainda não foi feito."),
  H2("8.5 Orçamento de incerteza"),
  TAB(["Fonte", "Tamanho típico", "Como reduzir"], [
    ["Tampões (valor nominal, idade, contaminação)", "±0,02 a ±0,05 pH", "tampão fresco; copos separados; não devolver ao frasco"],
    ["Leitura antes de estabilizar", "até ±0,2 pH", "esperar 1–2 min; critério de 0,005 V em 30 s"],
    ["Temperatura diferente da calibração", "0,03 pH por 10 °C, por unidade de distância ao pH 7", "calibrar e medir na mesma temperatura"],
    ["Conversor A/D", "±0,03 (Uno) · ±0,1 a 0,2 (ESP32) · ±0,005 (ADS1115)", "média aparada; ADS1115"],
    ["Deriva da sonda entre calibrações", "0,05 a 0,1 pH por semana", "recalibrar toda semana de uso"],
    ["Divisor e alimentação (se mudarem depois de calibrar)", "até vários décimos", "não mexer na montagem; recalibrar se mexer"],
  ], [0.36, 0.32, 0.32]),
  ESPACO(),
  P("Somando o que é inevitável, o resultado realista deste sensor bem calibrado é **±0,1 pH** no Uno e no ADS1115 e **±0,2 pH** no ADC interno do ESP32. É suficiente para classificar líquidos, acompanhar um aquário ou uma solução hidropônica; não substitui um pHmetro de laboratório (±0,01)."),

  // ---------------------------------------------------------------
  H1(`9. O sensor da bancada em ${B.data}`),
  P(`O ESP32 da bancada estava com o sketch \`01b_ph4502c_esp32_web\`, **sem calibração gravada** (valores padrão). As leituras foram levadas ao painel da telemetria‑cria (\`cria/teste/no5\`, grandezas \`tensao\` e \`ph\`) por uma ponte serial, uma a cada 2 s. O gráfico mostra ${B.n} leituras, das ${B.inicio} às ${B.fim}.`),
  ...FIGURA(path.join(AQUI, "bancada.png"), "Leituras da bancada antes de qualquer calibração. Em cima, a tensão no GPIO 34; embaixo, o pH que o sketch calcula com os valores padrão.", 1),
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
  P("Em qualquer dos casos, o caminho é o mesmo: conferir o divisor com o multímetro, fazer o Passo 1 e só então os Passos 2 e 3. Depois da calibração, vale gerar este gráfico de novo (`bash gerar_relatorio.sh 30`) com a sonda parada em cada tampão, para registrar a estabilidade."),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("10. Cuidados com a sonda e periodicidade"),
  UL(["**Guardar sempre molhada**, na tampa com solução de armazenamento (KCl 3 M). Nunca em água destilada por horas: ela retira os íons do eletrodo de referência.",
    "**Enxaguar entre amostras** com água destilada e secar encostando.",
    "**Limpeza** quando ficar lenta: 15 min em água morna com uma gota de detergente; para depósitos de calcário, 5 min em vinagre diluído. Depois, 1 h na solução de armazenamento e calibrar de novo.",
    "**Não bater o bulbo**, não medir líquidos acima de 60 °C, não deixar congelar.",
    "**Vida útil:** 6 a 12 meses de uso em sala. O sinal de fim de vida é a inclinação abaixo de 85 % mesmo depois da limpeza."]),
  TAB(["Quando", "O que fazer"], [
    ["Placa nova ou potenciômetro mexido", "Passo 1 (offset) + Passos 2 e 3"],
    ["Toda semana de uso; antes de uma medida importante", "Passos 2 e 3"],
    ["Troca de sonda, de placa (Uno ↔ ESP32), de divisor ou de alimentação", "Passos 2 e 3 (e o 1, se a placa mudou)"],
    ["Sonda ficou seca ou guardada por mais de um mês", "reidratar 24 h; Passos 2 e 3"],
    ["Verificação falhou ou a leitura do tampão 7 saiu de 7,00 ± 0,1", "Passos 2 e 3"],
  ], [0.55, 0.45]),

  // ---------------------------------------------------------------
  H1("11. Solução de problemas"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`V:` não muda ao girar o potenciômetro", "potenciômetro errado (o do limiar) ou no fim do curso", "usar o mais perto do BNC; girar muitas voltas no outro sentido"],
    ["`V:` deriva sem parar", "sonda desligada, seca ou com bolha no bulbo; GND solto", "curto no BNC para testar a placa; reidratar; sacudir a sonda de leve; conferir o GND comum"],
    ["Mesma leitura em todos os tampões", "sonda quebrada, BNC mal encaixado, fio no pino errado (Do/To em vez de Po)", "conferir o pino **Po**; girar o BNC até travar; testar outra sonda"],
    ["Inclinação positiva", "`c4` feito no tampão básico", "refazer com os tampões certos"],
    ["Inclinação baixa (< 85 %)", "sonda velha ou suja; tampão vencido; leitura antes de estabilizar", "limpar e reidratar; tampão novo; esperar mais"],
    ["ESP32: pH perto de 0 em qualquer líquido", "fio de dados antes do resistor de 1 kΩ, ou divisor sem o 2 kΩ/GND", "medir 2,5 V no Po e 1,67 V no nó (BNC em curto)"],
    ["ESP32 e Uno discordam com a mesma sonda", "cada placa tem a sua calibração; ADC do ESP32 não linear", "calibrar em cada uma; para concordância melhor, ADS1115"],
    ["Leitura salta quando a mão chega perto", "sinal de altíssima impedância capta interferência", "cabo da sonda longe de fontes e do ESP32; não segurar o cabo durante a leitura"],
    ["Calibração “some” ao regravar", "no Uno, EEPROM apagada por outro sketch; no ESP32, flash apagada (“Erase All Flash”)", "calibrar de novo; anotar V7 e inclinação na ficha"],
  ], [0.28, 0.36, 0.36]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("12. Ficha de calibração"),
  P("Uma ficha por calibração. Guarde‑as: a queda da inclinação ao longo dos meses mostra o envelhecimento da sonda."),
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
  H1("13. Referências"),
  UL([
    "Módulo pH‑4502C: não há folha de dados oficial; pinagem pelas marcações da placa e por fichas de revendedores (Think Robotics; raw.org, *PH‑4502C pH sensor with Arduino*).",
    "Equação de Nernst e eletrodo de vidro: Skoog, West, Holler, Crouch. *Fundamentos de Química Analítica*, cap. de potenciometria.",
    "Valores dos tampões padrão em função da temperatura: NIST / IUPAC, *Measurement of pH. Definition, standards and procedures* (Pure Appl. Chem. 74:2169, 2002).",
    "Espressif. *ESP32 ADC* — faixas recomendadas por atenuação e limitações do ADC2 com Wi‑Fi.",
    "Texas Instruments. *ADS1115* — folha de dados (resolução e ganhos).",
    "Guia do Aluno e Guia do Professor *Monitor de água* (aula‑agua), Parte 1 e Parte 4; sketches `01`, `01b` e `01c`.",
    "Telemetria‑cria: `mqtt/catalogo-topicos.md`, `gateway/README.md`, `calibracao/README.md`, `firmware/horta-no1`.",
  ]),
];

module.exports = DOC({ titulo: "Calibração do pH-4502C", rodape: "Relatório técnico — Calibração do pH‑4502C — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
