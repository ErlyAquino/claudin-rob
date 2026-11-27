// Parte de hidroponia do tutorial do pH-4502C: cuidados com a sonda (secao 11), pH na hidroponia (12) e a
// bancada NFT do no horta/no1 da telemetria-cria (13). Usado por tutorial.js.
// Os numeros de hidroponia vem das fontes listadas em `referencias`; a montagem do no, de telemetria-cria/firmware/horta-no1.
const path = require("path");
const { H1, H2, P, UL, OL, TAB, NOTA, CODIGO, QUEBRA, ESPACO, FIGURA } = require("../lib");
const IMG = (n) => path.join(__dirname, n);
const VERDE = "E8F5E9", VERMELHO = "FDECEA";

// ---------------------------------------------------------------- secao 11 (o H1 e a tabela de periodicidade ficam em tutorial.js)
const cuidados = () => [
  P("A sonda é a peça mais cara e mais frágil do conjunto, e a única que se gasta. Quase todos os problemas de leitura lenta, deriva e inclinação baixa vêm de sonda mal guardada."),
  H2("11.1 Guardar"),
  UL(["**Sempre molhada, na tampa com solução de armazenamento (KCl 3 mol/L).** A camada de gel do vidro só responde hidratada, e o KCl mantém a concentração de sal do eletrodo de referência.",
    "**Nunca guardar em água destilada.** Ela retira os íons do eletrodo de referência pela junção e encurta a vida da sonda. Água destilada é para **enxaguar**, não para guardar.",
    "**Faltou a solução de armazenamento?** Por poucos dias, use o tampão pH 4 ou o pH 7. Reponha a solução da tampa quando ela evaporar ou criar cristais.",
    "**Secou?** Deixe de molho na solução de armazenamento por pelo menos 24 h e calibre de novo. Se a inclinação não voltar a 85 %, a sonda chegou ao fim."]),
  H2("11.2 Usar"),
  UL(["**Enxaguar entre amostras** com água destilada e secar encostando o papel, sem esfregar.",
    "**Bulbo e junção cobertos** pelo líquido, sem tocar o fundo nem as paredes do copo.",
    "**Não bater o bulbo**, não medir líquidos acima de 60 °C, não deixar congelar.",
    "**Cabo e conector secos.** Umidade no BNC cria um caminho de fuga para o sinal de alta impedância. Não emende o cabo da sonda com jumpers."]),
  H2("11.3 Limpar"),
  P("Limpe quando a sonda ficar lenta (mais de 3 minutos para estabilizar) ou a inclinação cair. Nunca use escova, esponja ou abrasivo no bulbo."),
  TAB(["Sujeira", "Limpeza", "Depois"], [
    ["Depósito mole, limo, restos de solução nutritiva", "agitar em água morna com uma gota de detergente por 15 min; enxaguar bem", "1 h na solução de armazenamento; calibrar"],
    ["Calcário e sais (crosta branca)", "alguns minutos em ácido fraco: vinagre diluído ou, no laboratório, HCl 0,1 mol/L", "enxaguar; 1 h na solução de armazenamento; calibrar"],
    ["Algas e matéria orgânica (comum na hidroponia)", "alguns minutos em água sanitária bem diluída; enxaguar muito bem", "1 h na solução de armazenamento; calibrar"],
  ], [0.34, 0.4, 0.26]),
  ESPACO(),
  H2("11.4 Tampões"),
  UL(["**Separe uma porção num copo** para cada uso e descarte depois. Nunca mergulhe a sonda no frasco e nunca devolva o tampão usado.",
    "**Frascos tampados**, longe do sol. Escreva a data de preparo ou de abertura no rótulo.",
    "**Validade depois de aberto ou preparado:** os fabricantes falam em cerca de um mês para os tampões 4 e 7 e em uma a duas semanas para os básicos (9,18 e 10), que absorvem gás carbônico do ar e perdem o valor. Tampão turvo ou com fungo vai para o descarte."]),
  H2("11.5 Vida útil e periodicidade"),
  P("Uma sonda de vidro deste tipo dura, em uso, de **6 a 18 meses**, conforme o cuidado. O sinal de fim de vida é a inclinação abaixo de 85 % mesmo depois da limpeza e da reidratação. A ficha de calibração (seção 16) guarda esse histórico."),
];

// ---------------------------------------------------------------- secoes 12 e 13
const corpo = () => [
  QUEBRA(),
  H1("12. O pH na hidroponia"),
  H2("12.1 Plantas sem solo"),
  P("Na **hidroponia** a planta cresce sem solo: as raízes recebem uma **solução nutritiva**, água com todos os sais minerais de que a planta precisa, na proporção certa. No sistema **NFT** (do inglês Nutrient Film Technique, técnica do filme de nutrientes), a solução é bombeada de um reservatório para a ponta mais alta de canais levemente inclinados, escorre em **filme fino** pelas raízes e volta ao reservatório por gravidade. É o sistema da bancada do Espaço CRIA."),
  P("No solo, a argila e a matéria orgânica seguram nutrientes e amortecem as variações de pH. Na hidroponia não há esse amortecedor: a planta depende inteiramente do que está dissolvido na solução, e a solução muda todo dia, porque a planta retira água e nutrientes dela. Por isso o cultivo hidropônico se apoia em duas medidas diárias: o **pH** e a **condutividade elétrica**."),
  H2("12.2 Por que a faixa de 5,5 a 6,5"),
  P("O pH não alimenta a planta. Ele decide **quais nutrientes continuam dissolvidos** na forma que a raiz consegue absorver. Fora da faixa certa, o nutriente pode estar no tanque e a planta passar fome dele."),
  ...FIGURA(IMG("nutrientes.png"), "pH e disponibilidade de nutrientes na solução nutritiva. Faixa larga: nutriente disponível; faixa estreita: pouco disponível, porque precipita ou muda de forma química. Azul: macronutrientes; laranja: micronutrientes. Diagrama qualitativo, montado para este tutorial a partir das fontes da seção 17; os limites são aproximados e dependem da fórmula da solução.", 1.3),
  TAB(["O que acontece", "Onde", "Efeito na planta"], [
    ["**Ferro** oxida e precipita; o quelato Fe‑EDTA, o mais comum, perde cerca de metade do ferro acima de pH 6,5 e quase tudo em pH 7", "pH acima de 6,5", "clorose: folhas novas amareladas com nervuras verdes. Na alface aparece em cerca de 10 dias"],
    ["**Manganês, boro, cobre e zinco** deixam de estar disponíveis", "pH acima de 6,5", "deficiências de micronutrientes, crescimento travado"],
    ["**Fósforo** muda de forma (de H₂PO₄⁻ para HPO₄²⁻) e precipita com o **cálcio**: os dois saem da solução juntos", "pH acima de 7", "pó branco no fundo do tanque, entupimento; falta de P e de Ca"],
    ["Cálcio e magnésio precipitam como carbonatos", "pH acima de 8,3", "idem"],
    ["Cai a absorção de fósforo, cálcio, magnésio e outros; o **molibdênio** falta em meio ácido", "pH abaixo de 5", "crescimento comprometido; abaixo de pH 4 a raiz é danificada"],
  ], [0.48, 0.17, 0.35]),
  ESPACO(),
  P("A faixa de **5,5 a 6,5** é o compromisso: ácida o bastante para manter ferro, manganês, boro, cobre e zinco dissolvidos, e não tão ácida que prejudique a raiz e os outros nutrientes. As fontes variam pouco em torno dela: a Embrapa Hortaliças indica 6,0 a 6,5 como ideal, com crescimento comprometido abaixo de 5,0 e acima de 7,0; a Universidade Cornell trabalha as folhosas entre 5,5 e 6,0, justamente para garantir o ferro."),
  NOTA("A conta do fator 10", ["De pH 6,0 para 7,0 a solução perde 90 % dos íons H⁺ (seção 2.2). É essa queda que tira o ferro de circulação. Uma diferença de “só um ponto” no visor é uma mudança enorme na química da solução."], VERDE),
  ESPACO(),
  H2("12.3 Faixas por cultura"),
  ...FIGURA(IMG("culturas.png"), "pH e condutividade elétrica recomendados para algumas culturas em hidroponia. Verde: folhosas e ervas; laranja: hortaliças de fruto. Fontes: Oklahoma State University Extension (OKS), Embrapa Hortaliças (EMB), Cornell CEA (COR) e Singapore Food Agency (SFA). Para a alface, as fontes vão de 5,5–6,0 (COR) a 6,0–6,5 (EMB).", 1.3),
  P("Para a **alface**, a cultura da bancada, o alvo prático é **pH perto de 6,0**, aceitando de 5,5 a 6,5. As recomendações mudam de uma fonte para outra e de uma variedade para outra: use a figura como ponto de partida e anote o que funciona na sua bancada. Para hortelã, cebolinha, coentro e couve não encontramos valores em fonte técnica confiável; a faixa geral de 5,5 a 6,5 é o ponto de partida."),
  H2("12.4 A condutividade elétrica: a outra medida"),
  P("O pH diz se os nutrientes estão **disponíveis**; a **condutividade elétrica (CE)** diz **quanto** nutriente há. Sais dissolvidos se separam em íons, e íons conduzem corrente: quanto mais sais, maior a condutividade. A CE mede o total de sais, sem distinguir um do outro, e reflete principalmente os macronutrientes."),
  TAB(["Assunto", "O que saber"], [
    ["Unidades", "1 mS/cm = 1 dS/m = 1000 µS/cm. O nó `horta/no1` publica em µS/cm"],
    ["Alface", "entre 1,2 e 1,8 mS/cm na maior parte das fontes (a Embrapa admite CE inicial de 1,5 a 2,5); cerca de 1500 µS/cm é o valor citado na documentação do nó. A alface é sensível à salinidade: solução forte demais queima a borda das folhas"],
    ["Mudas e calor", "a Embrapa recomenda solução mais diluída nas fases iniciais (25 a 50 % da concentração) e nas épocas quentes"],
    ["Temperatura", "a condutividade sobe cerca de 2 % por °C. Por isso se informa a CE **referida a 25 °C**, e o nó mede a temperatura da solução com o DS18B20 para fazer essa correção"],
    ["CE e “ppm” (TDS)", "medidores de TDS mostram ppm = CE (µS/cm) × fator. O fator é 0,5 em uns aparelhos e 0,7 em outros: 1000 µS/cm vira 500 ou 700 ppm. Para comparar medidas, use sempre a CE"],
    ["Calibração", "solução‑padrão de 1413 µS/cm (KCl), um ponto"],
  ], [0.2, 0.8]),
  ESPACO(),
  P("As duas medidas se leem juntas. **CE caindo** com o nível do tanque estável: as plantas estão consumindo nutrientes, hora de repor solução concentrada. **CE subindo** com o nível caindo: a água evaporou ou foi transpirada mais depressa que os sais, hora de completar com água. Ajusta‑se **primeiro a CE e depois o pH**, porque acrescentar nutrientes ou água muda o pH."),
  H2("12.5 Por que o pH da solução não fica parado"),
  UL(["**A planta troca íons com a solução.** Para absorver um íon negativo, como o nitrato (NO₃⁻), a raiz libera OH⁻, e o pH **sobe**. Para absorver um íon positivo, como o amônio (NH₄⁺) ou o potássio (K⁺), libera H⁺, e o pH **desce**. Como a maior parte do nitrogênio das soluções é nitrato, a tendência mais comum numa bancada de alface em crescimento é o pH **subir** aos poucos.",
    "**A água de torneira traz alcalinidade.** O bicarbonato dissolvido na água neutraliza ácido e empurra o pH para cima a cada reposição. Água muito alcalina exige correção mais frequente.",
    "**O NFT tem pouco amortecimento.** O volume de solução por planta é pequeno e a solução tem pouco poder tampão (seção 2.4): em hidroponia o pH pode mudar de 1 a 2 unidades num dia.",
    "**Algas e microrganismos** no reservatório exposto à luz também consomem e liberam íons. Reservatório fechado e escuro ajuda o pH e a sonda."]),
  P("É por isso que a recomendação das fontes técnicas é medir **pH e CE todos os dias, na mesma hora**, de preferência depois de completar o nível do reservatório. Com o sensor ligado à telemetria, essa medida passa a existir a cada 10 segundos, e o gráfico do painel mostra a deriva acontecendo."),
  H2("12.6 Como corrigir o pH"),
  TAB(["Para", "Produtos", "Observação"], [
    ["**Baixar** o pH (o caso mais comum)", "ácido fosfórico ou ácido nítrico diluídos; produtos comerciais “pH down” (em geral ácido fosfórico)", "são os usados na produção; acrescentam fósforo ou nitrogênio, que a planta aproveita"],
    ["Baixar, alternativa escolar", "vinagre (ácido acético) ou ácido cítrico", "seguros de manusear, mas o efeito dura pouco: o pH volta a subir em poucos dias. Servem para a demonstração, não para manter um cultivo"],
    ["**Subir** o pH", "hidróxido de potássio ou carbonato de potássio diluídos; produtos “pH up”", "acrescentam potássio, que é nutriente. Evite produtos com sódio no uso contínuo"],
  ], [0.24, 0.38, 0.38]),
  ESPACO(),
  OL(["Complete o nível do reservatório e ajuste a CE primeiro.",
    "Com a bomba ligada (solução circulando), meça o pH e espere a leitura estabilizar.",
    "Prepare o corretor **diluído** num copo ou frasco à parte. Sempre o **ácido sobre a água**, nunca a água sobre o ácido.",
    "Adicione **um pouco de cada vez** (conta‑gotas ou seringa, alguns mililitros), longe da sonda e do retorno.",
    "Espere a solução circular e se misturar por **alguns minutos** e meça de novo. Repita até chegar ao alvo.",
    "Anote data, pH antes e depois, volume de corretor usado e CE. Em poucos dias você conhece a dose da sua bancada."]),
  NOTA("Segurança", ["**Ácidos e bases concentrados queimam a pele e os olhos.** Ácido fosfórico, ácido nítrico e hidróxido de potássio são manuseados pelo professor, com óculos de proteção e luvas, em local ventilado, e guardados fora do alcance dos estudantes. Os estudantes trabalham com a solução já diluída ou com vinagre.",
    "**Nunca despeje corretor concentrado direto no tanque**: a região onde ele cai fica com pH extremo por alguns instantes, o que precipita nutrientes e pode ferir raízes.",
    "**Passou do ponto?** Não tente consertar com o corretor oposto repetidas vezes: cada correção acrescenta sais. Dilua com água ou troque parte da solução."], VERMELHO),
  ESPACO(),
  H2("12.7 A rotina da bancada"),
  TAB(["Frequência", "O que fazer"], [
    ["Todo dia, na mesma hora", "conferir nível, pH e CE (no painel da telemetria ou com medidor de mão); completar o nível; corrigir CE e depois pH se estiverem fora da faixa"],
    ["Toda semana", "conferir o sensor de pH num tampão (o 7,00 deve dar 7,00 ± 0,1) e recalibrar se preciso; olhar raízes (devem estar claras) e folhas novas (clorose?)"],
    ["A cada ciclo de cultivo, ou quando houver problema", "trocar a solução inteira e lavar reservatório e canais. As fontes divergem sobre o intervalo: de duas semanas a manter por vários ciclos"],
    ["Sempre", "solução entre 20 e 25 °C, nunca acima de 30 °C: água quente guarda menos oxigênio dissolvido, e a raiz escurece e apodrece"],
  ], [0.3, 0.7]),

  // ---------------------------------------------------------------
  QUEBRA(),
  H1("13. A bancada hidropônica do Espaço CRIA: o nó horta/no1"),
  H2("13.1 A bancada e os sensores"),
  P("A bancada do projeto‑teste 2 da Rede de Telemetria é uma **hidroponia NFT de 25 posições**, cultivando alface. Três nós cuidam dela: o `horta/no1` mede a solução nutritiva e protege a bomba; o `horta/no2` mede o ambiente (umidade, temperatura do ar e iluminância); o `horta/no3` é a câmera que registra o crescimento em time‑lapse. O sensor de pH deste tutorial trabalha no `no1`."),
  ...FIGURA(IMG("bancada_nft.png"), "Esquema da bancada NFT com os sensores do nó `horta/no1`. Desenho fora de escala, feito a partir da documentação do nó; a posição exata de cada sensor e as medidas da bancada devem ser conferidas na montagem real.", 1.3),
  TAB(["Grandeza", "Sensor", "Para que serve na horta"], [
    ["`ph`", "pH‑4502C com eletrodo de vidro, pelo ADS1115", "disponibilidade dos nutrientes (seção 12.2). Só é publicado depois de calibrado"],
    ["`condutividade`", "sensor TDS analógico, pelo ADS1115", "quantidade de sais na solução, em µS/cm a 25 °C"],
    ["`temperatura`", "DS18B20 à prova d'água", "temperatura da solução; corrige a condutividade"],
    ["`vazao`", "YF‑S201", "a solução está circulando? (L/min)"],
    ["`pressao`", "sensor de pressão de 0 a 1,2 MPa, pelo ADS1115", "a bomba está empurrando?"],
    ["`nivel`", "boia", "há solução no reservatório? Comanda a proteção da bomba"],
    ["`bomba`", "relé", "ligada, ou cortada pela proteção"],
  ], [0.21, 0.36, 0.43]),
  ESPACO(),
  P("**Por que proteger a bomba.** No NFT as raízes ficam num filme fino de solução: sem recirculação por algumas horas, a alface murcha. E uma bomba que trabalha sem água se estraga. O nó resolve os dois riscos: se a solução fica abaixo da boia, ele corta a bomba pelo relé em cerca de 7 s e a religa 1 minuto depois de o nível voltar. A bomba passa pelo contato **normalmente fechado** do relé, de modo que um nó desligado ou travado deixa a bomba como estava antes da telemetria: ligada."),
  P("Para comparar a bancada com as referências técnicas do NFT (Embrapa Hortaliças, Circular Técnica 22):"),
  TAB(["Parâmetro", "Referência para plantas de porte pequeno, como a alface"], [
    ["Declividade dos canais", "2 a 4 % (2 a 4 cm de queda por metro de canal)"],
    ["Vazão por canal", "0,5 a 1 L/min na fase inicial; 1 a 2 L/min na fase final"],
    ["Volume do reservatório", "0,5 a 1,5 L por planta: para 25 plantas, de 12,5 a 37,5 L, no mínimo"],
    ["Regime da bomba", "contínuo, ou intermitente com temporizador (por exemplo, 15 min ligada e 30 a 45 min parada durante o dia)"],
    ["Temperatura da solução", "20 a 25 °C; evitar abaixo de 15 °C e acima de 30 °C"],
  ], [0.3, 0.7]),
  ESPACO(),
  H2("13.2 Como o pH é ligado no nó"),
  P("A placa de pH do nó é a mesma pH‑4502C, mas a ligação é diferente da versão de bancada da seção 5: o nó não usa o divisor."),
  ...FIGURA(IMG("no1_ligacao.png"), "Ligações do nó `horta/no1`, conforme o README e o programa do nó na telemetria‑cria. O Po da placa de pH vai direto à entrada A0 do ADS1115.", 1.3),
  TAB(["", "Nesta aula (sketch `01c`)", "No nó `horta/no1`"], [
    ["Alimentação do ADS1115", "3,3 V", "**5 V**"],
    ["Po da placa de pH", "pelo divisor 1 kΩ / 2 kΩ até a entrada A0", "**direto** na entrada A0: com 5 V de alimentação, o ADS1115 aceita até 5 V nas entradas"],
    ["Ganho do ADS1115", "ganho 1 (±4,096 V)", "ganho 2/3 (±6,144 V): 0,1875 mV por nível"],
    ["I2C (SDA, SCL)", "direto nos GPIO 21 e 22", "por um **conversor de nível lógico**: o I2C do ADS1115 fica em 5 V, que o ESP32 não tolera"],
    ["Calibração", "comandos `c7`, `c4`, `c10` no Monitor Serial", "ferramenta `calibrar.py` no notebook, pela USB"],
    ["Onde a reta fica", "Preferences do ESP32", "memória do nó (biblioteca CriaTelemetria)"],
    ["Sem calibração", "mostra pH com a reta padrão", "**não publica** o pH: sensor sem calibração dá número, não medida"],
  ], [0.22, 0.36, 0.42]),
  ESPACO(),
  P("Sem divisor, sai da cadeia de sinal um estágio e a sua fonte de erro (seção 4.3). O preço é o conversor de nível. O Passo 1 (offset em 2,500 V com o BNC em curto) vale igual: confira com o multímetro no pino Po."),
  H2("13.3 Calibrar o nó: a ferramenta calibrar.py"),
  P("No nó, a calibração é conduzida por um programa do notebook, que conversa com o ESP32 pela USB, espera a leitura estabilizar, coleta amostras, calcula a reta, faz a verificação e grava. O roteiro é o mesmo dos Passos 2 e 3 deste tutorial."),
  CODIGO(`py calibracao/calibrar.py --porta COM5 --listar     (mostra as retas gravadas no no)
py calibracao/calibrar.py --porta COM5 ph           (calibra o pH)`, { arquivo: false, titulo: "na pasta do repositório telemetria-cria (no Linux: python3 e /dev/ttyUSB0)" }),
  ESPACO(),
  OL(["A ferramenta mostra a reta atual do nó.",
    "Pede o tampão **7,00**. Enxágue, seque sem esfregar e mergulhe a sonda. Se o rótulo do tampão der outro valor na temperatura do dia (7,02 a 20 °C, ou um tampão 6,86), **digite esse valor**: aqui não há o problema da seção 10.4.",
    "Espera 60 s, mostrando a tensão a cada 10 s, e coleta 10 amostras. Se o desvio entre elas passar de 0,01 V, avisa e oferece repetir o ponto.",
    "Faz o mesmo com o tampão **4,00** e calcula a reta. Se os dois tampões derem quase a mesma tensão, ela para: a sonda ou a ligação não estão respondendo.",
    "**Verificação independente:** pede uma terceira solução, que não entrou na calibração (6,86 ou 10,01), mede e compara. O critério do projeto é **±0,2 pH**.",
    "Pergunta se pode gravar a reta no nó e registra os pontos em `calibracao/AAAA-MM-DD-ph-no1.csv` e em `coeficientes.csv`."]),
  P("A ferramenta e os sketches da aula escrevem a **mesma reta de duas formas**. A aula guarda a tensão em pH 7 e a inclinação em volts por pH; o nó guarda a inclinação em pH por volt e o deslocamento:"),
  CODIGO(`aula:   pH = 7 + (V - V7) / INCLINACAO            V7 em volts, INCLINACAO em V/pH
no:     pH = inclinacao x V + deslocamento        inclinacao em pH/V

inclinacao (no)   = 1 / INCLINACAO
deslocamento (no) = 7 - V7 / INCLINACAO

reta de fabrica do no:  -5,63 pH/V e 21,10   ->  INCLINACAO = -0,1776 V/pH,  V7 = 2,504 V
exemplo da secao 8.3:   V7 = 2,560 V, INCLINACAO = -0,160 V/pH   ->  -6,25 pH/V e 23,00
conferindo:             pH = -6,25 x 3,040 + 23,00 = 4,00`, { arquivo: false, titulo: "a mesma reta, escrita de duas formas" }),
  ESPACO(),
  NOTA("A calibração de uma montagem não serve na outra", ["Uma reta obtida com o sketch `01b` (tensão no GPIO 34, depois do divisor) **não** pode ser copiada para o nó, que mede o Po inteiro. Calibre o nó no nó, com a sonda, o cabo e a alimentação definitivos."]),
  ESPACO(),
  H2("13.4 O que muda quando a sonda fica na solução"),
  P("Medir um copo na bancada e medir um reservatório de hidroponia, dia e noite, são trabalhos diferentes para a mesma sonda."),
  UL(["**A condutividade atrapalha o pH.** O sensor de condutividade injeta corrente na água para medir. Essa corrente chega à sonda de pH pela solução e desvia a leitura. Por isso o nó alimenta o sensor TDS pelo **GPIO 32** e só o liga durante a própria leitura (0,8 s de espera, medida, desliga); o pH é lido com ele desligado. Se você montar os dois sensores de outra forma, mantenha essa regra: **nunca ler o pH com a sonda de condutividade energizada**.",
    "**Outras correntes na água.** Bomba submersa e fontes com fuga para a solução causam saltos na leitura do pH. Sintoma: o pH muda quando a bomba liga ou desliga. Confira o aterramento, ligue todos os GND entre si e afaste a sonda da bomba.",
    "**A sonda mergulhada o tempo todo se desgasta mais depressa.** A junção de referência entope com precipitados, algas e raízes, e o KCl interno se perde aos poucos para a solução. O efeito é uma **deriva lenta do offset**, que o painel mostra como um pH que “anda” sem motivo. A sonda do kit é de uso de bancada: não encontramos especificação do fabricante para imersão contínua, então trate a vida útil no reservatório como algo a medir.",
    "**Calibração mais frequente.** Confira a sonda num tampão **toda semana** (o 7,00 deve dar 7,00 ± 0,1) e recalibre quando sair disso. Anote a inclinação a cada calibração: a queda dela ao longo das semanas é o registro do desgaste.",
    "**Posição da sonda.** Na vertical, com o bulbo e a junção submersos, num ponto onde a solução se renova mas sem jato direto nem bolhas; presa de modo que não bata na parede; fora do alcance da luz forte. O cabo sobe até a caixa com um **laço de gotejamento** (uma volta para baixo antes de subir), para a água que escorre por ele pingar antes de chegar aos conectores.",
    "**Na manutenção do reservatório**, tire a sonda antes de esvaziar, enxágue e guarde‑a na tampa com KCl. Sonda esquecida no tanque vazio seca em poucas horas.",
    "**Uma segunda opinião.** Um medidor de pH de mão, ou fitas indicadoras, usado uma vez por semana na mesma solução, mostra se o sensor fixo saiu do lugar. O projeto registra essas conferências em `validacao/medidas-manuais.json`."]),
  NOTA("Por que o nó não compensa a temperatura do pH", ["Entre 20 e 30 °C, e perto de pH 6, o erro por temperatura fica abaixo de 0,02 pH (seção 10.2), dez vezes menor que o critério de ±0,2 do projeto. A temperatura medida pelo DS18B20 é usada para a condutividade, que varia 2 % por °C."]),
  ESPACO(),
  H2("13.5 Da aula ao nó: resumo do caminho"),
  OL(["**Na bancada, com o Uno ou o ESP32** (seções 5 a 9): aprender a ligar, ajustar o offset, calibrar e verificar. Preencher a ficha.",
    "**Com o ADS1115** (sketch `01c`): repetir a calibração e comparar a estabilidade da leitura com a do ADC interno.",
    "**No nó**, com `SIMULAR_SENSORES 1`: ensaiar a ferramenta `calibrar.py` sem nenhum sensor ligado. As retas do ensaio ficam num espaço separado da memória e não valem depois.",
    "**No nó, com os sensores montados**: Passo 1 com o multímetro, depois `calibrar.py ph` com os tampões 7,00 e 4,00 e a verificação com um terceiro.",
    "**No painel**: acompanhar o pH e a condutividade da solução, corrigir pelo roteiro da seção 12.6 e ver o efeito da correção no gráfico."]),
];

const referencias = [
  "Carrijo, O. A.; Makishima, N. Princípios de hidroponia. Embrapa Hortaliças, Circular Técnica 22, 2000 (pH, condutividade, manejo da solução e parâmetros do NFT; reproduz recomendações de Furlani et al., IAC, 1999).",
  "Singh, H.; Dunn, B. Electrical Conductivity and pH Guide for Hydroponics. Oklahoma State University Extension, HLA‑6722, 2016 (faixas por cultura e correção do pH).",
  "Mattson, N. Iron Deficiency of Hydroponic Leafy Greens and Herbs. Cornell CEA / e‑GRO Edible Alert 1(8), 2016 (ferro, quelatos e pH).",
  "Trejo‑Téllez, L. I.; Gómez‑Merino, F. C. Nutrient Solutions for Hydroponic Systems. InTech, 2012 (formas químicas dos nutrientes em função do pH).",
  "Gillespie, D. Root Zone Management of Hydroponic Leafy Greens. Ohio State University, 2019; Singapore Food Agency, Plant Nutrient Management for Hydroponic Cultivation, 2025; Penn State Extension, Hydroponics Systems and Principles of Plant Nutrition. Eletrodos e tampões: Atlas Scientific, YSI e Hanna Instruments.",
];

module.exports = { cuidados, corpo, referencias };
