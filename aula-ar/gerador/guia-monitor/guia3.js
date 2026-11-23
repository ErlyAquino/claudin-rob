// Guia de montagem do monitor de qualidade do ar (Rede de Telemetria do Espaco CRIA) - Parte 3: o sensor de CO2 MH-Z19C.
// Gera ../../saida/Guia-Montagem-Monitor-Ar-Parte3-MHZ19C.docx (gerar.sh converte para PDF).
// Esquema: ../../esquemas/saida-monitor/m3_mhz19c_esp32.png (python esquemas.py --monitor).
// Diagramas de rede: figuras/rede-3a.png e rede-3b.png (gerar.sh). Rede e servidor: Parte 1 (guia.js).
// Dados do ensaio real do sensor da bancada: aula-ar/saida/Relatorio-Calibracao-MH-Z19C (09/11/2026).
const path = require("path");
const { H1, H2, H3, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas", "saida-monitor");
const FIGS = path.join(AQUI, "figuras");
const COD = (n) => path.join(AQUI, "..", "..", "codigo", n, `${n}.ino`);
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-Montagem-Monitor-Ar-Parte3-MHZ19C.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia de montagem — Parte 3",
    titulo: "Monitor de Qualidade do Ar",
    subtitulo: "O sensor de CO₂ MH-Z19C (infravermelho não dispersivo): funcionamento, valores esperados, calibração do zero ao ar livre, teste com o celular ligado só ao Wi-Fi do ESP32 e integração à Rede de Telemetria do Espaço CRIA",
    info: [
      "**Placa:** ESP32 DevKit V1 (30 pinos)  •  **Sketches:** `aula-ar/codigo/m3a_co2_celular` e `m3b_co2_telemetria`",
      "**Pré-requisito:** Parte 1 (MQ-135), em especial a seção 6 (parâmetros da rede, IP fixo e conferência do servidor)",
      "Projeto Rede de Telemetria do Espaço CRIA — Edital nº 19/2026-FACEPE — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // =====================================================================
  H1("1. Onde estamos"),
  P("Nas Partes 1 e 2, os dois sensores de óxido metálico (MQ-135 e MQ-2) foram montados, calibrados e integrados à Rede de Telemetria. Esta Parte 3 trata do **MH-Z19C**, o sensor de dióxido de carbono (CO₂) do monitor. Ele é de outra natureza: mede **um único gás**, por um princípio óptico, e entrega a concentração **em ppm** (partes por milhão), com significado físico real. Também se comunica com o ESP32 de forma diferente: em vez de uma tensão analógica, envia o **valor já calculado pela porta serial**."),
  TAB(["", "Partes 1 e 2 (MQ)", "Parte 3 (este guia)"], [
    ["Sensor", "MQ-135 e MQ-2 (óxido metálico)", "**MH-Z19C** (infravermelho não dispersivo)"],
    ["O que entrega", "Razão Rs/R0 (relativa)", "**CO₂ em ppm** (absoluta)"],
    ["Ligação ao ESP32", "Tensão analógica, divisor, GPIO 35 / 34", "**Serial (UART)**, GPIO 16 e 17, sem divisor"],
    ["Calibração", "R0 em ar limpo", "**Zero em 400 ppm** ao ar livre"],
    ["Aquecimento", "10 min", "1 min (o sketch espera 3 min)"],
    ["Etapa A (celular)", "`m1a`, `m2a`", "`m3a_co2_celular`, rede `Ar-CO2`"],
    ["Etapa B (telemetria)", "grandezas `mq135`, `mq2`", "`m3b_co2_telemetria`, grandeza `co2`"],
    ["Nó de bancada (exemplo)", "`cria/teste/no5`, `cria/teste/no6`", "`cria/teste/no7`"],
    ["Tópico definitivo", "`cria/ar/no1/mq135`, `cria/ar/no1/mq2`", "`cria/ar/no1/co2`"],
  ], [0.24, 0.36, 0.4]),
  ESPACO(),
  P("Os pinos seguem o firmware do nó de ar da telemetria (`telemetria-cria/firmware/no-ar`): o **Tx do sensor vai ao GPIO 16 (RX2)** e o **Rx do sensor ao GPIO 17 (TX2)**. O catálogo e o firmware da telemetria citam o MH-Z19B; o sensor do kit é o MH-Z19C, que usa a mesma pinagem e o mesmo protocolo de leitura."),
  NOTA("O que vale da Parte 1 e não é repetido aqui", [
    "As regras elétricas do monitor (seção 1.5): ESP32 em 3,3 V, sensores de 5 V pelo VIN, GPIO 21 e 22 livres, montagem com o USB desligado.",
    "Toda a parte de rede e servidor (seções 6.1 a 6.6): parâmetros, IP fixo do servidor, conferência do servidor, teste da rede, Arduino IDE e `credenciais.h`.",
  ], AZUL),

  // =====================================================================
  ...QUEBRA(),
  H1("2. O sensor MH-Z19C"),
  H2("2.1 Para que serve"),
  P("O MH-Z19C mede a concentração de **CO₂** no ar, de 400 a 5000 ppm. Nas concentrações encontradas em salas de aula, o CO₂ **não é tóxico**. Ele importa por outro motivo: é o melhor **indicador de ventilação**. Cada pessoa exala CO₂ continuamente; se ele se acumula na sala, o ar que os outros exalaram também se acumula, com umidade, odores e aerossóis. Salas com mais de 1000 ppm costumam estar mal ventiladas, e estudos associam esses níveis a sonolência e queda de concentração."),
  P("No Brasil, a Resolução ANVISA RE nº 9/2003 adota **1000 ppm** como valor máximo recomendado de CO₂ para ambientes climatizados de uso coletivo. É esse o limite de alerta usado pelos sketches deste guia."),
  H2("2.2 Princípio de funcionamento (NDIR)"),
  P("NDIR significa **infravermelho não dispersivo**. Dentro do sensor há uma pequena câmara por onde o ar entra por difusão. Numa ponta, uma lâmpada emite infravermelho; na outra, um detector com um **filtro óptico de 4,26 µm** só deixa passar o comprimento de onda que a molécula de CO₂ absorve. Quanto mais CO₂ há na câmara, menos luz chega ao detector. A relação é a lei de Beer-Lambert:"),
  CODIGO([
    "I = I0 × e^(−k·C·L)      →      C = −ln(I / I0) / (k·L)",
    "",
    "I   luz que chega ao detector          C   concentração de CO2",
    "I0  luz que chegaria sem CO2           k   coeficiente de absorção do CO2 em 4,26 µm",
    "L   comprimento da câmara",
  ].join("\n"), { arquivo: false, titulo: "Lei de Beer-Lambert" }),
  ESPACO(),
  P("O ponto crítico é o **I0**: o sensor não consegue medi-lo diretamente. Ele o estima na **calibração do zero**, admitindo que o ar daquele momento tem 400 ppm. Daí duas consequências práticas:"),
  UL([
    "**Um zero errado desloca todas as leituras.** Por isso a calibração é feita ao ar livre (seção 4).",
    "**Tudo o que reduz a luz parece excesso de CO₂:** lâmpada fraca por tensão baixa, óptica suja ou defeito. É por isso que o sensor ligado em 3,3 V marca 5000 ppm (seção 2.6).",
  ]),
  NOTA("Seletivo × não seletivo", "Os MQ respondem a muitos gases ao mesmo tempo e dão só uma tendência. O NDIR responde **só ao CO₂** e dá a concentração em ppm. Álcool, gás de cozinha ou fumaça quase não alteram a leitura do MH-Z19C.", AZUL),
  ESPACO(),

  H2("2.3 Especificações"),
  P("Segundo o manual da Winsen (versões 1.0 e 1.2):"),
  TAB(["Item", "Valor", "Observação"], [
    ["Alimentação", "5,0 ± 0,1 V DC", "A versão 1.2 cita 4,5 a 5,5 V nas notas. Fora da faixa, o manual avisa que a leitura sai errada (\"baixa\") ou o sensor não funciona; na bancada, com 3,3 V, ela travou no alto (seção 2.6)"],
    ["Corrente", "média < 40 mA; pico de 125 mA", "Os picos vêm da lâmpada IR"],
    ["Faixas", "400 a 2000 ou 400 a 5000 ppm (10 000 opcional)", "A unidade da bancada veio com 5000 ppm"],
    ["Exatidão", "±(50 ppm + 5 % da leitura)", "A 1000 ppm: ±100 ppm"],
    ["Pré-aquecimento", "1 min", "O sketch espera 3 min (seção 3)"],
    ["Tempo de resposta (T90: tempo para chegar a 90 % da variação final)", "< 120 s", "Espere 2 min a cada mudança de ambiente"],
    ["Ambiente de trabalho", "−10 a 50 °C; 0 a 95 % de umidade relativa, sem condensação", ""],
    ["Interface", "UART 9600 bps, 8N1, nível de 3,3 V (aceita 5 V); também PWM", "A UART liga direto no ESP32"],
    ["Vida útil", "> 10 anos", "O manual recomenda recalibrar em no máximo 6 meses"],
  ], [0.24, 0.38, 0.38]),

  H2("2.4 Pinagem"),
  P("O MH-Z19C tem uma barra de **9 pinos** (com o sensor de frente: HD, SR, Tx, Rx, Vo, PWM, AOT, GND, Vin) e um conector para um cabo de 7 vias. Só quatro pinos são usados:"),
  TAB(["Pino", "Função", "Neste guia", "Fio do cabo de 7 vias (se usar o cabo)"], [
    ["**Vin**", "Alimentação 5 V", "VIN do ESP32 (trilha +). **Nunca no 3V3**", "vermelho"],
    ["**GND**", "Terra", "GND do ESP32", "preto"],
    ["**Tx**", "Saída serial do sensor (3,3 V)", "**GPIO 16 (RX2)**", "verde"],
    ["**Rx**", "Entrada serial do sensor (3,3 V)", "**GPIO 17 (TX2)**", "azul"],
    ["HD", "Zero manual: 0 V por 7 s grava 400 ppm", "**sem ligação** (isolar)", "marrom"],
    ["PWM", "Saída em largura de pulso", "sem ligação", "amarelo"],
    ["SR, Vo, AOT", "Não documentados no manual do MH-Z19C", "sem ligação", "branco (pino 2, reservado)"],
  ], [0.13, 0.31, 0.3, 0.26]),
  ESPACO(),
  P("As cores do cabo vêm do documento `aula-ar/saida/MH-Z19C_Pinagem_Fios.pdf`. Os quatro fios centrais (vermelho, preto, verde e azul) seguem esse padrão; as cores das pontas mudam com o fabricante do cabo. **Confira cada fio com o multímetro**, na escala de continuidade, da ponta do fio até o pino do sensor, e isole com fita os fios que não forem usados — principalmente o **HD**: encostado no GND por 7 segundos, ele refaz o zero acidentalmente."),

  H2("2.5 A comunicação serial (UART)"),
  P("A serial do sensor (UART, comunicação serial assíncrona) trabalha a **9600 bps, 8 bits, sem paridade, 1 bit de parada (8N1)**, em nível de 3,3 V: os fios vão **direto** aos pinos do ESP32, sem divisor. A serial é **cruzada**: o Tx de um vai no Rx do outro. Toda mensagem tem 9 bytes. Para ler o CO₂, o ESP32 envia o comando **0x86** e o sensor responde:"),
  CODIGO([
    "pedido:   FF 01 86 00 00 00 00 00 79",
    "resposta: FF 86 02 64 42 00 00 00 D2",
    "",
    "CO2 = byte2 × 256 + byte3 = 0x02 × 256 + 0x64 = 612 ppm",
    "temperatura interna = byte4 − 40 = 0x42 − 40 = 26 °C   (não está no manual)",
    "checksum = 0xFF − (soma dos bytes 1 a 7) + 1   (descarta a resposta se não conferir)",
  ].join("\n"), { arquivo: false, titulo: "Leitura do CO₂ (comando 0x86)" }),
  ESPACO(),
  TAB(["Comando", "Efeito", "Consta do manual do MH-Z19C?", "No sketch m3a"], [
    ["0x86", "Lê o CO₂ (bytes 2 e 3) e a temperatura interna (byte 4)", "sim para o CO₂; a temperatura vem da comunidade", "a cada 5 s"],
    ["0x79", "Liga (byte3 = 0xA0) ou desliga (0x00) a autocalibração (ABC)", "sim", "`a` / `d`, ou `/abc`"],
    ["0x87", "Zero: a leitura atual passa a valer 400 ppm", "não está na lista (é do MH-Z19B); as notas do manual citam um zero \"por comando\"", "`z`, ou o botão de `/zero`"],
    ["0xA0, 0x9B, 0x7D", "Versão do firmware, faixa, estado da ABC", "não; esta unidade responde", "`i`, ou `/info`"],
  ], [0.17, 0.39, 0.22, 0.22]),
  ESPACO(),
  P("O pino **HD** é a forma documentada de fazer o zero no MH-Z19C (0 V por 7 s ou mais). O comando **0x87** (do MH-Z19B) é o que as bibliotecas usam para o C, mas **ainda não foi conferido nesta unidade**: depois de enviá-lo, confirme que a leitura foi para perto de 400 ppm; se não mudar, use o HD. Os comandos de versão, faixa e estado da ABC (0xA0, 0x9B e 0x7D) também não estão no manual do MH-Z19C; o sketch só os envia quando se pede `/info` ou a tecla `i`. Os demais comandos do MH-Z19B (calibração de span, troca de faixa e leituras não documentadas) não são usados neste guia: no ensaio da bancada, comandos fora do manual coincidiram com reinícios do sensor."),

  H2("2.6 Alimentação: a lição do ensaio da bancada"),
  NOTA("Caso real: o sensor ligado no 3V3", [
    "No ensaio de 09/11/2026 (relatório `aula-ar/saida/Relatorio-Calibracao-MH-Z19C.pdf`), o Vin do sensor estava no **3V3** do ESP32. O sensor respondia normalmente pela serial — comunicação perfeita, checksum certo —, mas marcava **500 ppm** por cerca de 1 minuto depois de ligar e, em seguida, **5000 ppm fixo**, com reinícios frequentes.",
    "Com 3,3 V, a lâmpada IR fica fraca, pouca luz chega ao detector e o sensor calcula CO₂ acima do fundo de escala. Os picos de corrente da lâmpada derrubam a tensão e o sensor reinicia, voltando ao valor de partida (500 ppm).",
    "**Regra:** Vin sempre no **VIN** (5 V da USB) ou numa fonte de 5 V com GND comum. Meça a tensão **no próprio sensor**, com ele ligado.",
  ], VERMELHO),
  ESPACO(),
  P("Pela USB, o VIN do DevKit costuma dar **4,6 a 4,8 V** (há um diodo entre a USB e o VIN). Isso fica dentro da tolerância de 4,5 a 5,5 V da versão 1.2 do manual e funcionou na bancada. No monitor definitivo, que alimenta também os dois MQ e o Wi-Fi, a alimentação será uma **fonte de 5 V e 2 A** (Parte 5)."),

  // =====================================================================
  H1("3. Parâmetros esperados em condições normais"),
  P("Valores de referência para conferir se o sensor está medindo. O ar externo vem da série de Mauna Loa (NOAA); os demais são faixas típicas, para comparação."),
  TAB(["Situação", "CO₂ esperado", "Observação"], [
    ["Logo depois de ligar (partida)", "500 ppm fixo, por cerca de 1 min", "Valor de partida do sensor: não é medida. O sketch espera 3 min"],
    ["Ar externo (2026)", "≈ 430 ppm", "Perto de ruas e cidades, 450 a 500. Depois do zero, o sensor marca cerca de 30 ppm a menos (seção 4.4)"],
    ["Sala vazia e ventilada", "450 a 600 ppm", ""],
    ["Sala ocupada, janelas abertas", "600 a 1000 ppm", ""],
    ["Sala de aula fechada ou com ar-condicionado", "1000 a 2500 ppm", "Comum em escolas; sobe ao longo da aula"],
    ["Sopro a 30 cm do sensor", "sobe centenas de ppm em menos de 1 min", "O ar expirado tem cerca de 40 000 ppm"],
    ["Fundo de escala", "5000 ppm fixo", "Sinal de problema: Vin no 3V3, zero errado ou defeito"],
    ["Temperatura interna (byte 4)", "perto do ambiente, mas não é medida do ar", "Na bancada: 26 °C com o ar a 28–30 °C. Não use como termômetro"],
    ["Tempo de resposta (T90)", "< 2 min", "Ao mudar de ambiente, espere 2 min antes de anotar"],
  ], [0.32, 0.27, 0.41]),
  ESPACO(),
  P("Os sketches classificam a leitura com estes limites (constantes `CO2_BOA`, `CO2_ACEITAVEL` e `CO2_VENTILE` no `m3a`). O alerta vermelho da página começa acima de 1000 ppm, o valor da ANVISA."),
  TAB(["CO₂ (ppm)", "Mensagem", "O que fazer"], [
    ["≤ 800", "ar bom", "Nada"],
    ["801 a 1000", "ar aceitavel", "Abaixo do limite da ANVISA (RE nº 9/2003)"],
    ["1001 a 1500", "ventile: abra porta e janelas", "A página do celular fica em alerta"],
    ["> 1500", "AR RUIM: ventile ja", "Sonolência e dificuldade de concentração; ventile e faça uma pausa"],
  ], [0.18, 0.37, 0.45]),

  // =====================================================================
  ...QUEBRA(),
  H1("4. Calibração do MH-Z19C"),
  H2("4.1 O que significa calibrar este sensor"),
  P("Calibrar o MH-Z19C é **refazer o zero**: levar o sensor ao ar livre, onde o CO₂ é conhecido e estável (cerca de 430 ppm em 2026), e mandar o sensor tratar a leitura daquele momento como 400 ppm (a diferença é tratada na seção 4.4). Isso corrige o I0 da seção 2.2. A calibração de **span** (um segundo ponto, por exemplo 2000 ppm) só pode ser feita com um cilindro de gás-padrão e **não** faz parte deste guia."),
  H2("4.2 A autocalibração (ABC)"),
  P("O sensor sai de fábrica com a **ABC** (autocalibração da linha de base) ligada. Com ela, o sensor guarda o **menor valor das últimas 24 horas** e o trata como 400 ppm. Isso corrige a deriva (o desvio lento das leituras ao longo dos meses) sozinho, mas só funciona se o ambiente chegar ao nível do ar externo pelo menos uma vez por dia."),
  TAB(["Situação", "ABC", "Por quê"], [
    ["Sala ventilada, vazia à noite com janelas ou basculantes abertos", "ligada", "À noite o CO₂ cai ao nível externo e a ABC corrige a deriva"],
    ["Sala fechada com ar-condicionado, ocupada o dia todo", "**desligada**", "O mínimo diário fica acima de 400 ppm; a ABC passaria a subestimar o CO₂"],
    ["Durante a calibração do zero e nos ensaios", "**desligada**", "Para a ABC não mexer na referência no meio do processo"],
  ], [0.42, 0.16, 0.42]),
  ESPACO(),
  P("A decisão de manter a ABC ligada ou não, no monitor definitivo, fica registrada na pasta `calibracao/` do repositório telemetria-cria. O sketch do nó (`m3b`) não envia o comando da ABC: vale o que ficou gravado no sensor. Com a ABC desligada, refaça o zero a cada 3 a 6 meses."),

  H2("4.3 Zero ao ar livre, pelo celular (sketch m3a)"),
  P("O sketch `m3a` permite fazer o zero pelo navegador do celular. Assim, o ESP32 pode ir para fora alimentado por um carregador portátil (power bank), sem notebook."),
  NOTA("O zero vale para a alimentação usada", "A leitura depende da luz da lâmpada IR, e a lâmpada depende da tensão. Faça o zero agora, pela USB, para aprender e testar; no nó definitivo (Parte 5), com a fonte de 5 V, **refaça o zero** com essa fonte.", AZUL),
  ESPACO(),
  OL([
    "Grave o `m3a_co2_celular` (seção 5.5) e teste o sensor na bancada: o CO₂ precisa variar (sopre a 30 cm e veja subir). Se a leitura estiver fixa em 5000 ppm, **não calibre**: resolva a alimentação primeiro (seção 2.6).",
    "Escolha o horário: evite o começo da manhã (perto de cidades, o CO₂ fica mais alto de madrugada e logo cedo); prefira o fim da manhã ou a tarde, com vento leve.",
    "Leve o conjunto, ainda **desligado**, para **fora do prédio, à sombra**, longe de pessoas, carros, chaminés e saídas de ar-condicionado. Ligue o ESP32 no power bank **lá fora**: o tempo do sketch conta desde que a placa liga.",
    "Fique a 3 m ou mais do sensor, do lado contrário ao vento; o Wi-Fi do ESP32 alcança essa distância. No celular, entre na rede `Ar-CO2`, abra `http://192.168.4.1/abc?ligar=0` para **desligar a ABC** e confira em `http://192.168.4.1/info` que aparece \"ABC: desligada\".",
    "Espere **30 minutos** (exigência do manual 1.2; 20 é o mínimo citado para o pino HD). Acompanhe em `http://192.168.4.1`: a leitura deve se estabilizar, variando menos de ±20 ppm em 5 minutos. Se, estável, ela já estiver entre 410 e 450 ppm, o zero **não é necessário**: pule para o passo 8.",
    "Abra `http://192.168.4.1/zero` e toque no botão **Fazer o zero agora**. O sketch recusa (e diz por quê) se faltar tempo, se a leitura tiver variado mais de 40 ppm nos últimos 5 minutos ou se o zero já tiver sido feito desde que a placa ligou.",
    "Espere 2 minutos: a leitura deve ficar entre **380 e 440 ppm**. Se não tiver mudado, o comando não foi aceito: use o pino HD (abaixo).",
    "Decida a ABC (tabela da seção 4.2): para ligá-la de novo, `http://192.168.4.1/abc?ligar=1`. Confira em `/info`. Depois, desligue e religue o sensor e confira de novo em `/info` se a ABC continua como você deixou.",
    "Feche a aba do `/zero` e anote tudo na ficha da seção 4.5.",
  ]),
  P("Sem celular, o mesmo pode ser feito pelo Monitor Serial (teclas `d`, `z` e `a`) com um notebook, ou pelo pino **HD**: ligue-o ao GND por 7 segundos ou mais e solte."),
  CODIGO([
    "http://192.168.4.1/info          versão, faixa, estado da ABC, minutos ligado",
    "http://192.168.4.1/abc?ligar=0   desliga a ABC",
    "http://192.168.4.1/zero          página com o botão do zero (30 min ligado, leitura estável)",
    "http://192.168.4.1/abc?ligar=1   liga a ABC",
  ].join("\n"), { arquivo: false, titulo: "Endereços de calibração (rede Ar-CO2)" }),
  ESPACO(),
  H2("4.4 A diferença entre 400 ppm e o ar externo atual"),
  P("O zero grava 400 ppm, mas o ar externo em 2026 tem cerca de **430 ppm** (NOAA, Mauna Loa), com valores maiores perto de ruas e em áreas urbanas. Depois do zero, o sensor marca cerca de 30 ppm a menos que o real. Essa diferença fica dentro da exatidão de ±(50 ppm + 5 %). Registre-a como **deslocamento conhecido** nos relatórios, ou some 30 ppm na análise."),
  H2("4.5 Verificação e registro"),
  UL([
    "**Com referência:** se houver um medidor NDIR calibrado, coloque os dois lado a lado ao ar livre e numa sala ocupada, 2 minutos em cada. A diferença deve ficar dentro de ±(50 ppm + 5 %): a 1200 ppm, até ±110 ppm.",
    "**Sem referência:** ao ar livre, 380 a 440 ppm (sensor já zerado); numa sala fechada com pessoas, subida contínua; ao soprar a 30 cm, subida clara em menos de 1 minuto; ao abrir a janela, queda em poucos minutos.",
    "**Deriva:** uma vez por mês, leia 10 minutos ao ar livre. Se a média se afastar mais de 50 ppm de 400 (o valor do zero), refaça o zero.",
  ]),
  TAB(["Campo", "Exemplo", "Seu valor"], [
    ["Sensor e firmware (`/info`)", "MH-Z19C, firmware 100E, faixa 5000 ppm", ""],
    ["Data e hora", "27/11/2026, 11:00", ""],
    ["Local", "Pátio da escola, à sombra", ""],
    ["Tensão entre Vin e GND, no sensor", "4,72 V", ""],
    ["Minutos ligado ao ar livre", "30", ""],
    ["Leitura antes do zero", "455 ppm", ""],
    ["Leitura 2 min depois do zero", "402 ppm", ""],
    ["ABC depois da calibração", "desligada", ""],
    ["Responsável", "nome de quem fez", ""],
  ], [0.42, 0.33, 0.25]),
  ESPACO(),
  P("Refaça o zero quando a verificação mensal pedir, depois de transporte ou queda do sensor, e a cada 3 a 6 meses com a ABC desligada."),

  // =====================================================================
  ...QUEBRA(),
  H1("5. Etapa 3A — montagem e teste com o celular"),
  P("O ESP32 cria a própria rede Wi-Fi, `Ar-CO2`, e serve uma página que o celular abre em `http://192.168.4.1`. Além da página, o sketch atende os endereços de calibração da seção 4.3."),
  ...FIGURA(path.join(FIGS, "rede-3a.png"), "Etapa 3A: o celular se conecta direto à rede \"Ar-CO2\" criada pelo ESP32 e abre http://192.168.4.1.", 1.33),

  H2("5.1 Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32 DevKit V1 (30 pinos) + cabo USB de dados", "Pode ser o mesmo das Partes 1 e 2"],
    ["1", "Sensor MH-Z19C com barra de 9 pinos soldada", "Ou com o cabo de 7 vias e jumpers macho-fêmea"],
    ["1", "Protoboard de 830 furos", ""],
    ["6", "Jumpers macho-macho", "2 vermelhos, 2 pretos, 1 verde, 1 azul"],
    ["1", "Multímetro", "Para medir a tensão no sensor"],
    ["1", "Celular com Wi-Fi e navegador", ""],
    ["1", "Carregador portátil (power bank) com saída USB", "Para o zero ao ar livre (seção 4.3)"],
  ], [0.08, 0.52, 0.4]),

  H2("5.2 Esquema de montagem (Fritzing)"),
  ...FIGURA(path.join(ESQ, "m3_mhz19c_esp32.png"), "MH-Z19C no ESP32: Vin na trilha + de 5 V (VIN, fio vermelho), GND (preto), Tx do sensor no RX2 = GPIO 16 (verde), Rx do sensor no TX2 = GPIO 17 (azul). HD, SR, Vo, PWM e AOT sem ligação. Arquivo `aula-ar/esquemas/saida-monitor/m3_mhz19c_esp32.fzz`.", 1.33),
  TAB(["De", "Para", "Fio"], [
    ["VIN do ESP32", "Trilha + de baixo (a da linha vermelha; vira **5 V**)", "Vermelho"],
    ["GND do ESP32", "Trilha − de baixo (a da linha azul)", "Preto"],
    ["Vin do sensor (coluna 18)", "Trilha +", "Vermelho"],
    ["GND do sensor (coluna 17)", "Trilha −", "Preto"],
    ["Tx do sensor (coluna 12)", "**RX2** (GPIO 16) do ESP32", "Verde"],
    ["Rx do sensor (coluna 13)", "**TX2** (GPIO 17) do ESP32", "Azul"],
    ["HD, SR, Vo, PWM, AOT (colunas 10, 11, 14, 15, 16)", "nada", "—"],
  ], [0.4, 0.42, 0.18]),
  ESPACO(),

  H2("5.3 Passo a passo da montagem"),
  OL([
    "Com o **USB desligado**, encaixe o ESP32 e a protoboard como na figura.",
    "Ligue o **VIN** do ESP32 à trilha **+** de baixo (a da linha vermelha) e o **GND** à trilha **−** (a da linha azul). A trilha + agora é de **5 V**.",
    "Encaixe a barra de pinos do sensor na linha **J**, colunas 10 a 18, na ordem HD, SR, Tx, Rx, Vo, PWM, AOT, GND, Vin. Confira a serigrafia da placa do sensor.",
    "Ligue a coluna do **Vin** (18) à trilha + e a do **GND** (17) à trilha −.",
    "Ligue a coluna do **Tx** (12) ao **RX2** do ESP32 (verde) e a do **Rx** (13) ao **TX2** (azul).",
    "Deixe HD, SR, Vo, PWM e AOT sem ligação. Com o cabo de 7 vias, isole com fita as pontas dos fios marrom, branco e amarelo.",
  ]),
  NOTA("Três regras que evitam quase todos os defeitos", [
    "**1.** Vin no **VIN (5 V)**, nunca no 3V3 (seção 2.6).",
    "**2.** Serial **cruzada**: Tx do sensor no RX2, Rx do sensor no TX2.",
    "**3.** HD **isolado**: encostado no GND por 7 s, ele refaz o zero sem aviso.",
  ], VERDE),
  ESPACO(),

  H2("5.4 Conferência com o multímetro"),
  OL([
    "**Desligado**, na escala de continuidade: confira que nenhum fio liga a trilha + à trilha − (curto) e que o fio vermelho chega ao pino Vin do sensor.",
    "Ligue o USB. Meça entre **Vin e GND no próprio sensor**: o esperado pela USB é **4,6 a 4,8 V** (4,5 V é o mínimo). Com fonte de 5 V, 4,9 a 5,1 V. Anote o valor.",
    "Se der perto de **3,3 V**, o Vin está no pino errado: desligue e passe-o para o VIN.",
  ]),

  H2("5.5 Gravar o sketch m3a_co2_celular"),
  P("O sketch fica em `aula-ar/codigo/m3a_co2_celular/`, com `monitor_wifi.h` e `pagina_web.h` na mesma pasta. Não precisa de biblioteca: a `Serial2` vem com o núcleo do ESP32. Na Arduino IDE: placa **DOIT ESP32 DEVKIT V1**, porta do ESP32, **Carregar** (segure **BOOT** se parar em `Connecting...`) e **Monitor Serial** em 115200 baud."),
  CODIGO([
    "cd aula-ar/codigo/m3a_co2_celular",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (no Linux, troque COM4 por /dev/ttyUSB0)" }),

  H2("5.6 Abrir no celular"),
  OL([
    "No celular, entre na rede Wi-Fi **Ar-CO2**, senha **12345678**. Quando o celular avisar que a rede não tem internet, escolha **manter conectado**; se a página não abrir, desligue os dados móveis.",
    "No navegador, abra `http://192.168.4.1`. O valor principal é o CO₂ em ppm; abaixo aparecem o mínimo, o máximo e a temperatura interna do sensor.",
    "Os dados brutos ficam em `http://192.168.4.1/dados` e o estado do sensor em `http://192.168.4.1/info`.",
  ]),
  TAB(["Parâmetro da Etapa 3A", "Valor", "Onde mudar"], [
    ["Nome da rede (SSID)", "`Ar-CO2`", "1º argumento de `monitorIniciar` no `setup()`"],
    ["Senha da rede", "`12345678` (mínimo de 8 caracteres)", "2º argumento de `monitorIniciar`; sem ele, vale a senha padrão"],
    ["IP do ESP32", "`192.168.4.1` (fixo no modo ponto de acesso)", "—"],
    ["Página, dados e estado", "`/`, `/dados` e `/info`", "`pagina_web.h` e o sketch"],
    ["Calibração", "`/zero` (botão), `/abc?ligar=0` ou `/abc?ligar=1`", "funções `zero()` e `abc()`"],
  ], [0.26, 0.38, 0.36]),
  ESPACO(),
  NOTA("Várias placas na mesma sala", "Se vários grupos gravarem o mesmo sketch, todas as redes se chamarão Ar-CO2. Cada grupo troca o nome, por exemplo `monitorIniciar(\"Ar-CO2-G3\")`.", AZUL),
  ESPACO(),

  H2("5.7 O que aparece no Monitor Serial"),
  CODIGO([
    "Rede Wi-Fi: Ar-CO2  senha: 12345678  ->  abra http://192.168.4.1",
    "comandos: i = estado | z = zero 400 ppm (ar livre) | a / d = ABC liga / desliga",
    "aquecendo: faltam 175 s | 500 ppm (ainda nao vale) | 24 C",
    "...",
    "aquecendo: faltam 4 s | 618 ppm (ainda nao vale) | 26 C",
    "CO2_ppm:612 Temp_interna_C:26",
    "ar bom",
    "...",
    "CO2_ppm:1185 Temp_interna_C:26",
    "ventile: abra porta e janelas",
    "",
    "(tecla i)",
    "MH-Z19C",
    "versao do firmware: 100E",
    "faixa: 5000 ppm",
    "ABC (autocalibracao): LIGADA",
    "ligado ha 4 min",
  ].join("\n"), { arquivo: false, titulo: "Exemplo (os números do seu sensor serão outros)" }),
  ESPACO(),
  P("Os **500 ppm** do começo são o valor de partida do sensor, e não uma medida: por isso o sketch espera 3 minutos. A temperatura interna não mede o ar (seção 3). O firmware, a faixa e a ABC do exemplo são os da unidade testada na bancada em novembro de 2026. As linhas `CO2_ppm:...` servem ao **Plotter Serial**."),

  H2("5.8 Testes de funcionamento da Etapa 3A"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Alimentação", "Multímetro entre Vin e GND, no sensor", "4,5 a 5,1 V (nunca perto de 3,3 V)"],
    ["2", "Comunicação", "Monitor Serial nos primeiros segundos", "Linhas \"aquecendo\" com um valor em ppm; nenhuma linha \"sem resposta do MH-Z19C\""],
    ["3", "Estado", "Tecla `i` ou `http://192.168.4.1/info`", "Versão, faixa e ABC respondidas"],
    ["4", "Rede e página", "Rede `Ar-CO2`, `http://192.168.4.1`", "Página abre e o valor muda a cada poucos segundos"],
    ["5", "Aquecimento", "Primeiros 3 minutos", "Contagem regressiva; 500 ppm no início"],
    ["6", "Sala", "Ler 2 min com a sala como está", "Valor entre 450 e 1500 ppm, variando pouco"],
    ["7", "Sopro", "Expirar devagar a 30 cm por 5 s", "Sobe centenas de ppm em menos de 1 min"],
    ["8", "Recuperação", "Afastar-se e abrir a janela", "Volta ao valor da sala em poucos minutos (T90 < 2 min)"],
    ["9", "Seletividade", "Algodão com álcool a 10 cm por 5 s", "Quase nenhuma mudança (compare com os MQ)"],
    ["10", "Proteção do zero", "Botão de `/zero` logo depois de ligar", "\"RECUSADO\" e o tempo que falta"],
    ["11", "Ar livre", "30 min fora do prédio (seção 4.3)", "Antes do zero: estável (±20 ppm em 5 min), em geral 400 a 500 ppm. Depois do zero: 380 a 440 ppm"],
  ], [0.05, 0.17, 0.38, 0.4]),

  H2("5.9 Problemas comuns da Etapa 3A"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["\"sem resposta do MH-Z19C\" sempre", "Tx e Rx trocados, fio solto ou sensor sem alimentação", "Troque os fios verde e azul; confira Vin e GND"],
    ["\"5000 ppm = fundo de escala\" fixo", "Vin no 3V3, alimentação fraca, zero errado ou defeito", "Vin no VIN; meça no sensor; depois faça o zero ao ar livre"],
    ["500 ppm aparecendo de tempos em tempos", "O sensor está reiniciando (volta ao valor de partida)", "Use um cabo USB curto ligado direto à porta do computador (sem hub); aperte o conector do sensor"],
    ["400 ppm fixo, não sobe ao soprar", "Zero gravado num ar com muito CO₂ (o sensor não mostra menos que 400)", "Faça o zero ao ar livre (seção 4.3)"],
    ["Leitura cai devagar depois do sopro", "Normal: o ar sai da câmara por difusão (T90 < 2 min)", "Espere 2 min"],
    ["Zero feito sem querer", "Fio HD encostado no GND", "Isole o HD; refaça o zero ao ar livre"],
    ["Página não abre", "Celular em outra rede, ou usando os dados móveis", "Volte para `Ar-CO2`; desligue os dados móveis"],
  ], [0.32, 0.36, 0.32]),

  // =====================================================================
  ...QUEBRA(),
  H1("6. Etapa 3B — o MH-Z19C na Rede de Telemetria"),
  P("A montagem não muda: o ESP32 passa a entrar na rede Wi-Fi da telemetria e publica `co2` no broker do servidor a cada 10 segundos. Faça o **zero ao ar livre antes**, na Etapa 3A: o sketch desta etapa só lê e publica."),
  ...FIGURA(path.join(FIGS, "rede-3b.png"), "Etapa 3B: o nó do MH-Z19C publica cria/teste/no7/co2 no servidor; o painel é aberto em http://IP_DO_SERVIDOR:3000.", 1.33),

  H2("6.1 Antes de começar: o que já está pronto desde a Parte 1"),
  TAB(["Item", "Onde está na Parte 1", "Conferir"], [
    ["Parâmetros de rede (SSID, senha, IP do servidor, portas, usuário MQTT)", "seção 6.1", "Tabela preenchida com o coordenador"],
    ["IP fixo do servidor", "seção 6.2", "`hostname -I` no servidor mostra o IP reservado"],
    ["Servidor no ar", "seção 6.3", "`curl -i http://localhost:3000/saude` responde 200; porta 3000 liberada"],
    ["Rede alcançável da sala", "seção 6.4", "`Test-NetConnection IP_DO_SERVIDOR -Port 1883` (PowerShell) e painel abrindo no celular"],
    ["Arduino IDE com CriaTelemetria e PubSubClient", "seção 6.5", "Exemplo da CriaTelemetria aparece no menu"],
    ["`credenciais.h`", "seção 6.6", "O mesmo arquivo do `m1b` serve: copie-o para a pasta do `m3b`"],
  ], [0.3, 0.14, 0.56]),
  ESPACO(),

  H2("6.2 Ajustar e gravar o sketch m3b_co2_telemetria"),
  TAB(["Constante", "O que colocar"], [
    ["`PROJETO`", "`\"teste\"` na bancada; `\"ar\"` só no monitor definitivo. Igual ao `MQTT_USUARIO`"],
    ["`NO`", "Um nó livre. O exemplo usa `\"no7\"`, para os MQ das Partes 1 e 2 continuarem no `no5` e no `no6`"],
    ["`PINO_RX2`, `PINO_TX2`", "`16` e `17` (já vêm assim)"],
    ["`FAIXA_PPM`", "`5000`, a faixa de fábrica (confira em `/info` na Etapa 3A)"],
    ["`PREAQUECIMENTO_MS`", "3 min: pula os 500 ppm da partida"],
  ], [0.3, 0.7]),
  ESPACO(),
  P("O sketch **não publica** leituras sem resposta nem as de fundo de escala (5000 ppm): o fundo de escala é tratado como saturação, e não como medida, seguindo a regra do catálogo de tópicos de não publicar leitura com falha. Esses casos aparecem só no Monitor Serial. O firmware `no-ar` da telemetria ainda publica 5000; até ele ser ajustado, um 5000 no painel do nó definitivo significa sensor saturado."),
  CODIGO([
    "cd aula-ar/codigo/m3b_co2_telemetria",
    "cp ../m1b_mq135_telemetria/credenciais.h .",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 \\",
    "    --library /dados/Projetos/telemetria-cria/firmware/biblioteca-cria .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (ajuste o caminho da biblioteca e a porta à sua máquina)" }),

  H2("6.3 O que aparece no Monitor Serial"),
  CODIGO([
    "[cria] nó cria/teste/no7, biblioteca CriaTelemetria 0.2.0",
    "[cria] boot 1",
    "[cria] aguardando o Wi-Fi \"telemetria-cria\"...",
    "[co2] no cria/teste/no7 | aquecimento de 180 s",
    "[cria] Wi-Fi conectado, IP 192.168.0.25",
    "[cria] conectado ao broker; status online em cria/teste/no7/status",
    "[cria] relógio acertado: 2026-11-27 14:00:15 UTC",
    "[co2] aquecendo: faltam 168 s | 500 ppm (ainda nao vale)",
    "...",
    "[cria] cria/teste/no7/co2",
    "       {\"valor\":612,\"unidade\":\"ppm\",\"seq\":1,\"boot\":1,\"t\":1795788185212}",
  ].join("\n"), { arquivo: false, titulo: "Exemplo de partida normal" }),
  ESPACO(),
  P("A sequência é a mesma das partes anteriores: Wi-Fi, broker e relógio. O aquecimento conta desde que a placa liga, e a primeira publicação só sai quando o relógio já foi acertado e os 3 minutos terminaram. A linha publicada foi quebrada aqui em duas para caber."),

  H2("6.4 Ver os dados no painel"),
  OL([
    "Em qualquer computador ou celular ligado à rede Wi-Fi da telemetria, abra `http://192.168.0.10:3000` (troque pelo IP do seu servidor).",
    "O cartão `teste/no7` aparece on-line, com o último valor de `co2` em ppm e o gráfico da última hora.",
    "Com os nós das Partes 1 e 2 ligados, os três cartões aparecem lado a lado.",
  ]),
  TAB(["Endereço (no navegador)", "O que mostra"], [
    ["`http://192.168.0.10:3000/api/nos`", "Os nós e o último valor de cada grandeza (JSON)"],
    ["`http://192.168.0.10:3000/api/historico?projeto=teste&no=no7&grandeza=co2&minutos=60`", "Os pontos da última hora (JSON)"],
    ["`http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste&no=no7`", "Planilha CSV das últimas 24 h"],
  ], [0.62, 0.38]),
  ESPACO(),

  H2("6.5 Testes de funcionamento da Etapa 3B"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Conexão", "Ligar o nó e olhar o Monitor Serial", "Wi-Fi, broker e relógio, nessa ordem"],
    ["2", "Status no broker", "Observador `mosquitto_sub` no servidor (Parte 1, seção 6.3)", "`cria/teste/no7/status online`"],
    ["3", "Publicação", "Esperar os 3 min de aquecimento", "Uma linha `co2` a cada 10 s, com `seq` crescendo de 1 em 1"],
    ["4", "Painel", "`http://192.168.0.10:3000` no computador e no celular", "Cartão `teste/no7` on-line, mesmo valor nos dois"],
    ["5", "Sopro", "Expirar a 30 cm por 5 s", "Subida no gráfico em até 1 min"],
    ["6", "Aula inteira", "Deixar o nó numa sala durante uma aula", "Curva subindo com a sala fechada e caindo ao abrir as janelas"],
    ["7", "Queda do Wi-Fi", "Desligar o ponto de acesso por 1 min", "Leituras reenviadas com `\"fila\":1`; gráfico sem lacuna"],
    ["8", "Queda do nó", "Desligar o USB do ESP32", "`status offline` em segundos; cartão off-line"],
    ["9", "Exportação", "Abrir o link do CSV", "Planilha com data, hora e valores de `co2`"],
    ["10", "Estabilidade", "Deixar 24 h publicando", "Sem reinício e sem buraco na série; perda abaixo de 1 %"],
  ], [0.05, 0.17, 0.4, 0.38]),

  H2("6.6 Os três sensores juntos no painel"),
  P("Com os três nós publicando (`no5` com o MQ-135, `no6` com o MQ-2 e `no7` com o MH-Z19C), o painel mostra que cada sensor responde a uma coisa diferente:"),
  TAB(["Estímulo", "MQ-135 (`no5`)", "MQ-2 (`no6`)", "MH-Z19C (`no7`)"], [
    ["Sala cheia e fechada por 1 h", "cai devagar", "varia pouco", "**sobe**: 1000 a 2500 ppm"],
    ["Sopro a 30 cm", "queda pequena", "variação menor", "**sobe** centenas de ppm"],
    ["Álcool em algodão", "cai muito", "cai muito", "quase não muda"],
    ["Janela aberta depois da aula", "volta para perto de 1", "quase não muda", "**cai** para perto do ar externo"],
  ], [0.28, 0.24, 0.2, 0.28]),
  ESPACO(),
  P("Só o MH-Z19C dá um número com significado direto para a saúde (ppm de CO₂, comparável ao limite da ANVISA); os MQ completam o quadro com gases que o NDIR não enxerga. Os valores da tabela são referências do curso: anote os que a sua bancada mostrar."),

  H2("6.7 Problemas comuns da Etapa 3B"),
  P("As mensagens da biblioteca e as causas de rede são as mesmas da Parte 1 (seção 6.11). As específicas desta parte:"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`[co2] sem resposta do MH-Z19C`", "Tx e Rx trocados, fio solto ou sem alimentação", "Volte à Etapa 3A e confira a montagem"],
    ["`[co2] 5000 ppm = fundo de escala`", "Vin no 3V3, alimentação fraca ou zero errado", "Seção 2.6; depois o zero ao ar livre"],
    ["Cartão on-line, mas sem `co2` nos 3 primeiros minutos", "Aquecimento", "Espere os 3 minutos"],
    ["`AVISO: a conexão cai logo depois de abrir`", "Dois nós com o mesmo `NO`", "Use `no7` para o CO₂, diferente dos nós dos MQ"],
    ["CO₂ ao ar livre acima de 450 ppm (sensor já zerado)", "Zero antigo ou ABC gravou uma referência errada", "Refaça o zero ao ar livre (seção 4.3)"],
  ], [0.33, 0.33, 0.34]),

  H2("6.8 Do projeto teste ao monitor definitivo"),
  P("Aprovado na bancada, o MH-Z19C passa a fazer parte do monitor definitivo. Troque, no sketch e no `credenciais.h`, o projeto para `ar` (usuário MQTT `ar`, com a senha do projeto) e o nó para `no1`: o tópico passa a ser `cria/ar/no1/co2`, o mesmo do firmware completo `telemetria-cria/firmware/no-ar`. Só **um** ESP32 pode ser o `ar/no1`: enquanto os sensores estiverem em placas separadas, mantenha cada um no seu nó do projeto `teste`. No guia da Parte 5 (nó completo), o MQ-2 (GPIO 34), o MQ-135 (GPIO 35), o MH-Z19C (GPIO 16 e 17) e o DHT22 são reunidos nesse nó, com fonte de 5 V e 2 A e abrigo impresso em 3D. A decisão sobre a ABC no nó definitivo fica registrada na pasta `calibracao/` do repositório telemetria-cria, e o zero é refeito com a fonte de 5 V."),

  // =====================================================================
  ...QUEBRA(),
  H1("7. Códigos"),
  H2("7.1 Etapa 3A — m3a_co2_celular.ino"),
  P("Arquivo `aula-ar/codigo/m3a_co2_celular/m3a_co2_celular.ino`. Os auxiliares `monitor_wifi.h` e `pagina_web.h` ficam na mesma pasta."),
  CODIGO(COD("m3a_co2_celular"), { titulo: "m3a_co2_celular.ino", tamanho: 14 }),
  H2("7.2 Etapa 3B — m3b_co2_telemetria.ino"),
  P("Arquivo `aula-ar/codigo/m3b_co2_telemetria/m3b_co2_telemetria.ino`. Precisa do `credenciais.h` na mesma pasta."),
  CODIGO(COD("m3b_co2_telemetria"), { titulo: "m3b_co2_telemetria.ino", tamanho: 14 }),
];

module.exports = DOC({ titulo: "Guia de montagem do monitor de qualidade do ar — Parte 3: MH-Z19C", rodape: "Guia de montagem do monitor de qualidade do ar — Parte 3: o MH-Z19C — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
