// Guia de montagem do monitor de qualidade do ar (Rede de Telemetria do Espaco CRIA) - Parte 4: o sensor DHT22 / AM2302.
// Gera ../../saida/Guia-Montagem-Monitor-Ar-Parte4-DHT22.docx (gerar.sh converte para PDF).
// Esquema: ../../esquemas/saida-monitor/m4_dht22_esp32.png (python esquemas.py --monitor).
// Diagramas de rede: figuras/rede-4a.png e rede-4b.png (gerar.sh). Rede e servidor: Parte 1 (guia.js).
const path = require("path");
const { H1, H2, H3, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas", "saida-monitor");
const FIGS = path.join(AQUI, "figuras");
const COD = (n) => path.join(AQUI, "..", "..", "codigo", n, `${n}.ino`);
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-Montagem-Monitor-Ar-Parte4-DHT22.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia de montagem — Parte 4",
    titulo: "Monitor de Qualidade do Ar",
    subtitulo: "O sensor de temperatura e umidade DHT22 / AM2302: funcionamento, valores esperados, calibração com termômetro de referência e pote de sal, teste com o celular ligado só ao Wi-Fi do ESP32 e integração à Rede de Telemetria do Espaço CRIA",
    info: [
      "**Placa:** ESP32 DevKit V1 (30 pinos)  •  **Sketches:** `aula-ar/codigo/m4a_dht22_celular` e `m4b_dht22_telemetria`",
      "**Pré-requisito:** Parte 1 (MQ-135), em especial a seção 6 (parâmetros da rede, IP fixo e conferência do servidor)",
      "Projeto Rede de Telemetria do Espaço CRIA — Edital nº 19/2026-FACEPE — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // =====================================================================
  H1("1. Onde estamos"),
  P("As Partes 1 a 3 trataram dos três sensores de gás do monitor: MQ-135, MQ-2 e MH-Z19C. Esta Parte 4 acrescenta o **DHT22**, que mede a **temperatura** e a **umidade relativa** do ar. Ele não está entre os três sensores do projeto aprovado: entra como **medida complementar**, prevista como opcional no catálogo de tópicos e no firmware do nó de ar, porque os sensores MQ mudam de leitura com a temperatura e a umidade. Com o DHT22 no mesmo monitor, é possível distinguir uma variação causada por gás de uma variação causada apenas pela temperatura e pela umidade do ar."),
  TAB(["", "Partes 1 a 3 (gases)", "Parte 4 (este guia)"], [
    ["Sensor", "MQ-135, MQ-2, MH-Z19C", "**DHT22 / AM2302**"],
    ["O que entrega", "Rs/R0 (MQ) e CO₂ em ppm", "**Temperatura em °C e umidade relativa em %**"],
    ["Alimentação", "5 V, pelo VIN", "**3,3 V, pelo pino 3V3**"],
    ["Ligação ao ESP32", "Analógica (GPIO 35 e 34) e serial (GPIO 16 e 17)", "**Um fio de dados, GPIO 4**"],
    ["Biblioteca do sensor", "nenhuma", "**DHT sensor library** (Adafruit)"],
    ["Aquecimento", "10 min (MQ), 3 min (CO₂)", "não precisa: 2 s depois de ligar"],
    ["Etapa A (celular)", "`m1a`, `m2a`, `m3a`", "`m4a_dht22_celular`, rede `Ar-DHT22`"],
    ["Etapa B (telemetria)", "`mq135`, `mq2`, `co2`", "`m4b_dht22_telemetria`: `temperatura` e `umidade`"],
    ["Nó de bancada (exemplo)", "`cria/teste/no5`, `no6` e `no7`", "`cria/teste/no8`"],
    ["Tópicos definitivos", "`cria/ar/no1/mq135`, `mq2` e `co2`", "`cria/ar/no1/temperatura` e `cria/ar/no1/umidade`"],
  ], [0.22, 0.36, 0.42]),
  ESPACO(),
  P("O pino segue o firmware do nó de ar da telemetria (`telemetria-cria/firmware/no-ar`): **dado no GPIO 4** (pino marcado D4 na placa). No indicador do projeto que conta as grandezas com série registrada, as três do monitor de ar continuam sendo MQ-2, MQ-135 e CO₂; a temperatura e a umidade são grandezas adicionais, fora dessa contagem."),
  NOTA("O que vale da Parte 1 e não é repetido aqui", [
    "As regras elétricas do monitor (seção 1.5): ESP32 em 3,3 V, GPIO 21 e 22 livres, montagem com o USB desligado.",
    "Toda a parte de rede e servidor (seções 6.1 a 6.6): parâmetros, IP fixo do servidor, conferência do servidor, teste da rede, Arduino IDE e `credenciais.h`.",
  ], AZUL),

  // =====================================================================
  ...QUEBRA(),
  H1("2. O sensor DHT22 / AM2302"),
  H2("2.1 Para que serve"),
  P("AM2302 é o nome dado pelo fabricante (Aosong) ao DHT22 montado em caixa com cabo; neste guia, os dois nomes indicam o mesmo sensor. O DHT22 mede duas grandezas do ar ao mesmo tempo: a **temperatura**, de −40 a 80 °C, e a **umidade relativa (UR)**, de 0 a 100 %. A umidade relativa compara o vapor d'água que existe no ar com o máximo que o ar comportaria **naquela temperatura**: 100 % é ar saturado, a ponto de condensar. Como o ar quente comporta mais vapor, a UR cai quando o ar esquenta e sobe quando ele esfria, mesmo que a quantidade de vapor d'água não mude."),
  P("No monitor, as duas medidas servem para três coisas:"),
  UL([
    "**Interpretar os MQ.** A resistência dos sensores de óxido metálico cai quando a temperatura e a umidade sobem. Uma queda de Rs/R0 numa tarde abafada pode não ser gás.",
    "**Avaliar o conforto da sala.** Temperatura e umidade juntas dão a **sensação térmica** (seção 2.6).",
    "**Prever condensação e mofo.** O **ponto de orvalho** (seção 2.6) diz a que temperatura a água começa a condensar nas superfícies.",
  ]),

  H2("2.2 Princípio de funcionamento"),
  P("Dentro da caixa branca com grade há três partes:"),
  OL([
    "**Sensor de umidade capacitivo.** Um filme de **polímero** entre duas placas metálicas forma um capacitor. O polímero absorve vapor d'água do ar; como a água tem constante dielétrica alta (cerca de 80, contra cerca de 3 do polímero seco), mais umidade significa **mais capacitância**.",
    "**Sensor de temperatura.** Um termistor (resistor cujo valor muda com a temperatura) mede a temperatura do ar que passa pela grade.",
    "**Microcontrolador.** Mede a capacitância e o termistor, aplica a calibração gravada na fábrica e envia os dois valores **já em formato digital**, por um único fio de dados.",
  ]),
  P("Duas consequências práticas:"),
  UL([
    "**O sensor mede o ar que chega até ele.** Perto de algo quente (o próprio ESP32 com Wi-Fi, os sensores MQ, sol direto), a temperatura sobe e a UR calculada cai. Mantenha o DHT22 **afastado**, na ponta do cabo.",
    "**O erro de temperatura altera a umidade calculada.** Um erro de 1 °C na temperatura do sensor muda a UR em alguns pontos percentuais. Por isso, na calibração, a temperatura vem primeiro (seção 4).",
  ]),

  H2("2.3 Especificações"),
  P("Segundo a folha de dados da Aosong (AM2302), com o DHT11 ao lado para comparação:"),
  TAB(["Característica", "DHT22 / AM2302", "DHT11"], [
    ["Alimentação", "3,3 a 5,5 V", "3,0 a 5,5 V"],
    ["Corrente", "1 a 1,5 mA ao medir; 40 a 50 µA em repouso", "0,5 a 2,5 mA ao medir; cerca de 0,1 mA em repouso"],
    ["Faixa de temperatura", "−40 a 80 °C", "0 a 50 °C"],
    ["Exatidão da temperatura", "±0,5 °C", "±2 °C"],
    ["Faixa de umidade", "0 a 100 %", "20 a 90 %"],
    ["Exatidão da umidade", "±2 % (máximo de ±5 %)", "±5 %"],
    ["Resolução", "0,1 °C e 0,1 %", "1 °C e 1 % (0,1 °C nas versões novas)"],
    ["Intervalo mínimo entre leituras", "2 s", "1 s"],
    ["Deriva da umidade (desvio lento da leitura com o envelhecimento do sensor)", "cerca de 0,5 % por ano", "cerca de 1 % por ano"],
  ], [0.34, 0.38, 0.28]),
  ESPACO(),
  P("Os 3,3 V do ESP32 ficam no **limite inferior** da alimentação. Funciona, desde que os fios sejam curtos (o cabo de fábrica, de 20 a 30 cm, serve) e os contatos estejam firmes."),

  H2("2.4 Versões e pinagem"),
  P("O mesmo sensor é vendido em três formatos. O esquema deste guia usa o primeiro, que é o do kit:"),
  TAB(["Formato", "Ligações", "Resistor de pull-up"], [
    ["**AM2302: caixa com cabo de 3 fios**", "vermelho = VCC; amarelo = dado; preto = GND", "já vem dentro da caixa"],
    ["DHT22 de 4 pinos, sem placa", "pino 1 = VCC; 2 = dado; 3 = sem ligação; 4 = GND (grade de frente, da esquerda para a direita)", "**externo:** 10 kΩ entre o pino 2 e o 3V3"],
    ["Módulo de 3 pinos (sensor soldado numa placa)", "`+`, `out` e `−`, conforme a serigrafia", "já vem na placa"],
  ], [0.34, 0.4, 0.26]),
  ESPACO(),
  P("O **pull-up** é um resistor que liga o fio de dados à alimentação e o mantém em nível alto quando nem o ESP32 nem o sensor está transmitindo. Sem ele, a leitura falha ou fica instável: o pull-up interno do ESP32, que a biblioteca liga, é fraco demais para garantir o sinal. No DHT22 de 4 pinos, use de 4,7 a 10 kΩ."),
  NOTA("As cores podem enganar", "Quase todos os sensores com cabo seguem vermelho, amarelo e preto, mas há lotes com outras cores. Na dúvida, procure a etiqueta na caixa do sensor. Outra conferência: com o sensor alimentado, o fio de dados fica em nível alto (perto de 3,3 V), por causa do pull-up interno.", AZUL),
  ESPACO(),

  H2("2.5 O protocolo de um fio"),
  P("O DHT22 usa um protocolo próprio, de **um fio de dados**, que não é o 1-Wire do DS18B20. O ESP32 pede e o sensor responde, sempre nessa ordem:"),
  OL([
    "**Pedido:** o ESP32 leva o fio a 0 V por cerca de 1 ms e o libera.",
    "**Resposta:** o sensor leva o fio a 0 V por 80 µs e o libera por 80 µs.",
    "**40 bits de dados:** cada bit começa com 50 µs em 0 V; depois, o fio fica em nível alto por cerca de 27 µs (bit 0) ou 70 µs (bit 1). O que diferencia 0 de 1 é a **duração** do nível alto.",
  ]),
  P("Os 40 bits formam 5 bytes: dois de umidade, dois de temperatura e um de conferência (checksum): a soma dos quatro primeiros. Se a soma calculada pelo ESP32 for diferente do quinto byte, houve erro na transmissão."),
  CODIGO([
    "bytes recebidos:  02 6C 01 1C 8B",
    "",
    "umidade     = (0x02 × 256 + 0x6C) / 10 = 620 / 10 = 62,0 %",
    "temperatura = (0x01 × 256 + 0x1C) / 10 = 284 / 10 = 28,4 °C",
    "              (se o bit mais alto do 3º byte for 1, a temperatura é negativa)",
    "checksum    = 02 + 6C + 01 + 1C = 8B   (os 8 bits de baixo da soma; confere)",
  ].join("\n"), { arquivo: false, titulo: "Como os 5 bytes viram as duas medidas" }),
  ESPACO(),
  P("A biblioteca **DHT sensor library** faz tudo isso: mede os tempos em microssegundos, confere o checksum e devolve os valores com `readTemperature()` e `readHumidity()`. Quando o sensor não responde ou o checksum não confere, ela devolve **NaN** (not a number, \"não é um número\"), e o sketch trata como falha. O sketch também descarta leituras impossíveis (umidade abaixo de 1 %), que aparecem quando um mau contato zera os bits e o checksum confere por coincidência. Como o sensor só faz uma medida a cada 2 segundos, pedir mais rápido devolve a leitura anterior."),

  H2("2.6 Sensação térmica e ponto de orvalho"),
  P("Com a temperatura e a umidade, o sketch calcula duas grandezas derivadas, mostradas na página do celular:"),
  UL([
    "**Sensação térmica (índice de calor).** É a temperatura que o corpo sente à sombra quando a umidade dificulta a evaporação do suor. A biblioteca calcula com `computeHeatIndex()`, pela fórmula do serviço meteorológico dos Estados Unidos (NWS). Exemplo: 28,4 °C com 62 % dão sensação de 30,3 °C; 32 °C com 75 % dão 42,3 °C.",
    "**Ponto de orvalho.** É a temperatura até a qual o ar teria de esfriar para a umidade chegar a 100 % e a água condensar. Exemplo: ar a 28,4 °C e 62 % tem ponto de orvalho de 20,4 °C; uma superfície abaixo dessa temperatura (parede, copo) fica molhada.",
  ]),
  TAB(["Sensação térmica", "Faixa (tabela clássica do NWS)", "Efeito em quem fica exposto por muito tempo"], [
    ["abaixo de 27 °C", "conforto térmico", "—"],
    ["27 a 32 °C", "cautela", "Fadiga, mais sede, queda de concentração"],
    ["32 a 41 °C", "cautela extrema", "Câimbras e exaustão pelo calor são possíveis"],
    ["41 a 54 °C", "perigo", "Câimbras e exaustão prováveis; insolação possível"],
    ["54 °C ou mais", "perigo extremo", "Insolação muito provável"],
  ], [0.22, 0.28, 0.5]),
  ESPACO(),
  P("Os limites de 27, 32, 41 e 54 °C são os da tabela clássica do NWS (80, 90, 105 e 130 °F); páginas mais recentes do NWS usam 39 e 52 °C nos dois últimos. O ventilador aumenta a evaporação do suor e reduz o desconforto, mas **não altera** a leitura do DHT22 nem o índice de calor, que dependem apenas da temperatura e da umidade do ar. A Rede de Telemetria publica só a temperatura e a umidade; a sensação térmica e o ponto de orvalho podem ser calculados depois, a partir das duas."),

  // =====================================================================
  ...QUEBRA(),
  H1("3. Parâmetros esperados em condições normais"),
  P("As tabelas a seguir trazem valores típicos para conferir se o sensor está medindo corretamente. Os do Recife e das salas são referências do curso; as faixas de conforto vêm da Resolução ANVISA RE nº 9/2003, que vale para ambientes climatizados de uso coletivo."),
  TAB(["Lugar ou situação", "Temperatura", "Umidade relativa", "Observação"], [
    ["Sala com ar-condicionado", "22 a 25 °C", "40 a 60 %", "ANVISA, verão: 23 a 26 °C e 40 a 65 %"],
    ["Sala de aula com ventiladores, dia quente", "28 a 32 °C", "55 a 75 %", "Sensação térmica de 29 a 42 °C"],
    ["Ar externo, Recife, tarde de verão (sombra)", "29 a 32 °C", "60 a 75 %", "De manhã cedo, UR de 80 a 90 %"],
    ["Sopro a 10 cm da grade", "sobe pouco: até 1 a 2 °C", "sobe 20 a 40 pontos percentuais", "Em segundos; volta em 1 a 2 min"],
    ["Sensor ao lado do ESP32 ou dos MQ", "1 a 3 °C acima do ar", "alguns pontos abaixo", "Erro de montagem: afaste o sensor"],
    ["Leituras seguidas, ar parado", "variam até 0,2 °C", "variam até 1 ponto", "Use a média de 1 minuto"],
  ], [0.34, 0.17, 0.19, 0.3]),
  ESPACO(),
  P("Efeitos da umidade relativa no conforto e na saúde:"),
  TAB(["Umidade relativa", "O que acontece", "Situação"], [
    ["abaixo de 30 %", "Olhos e garganta secos, choque eletrostático", "Seco: comum com ar-condicionado forte"],
    ["30 a 40 %", "Aceitável por pouco tempo", "Atenção"],
    ["40 a 60 %", "Menos ácaros, fungos e vírus no ar", "**Faixa mais saudável**"],
    ["60 a 70 %", "Abafado em dia quente; o suor evapora menos", "Úmido: normal em sala ventilada no Recife"],
    ["acima de 70 %", "Mofo em paredes e livros, piora de asma e rinite", "Muito úmido"],
  ], [0.22, 0.45, 0.33]),
  ESPACO(),
  P("O sketch `m4a` mostra na página a faixa da sensação térmica, com estas mensagens. O alerta vermelho só aparece a partir de 41 °C (constante `SENSACAO_PERIGO_C`) ou quando o sensor não responde."),
  TAB(["Sensação térmica", "Mensagem do sketch"], [
    ["abaixo de 27 °C", "`conforto termico`"],
    ["27 a 32 °C", "`cautela: calor`"],
    ["32 a 41 °C", "`cautela extrema: hidrate-se e ventile`"],
    ["41 a 54 °C", "`PERIGO: calor excessivo` (página em alerta)"],
    ["54 °C ou mais", "`PERIGO EXTREMO` (página em alerta)"],
  ], [0.35, 0.65]),

  // =====================================================================
  ...QUEBRA(),
  H1("4. Calibração do DHT22"),
  H2("4.1 O que pode ser calibrado"),
  P("O DHT22 sai **calibrado de fábrica**, e não há ajuste dentro dele. O que se faz é **conferir** o sensor contra uma referência e, se a diferença for maior que a tolerância, escrever uma **correção no sketch**: um deslocamento (valor somado à leitura) para a temperatura e, para a umidade, um ganho (fator que multiplica a leitura) e um deslocamento. Três cuidados:"),
  UL([
    "**Temperatura primeiro**, umidade depois: o erro de temperatura altera a umidade.",
    "**Na temperatura de uso** (25 a 30 °C), à sombra, sem pessoas por perto e com o sensor parado, longe do ESP32.",
    "**Use médias.** O sketch `m4a` escreve a média de cada minuto no Monitor Serial (linhas que começam com `#`). Durante a calibração, mantenha as constantes sem correção: `CORR_TEMP_C = 0.0`, `UR_A = 1.0` e `UR_B = 0.0`.",
  ]),

  H2("4.2 Temperatura: termômetro de referência"),
  OL([
    "**Referência:** um DS18B20 (±0,5 °C, usado na aula de sensores) ou um termômetro digital de laboratório. Termômetro clínico não serve (só mede perto de 37 °C), e a temperatura interna do MH-Z19C também não.",
    "Prenda a referência e o DHT22 **juntos**, a 1 ou 2 cm um do outro, a pelo menos 20 cm do ESP32.",
    "Espere **20 a 30 minutos** com tudo parado: a caixa plástica e os fios demoram a entrar em equilíbrio.",
    "Anote 5 médias de 1 minuto do DHT22 e 5 leituras da referência, e calcule a média de cada conjunto.",
    "Calcule `CORR_TEMP_C` = temperatura da referência − temperatura do DHT22.",
  ]),
  NOTA("Quando não corrigir", [
    "A referência também tem tolerância (±0,5 °C no DS18B20), e as duas se somam.",
    "**Até 0,5 °C de diferença:** não corrija. Deixe `CORR_TEMP_C = 0.0` e registre que o sensor foi conferido e está dentro da tolerância.",
    "**Entre 0,5 e 1,0 °C:** a diferença ainda cabe na soma das tolerâncias. Só corrija se a referência for melhor que o DHT22 (termômetro de laboratório de ±0,1 a 0,2 °C) ou se a diferença se repetir em outro dia.",
    "**Acima de 1,0 °C:** corrija.",
  ], AZUL),
  ESPACO(),

  H2("4.3 Umidade: sal num pote fechado"),
  P("Uma **solução salina saturada** (uma pasta de sal com um pouco de água, com sal sobrando sem dissolver) mantém o ar de um recipiente fechado numa umidade relativa fixa, que quase não depende da temperatura. É um método clássico de laboratório, de custo muito baixo."),
  TAB(["Sal", "UR de equilíbrio a 25 °C", "Onde encontrar", "Uso"], [
    ["**Cloreto de sódio (NaCl)**, sal de cozinha", "**75,3 %**", "mercado", "Ponto principal"],
    ["**Cloreto de magnésio (MgCl₂)**", "**32,8 %**", "farmácia ou loja de produtos naturais", "Segundo ponto (ganho)"],
    ["Cloreto de potássio (KCl)", "84,3 %", "loja de química", "Ponto alto, opcional"],
  ], [0.36, 0.2, 0.26, 0.18]),
  ESPACO(),
  OL([
    "Num **pote de vidro com tampa de rosca**, coloque um recipiente raso (uma tampa de garrafa, por exemplo) com sal e algumas gotas de água, até formar uma pasta úmida, **com sal sem dissolver**. Se dissolver tudo, ponha mais sal.",
    "Prenda o DHT22 **suspenso** dentro do pote, sem encostar na pasta (respingo de sal estraga o sensor). Passe o cabo pela tampa e **vede o furo** com cola quente ou massa de modelar. O ESP32 fica do lado de fora.",
    "Deixe o pote longe do sol e de correntes de ar, em temperatura estável. Variação de temperatura cria condensação dentro do pote e estraga o ensaio.",
    "**Espere de 6 a 12 horas** (de preferência a noite toda), registrando pelo Monitor Serial ou pela telemetria (Etapa 4B). A leitura se aproxima do valor de equilíbrio e se estabiliza.",
    "Use a média da última hora. Com um ponto só: `UR_A = 1.0` e `UR_B` = 75,3 − umidade lida.",
    "Com o segundo pote (MgCl₂): `UR_A` = (75,3 − 32,8) / (L75 − L33) e `UR_B` = 75,3 − `UR_A` × L75, em que L75 e L33 são as médias lidas em cada pote.",
  ]),
  NOTA("Quando não corrigir, e um exemplo de conta", [
    "A exatidão do DHT22 é de ±2 %. Só corrija se pelo menos um dos potes ficar fora dela: NaCl fora de 73,3 a 77,3 %, ou MgCl₂ fora de 30,8 a 34,8 %. Com os dois dentro, deixe `UR_A = 1.0` e `UR_B = 0.0`.",
    "Exemplo: no pote de sal de cozinha, o DHT22 leu 71,9 % (L75), fora da tolerância; no de MgCl₂, leu 33,4 % (L33).",
    "`UR_A` = 42,5 / (71,9 − 33,4) = 1,104 e `UR_B` = 75,3 − 1,104 × 71,9 = −4,1. Na sala, uma leitura de 60,0 % passa a 1,104 × 60,0 − 4,1 = 62,1 %.",
  ], AZUL),
  ESPACO(),

  H2("4.4 Escrever a correção nos sketches e registrar"),
  CODIGO([
    "// deixe 0 / 1 / 0 enquanto nao calibrar; os mesmos valores no m4a e no m4b",
    "const float CORR_TEMP_C = 0.0;       // C: T_referencia - T_lida",
    "const float UR_A = 1.0;              // ganho da umidade (2 pontos) ou 1.0",
    "const float UR_B = 0.0;              // %: deslocamento da umidade",
    "",
    "float t  = tLida + CORR_TEMP_C;",
    "float ur = constrain(UR_A * urLida + UR_B, 0, 100);   // sempre entre 0 e 100 %",
  ].join("\n"), { arquivo: false, titulo: "Constantes de calibração (m4a e m4b)" }),
  ESPACO(),
  P("No sketch, os números usam **ponto decimal**: escreva `1.104` e `-4.1`, e não 1,104 e −4,1."),
  P("Registre a calibração na pasta `calibracao/` do repositório telemetria-cria:"),
  TAB(["Campo", "Exemplo", "Seu valor"], [
    ["Sensor", "DHT22 / AM2302, cabo de 3 fios", ""],
    ["Data e local", "30/11/2026, bancada do Espaço CRIA", ""],
    ["Referência de temperatura", "DS18B20, a 2 cm", ""],
    ["Média da referência / média do DHT22", "28,6 °C / 28,4 °C", ""],
    ["`CORR_TEMP_C`", "0,0 (diferença de 0,2 °C, dentro da tolerância)", ""],
    ["Pote de NaCl: horas e média lida", "10 h; 71,9 %", ""],
    ["Pote de MgCl₂: horas e média lida", "10 h; 33,4 %", ""],
    ["`UR_A` e `UR_B`", "1,104 e −4,1 (no sketch: `1.104` e `-4.1`)", ""],
    ["Responsável", "nome de quem mediu", ""],
  ], [0.4, 0.38, 0.22]),
  ESPACO(),
  H2("4.5 Cuidados e quando refazer"),
  UL([
    "**Refaça a conferência uma vez por ano**, ou quando a leitura divergir de outro instrumento.",
    "**Não molhe o sensor.** Depois de condensação ou respingo, deixe-o secar em ar ambiente por um dia antes de confiar na umidade.",
    "**Afaste o DHT22 dos testes com álcool** das Partes 1 a 3. A folha de dados da Aosong avisa que vapores químicos interferem no elemento sensível; em sensores capacitivos de polímero, vapores de solventes podem deslocar a leitura de umidade por horas ou dias.",
    "**Troque o sensor** se, depois de seco, ele continuar marcando umidade fixa (0 ou 100 %) ou falhar em mais de uma leitura a cada dez com a fiação conferida.",
  ]),

  // =====================================================================
  H1("5. Etapa 4A — montagem e teste com o celular"),
  P("O ESP32 cria a própria rede Wi-Fi, `Ar-DHT22`, e serve uma página que o celular abre em `http://192.168.4.1`, com a temperatura, a umidade, a sensação térmica e o ponto de orvalho."),
  ...FIGURA(path.join(FIGS, "rede-4a.png"), "Etapa 4A: o celular se conecta direto à rede \"Ar-DHT22\" criada pelo ESP32 e abre http://192.168.4.1.", 1.33),

  H2("5.1 Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32 DevKit V1 (30 pinos) + cabo USB de dados", "Pode ser o mesmo das Partes anteriores"],
    ["1", "DHT22 / AM2302 com cabo de 3 fios", "Ou um dos outros formatos (seção 2.4)"],
    ["1", "Protoboard de 830 furos", ""],
    ["4", "Jumpers macho-macho", "1 laranja ou vermelho, 1 amarelo, 2 pretos; mais 3 se o cabo do sensor terminar em conector fêmea"],
    ["1", "Resistor de 10 kΩ (marrom, preto, laranja)", "Só para o DHT22 de 4 pinos, sem placa"],
    ["1", "Multímetro", "Para conferir a continuidade e a tensão"],
    ["1", "Celular com Wi-Fi e navegador", ""],
    ["—", "Termômetro de referência; pote de vidro e sal", "Para a calibração (seção 4)"],
  ], [0.08, 0.52, 0.4]),

  H2("5.2 Esquema de montagem (Fritzing)"),
  ...FIGURA(path.join(ESQ, "m4_dht22_esp32.png"), "DHT22 de 3 fios no ESP32: vermelho (VCC) ligado direto ao pino 3V3 (fio laranja), amarelo (dado) no D4 = GPIO 4, preto (GND) na trilha −. A trilha + não é usada. Arquivo `aula-ar/esquemas/saida-monitor/m4_dht22_esp32.fzz`.", 1.33),
  TAB(["De", "Para", "Fio"], [
    ["GND do ESP32", "Trilha − de baixo (a da linha azul)", "Preto"],
    ["Fio vermelho do sensor (coluna 10)", "**3V3** do ESP32, direto", "Laranja (ou vermelho)"],
    ["Fio amarelo do sensor (coluna 11)", "**D4** (GPIO 4) do ESP32", "Amarelo"],
    ["Fio preto do sensor (coluna 12)", "Trilha −", "Preto"],
    ["Trilha + de baixo", "nada", "—"],
  ], [0.36, 0.4, 0.24]),
  ESPACO(),
  NOTA("O fio vermelho não é ligado à trilha +", "Nas Partes 1 a 3, a trilha + da protoboard é de **5 V** (VIN). Alimentado em 5 V, o DHT22 funciona, mas o pull-up interno leva o fio de dados a 5 V, e o GPIO do ESP32 só aceita 3,3 V. Por isso o fio vermelho vai **direto ao pino 3V3**, tanto aqui quanto no nó completo da Parte 5.", VERMELHO),
  ESPACO(),

  H2("5.3 Passo a passo da montagem"),
  OL([
    "Com o **USB desligado**, posicione o ESP32 à esquerda da protoboard, como na figura.",
    "Ligue o **GND** do ESP32 à trilha **−** de baixo (a da linha azul).",
    "Encaixe os três fios do sensor na linha **J**: vermelho na coluna 10, amarelo na 11 e preto na 12. Se o cabo terminar num conector fêmea, use três jumpers macho-macho como extensão.",
    "Ligue a coluna 10 (vermelho) ao pino **3V3** do ESP32.",
    "Ligue a coluna 11 (amarelo) ao **D4** e a coluna 12 (preto) à trilha −.",
    "Só para o DHT22 de 4 pinos (grade para a frente, pinos nas colunas 10 a 13): o pino 3 (coluna 12) fica sem ligação e o GND é o pino 4, então o fio preto sai da **coluna 13**, e não da 12. Ponha o resistor de 10 kΩ entre a coluna 10 (VCC) e a 11 (dado). No módulo de 3 pinos, siga a serigrafia (`+`, `out`, `−`): a ordem muda de um fabricante para outro.",
    "Deixe o sensor na ponta do cabo, **afastado do ESP32**, sem sol direto.",
  ]),

  H2("5.4 Conferência com o multímetro"),
  OL([
    "Com o **USB desligado** e o multímetro na escala de continuidade, confira se o fio vermelho chega ao 3V3 (e não ao VIN) e se não há ligação entre o 3V3 e o GND.",
    "Ligue o USB e meça entre o **fio vermelho e o preto**. O valor esperado é de 3,2 a 3,4 V.",
    "Meça entre o **fio amarelo e o preto**: entre 2,7 e 3,3 V (o pull-up mantém o fio em nível alto; antes de gravar o sketch, o GPIO 4 puxa a tensão um pouco para baixo). Se der 0 V, falta o pull-up ou o fio está em curto com o GND.",
  ]),

  H2("5.5 Instalar a biblioteca e gravar o sketch m4a_dht22_celular"),
  OL([
    "Na Arduino IDE, abra Ferramentas → Gerenciar Bibliotecas, procure **DHT sensor library** (Adafruit) e instale. Quando a IDE perguntar sobre as dependências, escolha instalar todas: a **Adafruit Unified Sensor** é instalada junto.",
    "Abra `aula-ar/codigo/m4a_dht22_celular/m4a_dht22_celular.ino` (com `monitor_wifi.h` e `pagina_web.h` na mesma pasta).",
    "Escolha a placa **DOIT ESP32 DEVKIT V1** e a porta do ESP32, e clique em **Carregar** (segure **BOOT** se parar em `Connecting...`).",
    "Abra o **Monitor Serial** em 115200 baud.",
  ]),
  CODIGO([
    "arduino-cli lib install \"DHT sensor library\"",
    "cd aula-ar/codigo/m4a_dht22_celular",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (no Linux, troque COM4 por /dev/ttyUSB0)" }),

  H2("5.6 Abrir no celular"),
  OL([
    "No celular, entre na rede Wi-Fi **Ar-DHT22**, senha **12345678**. Quando o celular avisar que a rede não tem internet, escolha **manter conectado**; se a página não abrir, desligue os dados móveis.",
    "No navegador, abra `http://192.168.4.1`. O valor principal é a temperatura; abaixo aparecem a umidade, a sensação térmica, o ponto de orvalho e a contagem de falhas. O gráfico mostra a temperatura.",
    "Os dados brutos ficam em `http://192.168.4.1/dados`.",
  ]),
  TAB(["Parâmetro da Etapa 4A", "Valor", "Onde mudar"], [
    ["Nome da rede (SSID)", "`Ar-DHT22`", "1º argumento de `monitorIniciar` no `setup()`"],
    ["Senha da rede", "`12345678` (mínimo de 8 caracteres)", "2º argumento de `monitorIniciar`; sem ele, vale a senha padrão"],
    ["IP do ESP32", "`192.168.4.1` (fixo no modo ponto de acesso)", "—"],
    ["Página e dados", "`/` e `/dados`", "`pagina_web.h` e o sketch"],
    ["Intervalo de leitura", "2,5 s (mínimo de 2 s)", "`INTERVALO_MS`"],
  ], [0.26, 0.36, 0.38]),
  ESPACO(),
  NOTA("Várias placas na mesma sala", "Se vários grupos gravarem o mesmo sketch, todas as redes se chamarão Ar-DHT22. Cada grupo deve trocar o nome, por exemplo `monitorIniciar(\"Ar-DHT22-G3\")`.", AZUL),

  H2("5.7 O que aparece no Monitor Serial"),
  CODIGO([
    "Rede Wi-Fi: Ar-DHT22  senha: 12345678  ->  abra http://192.168.4.1",
    "DHT22 no GPIO 4 | correcoes: T +0.0 C | UR x 1.000 +0.0",
    "Temperatura_C:28.4 Umidade_%:62.0 Sensacao_C:30.3 Orvalho_C:20.4",
    "Temperatura_C:28.5 Umidade_%:61.8 Sensacao_C:30.5 Orvalho_C:20.4",
    "...",
    "# media de 1 min: T = 28.43 C | UR = 61.9 % | falhas ate agora: 0 de 24",
    "...",
    "Temperatura_C:29.4 Umidade_%:84.0 Sensacao_C:36.9 Orvalho_C:26.4",
    "...",
    "FALHA 1 de 61: dado no GPIO 4? VCC no 3V3? GND? pull-up?",
  ].join("\n"), { arquivo: false, titulo: "Exemplo (os números do seu sensor serão outros)" }),
  ESPACO(),
  P("A linha com 29,4 °C e 84,0 % é um **sopro** na grade: a umidade sobe dezenas de pontos percentuais em segundos, a temperatura sobe pouco e a sensação térmica calculada sobe junto (num dia quente, pode passar de 41 °C e pôr a página em alerta por alguns instantes). A linha `FALHA` aparece quando o fio de dados é retirado; a página só muda a partir da segunda falha seguida. As linhas `Temperatura_C:...` servem ao **Plotter Serial**; as que começam com `#` trazem a média de cada minuto, usada na calibração."),

  H2("5.8 Testes de funcionamento da Etapa 4A"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Alimentação", "Multímetro entre o fio vermelho e o preto", "3,2 a 3,4 V"],
    ["2", "Leitura", "Monitor Serial por 2 minutos", "Uma linha a cada 2,5 s, com uma casa decimal e sem `FALHA`"],
    ["3", "Rede e página", "Rede `Ar-DHT22`, `http://192.168.4.1`", "Página abre e os valores mudam a cada poucos segundos"],
    ["4", "Valores plausíveis", "Comparar com a tabela da seção 3", "Temperatura e umidade dentro do esperado para o lugar"],
    ["5", "Sopro", "Expirar devagar a 10 cm da grade por 5 s", "Umidade sobe 20 a 40 pontos percentuais (limitada a 100 %); temperatura sobe pouco, até 1 a 2 °C; volta em 1 a 2 min"],
    ["6", "Mão em concha", "Envolver o sensor com a mão por 1 min, sem soprar", "Temperatura e umidade sobem devagar"],
    ["7", "Falha proposital", "Tirar o fio amarelo do D4 por 10 s e recolocar", "Linhas `FALHA` e página em alerta; depois, as leituras voltam sem intervenção e o gráfico recomeça"],
    ["8", "Posição", "Encostar o sensor no ESP32 por 10 min e depois afastar 20 cm", "Perto da placa, a temperatura fica 1 a 3 °C mais alta"],
    ["9", "Média", "Esperar a linha `# media de 1 min`", "No máximo 2 falhas em 24 leituras"],
    ["10", "Referência", "Comparar com um termômetro (seção 4.2)", "Diferença de até 0,5 °C: sensor conferido"],
  ], [0.05, 0.17, 0.39, 0.39]),

  H2("5.9 Problemas comuns da Etapa 4A"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`FALHA` em todas as leituras", "Fio de dados fora do D4, sensor sem alimentação ou fios trocados", "Confira as cores e a tabela da seção 5.2; meça 3,3 V entre vermelho e preto"],
    ["`FALHA` em todas, no DHT22 de 4 pinos", "Falta o resistor de pull-up, ou o GND está no pino 3", "10 kΩ entre o dado e o 3V3; GND no pino 4 (seção 5.3, passo 6)"],
    ["Falhas esporádicas", "Mau contato, cabo longo ou alimentação abaixo de 3,2 V", "Reencaixe os fios; use o cabo de fábrica; acrescente 10 kΩ entre o amarelo e o vermelho"],
    ["Erro ao compilar: `DHT.h: No such file`", "Biblioteca não instalada", "Instale a DHT sensor library (seção 5.5)"],
    ["Temperatura alta demais e umidade baixa demais", "Sensor perto do ESP32, dos MQ ou no sol", "Afaste o sensor, na ponta do cabo, à sombra"],
    ["Umidade fixa em 100 % (ou perto)", "Condensação no sensor", "Deixe secar por um dia em ar ambiente"],
    ["Sensor quente ao toque", "VCC e GND invertidos", "Desligue imediatamente e confira as cores; o sensor pode ter queimado"],
    ["ESP32 reinicia sozinho, com `Interrupt wdt timeout` no Monitor Serial", "A biblioteca do DHT22 travou numa resposta interrompida no meio (mau contato)", "Firme os três fios e não emende o cabo. No nó completo (Parte 5), o DHT22 é lido por uma rotina com limite de tempo, que não trava"],
    ["Página não abre", "Celular em outra rede, ou usando os dados móveis", "Volte para `Ar-DHT22`; desligue os dados móveis"],
  ], [0.32, 0.34, 0.34]),

  // =====================================================================
  ...QUEBRA(),
  H1("6. Etapa 4B — o DHT22 na Rede de Telemetria"),
  P("A montagem não muda: o ESP32 passa a entrar na rede Wi-Fi da telemetria e publica `temperatura` e `umidade` no broker do servidor a cada 10 segundos."),
  ...FIGURA(path.join(FIGS, "rede-4b.png"), "Etapa 4B: o nó do DHT22 publica cria/teste/no8/temperatura e cria/teste/no8/umidade no servidor; o painel é aberto em http://IP_DO_SERVIDOR:3000.", 1.33),

  H2("6.1 Antes de começar: o que já está pronto desde a Parte 1"),
  TAB(["Item", "Onde está na Parte 1", "Conferir"], [
    ["Parâmetros de rede (SSID, senha, IP do servidor, portas, usuário MQTT)", "seção 6.1", "Tabela preenchida com o coordenador"],
    ["IP fixo do servidor", "seção 6.2", "`hostname -I` no servidor mostra o IP reservado"],
    ["Servidor no ar", "seção 6.3", "`curl -i http://localhost:3000/saude` responde 200; porta 3000 liberada"],
    ["Rede alcançável da sala", "seção 6.4", "`Test-NetConnection IP_DO_SERVIDOR -Port 1883` (PowerShell) e painel abrindo no celular"],
    ["Arduino IDE com CriaTelemetria e PubSubClient", "seção 6.5", "Exemplo da CriaTelemetria aparece no menu"],
    ["`credenciais.h`", "seção 6.6", "O mesmo arquivo do `m1b` serve: copie-o para a pasta do `m4b`"],
  ], [0.3, 0.14, 0.56]),
  ESPACO(),

  H2("6.2 Ajustar e gravar o sketch m4b_dht22_telemetria", { quebra: true }),
  TAB(["Constante", "O que colocar"], [
    ["`PROJETO`", "`\"teste\"` na bancada; `\"ar\"` só no monitor definitivo. Deve ser igual ao `MQTT_USUARIO` do `credenciais.h`"],
    ["`NO`", "Um nó livre. O exemplo usa `\"no8\"`, para que os nós das Partes 1 a 3 continuem como `no5`, `no6` e `no7`"],
    ["`PINO_DHT`", "`4` (já vem assim)"],
    ["`CORR_TEMP_C`, `UR_A`, `UR_B`", "As correções da seção 4, iguais às do `m4a` (ou os valores sem correção: 0.0, 1.0 e 0.0)"],
    ["`INTERVALO_MS`", "`10000` (10 s), o padrão do catálogo"],
  ], [0.32, 0.68]),
  ESPACO(),
  P("O sketch publica os valores **já corrigidos**, como pede o catálogo de tópicos (\"o valor medido, já calibrado\"), arredondados a uma casa decimal, que é a resolução do sensor. Um valor inteiro, como 62,0, aparece sem a casa decimal (`62`). Leitura com falha **não é publicada** e não recebe número de sequência."),
  CODIGO([
    "cd aula-ar/codigo/m4b_dht22_telemetria",
    "cp ../m1b_mq135_telemetria/credenciais.h .",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 \\",
    "    --library /dados/Projetos/telemetria-cria/firmware/biblioteca-cria .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (ajuste o caminho da biblioteca e a porta à sua máquina)" }),

  H2("6.3 O que aparece no Monitor Serial"),
  CODIGO([
    "[cria] nó cria/teste/no8, biblioteca CriaTelemetria 0.2.0",
    "[cria] boot 1",
    "[cria] aguardando o Wi-Fi \"telemetria-cria\"...",
    "[dht22] no cria/teste/no8 | correcoes: T +0.0 C | UR x 1.000 +0.0",
    "[cria] Wi-Fi conectado, IP 192.168.0.26",
    "[cria] conectado ao broker; status online em cria/teste/no8/status",
    "[cria] relógio acertado: 2026-11-30 13:00:15 UTC",
    "[cria] cria/teste/no8/temperatura",
    "       {\"valor\":28.4,\"unidade\":\"C\",\"seq\":1,\"boot\":1,\"t\":1796043615318}",
    "[cria] cria/teste/no8/umidade",
    "       {\"valor\":62,\"unidade\":\"%\",\"seq\":2,\"boot\":1,\"t\":1796043615323}",
  ].join("\n"), { arquivo: false, titulo: "Exemplo de partida normal" }),
  ESPACO(),
  P("O DHT22 não tem tempo de aquecimento: a primeira publicação sai assim que o relógio é acertado. Cada ciclo de 10 segundos gera **duas mensagens**, uma por grandeza, com números de sequência seguidos. O `boot 1` do exemplo vale para uma placa que nunca usou a CriaTelemetria: o contador fica guardado no ESP32 e continua de onde parou nas Partes 1 a 3. Neste exemplo, cada linha de publicação foi dividida em duas para caber na página."),

  H2("6.4 Ver os dados no painel"),
  OL([
    "Em qualquer computador ou celular ligado à rede Wi-Fi da telemetria, abra `http://192.168.0.10:3000` (troque pelo IP do seu servidor).",
    "O cartão `teste/no8` aparece on-line, com as duas grandezas, `temperatura` (C) e `umidade` (%), cada uma com o seu gráfico.",
    "Com os nós das Partes 1 a 3 ligados, os quatro cartões aparecem lado a lado.",
  ]),
  TAB(["Endereço (no navegador)", "O que mostra"], [
    ["`http://192.168.0.10:3000/api/nos`", "Os nós e o último valor de cada grandeza (JSON)"],
    ["`http://192.168.0.10:3000/api/historico?projeto=teste&no=no8&grandeza=umidade&minutos=60`", "Os pontos de umidade da última hora (JSON)"],
    ["`http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste&no=no8`", "Planilha CSV das últimas 24 h, com as duas grandezas"],
  ], [0.62, 0.38]),
  ESPACO(),

  H2("6.5 Testes de funcionamento da Etapa 4B"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Conexão", "Ligar o nó e olhar o Monitor Serial", "Wi-Fi, broker e relógio, nessa ordem"],
    ["2", "Status no broker", "Observador `mosquitto_sub` no servidor (Parte 1, seção 6.3)", "`cria/teste/no8/status online`"],
    ["3", "Publicação", "Acompanhar por 1 minuto", "Duas linhas a cada 10 s; `seq` crescendo de 1 em 1"],
    ["4", "Painel", "`http://192.168.0.10:3000` no computador e no celular", "Cartão `teste/no8` on-line, com as duas grandezas"],
    ["5", "Sopro", "Expirar a 10 cm da grade por 5 s", "Degrau na umidade na leitura seguinte (até 10 s)"],
    ["6", "Falha do sensor", "Tirar o fio amarelo do D4 por 30 s", "Nada é publicado; o `seq` não avança; o cartão continua on-line, mas o horário da última leitura deixa de avançar"],
    ["7", "Queda do Wi-Fi", "Desligar o ponto de acesso por 1 min", "Leituras reenviadas com `\"fila\":1`; gráfico sem lacuna"],
    ["8", "Queda do nó", "Desligar o USB do ESP32", "`status offline` em segundos; cartão off-line"],
    ["9", "Exportação", "Abrir o link do CSV", "Planilha com uma linha por leitura: `data_hora`, `grandeza` (`temperatura` ou `umidade`), `valor` e `unidade`"],
    ["10", "Um dia inteiro", "Deixar 24 h publicando", "Temperatura sobe à tarde e a umidade cai; à noite, o contrário. Perda de mensagens abaixo de 1 %"],
  ], [0.05, 0.16, 0.38, 0.41]),

  H2("6.6 Os quatro sensores juntos: interpretar os MQ com a ajuda do DHT22"),
  P("Com os quatro nós publicando (`no5` com o MQ-135, `no6` com o MQ-2, `no7` com o MH-Z19C e `no8` com o DHT22), o painel permite conferir a principal razão de o DHT22 estar no monitor. Pelas folhas de dados dos MQ, a resistência Rs **diminui quando a temperatura e a umidade sobem**, mesmo em ar limpo. Faça a atividade a seguir:"),
  OL([
    "Deixe os quatro nós ligados por 24 horas na mesma sala e na mesma bancada, com o DHT22 a pelo menos 20 cm dos MQ, que aquecem.",
    "Exporte o CSV do dia em `http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste`.",
    "O CSV tem uma linha por leitura. Na planilha, filtre a coluna `grandeza` (ou use uma tabela dinâmica) para separar `mq135`, `umidade` e `temperatura`.",
    "Faça um gráfico de dispersão com `data_hora` no eixo horizontal, com `mq135` no eixo principal e `umidade` no eixo secundário (o Rs/R0 fica perto de 1, e a umidade vai de 0 a 100). Repita com `temperatura`.",
    "Procure os momentos em que o Rs/R0 caiu **sem** o CO₂ subir e **sem** fonte de gás: eles coincidem com a subida da umidade ou da temperatura?",
  ]),
  TAB(["O painel mostra", "Interpretação provável"], [
    ["Rs/R0 do MQ-135 cai junto com a subida do CO₂, sala cheia", "Ar viciado: ventile"],
    ["Rs/R0 cai devagar, umidade sobe, CO₂ estável, sala vazia", "Efeito da umidade no sensor, não poluição"],
    ["Rs/R0 cai de repente, umidade e CO₂ estáveis", "Vapor ou gás perto do sensor (álcool, produto de limpeza, fumaça)"],
    ["Temperatura do `no8` bem acima da de outro termômetro da sala", "DHT22 perto demais do ESP32 ou dos MQ"],
  ], [0.55, 0.45]),
  ESPACO(),
  P("O projeto aprovado não corrige os MQ pela temperatura e pela umidade: ele informa tendências e registra as cinco séries (`mq135`, `mq2`, `co2`, `temperatura` e `umidade`), para que essa interpretação conjunta possa ser feita. Os casos da tabela são referências do curso: anote o que a sua bancada mostrar."),

  H2("6.7 Problemas comuns da Etapa 4B"),
  P("As mensagens da biblioteca e as causas de rede são as mesmas da Parte 1 (seção 6.11). As específicas desta parte:"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`[dht22] sem resposta do sensor`", "Fio de dados solto, sensor sem alimentação ou falta de pull-up", "Volte à Etapa 4A (seções 5.4 e 5.9)"],
    ["Cartão on-line, mas a última leitura não se atualiza", "O sensor parou de responder (o nó continua conectado)", "Veja o Monitor Serial; confira os três fios"],
    ["Só aparece `temperatura` (ou só `umidade`)", "Sketch alterado, ou grandeza escrita fora das regras do catálogo", "Use os nomes `temperatura` e `umidade`, em minúsculas e sem acento"],
    ["`AVISO: a conexão cai logo depois de abrir`", "Dois nós com o mesmo `NO`", "Use `no8` para o DHT22, diferente dos outros nós"],
    ["Valores diferentes dos da Etapa 4A", "Correções diferentes nos dois sketches", "Copie `CORR_TEMP_C`, `UR_A` e `UR_B` do `m4a` para o `m4b`"],
  ], [0.33, 0.33, 0.34]),

  H2("6.8 Do projeto teste ao monitor definitivo"),
  P("Aprovado na bancada, o DHT22 passa a fazer parte do monitor definitivo. Troque, no sketch e no `credenciais.h`, o projeto para `ar` (usuário MQTT `ar`, com a senha do projeto) e o nó para `no1`: os tópicos passam a ser `cria/ar/no1/temperatura` e `cria/ar/no1/umidade`, os mesmos do firmware completo `telemetria-cria/firmware/no-ar`. Só **um** ESP32 pode ser o `ar/no1`: enquanto os sensores estiverem em placas separadas, mantenha `no5` a `no8` no projeto `teste`. No guia da Parte 5 (nó completo), o MQ-2 (GPIO 34), o MQ-135 (GPIO 35), o MH-Z19C (GPIO 16 e 17) e o DHT22 (GPIO 4, alimentado pelo 3V3) são reunidos nesse nó, com fonte de 5 V e 2 A e abrigo impresso em 3D. No abrigo, o DHT22 fica afastado dos MQ e do ESP32, com a grade exposta ao ar."),

  // =====================================================================
  ...QUEBRA(),
  H1("7. Códigos"),
  H2("7.1 Etapa 4A — m4a_dht22_celular.ino"),
  P("Arquivo `aula-ar/codigo/m4a_dht22_celular/m4a_dht22_celular.ino`. Os arquivos auxiliares `monitor_wifi.h` e `pagina_web.h` ficam na mesma pasta."),
  CODIGO(COD("m4a_dht22_celular"), { titulo: "m4a_dht22_celular.ino", tamanho: 14 }),
  H2("7.2 Etapa 4B — m4b_dht22_telemetria.ino"),
  P("Arquivo `aula-ar/codigo/m4b_dht22_telemetria/m4b_dht22_telemetria.ino`. Precisa do `credenciais.h` na mesma pasta."),
  CODIGO(COD("m4b_dht22_telemetria"), { titulo: "m4b_dht22_telemetria.ino", tamanho: 14 }),
];

module.exports = DOC({ titulo: "Guia de montagem do monitor de qualidade do ar — Parte 4: DHT22", rodape: "Guia de montagem do monitor de qualidade do ar — Parte 4: o DHT22 — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
