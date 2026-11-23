// Guia de montagem do monitor de qualidade do ar (Rede de Telemetria do Espaco CRIA) - Parte 2: o sensor MQ-2.
// Gera ../../saida/Guia-Montagem-Monitor-Ar-Parte2-MQ2.docx (gerar.sh converte para PDF).
// Esquema: ../../esquemas/saida-monitor/m2_mq2_esp32.png (python esquemas.py --monitor).
// Diagramas de rede: figuras/rede-2a.png e rede-2b.png (gerar.sh). A rede e o servidor estao na Parte 1 (guia.js).
const path = require("path");
const { H1, H2, H3, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, QUEBRA, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const ESQ = path.join(AQUI, "..", "..", "esquemas", "saida-monitor");
const FIGS = path.join(AQUI, "figuras");
const COD = (n) => path.join(AQUI, "..", "..", "codigo", n, `${n}.ino`);
const SAIDA = path.join(AQUI, "..", "..", "saida", "Guia-Montagem-Monitor-Ar-Parte2-MQ2.docx");
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Guia de montagem — Parte 2",
    titulo: "Monitor de Qualidade do Ar",
    subtitulo: "O sensor MQ-2 (gases inflamáveis e fumaça): funcionamento, valores esperados, calibração, teste com o celular ligado só ao Wi-Fi do ESP32 e integração à Rede de Telemetria do Espaço CRIA",
    info: [
      "**Placa:** ESP32 DevKit V1 (30 pinos)  •  **Sketches:** `aula-ar/codigo/m2a_mq2_celular` e `m2b_mq2_telemetria`",
      "**Pré-requisito:** Parte 1 (MQ-135), em especial a seção 6 (parâmetros da rede, IP fixo e conferência do servidor)",
      "Projeto Rede de Telemetria do Espaço CRIA — Edital nº 19/2026-FACEPE — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // =====================================================================
  H1("1. Onde estamos"),
  P("Na Parte 1, o **MQ-135** foi montado, calibrado (R0), testado pelo celular e integrado à Rede de Telemetria. Esta Parte 2 faz o mesmo percurso com o **MQ-2**, o segundo sensor de gás do monitor. O roteiro é o mesmo; mudam apenas o sensor, o pino do ESP32 e o nome da grandeza publicada."),
  TAB(["", "Parte 1", "Parte 2 (este guia)"], [
    ["Sensor", "MQ-135 (ar viciado)", "**MQ-2** (gases inflamáveis e fumaça)"],
    ["Pino do ESP32", "GPIO 35", "**GPIO 34**"],
    ["Divisor e capacitor", "100 kΩ / 200 kΩ, 100 nF", "os mesmos"],
    ["Etapa A (celular)", "`m1a_mq135_celular`, rede `Ar-MQ135`", "`m2a_mq2_celular`, rede `Ar-MQ2`"],
    ["Etapa B (telemetria)", "`m1b_mq135_telemetria`, grandeza `mq135`", "`m2b_mq2_telemetria`, grandeza `mq2`"],
    ["Nó de bancada (exemplo)", "`cria/teste/no5`", "`cria/teste/no6`"],
    ["Nó definitivo", "`cria/ar/no1/mq135`", "`cria/ar/no1/mq2`"],
  ], [0.26, 0.34, 0.4]),
  ESPACO(),
  P("Os pinos seguem o firmware do nó de ar da telemetria (`telemetria-cria/firmware/no-ar`): **MQ-2 no GPIO 34 e MQ-135 no GPIO 35**. Assim, quando os sensores se juntarem no nó completo (Parte 5), nenhum fio precisa mudar de lugar."),
  NOTA("O que vale da Parte 1 e não é repetido aqui", [
    "As regras elétricas do monitor (seção 1.5): ESP32 em 3,3 V, MQ em 5 V pelo VIN, só ADC1, GPIO 21 e 22 livres, montagem com o USB desligado. A regra de testar gases longe de chama continua valendo; os dois testes desta parte que envolvem fumaça e gás de isqueiro são feitos só pelo professor (seção 5.8).",
    "As contas do AO até Rs/R0 (seção 2.4) e o motivo do divisor 100 kΩ / 200 kΩ (seção 2.5).",
    "Toda a parte de rede e servidor (seções 6.1 a 6.6): parâmetros, IP fixo do servidor, conferência do servidor, teste da rede, Arduino IDE e `credenciais.h`.",
  ], AZUL),

  // =====================================================================
  ...QUEBRA(),
  H1("2. O sensor MQ-2"),
  H2("2.1 Para que serve"),
  P("O MQ-2 detecta **gases inflamáveis e fumaça**: GLP (o gás de cozinha, mistura de propano e butano), propano, metano (gás natural), hidrogênio, vapor de álcool e fumaça. É o sensor usado em alarmes de baixo custo contra vazamento de gás e fumaça. No monitor, ele responde à pergunta \"há algo inflamável ou fumaça no ar?\"."),
  P("Como o MQ-135, ele **não identifica** o gás e **não mede** concentração com exatidão: reage a todos esses gases ao mesmo tempo. O que ele entrega é a **razão Rs/R0**, que cai quando aparece gás."),
  NOTA("O MQ-2 deste projeto não é um alarme de segurança", "Ele serve para **ensinar e registrar tendências**. Para proteger uma cozinha ou um laboratório de verdade, use um detector de gás comercial, certificado, instalado conforme o fabricante. O limite inferior de explosividade do GLP fica perto de 2 % no ar (cerca de 20 000 ppm); detectores comerciais alarmam em 10 a 25 % disso (cerca de 2 000 a 5 000 ppm). O MQ-2 reage nessa faixa, mas não é calibrado nem testado para essa função.", VERMELHO),

  H2("2.2 Princípio de funcionamento"),
  P("O MQ-2 é da mesma família do MQ-135: uma película de **dióxido de estanho (SnO₂)** aquecida a algumas centenas de graus Celsius. No ar limpo, o oxigênio preso à superfície captura elétrons e a resistência **Rs** é alta. Um gás redutor (GLP, metano, hidrogênio, álcool) reage com esse oxigênio, os elétrons voltam ao SnO₂ e **Rs cai**. A diferença está na composição da película, escolhida pelo fabricante para responder mais aos gases inflamáveis. Os dados abaixo são da folha de dados da Hanwei; há versões com números um pouco diferentes (por exemplo, aquecedor de 31 Ω e 900 mW): vale a do fabricante do seu sensor."),
  TAB(["", "MQ-135", "MQ-2"], [
    ["Responde mais a", "Amônia, óxidos de nitrogênio, álcool, benzeno, fumaça", "GLP, propano, metano, hidrogênio, álcool, fumaça"],
    ["Uso típico", "Ar viciado, cheiro de produto", "Vazamento de gás combustível, fumaça"],
    ["Referência do R0 na folha de dados", "100 ppm de amônia", "1000 ppm de hidrogênio"],
    ["Rs/R0 em ar limpo (lido no gráfico da folha)", "≈ 3,6", "≈ 9,8"],
    ["Rs no gás de referência (folha de dados)", "30 a 200 kΩ (100 ppm de NH₃)", "3 a 30 kΩ (1000 ppm de isobutano)"],
    ["Faixa de detecção (folha de dados)", "10 a 300 ppm de NH₃; 10 a 1000 ppm de benzeno", "300 a 10 000 ppm de gás inflamável"],
    ["Aquecedor", "33 Ω, até 800 mW", "33 Ω, até 800 mW"],
    ["Temperatura de uso", "−10 a 45 °C", "−20 a 50 °C"],
  ], [0.34, 0.33, 0.33]),
  ESPACO(),
  P("As mesmas consequências práticas da Parte 1 valem aqui: **aquecer 10 minutos** antes de medir (24 a 48 horas na primeira vez), sensibilidade à **temperatura e à umidade** e **memória** depois de uma exposição forte."),
  P("Como no MQ-135, o monitor **não usa as curvas de ppm** da folha de dados. O R0 da folha é medido em 1000 ppm de hidrogênio, e em ar limpo o gráfico da folha dá Rs/R0 ≈ 9,8. O R0 deste projeto é o Rs **em ar limpo, medido pelo próprio nó**, como define o catálogo de tópicos da telemetria-cria (seção 4.1 do catálogo). Por isso o ar limpo dá Rs/R0 perto de 1."),

  H2("2.3 O módulo"),
  P("O módulo do MQ-2 é igual ao do MQ-135: pinos **VCC, GND, DO e AO**, um resistor de carga **RL** em série com o sensor, um comparador LM393 com trimpot (resistor ajustável) para a saída DO e dois LEDs. A ligação também é a mesma: **VCC no VIN (5 V), GND no GND, AO pelo divisor até o GPIO 34, DO sem ligação** (ele sai em 5 V)."),

  H2("2.4 O resistor de carga do MQ-2"),
  P("A folha de dados dá o Rs entre 3 e 30 kΩ em 1000 ppm de isobutano e diz que, em ar limpo, ele é pelo menos 5 vezes maior. O Rs em ar limpo fica, portanto, entre **algumas dezenas e algumas centenas de kΩ** (estimativa; varia muito entre sensores). Com o RL de 1 kΩ que muitos módulos trazem, a tensão no pino fica baixa demais para o ADC do ESP32, como acontecia com o MQ-135. A tabela mostra a tensão no GPIO 34 em ar limpo, com o divisor 100 kΩ / 200 kΩ e VC = 4,96 V:"),
  TAB(["Rs em ar limpo (exemplo)", "RL = 1 kΩ", "RL = 10 kΩ", "RL = 22 kΩ", "RL = 47 kΩ"], [
    ["30 kΩ", "0,11 V (abaixo)", "**0,81 V**", "**1,34 V**", "**1,90 V**"],
    ["100 kΩ", "0,03 V (abaixo)", "0,29 V (resolução ruim)", "**0,56 V**", "**0,96 V**"],
    ["300 kΩ", "0,01 V (abaixo)", "0,10 V (abaixo)", "0,21 V (resolução ruim)", "**0,39 V**"],
  ], [0.2, 0.17, 0.21, 0.21, 0.21]),
  ESPACO(),
  P("A regra é a mesma da Parte 1: **em ar limpo, o pino deve ficar acima de 0,3 V**. O maior Rs que o sketch mede (pino em 0,15 V) é de cerca de **21 kΩ com RL de 1 kΩ, 200 kΩ com 10 kΩ, 430 kΩ com 22 kΩ e 850 kΩ com 47 kΩ**. Comece pelo RL do seu módulo, meça o pino em ar limpo e aumente o RL se for preciso (seção 5.4)."),
  P("No outro extremo, com muito gás o Rs cai a poucos kΩ e o pino passa de 2,45 V: o sketch avisa \"saturou\" e trata como gás muito alto. Com RL de 10 kΩ, isso acontece com Rs abaixo de cerca de 3,4 kΩ; com 22 kΩ, abaixo de 7 kΩ; com 47 kΩ, abaixo de 14 kΩ. Um RL maior dá mais resolução em ar limpo, mas satura com menos gás: para o MQ-2, **10 kΩ ou 22 kΩ** oferecem o melhor compromisso entre as duas situações."),

  // =====================================================================
  H1("3. Parâmetros esperados em condições normais"),
  P("Os valores da folha de dados vêm marcados; os de Rs/R0 são **referências do curso**, para conferir a montagem, e não limites de segurança."),
  TAB(["Grandeza", "Valor esperado", "Observação"], [
    ["Tensão no VIN (USB)", "4,5 a 5,1 V", "Anote em `VC`. Abaixo de 4,5 V, troque o cabo ou a porta"],
    ["Corrente do aquecedor", "≈ 150 mA", "Folha de dados: 33 Ω em 5 V, até 800 mW"],
    ["Aquecimento (dia a dia)", "10 min", "O sketch não calibra nem publica antes disso"],
    ["Estabilização (sensor novo ou guardado)", "24 a 48 h ligado", "Folha de dados"],
    ["Tensão no pino em ar limpo", "0,3 a 2,0 V (ideal)", "Abaixo de 0,3 V: aumente o RL"],
    ["Rs em ar limpo", "dezenas a centenas de kΩ", "Estimativa: pelo menos 5 vezes o Rs em 1000 ppm de isobutano (3 a 30 kΩ)"],
    ["Rs/R0 em ar limpo", "**0,90 a 1,10**", "Fora disso, refaça a calibração"],
    ["Rs/R0 com bafo a 10 cm", "pequena variação (0,85 a 1,05)", "O MQ-2 quase não responde ao CO₂; a umidade e o ar morno do bafo mudam um pouco o Rs. Em geral, menos que no MQ-135"],
    ["Rs/R0 com algodão e álcool a 10 cm", "0,2 a 0,5", "Volta acima de 0,8 em alguns minutos"],
    ["Rs/R0 com fumaça de fósforo apagado", "0,3 a 0,6", "Só com o professor (seção 5.8)"],
    ["Rs/R0 com gás de isqueiro de pedra (sem chama, 1 s, a 15 cm)", "abaixo de 0,3 ou saturado", "Só com o professor (seção 5.8)"],
    ["Ambiente de operação", "−20 a 50 °C; umidade relativa até 95 %", "Folha de dados. Não deixe condensar água no sensor"],
  ], [0.36, 0.25, 0.39]),
  ESPACO(),
  P("O sketch `m2a` classifica a leitura com estes limites (constantes `LIMIAR_ATENCAO` e `LIMIAR_ALERTA`). Eles são mais baixos que os do MQ-135, porque o MQ-2 varia pouco com a ocupação da sala: quando a razão cai, em geral há mesmo gás ou fumaça perto."),
  TAB(["Rs/R0", "Mensagem", "Significado"], [
    ["≥ 0,80", "ar limpo", "Sem gás inflamável nem fumaça perceptíveis"],
    ["0,50 a 0,80", "gas ou fumaca por perto: verifique", "Vapor de álcool a distância, fumaça leve, fogão aceso por perto"],
    ["< 0,50", "GAS DETECTADO: ventile e verifique", "Gás ou fumaça perto do sensor. A página do celular pisca em vermelho"],
  ], [0.18, 0.38, 0.44]),

  // =====================================================================
  H1("4. Calibração do MQ-2"),
  P("A calibração é a mesma da Parte 1 (seção 4): **medir o R0**, o Rs do sensor em ar limpo, depois do aquecimento, na montagem definitiva. Resumo do procedimento, feito pelo sketch `m2a_mq2_celular`:"),
  OL([
    "Se o sensor for novo ou tiver ficado guardado por semanas, deixe-o ligado de 24 a 48 horas antes.",
    "Monte o circuito definitivo (seção 5), meça a tensão do VIN e escreva em `VC`; escreva o RL do módulo em `RL_KOHM`.",
    "Grave o `m2a` com `R0_KOHM = 0.0` e leve a montagem para perto de uma janela aberta, longe da cozinha, de produtos de limpeza e de álcool em gel.",
    "Espere os 10 minutos de aquecimento e os 5 minutos de calibração. O Monitor Serial escreve `>>> R0 = ... kOhm`.",
    "Escreva o valor em `R0_KOHM` no `m2a` **e** no `m2b`, e grave de novo. Em ar limpo, Rs/R0 deve ficar entre 0,90 e 1,10.",
    "Repita em outro dia. Se os dois R0 diferirem mais de 10 %, o sensor ainda não estabilizou.",
  ]),
  P("Registre a calibração na pasta `calibracao/` da telemetria-cria, com os mesmos campos da Parte 1 (seção 4.4):"),
  TAB(["Campo", "Exemplo", "Seu valor"], [
    ["Sensor", "MQ-2", ""],
    ["Data e hora", "26/11/2026, 09:50", ""],
    ["Local", "Janela do Espaço CRIA, aberta", ""],
    ["Temperatura e umidade", "28 °C, 70 %", ""],
    ["Horas de estabilização antes", "48 h", ""],
    ["RL do módulo", "10 kΩ (trocado; original 1 kΩ)", ""],
    ["Divisor e capacitor", "100 kΩ / 200 kΩ, 100 nF", ""],
    ["VC medido no VIN", "4,96 V", ""],
    ["Tensão no pino em ar limpo", "430 mV", ""],
    ["R0 obtido", "64,74 kΩ", ""],
    ["Responsável", "nome de quem mediu", ""],
  ], [0.42, 0.33, 0.25]),
  ESPACO(),
  P("Refaça a calibração quando trocar o sensor, o RL, o divisor ou a fonte; quando o Rs/R0 em ar limpo sair da faixa de 0,90 a 1,10 por mais de um dia; uma vez por mês em operação; e depois de uma exposição forte a gás, se o sensor não voltar ao normal em uma hora."),

  // =====================================================================
  H1("5. Etapa 2A — montagem e teste com o celular"),
  P("O ESP32 cria a própria rede Wi-Fi, `Ar-MQ2`, e serve uma página que o celular abre em `http://192.168.4.1`. Não há roteador, servidor nem internet."),
  ...FIGURA(path.join(FIGS, "rede-2a.png"), "Etapa 2A: o celular se conecta direto à rede \"Ar-MQ2\" criada pelo ESP32 e abre http://192.168.4.1.", 1.33),

  H2("5.1 Material"),
  TAB(["Qtd.", "Item", "Observação"], [
    ["1", "ESP32 DevKit V1 (30 pinos) + cabo USB de dados", "Pode ser o mesmo da Parte 1"],
    ["1", "Módulo MQ-2 (4 pinos: VCC, GND, DO, AO)", "Anote o código do RL"],
    ["1", "Resistor de 100 kΩ (marrom, preto, amarelo)", "Do AO ao GPIO 34"],
    ["1", "Resistor de 200 kΩ (vermelho, preto, amarelo)", "Ou dois de 100 kΩ em série"],
    ["1", "Capacitor cerâmico de 100 nF (código 104)", "Do GPIO 34 ao GND"],
    ["1", "Protoboard de 830 furos", ""],
    ["8", "Jumpers macho-macho", "2 vermelhos, 4 pretos, 2 amarelos"],
    ["1", "Multímetro", "Para conferir as tensões"],
    ["1", "Celular com Wi-Fi e navegador", ""],
    ["—", "Algodão e álcool 70 %", "Teste de resposta (seção 5.8)"],
    ["—", "Fósforos e isqueiro de pedra", "Só o professor (seção 5.8)"],
  ], [0.08, 0.52, 0.4]),

  H2("5.2 Esquema de montagem (Fritzing)"),
  ...FIGURA(path.join(ESQ, "m2_mq2_esp32.png"), "MQ-2 no ESP32: VCC na trilha + de 5 V (VIN, fio vermelho), GND (preto), AO → 100 kΩ → GPIO 34 → 200 kΩ → GND, com 100 nF entre o GPIO 34 e o GND. O DO fica sem ligação. Arquivo `aula-ar/esquemas/saida-monitor/m2_mq2_esp32.fzz`.", 1.33),
  TAB(["De", "Para", "Fio ou componente"], [
    ["VIN do ESP32", "Trilha + de baixo (vira **5 V**)", "Vermelho"],
    ["GND do ESP32", "Trilha − de baixo", "Preto"],
    ["VCC do MQ-2 (coluna 10)", "Trilha +", "Vermelho"],
    ["GND do MQ-2 (coluna 11)", "Trilha −", "Preto"],
    ["AO do MQ-2 (coluna 13, metade de cima)", "Coluna 13, metade de baixo", "Amarelo (jumper curto)"],
    ["Coluna 13 (linha D)", "Coluna 17 (linha D)", "**Resistor de 100 kΩ**"],
    ["Coluna 17 (linha C)", "Coluna 21 (linha C)", "**Resistor de 200 kΩ**"],
    ["Coluna 21", "Trilha −", "Preto"],
    ["Coluna 16 (linha A)", "Coluna 17 (linha A)", "**Capacitor de 100 nF**"],
    ["Coluna 16", "Trilha −", "Preto"],
    ["Coluna 17 (linha B), o \"nó\" do divisor", "**D34** (GPIO 34) do ESP32", "Amarelo"],
    ["DO do MQ-2 (coluna 12)", "nada", "—"],
  ], [0.4, 0.35, 0.25]),
  ESPACO(),
  NOTA("Mesma protoboard da Parte 1?", "A montagem é igual à do MQ-135, coluna por coluna; só o fio amarelo vai ao **D34** em vez do D35. Se quiser manter o MQ-135 montado, use outra protoboard ou desloque o MQ-2 para outras colunas, sempre com o seu próprio divisor e capacitor. Os dois MQ juntos no mesmo ESP32, com fonte externa, ficam para a Parte 5.", AZUL),
  ESPACO(),

  H2("5.3 Passo a passo da montagem"),
  OL([
    "Com o **USB desligado**, encaixe o ESP32 e a protoboard como na figura.",
    "Ligue o **VIN** do ESP32 à trilha **+** de baixo (a da linha vermelha) e o **GND** à trilha **−** (a da linha azul). A trilha + agora é de **5 V**.",
    "Encaixe o MQ-2 com os pinos na linha **J**, colunas 10 (VCC), 11 (GND), 12 (DO) e 13 (AO). Confira a serigrafia do seu módulo.",
    "Ligue VCC à trilha + e GND à trilha −.",
    "Desça o AO: jumper da coluna 13, linha F, para a coluna 13, linha E.",
    "Divisor: 100 kΩ da coluna 13 à 17 (linha D); 200 kΩ da coluna 17 à 21 (linha C); jumper da coluna 21 à trilha −.",
    "Capacitor entre as colunas 16 e 17 (linha A); jumper da coluna 16 à trilha −.",
    "Ligue a coluna 17 (linha B) ao **D34** do ESP32. **Não ligue o DO.**",
  ]),

  H2("5.4 Conferência com o multímetro"),
  OL([
    "**Desligado**, na escala de resistência: entre a coluna 17 e o GND, cerca de **67 kΩ** (RL de 1 kΩ) a **71 kΩ** (RL de 10 kΩ). Entre VIN e GND, cerca de **30 Ω** (o aquecedor); de 0 a 1 Ω é curto.",
    "Ligue o USB: o LED de alimentação do módulo acende. Meça entre **VIN e GND** (4,5 a 5,1 V) e anote em `VC`.",
    "Depois de 10 minutos, meça entre **AO e GND** e entre a **coluna 17 e GND**. A segunda é 2/3 da primeira e **nunca passa de 3,3 V**.",
    "Em ar limpo, se a coluna 17 ficar **abaixo de 0,3 V**, aumente o RL do módulo para 10 kΩ ou 22 kΩ (procedimento de solda na Parte 1, seção 5.4) e escreva o novo valor em `RL_KOHM` nos dois sketches.",
  ]),

  H2("5.5 Gravar o sketch m2a_mq2_celular"),
  P("O sketch fica em `aula-ar/codigo/m2a_mq2_celular/`, com `monitor_wifi.h` e `pagina_web.h` na mesma pasta. Na Arduino IDE: placa **DOIT ESP32 DEVKIT V1**, porta do ESP32, confira `RL_KOHM`, `VC` e `R0_KOHM = 0.0`, clique em **Carregar** (segure **BOOT** se parar em `Connecting...`) e abra o **Monitor Serial** em 115200 baud."),
  CODIGO([
    "cd aula-ar/codigo/m2a_mq2_celular",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (no Linux, troque COM4 por /dev/ttyUSB0)" }),

  H2("5.6 Abrir no celular"),
  OL([
    "No celular, entre na rede Wi-Fi **Ar-MQ2**, senha **12345678**.",
    "Quando o celular avisar que a rede não tem internet, escolha **manter conectado**. Se a página não abrir, desligue os dados móveis.",
    "No navegador, abra `http://192.168.4.1`. Os dados brutos ficam em `http://192.168.4.1/dados`.",
  ]),
  TAB(["Parâmetro da Etapa 2A", "Valor", "Onde mudar"], [
    ["Nome da rede (SSID)", "`Ar-MQ2`", "1º argumento de `monitorIniciar` no `setup()`"],
    ["Senha da rede", "`12345678` (mínimo de 8 caracteres)", "acrescente um 2º argumento a `monitorIniciar` (o sketch usa o padrão)"],
    ["IP do ESP32", "`192.168.4.1` (fixo no modo ponto de acesso)", "—"],
    ["Página e dados", "`http://192.168.4.1/` e `/dados`", "`pagina_web.h` e `monitorPublicar()`"],
  ], [0.26, 0.38, 0.36]),
  ESPACO(),
  P("Se o MQ-135 da Parte 1 estiver ligado ao mesmo tempo, as duas redes aparecem no celular: `Ar-MQ135` e `Ar-MQ2`. O celular só fica em uma por vez."),
  NOTA("Várias placas na mesma sala", "Se vários grupos gravarem o mesmo sketch, todas as redes se chamarão Ar-MQ2. Cada grupo troca o nome, por exemplo `monitorIniciar(\"Ar-MQ2-G3\")`.", AZUL),

  H2("5.7 O que aparece no Monitor Serial"),
  CODIGO([
    "Rede Wi-Fi: Ar-MQ2  senha: 12345678  ->  abra http://192.168.4.1",
    "MQ-2 | RL = 10.0 k | divisor 100 k / 200 k | VC = 4.96 V",
    "aquecendo: faltam 599 s | pino 1415 mV | AO 2.122 V | Rs 12.9 k",
    "...",
    "aquecendo: faltam 0 s | pino 428 mV | AO 0.642 V | Rs 65.1 k",
    "calibrando R0 (ar limpo): 1/300 | Rs = 64.40 k | media = 64.40 k",
    "...",
    "calibrando R0 (ar limpo): 300/300 | Rs = 65.09 k | media = 64.74 k",
    "",
    ">>> R0 = 64.74 kOhm. Escreva  R0_KOHM = 64.74  neste sketch e no m2b.",
    "",
    "Rs/R0:0.995 Rs_kOhm:64.40 AO_V:0.648 Pino_mV:432",
    "ar limpo",
    "Rs/R0:0.400 Rs_kOhm:25.88 AO_V:1.350 Pino_mV:900",
    "GAS DETECTADO: ventile e verifique",
    "Rs/R0:0.262 Rs_kOhm:16.99 AO_V:1.800 Pino_mV:1200",
    "GAS DETECTADO: ventile e verifique",
  ].join("\n"), { arquivo: false, titulo: "Exemplo (os números do seu sensor serão outros)" }),
  ESPACO(),
  P("Como no MQ-135, o Rs começa **baixo** logo depois de ligar e sobe durante o aquecimento. As linhas `Rs/R0:...` servem ao **Plotter Serial**; abra-o depois da calibração."),

  H2("5.8 Testes de funcionamento da Etapa 2A"),
  NOTA("Segurança nos testes com fumaça e gás (só o professor)", [
    "**Antes:** sala ventilada; tire da bancada o algodão com álcool e o frasco, desligue o ferro de solda e espere 1 minuto.",
    "**Fumaça:** acenda e apague o fósforo a mais de 50 cm do circuito, traga só a fumaça para perto do sensor e jogue o palito num copo com água.",
    "**Gás:** use **isqueiro de pedra (roda)** e aperte só a alavanca do gás, **sem girar a roda**, por 1 segundo, a cerca de 15 cm do sensor. **Nunca use isqueiro de botão (piezoelétrico)**: o botão solta faísca junto com o gás. Nunca encha copo, caixa ou saco com gás em volta do sensor. Um disparo por vez: espere o Rs/R0 voltar acima de 0,8 antes de repetir. Não teste em fogão nem em botijão.",
    "O teste com álcool em algodão mostra uma queda parecida e pode ser feito pelos alunos, longe de chama.",
  ], VERMELHO),
  ESPACO(),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Alimentação", "Multímetro entre VIN e GND", "4,5 a 5,1 V; LED do módulo aceso"],
    ["2", "Proteção do pino", "Multímetro entre a coluna 17 e GND, com álcool perto", "Nunca acima de 3,3 V"],
    ["3", "Rede e página", "Rede `Ar-MQ2`, `http://192.168.4.1`", "Página abre e o valor muda a cada 2 s"],
    ["4", "Aquecimento", "Observar os 10 primeiros minutos", "Contagem regressiva; Rs subindo e se estabilizando"],
    ["5", "Calibração", "5 min em ar limpo", "Linha `>>> R0 = ...`; depois Rs/R0 entre 0,90 e 1,10"],
    ["6", "Bafo", "Expirar a 10 cm por 5 s", "Pequena variação, em geral menor que a do MQ-135"],
    ["7", "Álcool", "Algodão com álcool a 10 cm por 5 s", "Rs/R0 entre 0,2 e 0,5; página em alerta"],
    ["8", "Fumaça (professor)", "Fósforo apagado a mais de 50 cm; só a fumaça perto do sensor", "Queda para 0,3 a 0,6"],
    ["9", "Gás (professor)", "Isqueiro de pedra, sem girar a roda, 1 s, a 15 cm", "Queda forte ou \"saturou\"; alerta vermelho"],
    ["10", "Recuperação", "Afastar a fonte e cronometrar", "Volta acima de 0,8 em alguns minutos (anote o tempo)"],
    ["11", "R0 gravado", "Escrever o R0, gravar e religar", "Mensagem \"R0 fixo no codigo\""],
  ], [0.05, 0.16, 0.42, 0.37]),

  H2("5.9 Problemas comuns da Etapa 2A"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`pino ... fora da faixa` (\"tensão baixa demais\" na calibração; \"sensor desligado? fio do AO? RL?\" na medição)", "RL pequeno para o Rs do MQ-2, divisor errado ou AO solto", "Meça o pino; aumente o RL para 10 ou 22 kΩ; confira os fios"],
    ["\"saturou\" com pouco gás", "RL grande demais (47 kΩ)", "Use 10 ou 22 kΩ"],
    ["Rs/R0 não volta a 1 depois do gás", "Memória do sensor depois de exposição forte", "Deixe-o em ar limpo por uma hora; se não voltar, recalibre"],
    ["Rs/R0 longe de 1 em ar limpo", "R0 medido antes de estabilizar ou perto de álcool em gel", "Refaça a calibração junto à janela"],
    ["Fio amarelo no D35", "Montagem copiada da Parte 1", "O MQ-2 vai no **D34**"],
    ["Página não abre", "Celular em outra rede, ou usando os dados móveis", "Volte para `Ar-MQ2`; desligue os dados móveis"],
  ], [0.32, 0.34, 0.34]),

  // =====================================================================
  ...QUEBRA(),
  H1("6. Etapa 2B — o MQ-2 na Rede de Telemetria"),
  P("A montagem não muda: o ESP32 passa a entrar na rede Wi-Fi da telemetria e publica `mq2` no broker do servidor a cada 10 segundos. Toda a preparação da rede e do servidor foi feita na Parte 1."),
  ...FIGURA(path.join(FIGS, "rede-2b.png"), "Etapa 2B: o nó do MQ-2 publica cria/teste/no6/mq2 no servidor; o painel é aberto em http://IP_DO_SERVIDOR:3000.", 1.33),

  H2("6.1 Antes de começar: o que já está pronto desde a Parte 1"),
  TAB(["Item", "Onde está na Parte 1", "Conferir"], [
    ["Parâmetros de rede (SSID, senha, IP do servidor, portas, usuário MQTT)", "seção 6.1", "Tabela preenchida com o coordenador"],
    ["IP fixo do servidor (reserva de DHCP ou IP estático)", "seção 6.2", "`hostname -I` no servidor mostra o IP reservado"],
    ["Servidor no ar", "seção 6.3", "`curl -i http://localhost:3000/saude` responde 200; porta 3000 liberada"],
    ["Rede alcançável da sala", "seção 6.4", "`Test-NetConnection IP_DO_SERVIDOR -Port 1883` (PowerShell) e painel abrindo no celular"],
    ["Arduino IDE com CriaTelemetria e PubSubClient", "seção 6.5", "Exemplo da CriaTelemetria aparece no menu"],
    ["`credenciais.h`", "seção 6.6", "O mesmo arquivo do `m1b` serve: copie-o para a pasta do `m2b`"],
  ], [0.42, 0.22, 0.36]),
  ESPACO(),

  H2("6.2 Ajustar e gravar o sketch m2b_mq2_telemetria"),
  P("Copie o `credenciais.h` da Parte 1 (ou crie a partir do `credenciais.exemplo.h`) para `aula-ar/codigo/m2b_mq2_telemetria/` e ajuste o topo do sketch:"),
  TAB(["Constante", "O que colocar"], [
    ["`PROJETO`", "`\"teste\"` na bancada; `\"ar\"` só no monitor definitivo. Igual ao `MQTT_USUARIO`"],
    ["`NO`", "Um nó livre. O exemplo usa `\"no6\"`, para o MQ-135 da Parte 1 continuar no `no5` ao mesmo tempo"],
    ["`RL_KOHM`, `VC`", "Os mesmos da Etapa 2A"],
    ["`R0_KOHM`", "O R0 do MQ-2 medido na Etapa 2A. Com `0.0`, o nó só mostra o Rs e não publica"],
    ["`PINO_AO`", "`34` (já vem assim)"],
  ], [0.25, 0.75]),
  ESPACO(),
  CODIGO([
    "cd aula-ar/codigo/m2b_mq2_telemetria",
    "cp ../m1b_mq135_telemetria/credenciais.h .",
    "arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 \\",
    "    --library /dados/Projetos/telemetria-cria/firmware/biblioteca-cria .",
    "arduino-cli upload --fqbn esp32:esp32:esp32doit-devkit-v1 -p COM4 .",
    "arduino-cli monitor -p COM4 -c baudrate=115200",
  ].join("\n"), { arquivo: false, titulo: "Terminal (ajuste o caminho da biblioteca e a porta à sua máquina)" }),

  H2("6.3 O que aparece no Monitor Serial"),
  CODIGO([
    "[cria] nó cria/teste/no6, biblioteca CriaTelemetria 0.2.0",
    "[cria] boot 1",
    "[cria] aguardando o Wi-Fi \"telemetria-cria\"...",
    "[mq2] no cria/teste/no6 | R0 = 64.74 k | aquecimento de 600 s",
    "[cria] Wi-Fi conectado, IP 192.168.0.24",
    "[cria] conectado ao broker; status online em cria/teste/no6/status",
    "[cria] relógio acertado: 2026-11-26 13:10:15 UTC",
    "[mq2] aquecendo: faltam 588 s | pino 1402 mV | AO 2.103 V",
    "...",
    "[mq2] Rs = 64.06 k | AO = 0.651 V | Rs/R0 = 0.989",
    "[cria] cria/teste/no6/mq2",
    "       {\"valor\":0.9894239,\"unidade\":\"Rs/R0\",\"seq\":1,\"boot\":1,\"t\":1795699205422}",
  ].join("\n"), { arquivo: false, titulo: "Exemplo de partida normal" }),
  ESPACO(),
  P("A sequência é a mesma da Parte 1: Wi-Fi, broker e relógio. O aquecimento conta desde que a placa liga, e a primeira publicação só sai quando o relógio já foi acertado e o aquecimento terminou. A linha publicada foi quebrada aqui em duas para caber."),

  H2("6.4 Ver os dados no painel"),
  OL([
    "Em qualquer computador ou celular ligado à rede Wi-Fi da telemetria, abra `http://192.168.0.10:3000` (troque pelo IP do seu servidor).",
    "O cartão `teste/no6` aparece on-line, com o último valor de `mq2` e o gráfico da última hora.",
    "Se o nó do MQ-135 (`teste/no5`) também estiver ligado, os dois cartões aparecem lado a lado.",
  ]),
  TAB(["Endereço (no navegador)", "O que mostra"], [
    ["`http://192.168.0.10:3000/api/nos`", "Os nós e o último valor de cada grandeza (JSON)"],
    ["`http://192.168.0.10:3000/api/historico?projeto=teste&no=no6&grandeza=mq2&minutos=60`", "Os pontos da última hora (JSON)"],
    ["`http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste&no=no6`", "Planilha CSV das últimas 24 h"],
  ], [0.62, 0.38]),
  ESPACO(),

  H2("6.5 Testes de funcionamento da Etapa 2B"),
  TAB(["#", "Teste", "Como fazer", "Resultado esperado"], [
    ["1", "Conexão", "Ligar o nó e olhar o Monitor Serial", "Wi-Fi, broker e relógio, nessa ordem"],
    ["2", "Status no broker", "Observador `mosquitto_sub` no servidor (Parte 1, seção 6.3)", "`cria/teste/no6/status online`"],
    ["3", "Publicação", "Esperar o fim do aquecimento", "Uma linha `mq2` a cada 10 s, com `seq` crescendo de 1 em 1"],
    ["4", "Painel", "`http://192.168.0.10:3000` no computador e no celular", "Cartão `teste/no6` on-line, mesmo valor nos dois"],
    ["5", "Resposta ao álcool", "Algodão com álcool a 10 cm por 5 s", "Queda no gráfico em até 10 s; recuperação em minutos"],
    ["6", "Queda do Wi-Fi", "Desligar o ponto de acesso por 1 min", "Leituras reenviadas com `\"fila\":1`; gráfico sem lacuna"],
    ["7", "Queda do nó", "Desligar o USB do ESP32", "`status offline` em segundos; cartão off-line"],
    ["8", "Exportação", "Abrir o link do CSV", "Planilha com data, hora e valores de `mq2`"],
    ["9", "Estabilidade", "Deixar 24 h publicando", "Sem reinício e sem buraco na série; perda abaixo de 1 %"],
  ], [0.05, 0.17, 0.4, 0.38]),

  H2("6.6 Comparar o MQ-2 com o MQ-135"),
  P("Com os dois nós publicando (dois ESP32: `no5` com o MQ-135 e `no6` com o MQ-2, lado a lado na bancada), o painel mostra como cada sensor responde ao mesmo estímulo. A comparação mostra por que o monitor tem dois sensores MQ:"),
  TAB(["Estímulo", "MQ-135 (`no5`)", "MQ-2 (`no6`)", "O que se aprende"], [
    ["Sala cheia e fechada por 1 h", "cai devagar (0,70 a 0,85)", "varia pouco (alguns %, pela umidade e pela temperatura)", "O MQ-135 percebe ar viciado; o MQ-2, não"],
    ["Bafo a 10 cm", "queda pequena", "variação menor", "O bafo tem CO₂ e umidade, não gás inflamável"],
    ["Álcool em algodão", "cai muito", "cai muito", "Os dois reagem a álcool: nenhum dos dois é seletivo"],
    ["Gás de isqueiro (professor)", "queda moderada", "queda forte ou satura", "O MQ-2 é o sensor de gás combustível"],
  ], [0.22, 0.22, 0.22, 0.34]),
  ESPACO(),
  P("Exporte o CSV dos dois nós, sem filtro de nó, em `http://192.168.0.10:3000/api/exportar.csv?horas=24&projeto=teste`, e faça o gráfico das duas séries juntas numa planilha. Os valores da tabela são referências do curso: anote os que a sua bancada mostrar."),

  H2("6.7 Problemas comuns da Etapa 2B"),
  P("As mensagens da biblioteca e as causas de rede são as mesmas da Parte 1 (seção 6.11). As específicas desta parte:"),
  TAB(["Sintoma", "Causa provável", "O que fazer"], [
    ["`AVISO: a conexão cai logo depois de abrir`", "O MQ-2 e o MQ-135 com o mesmo `NO`", "Use `no5` para um e `no6` para o outro"],
    ["Cartão aparece, mas sem `mq2`", "`R0_KOHM = 0.0`, ou ainda no aquecimento", "Escreva o R0 da Etapa 2A; espere os 10 minutos"],
    ["`[mq2] pino ... fora da faixa`", "RL pequeno, fio solto ou saturação por gás", "Volte à seção 5.4; afaste a fonte de gás"],
    ["Valor do MQ-2 aparece no cartão do MQ-135", "Os dois nós com o mesmo `NO` em horários diferentes", "Cada sensor no seu nó; o histórico antigo fica no nó usado"],
  ], [0.33, 0.33, 0.34]),

  H2("6.8 Do projeto teste ao monitor definitivo"),
  P("Aprovado na bancada, o MQ-2 passa a fazer parte do monitor definitivo. Troque, no sketch e no `credenciais.h`, o projeto para `ar` (usuário MQTT `ar`, com a senha do projeto) e o nó para `no1`: o tópico passa a ser `cria/ar/no1/mq2`, o mesmo do firmware completo `telemetria-cria/firmware/no-ar`. Só **um** ESP32 pode ser o `ar/no1`: enquanto os sensores estiverem em placas separadas, mantenha cada um no seu nó do projeto `teste`. No guia da Parte 5 (nó completo), o MQ-2 (GPIO 34), o MQ-135 (GPIO 35), o MH-Z19C e o DHT22 são reunidos nesse nó, com fonte de 5 V e 2 A e abrigo impresso em 3D."),

  // =====================================================================
  ...QUEBRA(),
  H1("7. Códigos"),
  H2("7.1 Etapa 2A — m2a_mq2_celular.ino"),
  P("Arquivo `aula-ar/codigo/m2a_mq2_celular/m2a_mq2_celular.ino`. Os auxiliares `monitor_wifi.h` e `pagina_web.h` ficam na mesma pasta."),
  CODIGO(COD("m2a_mq2_celular"), { titulo: "m2a_mq2_celular.ino", tamanho: 14 }),
  H2("7.2 Etapa 2B — m2b_mq2_telemetria.ino"),
  P("Arquivo `aula-ar/codigo/m2b_mq2_telemetria/m2b_mq2_telemetria.ino`. Precisa do `credenciais.h` na mesma pasta."),
  CODIGO(COD("m2b_mq2_telemetria"), { titulo: "m2b_mq2_telemetria.ino", tamanho: 14 }),
];

module.exports = DOC({ titulo: "Guia de montagem do monitor de qualidade do ar — Parte 2: MQ-2", rodape: "Guia de montagem do monitor de qualidade do ar — Parte 2: o MQ-2 — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
