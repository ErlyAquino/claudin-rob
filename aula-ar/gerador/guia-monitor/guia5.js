// Guia de montagem do monitor de qualidade do ar (Rede de Telemetria do Espaco CRIA) - Parte 5: o no completo.
// Gera ../../saida/Guia-Montagem-Monitor-Ar-Parte5-No-Completo.docx (gerar.sh converte para PDF).
// Esquema: ../../esquemas/saida-monitor/m5_monitor_ar_esp32.png (python esquemas.py --monitor).
// Figuras: figuras/rede-5a.png, rede-5b.png e tempo-5.png (gerar.sh). Rede e servidor: Parte 1 (guia.js).
const path = require("path");
const { H1, H2, H3, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas", "saida-monitor");
const FIGS = path.join(AQUI, "figuras");
const ARQ = (pasta, nome) => path.join(AQUI, "..", "..", "codigo", pasta, nome);
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-Montagem-Monitor-Ar-Parte5-No-Completo.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia de montagem — Parte 5",
    titulo: "Monitor de Qualidade do Ar",
    subtitulo: "O nó completo: os quatro sensores (MQ-2, MQ-135, MH-Z19C e DHT22) num único ESP32. Análise de viabilidade, alimentação com fonte de 5 V, montagem, calibração na montagem final, teste de 24 horas e o plano B com dois ESP32",
    info: [
      "**Placa:** ESP32 DevKit V1 (30 pinos)  •  **Sketches:** `aula-ar/codigo/m5a_monitor_celular` e `m5b_monitor_telemetria`",
      "**Pré-requisito:** Partes 1 a 4 (cada sensor montado, calibrado e testado em separado)",
      "Projeto Rede de Telemetria do Espaço CRIA — Edital nº 19/2026-FACEPE — ETE Epitácio Pessoa — dezembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // =====================================================================
  H1("1. Onde estamos"),
  P("Nas Partes 1 a 4, cada sensor foi montado, calibrado e testado num nó próprio do projeto `teste`. Esta Parte 5 reúne os quatro no **nó definitivo do monitor**, que o projeto aprovado descreve como **um único nó ESP32** e o catálogo de tópicos registra como `cria/ar/no1`. Antes de montar, o guia responde a uma pergunta de engenharia: **um só ESP32 consegue ler os quatro sensores sem perder dados e sem ficar lento?** A resposta é sim, com condições, e ela é conferida na bancada por um teste de 24 horas. Se o teste reprovar, o guia já traz o plano B: dois ESP32."),
  TAB(["O que vem das partes anteriores", "O que é novo nesta parte"], [
    ["Pinos de cada sensor (GPIO 34, 35, 16, 17 e 4)", "Todos na mesma protoboard, com o mesmo ESP32"],
    ["Alimentação pela USB, um sensor por vez", "**Fonte de 5 V e 2 A** nas trilhas"],
    ["Procedimentos de calibração (R0, zero, correções)", "Calibração **refeita na montagem final**, com a fonte definitiva"],
    ["Um nó por sensor, no projeto `teste`", "Um nó publicando **cinco grandezas** a cada 10 s"],
    ["Um sketch de teste para cada sensor", "Arquivo `sensores_ar.h`, com chaves para ligar e desligar cada sensor"],
  ], [0.5, 0.5]),
  ESPACO(),
  P("A rede, o servidor e o `credenciais.h` continuam os da Parte 1, seção 6."),

  // =====================================================================
  H1("2. Análise de viabilidade: um ESP32 para os quatro sensores"),
  H2("2.1 Conclusão"),
  P("**Sim, é viável.** O ESP32 passa menos de 1 % do tempo lendo os sensores e publicando; os pinos não conflitam; a memória tem folga; a carga na rede é desprezível (5 mensagens de cerca de 100 bytes a cada 10 s). O firmware de referência da telemetria (`telemetria-cria/firmware/no-ar`) já foi escrito assim, com os quatro sensores num nó. As condições não estão no processador:"),
  UL([
    "**Alimentação.** Os dois aquecedores dos MQ, o MH-Z19C e o Wi-Fi somam cerca de 0,45 A, com picos perto de 0,7 A. Uma porta USB de computador fornece no máximo 0,5 A. O nó completo precisa de uma **fonte de 5 V e 2 A** (seção 2.6).",
    "**Calor.** Os dois MQ dissipam cerca de 1,5 W. O DHT22 tem de ficar **afastado** deles e do ESP32, ou a temperatura sai alta e a umidade, baixa (seção 2.7).",
    "**Leitura do DHT22 com limite de tempo.** A biblioteca usada na Parte 4 pode reiniciar o ESP32 inteiro se o sensor parar no meio de uma resposta. Num nó com quatro sensores, isso derruba os outros três; por isso, nesta parte, o DHT22 é lido por uma rotina própria (seção 2.3).",
  ]),
  P("As seções seguintes mostram as contas. Os tempos são **estimativas** feitas pelo código e pelas folhas de dados, e nada disso foi medido em placa: o sketch mede o valor real em cada rodada, e o teste de 24 horas confirma (ou não) a conclusão na sua bancada. O quadro comparativo está na seção 2.8, os critérios de aprovação na 2.9 e a ficha do teste na 7.5."),

  H2("2.2 Pinos: nenhum conflito"),
  TAB(["Sensor", "Pino do ESP32", "Recurso usado", "Observação"], [
    ["MQ-2", "GPIO 34", "ADC1, canal 6", "Só entrada; não depende do Wi-Fi"],
    ["MQ-135", "GPIO 35", "ADC1, canal 7", "Só entrada; não depende do Wi-Fi"],
    ["MH-Z19C", "GPIO 16 (RX2) e 17 (TX2)", "UART2 (a segunda porta serial do ESP32)", "A primeira porta serial continua com o Monitor Serial"],
    ["DHT22", "GPIO 4", "Entrada e saída digital", "Um fio de dados"],
    ["(livres)", "GPIO 21 e 22", "I2C", "Reservados, conforme o projeto aprovado"],
  ], [0.14, 0.26, 0.3, 0.3]),
  ESPACO(),
  P("Cada sensor usa um periférico diferente do ESP32 (dois canais do ADC1, uma porta serial e um pino digital). Nenhum disputa recurso com outro, e nenhum usa o ADC2, que deixa de funcionar com o Wi-Fi ligado."),

  H2("2.3 Tempo: menos de 1 % do processador"),
  ...FIGURA(path.join(FIGS, "tempo-5.png"), "Orçamento de tempo de uma rodada de leituras e publicações, em relação ao intervalo de 10 s (valores estimados).", 1.33),
  TAB(["Etapa da rodada", "Tempo típico", "Pior caso", "De onde vem"], [
    ["MH-Z19C: pedido e resposta pela serial", "≈ 35 ms", "200 ms (sensor sem resposta)", "18 bytes a 9600 bps, mais o tempo de resposta do sensor; limite em `Serial2.setTimeout(200)`"],
    ["MQ-2 e MQ-135: 16 leituras do ADC cada", "≈ 4 ms", "≈ 10 ms", "32 conversões de cerca de 0,1 ms"],
    ["DHT22: pedido e 40 bits", "≈ 6 ms", "≈ 2 ms (sem resposta: a leitura é abandonada)", "Rotina própria, com limite de tempo em cada pulso"],
    ["5 publicações MQTT, com a cópia no Monitor Serial", "≈ 35 ms", "0,3 a 0,5 s (sem rede: 5 gravações na fila de espera, seção 2.4)", "Quase todo o tempo é a escrita das 5 linhas no Monitor Serial, a 115200 bps; a gravação na fila é mais lenta"],
    ["**Total da rodada**", "**≈ 80 ms**", "**< 1 s**", "≈ 0,8 % do intervalo de 10 000 ms"],
  ], [0.28, 0.13, 0.25, 0.34]),
  ESPACO(),
  P("Três cuidados do sketch mantêm esse orçamento:"),
  UL([
    "**Uma rodada só.** A biblioteca pede um único `aCada()` por programa: todos os sensores são lidos em sequência, e só depois vêm as publicações da rodada.",
    "**O DHT22 por último.** A leitura dele desliga as interrupções de um dos dois núcleos do ESP32 por cerca de 5 ms. O Wi-Fi roda no outro núcleo e não é afetado, e o MH-Z19C já respondeu antes.",
    "**Nenhuma espera longa.** O limite a respeitar é o keepalive do MQTT (o sinal periódico pelo qual o broker sabe que o nó continua conectado), de 5 s: se o programa passar mais que isso sem chamar `no.manter()`, o broker encerra a conexão. O pior caso da rodada fica mais de cinco vezes abaixo dele.",
  ]),
  NOTA("Por que o DHT22 não é lido pela biblioteca nesta parte", [
    "A DHT sensor library espera cada pulso do sensor com as interrupções desligadas, e cada espera pode durar cerca de 0,1 s. Se o sensor começar a responder e parar no meio (mau contato no cabo, por exemplo), as esperas se somam, o circuito de vigilância do ESP32 (watchdog) entende que o programa travou e **reinicia a placa**.",
    "Num nó com um sensor, o prejuízo é pequeno. No nó completo, o reinício zera o aquecimento: 3 minutos sem CO₂ e 10 minutos sem os MQ.",
    "Por isso o `sensores_ar.h` traz uma leitura própria do DHT22, com o mesmo protocolo da Parte 4 (seção 2.5) e um limite de frações de milissegundo em cada espera: se o sensor falhar, a leitura é abandonada e as outras seguem. A chave `DHT22_PELA_BIBLIOTECA` permite voltar à biblioteca, para comparar.",
  ], AZUL),
  ESPACO(),
  P("Para o painel, nada muda: a latência entre a leitura e o gráfico continua a mesma de um nó com um sensor, porque cada grandeza é publicada na mesma rodada em que foi lida."),

  H2("2.4 Rede e fila: a autonomia sem conexão diminui"),
  P("O nó completo publica 5 mensagens a cada 10 s (30 por minuto). O que muda em relação a um nó simples é a **fila de espera**: quando a rede ou o servidor caem, a biblioteca guarda as leituras na memória flash do ESP32 (a memória permanente, que não se apaga sem energia), até cerca de 6000 leituras, e as reenvia depois. Com mais grandezas no mesmo nó, a fila enche mais depressa:"),
  TAB(["Configuração", "Leituras por minuto", "Autonomia da fila (aproximada)"], [
    ["Um sensor por nó (Partes 1 a 3)", "6", "16 h 40 min"],
    ["**Um ESP32 com os quatro sensores**", "**30**", "**3 h 20 min**"],
    ["Plano B, placa A: MQ-2 + MQ-135", "12", "8 h 20 min"],
    ["Plano B, placa B: MH-Z19C + DHT22", "18", "5 h 30 min"],
  ], [0.46, 0.22, 0.32]),
  ESPACO(),
  P("Depois que a fila enche, as leituras novas são descartadas até a conexão voltar, e a perda aparece no painel como lacuna na numeração (`seq`). Com o servidor e o ponto de acesso ligados no nobreak, uma queda de mais de 3 horas é improvável; ainda assim, a menor autonomia da fila é a única desvantagem mensurável de reunir os quatro sensores num nó."),

  H2("2.5 Memória"),
  TAB(["Recurso", "Uso do sketch `m5b` (medido na compilação)", "Limite", "Folga"], [
    ["Memória de programa (flash)", "998 kB (76 %)", "1311 kB (partição padrão)", "24 %"],
    ["Variáveis globais (RAM)", "49 kB (15 %)", "328 kB", "85 %"],
  ], [0.28, 0.34, 0.22, 0.16]),
  ESPACO(),
  P("O sketch com os quatro sensores ocupa só cerca de 5 kB a mais de programa que o de um sensor: quase todo o espaço é do Wi-Fi e da biblioteca de telemetria. O sketch acompanha também a menor quantidade de memória RAM livre desde a partida e a mostra na linha `[diag]` do Monitor Serial; o valor deve ficar estável ao longo das horas."),

  H2("2.6 Alimentação: o limite real"),
  TAB(["Consumidor", "Corrente típica", "Pico", "Fonte da informação"], [
    ["Aquecedor do MQ-2", "150 mA", "160 mA", "Folha de dados: aquecedor de 33 Ω em 5 V"],
    ["Aquecedor do MQ-135", "150 mA", "160 mA", "Folha de dados: aquecedor de 33 Ω em 5 V"],
    ["MH-Z19C", "< 40 mA", "125 mA", "Manual Winsen"],
    ["ESP32 com Wi-Fi", "≈ 100 mA", "≈ 240 mA (transmitindo)", "Folha de dados da Espressif"],
    ["DHT22 e LEDs dos módulos", "≈ 10 mA", "≈ 10 mA", "Folhas de dados"],
    ["**Total**", "**≈ 0,45 A**", "**≈ 0,7 A**", ""],
  ], [0.28, 0.17, 0.25, 0.3]),
  ESPACO(),
  P("Uma porta USB de computador fornece até 0,5 A, e a tensão que chega ao pino VIN ainda perde alguns décimos de volt no diodo da placa. Nas Partes 1 a 4, com um sensor por vez, isso bastava. Com os quatro sensores, a USB fica no limite: a tensão cai nos picos, o MH-Z19C reinicia (o caso dos 500 e 5000 ppm da Parte 3, seção 2.6) e o ESP32 pode reiniciar por subtensão (tensão abaixo do mínimo de funcionamento; a placa se protege reiniciando). Por isso o nó completo usa a **fonte chaveada de 5 V e 2 A** prevista no orçamento, ligada direto às trilhas da protoboard, com um capacitor de 470 µF para absorver os picos."),
  NOTA("Dividir em dois ESP32 não dispensa a fonte", "A placa com os dois MQ consumiria 0,3 A dos aquecedores mais o ESP32: de 0,4 A em regime a 0,55 A nos picos, no limite de uma porta USB (0,5 A), sem margem. Só a placa do MH-Z19C com o DHT22 (0,15 a 0,37 A) poderia ficar na USB. O problema de alimentação se resolve com a fonte, e não com a divisão.", AZUL),
  ESPACO(),

  H2("2.7 Calor e posição dos sensores"),
  UL([
    "**DHT22 longe do calor.** Os dois MQ dissipam cerca de 0,75 W cada, e o regulador do ESP32 também aquece. A menos de 10 cm deles, o DHT22 marca de 1 a 3 °C a mais e alguns pontos percentuais de umidade a menos. Mantenha-o na ponta do cabo, a **20 cm ou mais**, e, no abrigo, num compartimento ventilado próprio.",
    "**MQ com a tela exposta ao ar** e sem encostar em plástico: a cápsula metálica esquenta.",
    "**MH-Z19C com as janelas de difusão livres** (as aberturas com filtro branco, na lateral): é por elas que o ar entra.",
    "**Nenhum sensor em caixa fechada.** O abrigo precisa de aberturas em cima e embaixo, para o ar quente dos MQ sair (seção 9).",
  ]),

  H2("2.8 Um ESP32 ou dois: quadro comparativo"),
  TAB(["Critério", "Um ESP32 (recomendado)", "Dois ESP32 (plano B)"], [
    ["Projeto aprovado e catálogo de tópicos", "Como está escrito: um nó, com os cinco tópicos em `cria/ar/no1`", "Três dos cinco tópicos mudam de nó; exige registrar um segundo nó (`no2`) no catálogo e a decisão em `decisoes/`"],
    ["Processamento e latência", "Menos de 1 % do tempo; mesma latência", "Igual"],
    ["Alimentação", "Fonte de 5 V e 2 A", "Fonte na placa dos MQ; a outra pode usar USB"],
    ["Autonomia da fila sem rede", "3 h 20 min", "8 h 20 min (MQ) e 5 h 30 min (CO₂ e DHT22)"],
    ["Calor no DHT22", "Exige afastar o DHT22 (cabo, compartimento)", "Resolvido se as placas ficarem em compartimentos separados"],
    ["Falha ou reinício de uma placa", "Interrompe as cinco grandezas; depois de um reinício, 3 min sem CO₂ e 10 min sem os MQ", "Interrompe só as grandezas daquela placa"],
    ["Custo e manutenção", "1 placa, 1 abrigo, 1 firmware", "2 placas, 2 abrigos (ou um maior), 2 gravações, 2 nós para acompanhar"],
    ["Comparação entre sensores", "As cinco séries saem da mesma rodada", "Séries de placas diferentes, com alguns segundos de defasagem"],
  ], [0.24, 0.38, 0.38]),
  ESPACO(),
  NOTA("Recomendação", "Monte um ESP32 com os quatro sensores, com a fonte de 5 V e o DHT22 afastado, e faça o teste de 24 horas (seção 7.5). O plano B (seção 8) fica reservado para o caso de o teste reprovar por um motivo que a fonte, a fiação e a posição dos sensores não resolvam.", VERDE),
  ESPACO(),

  H2("2.9 Critérios de aprovação do teste de 24 horas"),
  P("A análise acima é teórica; a decisão depende da medida. O teste de 24 horas (seção 7.5) aprova o nó único se **todos** estes critérios forem atendidos:"),
  TAB(["#", "Critério", "Limite", "Onde ler"], [
    ["1", "Duração da rodada (`ciclo`), com a rede no ar", "até 500 ms", "Gráfico da grandeza `ciclo` no painel"],
    ["2", "Maior intervalo entre voltas do programa (`volta`), com a rede no ar", "até 1000 ms", "Gráfico da grandeza `volta` no painel"],
    ["3", "Reinícios do ESP32", "nenhum em 24 h", "`boot` no cartão do painel"],
    ["4", "Perda de mensagens", "menos de 1 %", "\"perda estimada\" no cartão do painel"],
    ["5", "Falhas de leitura do MH-Z19C e do DHT22", "até 86 cada (1 % das 8640 rodadas)", "Grandezas `falhas-co2` e `falhas-dht` no painel"],
    ["6", "Queda proposital do servidor por 15 minutos", "leituras reenviadas; perda continua abaixo de 1 %", "Gráficos sem lacuna depois da volta"],
    ["7", "Tensão na trilha + com tudo ligado", "4,9 a 5,2 V", "Multímetro, no início e no fim"],
    ["8", "Temperatura do DHT22 contra um termômetro fora do nó", "diferença de até 1 °C", "Termômetro de referência a 1 m do nó"],
  ], [0.05, 0.4, 0.25, 0.3]),
  ESPACO(),
  P("Os critérios 1 a 6 respondem à pergunta \"sem perda de dados e sem lentidão\". Os critérios 7 e 8 conferem as condições de alimentação e de calor. O limite de 1 % de perda é o mesmo do critério de aceitação do projeto."),

  // =====================================================================
  H1("3. Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32 DevKit V1 (30 pinos) + cabo USB de dados", ""],
    ["1", "Módulo MQ-2 e 1 módulo MQ-135", "Com o RL já conferido nas Partes 1 e 2"],
    ["1", "Sensor MH-Z19C com barra de pinos", ""],
    ["1", "DHT22 / AM2302 com cabo de 3 fios", "Não emende o cabo: em 3,3 V ele já está no limite"],
    ["1", "Protoboard de 830 furos", ""],
    ["1", "**Fonte chaveada de 5 V e 2 A**, com plugue P4 (cilíndrico, de 5,5 × 2,1 mm)", "Item do orçamento do projeto"],
    ["1", "Adaptador P4 fêmea com bornes de parafuso (terminais em que o fio é preso por um parafuso)", "Para levar a fonte às trilhas"],
    ["1", "Capacitor eletrolítico de 470 µF, 10 V ou mais", "Entre as trilhas + e −; tem polaridade"],
    ["2", "Resistores de 100 kΩ, 2 de 200 kΩ e 2 capacitores de 100 nF", "Os divisores dos dois MQ"],
    ["27", "Jumpers macho-macho", "Inclui 2 para unir as metades das trilhas"],
    ["1", "Multímetro", "Indispensável nesta parte"],
    ["1", "Celular com Wi-Fi e navegador", ""],
  ], [0.08, 0.54, 0.38]),
  ESPACO(),
  NOTA("Trilhas de alimentação interrompidas no meio", "Em muitas protoboards de 830 furos, as trilhas + e − são divididas em duas metades que **não se comunicam**. Confira com o multímetro, na escala de continuidade, entre as duas pontas de cada trilha. Se não houver continuidade, una as metades com um jumper em cada trilha.", VERMELHO),

  // =====================================================================
  ...QUEBRA(),
  H1("4. Montagem do nó completo"),
  H2("4.1 Esquema (Fritzing)"),
  ...FIGURA(path.join(ESQ, "m5_monitor_ar_esp32.png"), "Nó completo. Da esquerda para a direita: ESP32, DHT22, MQ-2, MQ-135, MH-Z19C, capacitor de 470 µF e a fonte de 5 V. No desenho, o DHT22 aparece ao lado dos MQ; na montagem real, ele fica afastado, na ponta do cabo. Confira cada ligação pela tabela abaixo.", 1.33),
  P("O desenho usa o par de trilhas de alimentação de baixo (o da borda da linha A). Arquivo do esquema: `aula-ar/esquemas/saida-monitor/m5_monitor_ar_esp32.fzz`."),
  TAB(["Bloco", "De", "Para", "Fio ou componente"], [
    ["Alimentação", "+ e − da fonte (bornes do adaptador P4)", "Trilha + (a da linha vermelha) e trilha − (a da linha azul), coluna 61", "Vermelho, preto"],
    ["Alimentação", "Capacitor de 470 µF: − na coluna 59, + na coluna 60", "Coluna 59 à trilha −; coluna 60 à trilha +", "Preto, vermelho"],
    ["ESP32", "VIN e GND", "Trilha + e trilha −", "Vermelho, preto"],
    ["DHT22 (colunas 4 a 6)", "Vermelho (4) / amarelo (5) / preto (6)", "**3V3** direto / **D4** / trilha −", "Laranja, amarelo, preto"],
    ["MQ-2 (colunas 12 a 15)", "VCC (12) / GND (13) / DO (14)", "Trilha + / trilha − / nada", "Vermelho, preto"],
    ["MQ-2: divisor", "AO (15) → 100 kΩ → coluna 19 → 200 kΩ → coluna 23", "Coluna 23 à trilha −; coluna 19 ao **D34**", "Amarelo, preto"],
    ["MQ-2: capacitor", "100 nF entre as colunas 18 e 19", "Coluna 18 à trilha −", "Preto"],
    ["MQ-135 (colunas 24 a 27)", "VCC (24) / GND (25) / DO (26)", "Trilha + / trilha − / nada", "Vermelho, preto"],
    ["MQ-135: divisor", "AO (27) → 100 kΩ → coluna 31 → 200 kΩ → coluna 35", "Coluna 35 à trilha −; coluna 31 ao **D35**", "Amarelo, preto"],
    ["MQ-135: capacitor", "100 nF entre as colunas 30 e 31", "Coluna 30 à trilha −", "Preto"],
    ["MH-Z19C (colunas 40 a 48)", "Tx (42) / Rx (43) / GND (47) / Vin (48)", "**RX2** / **TX2** / trilha − / trilha +", "Verde, azul, preto, vermelho"],
  ], [0.17, 0.33, 0.32, 0.18]),
  ESPACO(),
  P("Os divisores seguem as Partes 1 e 2: o sinal do AO desce da metade de cima para a de baixo da protoboard por um jumper curto (da linha F para a linha E, na mesma coluna); o resistor de 100 kΩ fica na linha D; o de 200 kΩ, na linha C; o capacitor, na linha A; e o fio para o ESP32 sai da linha B."),

  H2("4.2 Passo a passo"),
  OL([
    "Com a **fonte fora da tomada e o USB desligado**, una as metades das trilhas + e −, se a sua protoboard for dividida (seção 3).",
    "Antes de ligar a fonte à protoboard, ponha-a na tomada e meça a saída nos bornes do adaptador P4: **5,0 a 5,3 V**. Identifique o borne positivo (a leitura aparece sem sinal de menos com a ponta vermelha nele) e marque-o. Tire a fonte da tomada.",
    "Ligue os bornes do adaptador às trilhas de alimentação de baixo: + na trilha da linha vermelha, − na trilha da linha azul.",
    "Encaixe o capacitor de 470 µF com o terminal **negativo** (o da faixa clara no corpo) na coluna 59 e o positivo na 60; ligue a coluna 59 à trilha − e a 60 à trilha +. Invertido, o capacitor pode estourar.",
    "Ligue o **VIN** do ESP32 à trilha + e o **GND** à trilha −, com fios curtos.",
    "Monte o MQ-2 e o seu divisor (colunas 12 a 23) e leve a coluna 19 ao **D34**.",
    "Monte o MQ-135 e o seu divisor (colunas 24 a 35) e leve a coluna 31 ao **D35**.",
    "Monte o MH-Z19C (colunas 40 a 48): Vin na trilha +, GND na trilha −, Tx no **RX2**, Rx no **TX2**.",
    "Monte o DHT22: vermelho direto no pino **3V3** do ESP32 (nunca na trilha +), amarelo no **D4**, preto na trilha −. Deixe o sensor na ponta do cabo, a 20 cm ou mais dos MQ.",
    "Confira tudo pela tabela da seção 4.1 antes de energizar.",
  ]),

  H2("4.3 A fonte e o cabo USB ao mesmo tempo"),
  UL([
    "**Ligue sempre a fonte primeiro.** Com o VIN na trilha + e só o USB ligado, o computador passa a alimentar os aquecedores e o MH-Z19C pela placa: a porta USB fica sobrecarregada e pode desligar.",
    "**Fonte e USB juntos:** a DOIT DevKit V1 tem um diodo entre o conector USB e o VIN, que impede a corrente da fonte de voltar para o computador. Com ele, o USB pode ficar ligado para gravar o sketch e usar o Monitor Serial enquanto a fonte alimenta tudo.",
    "**Para saber se a sua placa tem esse diodo:** só com o USB ligado e o fio do VIN fora da trilha, meça entre VIN e GND. De 4,5 a 4,8 V, há diodo; 5,0 V ou mais (igual à USB), não há.",
    "**Em placa sem o diodo**, tire o fio do VIN enquanto o USB estiver ligado: o ESP32 fica alimentado pelo USB, os sensores pela fonte, e o GND continua comum. Nesse arranjo, não deixe a fonte ligada com o USB desligado.",
  ]),

  H2("4.4 Conferência com o multímetro"),
  OL([
    "**Tudo desligado**, na escala de 200 Ω: entre a trilha + e a trilha − devem aparecer de **14 a 18 Ω** (os dois aquecedores em paralelo; o valor sobe por alguns segundos enquanto o capacitor carrega). Menos de 5 Ω é curto. Na escala de continuidade, o multímetro pode apitar: aqui isso é normal.",
    "Ainda desligado: entre o **3V3** do ESP32 e a trilha + **não** pode haver continuidade.",
    "Ligue a fonte. Os LEDs dos módulos MQ e do ESP32 acendem.",
    "Meça entre a **trilha + e a trilha −**, perto dos MQ: **4,9 a 5,1 V** é o ideal para o MH-Z19C; até 5,2 V é tolerado. Acima disso, troque a fonte. Anote o valor: ele é o `TENSAO_DOS_MQ` do `sensores_ar.h`.",
    "Meça no **MH-Z19C**, entre Vin e GND: o mesmo valor, com até 0,1 V de diferença.",
    "Na escala de 200 mV, meça entre o **pino GND do ESP32** e a trilha − nas colunas 23 e 35: **menos de 10 mV**. Se der mais, encurte o fio do GND do ESP32, una as metades da trilha − com dois jumpers em paralelo e ligue a fonte perto do meio da trilha. Essa diferença entra como erro na leitura dos MQ.",
    "Meça entre o **fio vermelho e o preto do DHT22**: 3,2 a 3,4 V. Se der 5 V, o fio vermelho está na trilha +: desligue e corrija.",
    "Depois de 10 minutos, meça as colunas 19 e 31 (os pinos D34 e D35) em relação ao GND: entre 0,3 e 2,5 V em ar limpo, **nunca acima de 3,3 V**. Abaixo de 0,15 V, o RL do módulo é pequeno demais (Parte 1, seção 5.4).",
    "Opcional: com o multímetro em série com o + da fonte, na escala de 10 A, a corrente deve ficar perto de **0,45 A**. Depois, volte a ponta vermelha para a entrada de tensão antes de medir volts.",
  ]),

  // =====================================================================
  ...QUEBRA(),
  H1("5. Etapa 5A — os quatro sensores no celular"),
  P("O ESP32 cria a rede Wi-Fi `Ar-Monitor` e mostra os quatro sensores numa página só, em `http://192.168.4.1`. Esta etapa confere a montagem, mede o tempo de cada rodada e fornece as médias usadas para recalibrar os MQ (seção 6). No `m5a`, a rodada de leituras ocorre a cada 5 s; no `m5b`, a cada 10 s."),
  ...FIGURA(path.join(FIGS, "rede-5a.png"), "Etapa 5A: o celular se conecta direto à rede \"Ar-Monitor\" criada pelo ESP32 e abre http://192.168.4.1.", 1.33),

  H2("5.1 O arquivo sensores_ar.h"),
  P("Os dois sketches desta parte leem os sensores pelo mesmo arquivo, `sensores_ar.h`, que fica nas duas pastas. É nele que se escrevem os ajustes desta montagem. **Se editar numa pasta, copie para a outra.**"),
  TAB(["Constante", "O que colocar"], [
    ["`USAR_MQ2`, `USAR_MQ135`, `USAR_CO2`, `USAR_DHT22`", "`1` nos quatro (um ESP32 com os quatro sensores). No plano B, `0` nos sensores que não estão na placa"],
    ["`DHT22_PELA_BIBLIOTECA`", "`0`: leitura própria, com limite de tempo (seção 2.3). `1`: pela DHT sensor library, para comparar"],
    ["`TENSAO_DOS_MQ`", "A tensão medida na trilha + (seção 4.4), com ponto decimal: `5.04`"],
    ["`RL_MQ2_KOHM`, `RL_MQ135_KOHM`", "O resistor de carga de cada módulo: `1.0` de fábrica; `10.0` se você trocou o resistor nas Partes 1 e 2. Com 1 kΩ, o pino costuma ficar abaixo de 0,15 V em ar limpo, e o sketch avisa \"fora da faixa\""],
    ["`R0_MQ2_KOHM`, `R0_MQ135_KOHM`", "`0.0` até a recalibração da seção 6.1; depois, os valores medidos **nesta montagem**"],
    ["`CORR_TEMP_C`, `UR_A`, `UR_B`", "As correções do DHT22 achadas na Parte 4"],
    ["`FAIXA_CO2_PPM`", "`5000`, a faixa de fábrica do MH-Z19C"],
  ], [0.4, 0.6]),
  ESPACO(),

  H2("5.2 Gravar o sketch m5a_monitor_celular"),
  P("Não precisa de biblioteca extra: o DHT22 é lido pela rotina do próprio `sensores_ar.h`. Na Arduino IDE, abra `aula-ar/codigo/m5a_monitor_celular/m5a_monitor_celular.ino` (com `sensores_ar.h`, `monitor_wifi.h` e `pagina_web.h` na mesma pasta), escolha a placa **DOIT ESP32 DEVKIT V1** e a porta, e clique em **Carregar**."),
  CODIGO([
    "cd aula-ar/codigo/m5a_monitor_celular",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (no Linux, troque COM4 por /dev/ttyUSB0)" }),

  H2("5.3 Abrir no celular"),
  OL([
    "No celular, entre na rede Wi-Fi **Ar-Monitor**, senha **12345678**, e mantenha a conexão mesmo sem internet.",
    "Abra `http://192.168.4.1`. O valor principal é o CO₂; abaixo aparecem o MQ-135, o MQ-2, a temperatura, a umidade e a duração da rodada (`Ciclo` e `Ciclo maximo`, em ms).",
    "Enquanto o R0 de um MQ estiver em `0.0`, a página mostra o **Rs** dele, em kΩ. Depois da recalibração, passa a mostrar **Rs/R0**.",
    "A faixa de aviso da página junta as mensagens de todos os sensores: aquecimento, CO₂ alto, gás, sensor sem resposta. Se o MH-Z19C não responder, o valor principal fica no último CO₂ lido e a faixa avisa.",
  ]),

  H2("5.4 O que aparece no Monitor Serial"),
  CODIGO([
    "Rede Wi-Fi: Ar-Monitor  senha: 12345678  ->  abra http://192.168.4.1",
    "partida: ligou na energia (ou botao EN / Monitor Serial)",
    "sensores: MQ-2 1 | MQ-135 1 | MH-Z19C 1 | DHT22 1",
    "MQ-2: RL 10.0 k, R0 0.00 k | MQ-135: RL 10.0 k, R0 0.00 k | VC = 5.04 V",
    "CO2_ppm:500 MQ135_Rs_k:14.60 MQ2_Rs_k:12.71 Temp_C:28.4 Umid_%:62.0 Ciclo_ms:47",
    "# CO2 aquecendo; MQ aquecendo: faltam 594 s",
    "...",
    "CO2_ppm:612 MQ135_Rs_k:35.84 MQ2_Rs_k:64.40 Temp_C:28.6 Umid_%:61.5 Ciclo_ms:45",
    "...",
    "# media de 5 min: Rs MQ-2 = 64.74 k (60 leituras) | Rs MQ-135 = 35.94 k (60)",
    "#   em ar limpo, com os sensores estabilizados, esses valores sao os R0",
  ].join("\n"), { arquivo: false, titulo: "Exemplo com o RL dos módulos trocado para 10 kΩ (números ilustrativos, inclusive os tempos de ciclo)" }),
  ESPACO(),
  P("As linhas com `nome:valor` servem ao Plotter Serial; as que começam com `#` trazem os avisos e, a cada 5 minutos depois do aquecimento, a média do Rs de cada MQ. A linha `partida:` diz por que o ESP32 ligou: se aparecer `SUBTENSAO`, o problema é a alimentação; se aparecer `TRAVOU` ou `ERRO`, anote e veja a seção 10."),

  H2("5.5 Testes de funcionamento da Etapa 5A"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Alimentação", "Multímetro na trilha +, com tudo ligado", "4,9 a 5,2 V, estável"],
    ["2", "Todos respondem", "Página do celular, 1 minuto depois de ligar", "CO₂, dois MQ (em kΩ), temperatura e umidade com valores; nenhum aviso de \"sem resposta\""],
    ["3", "Duração da rodada", "Itens `Ciclo` e `Ciclo maximo`", "Dezenas de ms; máximo de até 500 ms. **Anote os dois valores**"],
    ["4", "Sem reinícios", "Monitor Serial por 15 minutos", "A linha `Rede Wi-Fi: ...` aparece uma vez só"],
    ["5", "Um por vez", "Sopro no MH-Z19C; álcool no MQ-135; sopro no DHT22", "Só a grandeza estimulada muda de forma clara (o álcool altera a leitura dos dois MQ)"],
    ["6", "Falha isolada do DHT22", "Tirar o fio amarelo por 30 s; depois, encostar e soltar o fio várias vezes", "Aviso \"DHT22 sem leitura\"; os outros sensores continuam normais; a linha `Rede Wi-Fi: ...` **não** reaparece"],
    ["7", "Falha isolada do MH-Z19C", "Tirar o fio verde (Tx) por 30 s", "Aviso \"CO2 sem resposta\"; o `Ciclo` sobe para cerca de 250 ms; os outros continuam"],
    ["8", "DHT22: rotina própria contra a biblioteca", "Gravar com `DHT22_PELA_BIBLIOTECA` em 0 e depois em 1, no mesmo lugar", "Mesma temperatura e mesma umidade, com diferença de até 0,2 °C e 1 ponto percentual"],
    ["9", "Calor", "Comparar o DHT22 com um termômetro a 1 m do nó, após 30 min", "Diferença de até 1 °C; se for maior, afaste o DHT22"],
  ], [0.05, 0.18, 0.37, 0.4]),

  // =====================================================================
  H1("6. Calibração na montagem final"),
  P("As calibrações das Partes 1 a 3 valem para a montagem em que foram feitas. No nó completo, a tensão de alimentação mudou (fonte no lugar da USB), e por isso o R0 dos MQ e o zero do MH-Z19C são **refeitos aqui**. As correções do DHT22 não dependem da alimentação e continuam valendo."),
  H2("6.1 R0 dos dois MQ"),
  OL([
    "Com o `m5a` gravado e os R0 em `0.0`, deixe o nó ligado em **ar limpo** (perto de uma janela aberta) por pelo menos 30 minutos. Se os sensores ficaram dias guardados, estabilize-os antes (24 a 48 horas ligados).",
    "Acompanhe as linhas `# media de 5 min` do Monitor Serial. Quando três médias seguidas diferirem menos de 5 %, anote a última de cada sensor.",
    "Escreva os valores em `R0_MQ2_KOHM` e `R0_MQ135_KOHM` no `sensores_ar.h`, com ponto decimal, e copie o arquivo para a pasta do `m5b`.",
    "Grave o `m5a` de novo: em ar limpo, depois do aquecimento, a página deve mostrar Rs/R0 entre 0,90 e 1,10 nos dois.",
    "Registre os dois R0 na pasta `calibracao/` do repositório telemetria-cria, com a tensão da trilha + e os RL (ficha da Parte 1, seção 4.4).",
  ]),
  P("Com a fonte, a tensão dos aquecedores é maior que na USB, e os R0 desta montagem ficam diferentes dos das Partes 1 e 2. Isso é esperado."),
  H2("6.2 Zero do MH-Z19C"),
  P("Os pinos do MH-Z19C são os mesmos da Parte 3. Por isso, o sketch `m3a_co2_celular` funciona **nesta montagem, sem mudar nenhum fio**, com os outros sensores ligados e a fonte definitiva:"),
  OL([
    "Grave o `m3a_co2_celular` no nó completo. A rede criada por ele chama-se `Ar-CO2`, e não `Ar-Monitor`.",
    "Leve o nó para o ar livre com a mesma alimentação. Há duas opções: a própria fonte, ligada por uma extensão elétrica, em área externa coberta; ou um carregador portátil (power bank) de 2 A ou mais, ligado às trilhas por um adaptador USB com bornes. Com o carregador, confira a polaridade antes de ligar e meça a trilha +: ela tem de ficar a até 0,1 V do valor medido com a fonte (seção 4.4); se não ficar, use a fonte com a extensão. Nunca ligue a fonte e o carregador ao mesmo tempo.",
    "Siga a Parte 3, seção 4.3: ABC desligada, 30 minutos ao ar livre, botão do zero em `http://192.168.4.1/zero`, conferência entre 380 e 440 ppm.",
    "Volte para a bancada e grave o `m5a` (ou o `m5b`).",
  ]),
  H2("6.3 DHT22"),
  P("Mantenha as correções da Parte 4 em `CORR_TEMP_C`, `UR_A` e `UR_B`. O que precisa ser conferido aqui é a **posição**: compare o DHT22 com um termômetro colocado a 1 metro do nó, depois de 30 minutos de funcionamento. Uma diferença maior que 1 °C indica que o sensor está recebendo calor dos MQ ou do ESP32. A solução é afastá-lo, e não corrigir no sketch."),

  // =====================================================================
  ...QUEBRA(),
  H1("7. Etapa 5B — o nó completo na Rede de Telemetria"),
  P("A montagem não muda. O sketch `m5b_monitor_telemetria` entra na rede Wi-Fi da telemetria e, a cada 10 segundos, faz uma rodada de leituras e publica uma mensagem por grandeza."),
  ...FIGURA(path.join(FIGS, "rede-5b.png"), "Etapa 5B: o nó completo publica co2, mq2, mq135, temperatura e umidade no servidor; o painel é aberto em http://IP_DO_SERVIDOR:3000.", 1.33),

  H2("7.1 O que o nó publica"),
  TAB(["Tópico (depois de `cria/teste/no9/`)", "Sensor", "Unidade", "Quando publica"], [
    ["`temperatura`", "DHT22", "`C`", "A cada 10 s, desde a partida"],
    ["`umidade`", "DHT22", "`%`", "A cada 10 s, desde a partida"],
    ["`co2`", "MH-Z19C", "`ppm`", "Depois de 3 min; sem falha e abaixo de 5000 ppm"],
    ["`mq2`", "MQ-2", "`Rs/R0`", "Depois de 10 min e com o R0 medido"],
    ["`mq135`", "MQ-135", "`Rs/R0`", "Depois de 10 min e com o R0 medido"],
    ["`ciclo`", "(diagnóstico)", "`ms`", "Uma vez por minuto: a maior duração de uma rodada naquele minuto"],
    ["`volta`", "(diagnóstico)", "`ms`", "Uma vez por minuto: o maior intervalo entre duas voltas do programa"],
    ["`falhas-co2`, `falhas-dht`", "(diagnóstico)", "`vezes`", "Uma vez por minuto: rodadas sem leitura de cada sensor, desde a partida"],
  ], [0.3, 0.15, 0.11, 0.44]),
  ESPACO(),
  P("Leitura com falha não é publicada e não recebe número de sequência, como determina o catálogo de tópicos. As quatro grandezas de diagnóstico existem para o teste de viabilidade e não fazem parte do catálogo do projeto `ar`: o sketch só as publica quando `PROJETO` é `\"teste\"`. Como elas vão para o painel e para o CSV, o teste não depende de deixar o Monitor Serial aberto."),

  H2("7.2 Ajustar e gravar o sketch m5b_monitor_telemetria"),
  OL([
    "Copie o `sensores_ar.h` já calibrado da pasta do `m5a` para a do `m5b`.",
    "Copie o `credenciais.h` da Parte 1 para a pasta do `m5b` (Parte 1, seção 6.6).",
    "No topo do sketch, confira `PROJETO = \"teste\"` e escolha um `NO` livre (o exemplo usa `\"no9\"`). **Desligue os nós das Partes 1 a 4** que estiverem usando os mesmos sensores.",
    "Grave e abra o Monitor Serial em 115200 baud.",
  ]),
  CODIGO([
    "cd aula-ar/codigo/m5b_monitor_telemetria",
    "cp ../m5a_monitor_celular/sensores_ar.h .",
    "cp ../m1b_mq135_telemetria/credenciais.h .",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 \\",
    "    --library /dados/Projetos/telemetria-cria/firmware/biblioteca-cria .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (ajuste o caminho da biblioteca e a porta à sua máquina)" }),

  H2("7.3 O que aparece no Monitor Serial"),
  CODIGO([
    "[cria] nó cria/teste/no9, biblioteca CriaTelemetria 0.2.0",
    "[cria] boot 12",
    "[cria] aguardando o Wi-Fi \"telemetria-cria\"...",
    "[ar] no cria/teste/no9 | MQ-2 1 | MQ-135 1 | MH-Z19C 1 | DHT22 1",
    "[ar] partida: ligou na energia (ou botao EN / Monitor Serial)",
    "[cria] Wi-Fi conectado, IP 192.168.0.27",
    "[cria] conectado ao broker; status online em cria/teste/no9/status",
    "[cria] relógio acertado: 2026-12-01 13:00:15 UTC",
    "[cria] cria/teste/no9/temperatura {\"valor\":28.4,\"unidade\":\"C\",\"seq\":1,...}",
    "[cria] cria/teste/no9/umidade {\"valor\":62,\"unidade\":\"%\",\"seq\":2,...}",
    "[ar] MH-Z19C aquecendo: 500 ppm (ainda nao vale)",
    "[ar] MQ aquecendo: faltam 588 s",
    "...                                        (depois de 10 minutos)",
    "[cria] cria/teste/no9/temperatura {...}",
    "[cria] cria/teste/no9/umidade {...}",
    "[cria] cria/teste/no9/co2 {\"valor\":612,\"unidade\":\"ppm\",...}",
    "[cria] cria/teste/no9/mq2 {...}",
    "[cria] cria/teste/no9/mq135 {...}",
    "[diag] ciclo medio 71 ms, maximo 96 ms | maior volta do loop 97 ms",
    "       | memoria minima 214320 B | Wi-Fi -58 dBm | fila 0 | boot 12",
    "[diag] em 66 rodadas: MH-Z19C sem resposta 0, saturado 0",
    "       | DHT22 sem leitura 0 | MQ fora da faixa 0",
    "[cria] cria/teste/no9/ciclo {\"valor\":96,\"unidade\":\"ms\",...}",
    "[cria] cria/teste/no9/volta {...}",
    "[cria] cria/teste/no9/falhas-co2 {...}",
    "[cria] cria/teste/no9/falhas-dht {...}",
  ].join("\n"), { arquivo: false, titulo: "Exemplo de partida normal (mensagens abreviadas com \"...\"; números ilustrativos)" }),
  ESPACO(),
  P("As linhas `[diag]` saem uma vez por minuto (no exemplo, cada uma foi dividida em duas para caber na página). Elas trazem a duração média e máxima da rodada, o maior intervalo entre voltas do programa, a menor memória RAM livre desde a partida, o sinal do Wi-Fi em dBm (número negativo; quanto mais perto de zero, mais forte), o tamanho da fila, o número do `boot` e as contagens de falha de cada sensor. O `boot` conta as partidas do ESP32 e fica guardado na placa: o que importa no teste é ele **não aumentar**."),

  H2("7.4 Ver os dados no painel"),
  OL([
    "Em qualquer computador ou celular ligado à rede Wi-Fi da telemetria, abra `http://192.168.0.10:3000` (troque pelo IP do seu servidor).",
    "O cartão `teste/no9` aparece on-line. Nos 3 primeiros minutos, aparecem só a temperatura e a umidade; a partir de 3 minutos, também o CO₂; a partir de 10 minutos, os dois MQ, desde que os R0 já estejam escritos no `sensores_ar.h`. As grandezas de diagnóstico entram uma vez por minuto.",
    "O cartão mostra também o `boot` do nó e a **perda estimada**: a porcentagem de mensagens que não chegaram, calculada pelo servidor pelas lacunas na numeração `seq`.",
  ]),
  P("Para acompanhar o diagnóstico e baixar os dados (digite cada endereço numa linha só, sem espaços):"),
  CODIGO([
    "http://192.168.0.10:3000/api/historico?projeto=teste&no=no9&grandeza=ciclo&minutos=1440",
    "http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste&no=no9",
  ].join("\n"), { arquivo: false, titulo: "Histórico de 24 h da grandeza ciclo (JSON) e planilha CSV das últimas 24 h", tamanho: 14 }),

  H2("7.5 O teste de viabilidade de 24 horas"),
  P("Este teste confirma, na sua bancada, a conclusão da seção 2. Use o projeto `teste`. Ele não substitui o teste de aceitação do projeto, que tem critérios próprios, definidos no plano de trabalho, e é feito com o nó já no projeto `ar` (descrito em `telemetria-cria/validacao/README.md`)."),
  OL([
    "Monte e calibre o nó (seções 4 a 6), grave o `m5b` e confira no painel que as cinco grandezas chegam.",
    "Anote no caderno: data e hora de início, tensão na trilha +, `boot` do cartão e temperatura de um termômetro de referência a 1 m do nó.",
    "**Não abra o Monitor Serial durante o teste.** Na DevKit V1, abrir o monitor costuma reiniciar o ESP32: o `boot` aumenta e as contagens voltam a zero. Se quiser acompanhar as linhas `[diag]`, deixe o monitor aberto desde antes do início.",
    "Depois de 1 hora, **desligue o servidor por 15 minutos** (pare o `npm start` e o Mosquitto) e religue. Anote o horário. Ao voltar, as leituras desse intervalo chegam de uma vez, e os gráficos ficam sem lacuna.",
    "Deixe o nó publicando até completar **24 horas**, sem mexer. Servidor e ponto de acesso ligados no nobreak.",
    "Ao fim, anote a \"perda estimada\" e o `boot` do cartão, os últimos valores de `falhas-co2` e `falhas-dht`, e os maiores valores de `ciclo` e de `volta` fora dos 15 minutos da queda (durante a queda, as gravações na fila deixam a rodada mais lenta, e isso não conta).",
    "Meça de novo a tensão na trilha + e compare o DHT22 com o termômetro.",
    "Preencha a ficha. Se todos os critérios passarem, o nó único está aprovado. Se algum falhar, veja a tabela seguinte.",
  ]),
  TAB(["#", "Critério", "Limite", "Valor medido", "Aprovado?"], [
    ["1", "Maior `ciclo`, com a rede no ar", "até 500 ms", "", ""],
    ["2", "Maior `volta`, com a rede no ar", "até 1000 ms", "", ""],
    ["3", "`boot` no início e no fim", "igual", "", ""],
    ["4", "Perda estimada (cartão do painel)", "< 1 %", "", ""],
    ["5", "`falhas-co2` e `falhas-dht` ao fim", "até 86 cada", "", ""],
    ["6", "Depois da queda de 15 min", "gráficos sem lacuna; perda < 1 %", "", ""],
    ["7", "Tensão na trilha +, início e fim", "4,9 a 5,2 V", "", ""],
    ["8", "DHT22 menos termômetro a 1 m", "até 1 °C", "", ""],
  ], [0.05, 0.36, 0.25, 0.18, 0.16]),
  ESPACO(),
  TAB(["Se reprovar em…", "Causa mais provável", "O que fazer"], [
    ["`boot` aumentou e a partida seguinte mostra `SUBTENSAO`, ou a tensão caiu abaixo de 4,9 V", "Alimentação: fonte fraca, fios finos, mau contato nas trilhas", "Fonte de 2 A, fios curtos, capacitor de 470 µF, trilhas unidas. Repita o teste. Dividir em duas placas não resolve"],
    ["`boot` aumentou e a partida mostra `TRAVOU` ou `ERRO`", "Programa travado (por exemplo, `DHT22_PELA_BIBLIOTECA` em 1 com mau contato no DHT22)", "Volte a chave para 0, firme os fios do DHT22 e anote a mensagem. Se continuar, plano B"],
    ["DHT22 mais de 1 °C acima do termômetro", "Calor dos MQ ou do ESP32", "Afaste o DHT22 e repita. Se o abrigo não permitir a distância, plano B"],
    ["`ciclo` acima de 500 ms em alguma rodada, com a rede no ar", "Um sensor demorando a responder ou falhando", "Veja `falhas-co2` e `falhas-dht`; confira a fiação daquele sensor"],
    ["`volta` acima de 1000 ms com a rede no ar", "O nó perdeu o broker e tentou reconectar", "Veja o sinal do Wi-Fi (abaixo de −70 dBm é fraco); aproxime o nó do ponto de acesso"],
    ["Perda acima de 1 % com `boot` estável", "Rede: Wi-Fi fraco, ou queda do servidor mais longa que a autonomia da fila", "Sinal do Wi-Fi; nobreak no servidor e no ponto de acesso"],
    ["Tudo acima conferido e o problema continua", "—", "Plano B (seção 8), registrado em `decisoes/`"],
  ], [0.32, 0.3, 0.38]),

  H2("7.6 Do projeto teste ao nó definitivo"),
  OL([
    "No `m5b`, troque `PROJETO` para `\"ar\"` e `NO` para `\"no1\"`. No `credenciais.h`, use o usuário MQTT `ar`, com a senha desse projeto.",
    "Grave. Os tópicos passam a ser `cria/ar/no1/co2`, `mq2`, `mq135`, `temperatura` e `umidade`, os registrados na seção 4.1 do catálogo de tópicos. As grandezas de diagnóstico deixam de ser publicadas.",
    "Só **um** ESP32 pode ser o `ar/no1`. Desligue os nós de bancada das Partes 1 a 4.",
    "Registre em `calibracao/` os R0, o zero do CO₂, a decisão sobre a ABC e as correções do DHT22; e, no caderno do projeto, o resultado do teste de 24 horas.",
  ]),
  ESPACO(),
  NOTA("Diferenças em relação ao firmware no-ar da telemetria-cria", [
    "O `m5b` faz o mesmo que o `firmware/no-ar`, com os mesmos pinos e tópicos, e acrescenta o que as revisões das Partes 1 a 5 recomendaram: não publica 5000 ppm (fundo de escala), lê o DHT22 com limite de tempo, descarta leituras impossíveis, aplica as correções de calibração e mede a duração da rodada.",
    "Antes de substituir o firmware oficial do repositório, leve essas diferenças à equipe por pull request (proposta de alteração enviada ao repositório, que a equipe revisa antes de aceitar), como pede o catálogo. O mesmo pull request pode corrigir o nome do sensor de CO₂ no catálogo, que ainda cita o MH-Z19B.",
  ], AZUL),

  // =====================================================================
  ...QUEBRA(),
  H1("8. Plano B: dois ESP32"),
  P("Use este plano só se o teste de 24 horas reprovar por um motivo que a fonte, a fiação e a posição dos sensores não resolvam. A divisão separa os sensores que geram calor (os dois MQ) dos que são sensíveis a ele (o MH-Z19C e o DHT22)."),
  TAB(["", "Placa A", "Placa B"], [
    ["Sensores", "MQ-2 (GPIO 34) e MQ-135 (GPIO 35)", "MH-Z19C (GPIO 16 e 17) e DHT22 (GPIO 4)"],
    ["`sensores_ar.h`", "`USAR_MQ2 1`, `USAR_MQ135 1`, `USAR_CO2 0`, `USAR_DHT22 0`", "`USAR_MQ2 0`, `USAR_MQ135 0`, `USAR_CO2 1`, `USAR_DHT22 1`"],
    ["Grandezas", "`mq2`, `mq135`", "`co2`, `temperatura`, `umidade`"],
    ["Corrente", "0,4 a 0,55 A: **precisa da fonte**", "0,15 a 0,37 A: fonte ou USB"],
    ["Nó na bancada (projeto `teste`)", "por exemplo, `no9`", "por exemplo, `no10`"],
    ["Nó definitivo (projeto `ar`)", "`no1`", "`no2`, **depois de registrado no catálogo**"],
    ["Autonomia da fila", "8 h 20 min", "5 h 30 min"],
  ], [0.22, 0.39, 0.39]),
  ESPACO(),
  OL([
    "Monte cada placa com os mesmos pinos e as mesmas ligações deste guia; só muda o que fica em cada protoboard. Se as duas compartilharem a fonte de 5 V, o GND é comum.",
    "Em cada pasta de sketch, ajuste as quatro linhas `USAR_...` do `sensores_ar.h`. O mesmo `m5a` e o mesmo `m5b` servem para as duas placas: os sensores desligados não são lidos nem publicados.",
    "Dê um `NO` diferente a cada placa. Dois nós com o mesmo nome desconectam um ao outro no broker.",
    "Refaça em cada placa a calibração da seção 6 e o teste de 24 horas da seção 7.5.",
    "Para usar no projeto `ar`: proponha por pull request o registro do segundo nó no catálogo de tópicos (seção 4.1 do catálogo) e escreva a decisão em `decisoes/`, com a data, o motivo (o critério reprovado e o valor medido) e o que se perde: o projeto aprovado descreve o monitor como um único nó.",
  ]),
  P("As duas configurações foram compiladas com os sketches deste guia. Com o nó dividido em duas placas, as séries de sensores diferentes passam a ter horários de leitura com alguns segundos de diferença, o que não atrapalha a leitura de tendências. Para o calor deixar de ser problema, as placas precisam ficar em compartimentos separados."),

  // =====================================================================
  H1("9. Abrigo e instalação"),
  P("O orçamento prevê filamento para o abrigo impresso em 3D, mas a pasta `telemetria-cria/modelos-3d/` ainda não tem o modelo. Estes são os requisitos que o desenho precisa atender:"),
  UL([
    "**Ventilação natural:** aberturas embaixo e em cima, para o ar entrar frio e sair quente. A caixa não pode ser fechada.",
    "**Dois compartimentos:** um para os MQ e o ESP32 (parte quente), outro para o DHT22 e o MH-Z19C, com entrada de ar própria. O compartimento do DHT22 fica **embaixo ou ao lado** do quente, nunca acima.",
    "**MQ sem contato com o plástico:** o PLA amolece perto de 55 a 60 °C, e a cápsula metálica do MQ esquenta. Deixe 10 mm ou mais de folga em volta de cada cápsula, com a tela voltada para fora, ou imprima esse compartimento em PETG ou ABS.",
    "**MH-Z19C com as janelas de difusão desobstruídas** e protegido de sol direto.",
    "**Acesso ao conector USB** do ESP32 e ao plugue da fonte, e um ponto para prender o cabo da fonte.",
    "**Abrigo arejado antes da calibração:** peça recém-impressa solta vapores que o MQ-135 detecta. Deixe o abrigo ao ar por 1 a 2 dias antes de medir os R0.",
    "**Impressão sempre supervisionada**, como nas oficinas de impressão 3D do projeto.",
  ]),
  P("Para a instalação na sala:"),
  UL([
    "Altura de **1,2 a 1,5 m**, na zona onde as pessoas respiram, mas a pelo menos 1 m de qualquer pessoa sentada (o ar expirado tem cerca de 40 000 ppm de CO₂).",
    "Longe de janelas, portas, ventiladores apontados para o nó, saídas de ar-condicionado e sol direto.",
    "Longe de produtos de limpeza, álcool e cozinha, que alteram os MQ e podem deslocar a leitura de umidade.",
    "Perto de uma tomada, com o cabo da fonte preso, e dentro do alcance do ponto de acesso da telemetria (sinal mais forte que −70 dBm na linha `[diag]`).",
  ]),

  // =====================================================================
  H1("10. Problemas comuns"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["ESP32 reinicia (o `boot` aumenta) e a partida mostra `SUBTENSAO`; CO₂ volta a 500 ppm", "Alimentação pela USB ou fonte fraca", "Fonte de 5 V e 2 A nas trilhas; capacitor de 470 µF; meça a trilha +"],
    ["ESP32 reinicia e a partida mostra `TRAVOU` ou `ERRO`", "Programa travado; com `DHT22_PELA_BIBLIOTECA` em 1, mau contato no DHT22", "Use a chave em 0; firme os três fios do DHT22; anote a mensagem do Monitor Serial"],
    ["Metade dos sensores sem energia", "Trilhas da protoboard interrompidas no meio", "Una as metades com jumpers (seção 3)"],
    ["Porta USB do computador desliga", "USB ligado sem a fonte, com o VIN na trilha +", "Ligue a fonte primeiro (seção 4.3)"],
    ["MQ \"fora da faixa\" em ar limpo", "RL de 1 kΩ no módulo: tensão baixa demais no pino", "Troque o RL por 10 kΩ (Parte 1, seção 5.4) e escreva `10.0` no `sensores_ar.h`"],
    ["Rs/R0 dos MQ longe de 1 em ar limpo", "R0 das Partes 1 e 2, medido com outra alimentação", "Refaça o R0 nesta montagem (seção 6.1)"],
    ["Leitura dos MQ oscila quando o Wi-Fi transmite", "Diferença de tensão no GND entre o ESP32 e os divisores", "Seção 4.4, passo 6: GND curto e trilha − reforçada"],
    ["Temperatura alta e umidade baixa", "DHT22 perto dos MQ ou do ESP32", "Afaste o DHT22 (20 cm ou mais)"],
    ["DHT22 com 5 V entre vermelho e preto", "Fio vermelho na trilha +", "Desligue e leve o fio ao pino 3V3"],
    ["`ciclo` perto de 250 ms em todas as rodadas", "MH-Z19C sem responder (espera de 200 ms)", "Confira Tx, Rx e a alimentação do sensor"],
    ["Só `temperatura` e `umidade` no painel", "Aquecimento (3 e 10 min) ou R0 em `0.0`", "Espere; escreva os R0 e copie o `sensores_ar.h` para a pasta do `m5b`"],
    ["Valores diferentes entre o `m5a` e o `m5b`", "`sensores_ar.h` diferente nas duas pastas", "Copie o arquivo calibrado de uma pasta para a outra"],
    ["`AVISO: a conexão cai logo depois de abrir`", "Outro ESP32 com o mesmo `NO` (um nó de bancada ligado)", "Desligue os nós antigos ou troque o `NO`"],
    ["`fila` crescendo na linha `[diag]`", "Servidor ou ponto de acesso fora do ar", "Restabeleça a rede: a fila cobre cerca de 3 h 20 min"],
  ], [0.32, 0.32, 0.36]),

  // =====================================================================
  ...QUEBRA(),
  H1("11. Códigos"),
  H2("11.1 sensores_ar.h (o mesmo nas duas pastas)"),
  CODIGO(ARQ("m5a_monitor_celular", "sensores_ar.h"), { titulo: "sensores_ar.h", tamanho: 14 }),
  H2("11.2 Etapa 5A — m5a_monitor_celular.ino", { quebra: true }),
  P("Arquivo `aula-ar/codigo/m5a_monitor_celular/m5a_monitor_celular.ino`. Os arquivos auxiliares `sensores_ar.h`, `monitor_wifi.h` e `pagina_web.h` ficam na mesma pasta."),
  CODIGO(ARQ("m5a_monitor_celular", "m5a_monitor_celular.ino"), { titulo: "m5a_monitor_celular.ino", tamanho: 14 }),
  H2("11.3 Etapa 5B — m5b_monitor_telemetria.ino", { quebra: true }),
  P("Arquivo `aula-ar/codigo/m5b_monitor_telemetria/m5b_monitor_telemetria.ino`. Precisa do `sensores_ar.h` e do `credenciais.h` na mesma pasta."),
  CODIGO(ARQ("m5b_monitor_telemetria", "m5b_monitor_telemetria.ino"), { titulo: "m5b_monitor_telemetria.ino", tamanho: 14 }),
];

module.exports = DOC({ titulo: "Guia de montagem do monitor de qualidade do ar — Parte 5: o nó completo", rodape: "Guia de montagem do monitor de qualidade do ar — Parte 5: o nó completo — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
