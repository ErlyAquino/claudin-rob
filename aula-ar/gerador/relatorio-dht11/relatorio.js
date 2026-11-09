// Relatorio tecnico: DHT11 (modulo 3 pinos) - funcionamento, biblioteca, calibracao, sensacao termica e sala de aula.
// Gera ../../saida/Relatorio-DHT11-Calibracao-Sensacao-Termica.docx (o gerar_relatorio.sh converte para PDF).
// Figuras e numeros: graficos.py (dados.json). Indice de calor calculado com o algoritmo da DHT sensor library.
const path = require("path");
const fs = require("fs");
const { H1, H2, H3, P, UL, OL, TAB, NOTA, CODIGO, CAPA, DOC, SUMARIO, ESPACO, FIGURA, salvar } = require("../lib");

const AQUI = __dirname;
const LOGOS = path.join(AQUI, "..", "..", "..", "imagens", "logos");
const SAIDA = path.join(AQUI, "..", "..", "saida", "Relatorio-DHT11-Calibracao-Sensacao-Termica.docx");
const D = JSON.parse(fs.readFileSync(path.join(AQUI, "dados.json"), "utf8"));
const E = D.ensaio;
const VERDE = "E8F5E9", AZUL = "E3F2FD", VERMELHO = "FDECEA";
const v = (x, c = 1) => Number(x).toFixed(c).replace(".", ",");

// fisica (Magnus, Sonntag 1990) - os mesmos numeros do graficos.py
const psat = (t) => 6.112 * Math.exp((17.62 * t) / (243.12 + t));     // hPa
const pPele = psat(35);                                                // pele suada ~35 C
const rhoSat30 = (psat(30) * 100) / (461.5 * 303.15) * 1000;           // g/m3 de vapor saturado a 30 C
const agua = 35 * 60;                                                  // g/h: 35 alunos x ~60 g/h
const dUR = (ach) => (100 * agua) / (ach * 180) / rhoSat30;            // aumento de UR em regime, sala 180 m3
const ex = Object.fromEntries(D.exemplos.map((x) => [`${x.t}/${x.ur}`, x]));
const hi = (t, u) => ex[`${t}/${u}`].hi;

const corpo = [
  ...CAPA({
    logosDir: LOGOS, tipo: "Relatório técnico",
    titulo: "DHT11: calibração, valores normais e sensação térmica",
    subtitulo: "Como o sensor mede, como a DHT sensor library calcula umidade, temperatura e índice de calor, como calibrar com sal de cozinha e termômetro de referência, e o que esperar numa sala de aula com ventiladores num dia quente",
    info: [
      "**Sensor:** módulo DHT11 de 3 pinos (+, DATA, −) com resistor de pull‑up e LED embutidos  •  **Placa:** ESP32 DevKit V1",
      `**Ensaio na bancada:** ${E.data}, ${E.inicio}–${E.fim}  •  **Biblioteca:** DHT sensor library (Adafruit) 1.4.7`,
      "Espaço CRIA — ETE Epitácio Pessoa — novembro de 2026",
    ],
  }),
  ...SUMARIO(),

  // ---------------------------------------------------------------
  H1("1. Resumo"),
  NOTA("Em uma página", [
    "O **DHT11** mede **umidade relativa (UR) de 20 a 90 %, com erro de ±5 pontos**, e **temperatura de 0 a 50 °C, com erro de ±2 °C**. Ele já sai **calibrado de fábrica**: os coeficientes ficam gravados no chip e não podem ser alterados. \"Calibrar\" o DHT11 é **corrigir no programa** (offset e ganho), comparando com uma referência.",
    "**Temperatura:** compare com um **DS18B20** ou um **DHT22** lado a lado, à sombra e longe do ESP32 (seção 5.2). **Umidade:** use **sal de cozinha úmido num pote fechado**, que mantém o ar a **75 % de UR**; o cloreto de magnésio dá um segundo ponto, a **33 %** (seção 5.3).",
    "A **sensação térmica** (índice de calor) é a temperatura que \"o corpo sente\" quando a umidade atrapalha a evaporação do suor. A biblioteca já calcula: `dht.computeHeatIndex(t, ur, false)`. O sketch 05c e o monitor passaram a mostrá‑la.",
    `**Sala de aula com ventiladores num dia quente** (Recife): esperado **28–32 °C e 55–75 % de UR**, ou seja, sensação de **${v(hi(28, 60), 0)} a ${v(hi(32, 75), 0)} °C** (de \"cautela\" a \"cautela extrema\", chegando a \"perigo\" numa tarde abafada com a sala lotada). O ventilador alivia o corpo, mas **não muda** a leitura do DHT11 nem o índice de calor (seção 7).`,
    `**Na bancada (${E.inicio}–${E.fim}):** **${v(E.tmed)} °C e ${v(E.urmed, 0)} %** de UR em média, sensação de **${v(E.himed)} °C**. Um sopro levou a UR a ${E.urmax} % em 10 s. Apareceram **${E.zeradas} leituras falsas de 0 %** com o checksum \"certo\", durante o mau contato da montagem. O sketch agora descarta esse caso (seção 3.4).`,
  ], VERDE),

  // ---------------------------------------------------------------
  H1("2. O sensor DHT11"),
  H2("2.1 O que tem dentro"),
  P("Dentro da caixinha azul há três partes:"),
  UL([
    "**Elemento de umidade resistivo:** dois eletrodos em pente sobre um substrato coberto por um material que **absorve vapor d'água** do ar. Quanto mais água ele absorve, mais íons ficam livres e **menor é a resistência** elétrica entre os eletrodos. A relação é quase exponencial: a resistência cai muitas vezes entre 20 % e 90 % de UR. O material entra em equilíbrio com a UR do ar em torno, por isso leva alguns segundos para responder.",
    "**Termistor NTC:** um resistor cuja resistência **diminui quando a temperatura sobe**. Serve para medir a temperatura e também para **compensar** o elemento de umidade, cuja resistência também muda com a temperatura.",
    "**Microcontrolador de 8 bits:** mede as duas resistências, aplica os **coeficientes de calibração** gravados na fábrica (memória OTP, medidos numa câmara de umidade de referência) e envia o resultado já em % e °C pelo **barramento de 1 fio**.",
  ]),
  P("O DHT11 não mede o **vapor d'água absoluto**, e sim a **umidade relativa**: quanto vapor há no ar em comparação com o máximo que o ar aguenta **naquela temperatura** (pressão de saturação). Por isso a UR cai quando o ar esquenta, mesmo sem a quantidade de água mudar. Perto de 25 °C, **1 °C de erro na temperatura muda a UR em cerca de " + v(D.sens_temp) + " % do valor lido**. Por isso a temperatura se calibra primeiro."),

  H2("2.2 Especificações (datasheet Aosong/D‑Robotics)"),
  TAB(["Item", "DHT11", "Para comparar: DHT22/AM2302"], [
    ["Alimentação", "3,0–5,5 V (no ESP32: **3V3**)", "3,3–6 V"],
    ["Corrente", "0,5–2,5 mA medindo; ~0,1 mA em repouso", "1–1,5 mA medindo"],
    ["Umidade: faixa / erro", "**20–90 % / ±5 % UR** (a 25 °C)", "0–100 % / ±2 % UR"],
    ["Temperatura: faixa / erro", "**0–50 °C / ±2 °C**", "−40 a 80 °C / ±0,5 °C"],
    ["Resolução", "1 % UR; 0,1 °C nas versões novas (1 °C nas antigas)", "0,1 % UR; 0,1 °C"],
    ["Tempo de resposta (63 %)", "umidade 6–15 s; temperatura 6–30 s", "~2 s (umidade)"],
    ["Intervalo entre leituras", "≥ 1 s (a biblioteca usa **2 s**)", "≥ 2 s"],
    ["Histerese / deriva", "±1 % UR / ±1 % UR por ano", "±0,3 % / ±0,5 % por ano"],
    ["Cabo", "até 20 m com pull‑up de 5 kΩ", "até 20 m"],
  ], [0.28, 0.40, 0.32]),
  ESPACO(),
  P(`Na bancada, o DHT11 mandou décimos de grau (29,1, 29,5, 29,8…), então é uma **versão nova**. A umidade continua de **1 em 1 %**: o byte decimal da umidade é sempre zero.`),

  H2("2.3 O módulo de 3 pinos"),
  P("O módulo é o DHT11 soldado numa plaquinha que já tem:"),
  UL([
    "**Resistor de pull‑up** (normalmente 10 kΩ, às vezes 4,7 kΩ) entre DATA e +. A linha de dados é de **dreno aberto**: o sensor e o ESP32 só puxam a linha para 0 V, e é o resistor que a traz de volta para 3,3 V. **Não precisa de resistor extra.**",
    "**LED com resistor**, ligado entre + e −. Ele **só mostra que há alimentação**: não pisca na leitura e não indica que o sensor está bom. LED aceso com o sensor falhando = problema no fio DATA ou na ordem dos pinos.",
    "Em alguns módulos, um **capacitor de 100 nF** de desacoplamento.",
  ]),
  TAB(["Pino do módulo", "ESP32 (bancada e sketch 05c)", "Observação"], [
    ["**+** (VCC)", "**3V3**", "Em 3,3 V, o pull‑up deixa a linha DATA no nível do ESP32. Com o + em 5 V, a linha iria a 5 V no GPIO."],
    ["**DATA** (meio)", "**GPIO 4**", "Qualquer GPIO de entrada e saída serve (no 06b o DHT11 fica no 13)"],
    ["**−** (GND)", "**GND**", "O mesmo GND do MH‑Z19C"],
  ], [0.2, 0.3, 0.5]),
  ESPACO(),
  NOTA("A ordem dos pinos muda de fabricante para fabricante", "Leia a serigrafia (+, out/S/DATA, −). Há módulos com o − no meio. Invertido + com −, o DHT11 esquenta e pode queimar em segundos."),

  H2("2.4 Como o dado viaja pelo fio"),
  P("O DHT11 usa um protocolo próprio de **um fio**, sem relógio: **a informação está na duração dos pulsos**."),
  ...FIGURA(path.join(AQUI, "protocolo.png"), "Uma leitura do DHT11. O ESP32 dá o \"acorda\" (0 V por 20 ms); o sensor responde com 80 µs em 0 e 80 µs em 1 e depois manda 40 bits. Cada bit começa com 50 µs em 0; o que decide se é 0 ou 1 é o tempo em 1 que vem depois."),
  OL([
    "**Pedido:** o ESP32 puxa DATA para 0 V por **pelo menos 18 ms** (a biblioteca usa 20 ms) e solta a linha. O pull‑up a leva para 3,3 V.",
    "**Resposta:** o DHT11 puxa a linha para 0 V por **80 µs** e solta por **80 µs**: \"estou aqui\".",
    "**Dados:** 40 bits, o mais significativo primeiro. Cada bit é **50 µs em 0** seguidos de **26–28 µs em 1 (bit 0)** ou **70 µs em 1 (bit 1)**.",
    "**Fim:** o sensor puxa a linha por mais 50 µs e solta. Só faz nova medição no próximo pedido; o valor entregue é o da medição **anterior**.",
  ]),
  P("Os 40 bits formam 5 bytes:"),
  TAB(["Byte", "Conteúdo", "Exemplo da bancada (47 %, 29,5 °C)"], [
    ["0", "umidade, parte inteira", "0x2F = 47"],
    ["1", "umidade, décimos (sempre 0 no DHT11)", "0x00"],
    ["2", "temperatura, parte inteira", "0x1D = 29"],
    ["3", "temperatura: décimos nos bits 0–3; bit 7 = negativo", "0x05 → 0,5"],
    ["4", "**checksum** = (byte0 + byte1 + byte2 + byte3) & 0xFF", "47 + 0 + 29 + 5 = 81 = **0x51**"],
  ], [0.1, 0.55, 0.35]),

  // ---------------------------------------------------------------
  H1("3. Como a biblioteca calcula (DHT sensor library 1.4.7)"),
  H2("3.1 A leitura: DHT::read()"),
  OL([
    "**Cache de 2 s:** se a última leitura foi há menos de 2000 ms (`MIN_INTERVAL`), devolve o resultado anterior sem falar com o sensor. Por isso `readHumidity()` e `readTemperature()` logo em seguida fazem **uma só** leitura.",
    "**Pedido:** `INPUT_PULLUP` por 1 ms, depois `OUTPUT` em LOW por **20 ms** (DHT11) e de novo `INPUT_PULLUP`; espera `pullTime` = **55 µs** (o parâmetro de `dht.begin()`).",
    "**Desliga as interrupções** (`InterruptLock`): o Wi‑Fi ou um timer no meio estragaria a contagem de microssegundos.",
    "`expectPulse(LOW)` e `expectPulse(HIGH)` conferem a resposta de 80 + 80 µs. Cada um **conta voltas de laço** enquanto o pino fica no nível esperado e desiste em ~1 ms (`TIMEOUT`).",
    "Para os 40 bits, guarda as contagens do trecho em 0 (50 µs) e do trecho em 1. **Bit = 1 se o trecho em 1 foi mais longo que o trecho em 0.** A comparação é **relativa**, então não depende da velocidade da CPU: funciona igual no Uno a 16 MHz e no ESP32 a 240 MHz.",
    "**Confere o checksum**: se o byte 4 bate com a soma dos 4 primeiros, a leitura vale. Senão, `read()` devolve `false` e as funções de leitura devolvem **NAN** (por isso o `isnan()` no sketch).",
  ]),

  H2("3.2 Os números: readHumidity() e readTemperature()"),
  CODIGO(`// DHT.cpp, caso DHT11 (trechos)
float h = data[0] + data[1] * 0.1;          // umidade: inteiro + decimos (no DHT11, decimos = 0)

float t = data[2];                          // temperatura: parte inteira
if (data[3] & 0x80) t = -1 - t;             // bit 7 do byte 3 = negativo
t += (data[3] & 0x0f) * 0.1;                // decimos nos 4 bits baixos`, { arquivo: false, titulo: "readHumidity() / readTemperature()" }),
  ESPACO(),
  P("A biblioteca **não faz nenhuma conta de calibração**: só junta os bytes. Quem converte a resistência do sensor em % e °C é o microcontrolador dentro do DHT11. Qualquer correção extra fica por conta do nosso programa (seção 5)."),
  P("`readTemperature(true)` devolve °F (×1,8 + 32). `computeHeatIndex()` é explicada na seção 6.3."),

  H2("3.3 Leituras na bancada"),
  ...FIGURA(path.join(AQUI, "leituras.png"), `DHT11 no GPIO 4, leitura a cada 2 s, ${E.inicio}–${E.fim} (${E.n} leituras válidas). Acima: temperatura e sensação térmica calculada; abaixo: umidade.`),
  UL([
    `**Repouso:** ${v(E.tmin)}–${v(E.tmax)} °C e ${E.urmin}–48 % de UR. Ponto de orvalho ≈ ${v(E.orvmed)} °C, sensação ≈ ${v(E.himed)} °C.`,
    "**Sopro às 13:23:** a UR subiu de 47 % para 68–69 % em ~10 s e voltou a 48 % em ~40 s. O ar expirado sai a ~34 °C e quase saturado; a temperatura do DHT11 mal mudou (+1 °C), mas a sensação calculada chegou a 34 °C. Na prática, a umidade responde bem mais rápido que a temperatura.",
    "**Degraus de ~1,5 °C** (28,0 ↔ 29,5 °C, às 13:22 e 13:28): coincidem com mexidas na montagem; a temperatura voltou sozinha. Mão por perto e o calor do próprio ESP32 aquecem o sensor (seção 5.2).",
    "**Falhas (NAN):** " + E.falhas + " leituras sem resposta ou com checksum errado, todas antes das 13:20, enquanto o módulo era ligado.",
  ]),

  H2("3.4 Armadilha: \"0 % e 0,8 °C\" com o checksum certo"),
  NOTA("Leitura falsa que passa no checksum", [
    `Entre 13:19 e 13:21, o sensor entregou **${E.zeradas} leituras de 0 % de UR e 0,8–0,9 °C** que a biblioteca aceitou. Os bytes eram 0x00 0x00 0x00 0x08 0x08: os três primeiros perdidos (mau contato no DATA ou no GND durante a montagem), e o checksum \"certo\" por coincidência, porque 0 + 0 + 0 + 8 = 8.`,
    "O DHT11 **não mede abaixo de 20 %**, e um ambiente interno no Recife não chega a 0 %. **Correção no sketch 05c:** UR < 1 % conta como falha (`umid < 1` junto do `isnan`). Em qualquer projeto, vale descartar valores fora da faixa do sensor (UR < 20 % ou > 95 %, T < 0 °C ou > 50 °C) e repetir a leitura.",
  ], VERMELHO),
  ESPACO(),
  CODIGO(`// 05c_mhz19c_diagnostico_usb.ino (trecho do loop, a cada 2 s)
float umid = dht.readHumidity(), tAr = dht.readTemperature();
// 0 % com checksum "certo" = bits zerados por mau contato (abaixo dos 20 % que o DHT11 mede): descarta
if (isnan(umid) || isnan(tAr) || umid < 1) {
  falhasDht++;
} else {
  float sensacao = dht.computeHeatIndex(tAr, umid, false);   // indice de calor (NWS), em C
  publicar("umidade", umid, 0, "%");
  publicar("temperatura-ar", tAr, 1, "C");
  publicar("sensacao-termica", sensacao, 1, "C");
}`, { arquivo: false, titulo: "Leitura com descarte de quadros inválidos" }),

  // ---------------------------------------------------------------
  H1("4. Valores normais esperados"),
  H2("4.1 Umidade relativa e saúde"),
  TAB(["UR", "O que acontece", "Situação"], [
    ["< 30 %", "Olhos e garganta secos, mucosas irritadas, choque eletrostático; vírus respiratórios sobrevivem mais no ar seco", "Seco — comum com ar‑condicionado forte, raro no Recife"],
    ["30–40 %", "Aceitável por pouco tempo", "Atenção"],
    ["**40–60 %**", "**Faixa ótima**: menos ácaros, fungos, bactérias e vírus no ar (\"zona ótima\" de Sterling et al., 1985)", "**Saudável**"],
    ["60–70 %", "Abafado em dia quente, o suor evapora menos; ácaros e mofo começam a crescer", "Úmido — normal em sala ventilada no Recife"],
    ["> 70 %", "Mofo nas paredes e nos livros, cheiro de umidade, piora de asma e rinite", "Muito úmido"],
    ["> 85 % ou T ≤ ponto de orvalho", "Condensação: paredes frias \"suam\", eletrônicos em risco", "Crítico"],
  ], [0.2, 0.52, 0.28]),
  ESPACO(),
  H2("4.2 Referências normativas"),
  TAB(["Norma", "Temperatura", "UR", "Velocidade do ar"], [
    ["ANVISA RE 9/2003 (ambientes climatizados de uso coletivo)", "verão 23–26 °C", "verão 40–65 %", "≤ 0,25 m/s a 1,5 m do piso"],
    ["ABNT NBR 16401‑2 (conforto, ar‑condicionado)", "verão 22,5–25,5 °C", "35–65 %", "≤ 0,2–0,25 m/s"],
    ["NR‑17 (trabalho intelectual, ex.: salas de aula e escritórios)", "18–25 °C", "≥ 40 %", "≤ 0,75 m/s"],
    ["ASHRAE 55 com ventiladores (\"velocidade do ar elevada\")", "conforto até ~30–31 °C", "—", "0,8–1,2 m/s"],
  ], [0.38, 0.2, 0.18, 0.24]),
  ESPACO(),
  P("As normas brasileiras valem para ambientes **climatizados**. Numa sala só com ventiladores, a referência útil é a **ASHRAE 55**, que aceita temperaturas mais altas quando o ar se move sobre as pessoas, e o **índice de calor** (seção 6) como alerta."),
  H2("4.3 O que o DHT11 deve mostrar em cada lugar"),
  TAB(["Lugar", "Temperatura", "UR", "Comentário"], [
    ["Sala com ar‑condicionado", "22–25 °C", "40–60 %", "Abaixo de 40 %, o ar‑condicionado está secando demais"],
    ["Laboratório/bancada (esta medição)", `${v(E.tmin, 0)}–${v(E.tmax, 0)} °C`, `${E.urmin}–48 %`, "Ensaio de 09/11/2026, 13:20"],
    ["Sala de aula com ventiladores, dia quente", "28–32 °C", "55–75 %", "Seção 7"],
    ["Externo, Recife, tarde de verão (sombra)", "29–32 °C", "60–75 %", "Pela manhã, UR mais alta (80–90 %)"],
    ["Banheiro depois do banho, cozinha", "+2 a +5 °C", "80–95 %", "Fora da faixa do DHT11 acima de 90 %"],
    ["Sopro direto no sensor", "+1 a +3 °C", "+20 a +40 pontos", "Teste rápido de que o sensor responde"],
  ], [0.33, 0.17, 0.17, 0.33]),
  ESPACO(),
  P("Ao comparar dois DHT11 ou o DHT11 com outro sensor, diferenças de **até 2 °C e até 5 pontos de UR estão dentro da especificação**. Só acima disso vale corrigir ou trocar."),

  // ---------------------------------------------------------------
  H1("5. Calibração do DHT11"),
  H2("5.1 O que dá para calibrar"),
  P("O DHT11 não aceita comandos: não há registrador de calibração como o zero do MH‑Z19C. A calibração é uma **correção linear no programa**:"),
  CODIGO(`T_corrigida  = T_lida + T_OFFSET
UR_corrigida = UR_A * UR_lida + UR_B      (1 ponto: UR_A = 1 e so o UR_B)`, { arquivo: false }),
  ESPACO(),
  UL([
    "**Calibre a temperatura primeiro.** O erro de temperatura também puxa a umidade (seção 2.1).",
    "**Faça na temperatura de uso** (25–30 °C), sem sol, sem gente perto e com o sensor parado.",
    "Use a **média de 30 leituras** (1 minuto): o DHT11 oscila 0,1–0,5 °C de uma leitura para outra.",
  ]),

  H2("5.2 Temperatura: um termômetro de referência"),
  OL([
    "**Referência:** um **DS18B20** (±0,5 °C, aula‑sensores) ou um **DHT22** (±0,5 °C, aula‑ar). Um termômetro digital de laboratório também serve. O sensor interno do MH‑Z19C **não serve**: ele mede a própria placa, mais quente.",
    "Prenda os dois **juntos (1–2 cm)**, na **ponta de um cabo de 15–20 cm**, longe do ESP32. O chip do ESP32 com Wi‑Fi esquenta a placa e o ar em volta em vários graus. Isso explica, em parte, por que DHT11 \"espetado\" ao lado da placa marca mais calor.",
    "Espere **20–30 min** parado (tempo de resposta de até 30 s, mas a caixa plástica e o fio levam mais tempo para entrar em equilíbrio).",
    "Anote a média de 30 leituras dos dois: **T_OFFSET = T_referência − T_DHT11.**",
    "Para dois pontos, repita num lugar ~10 °C diferente (perto do ar‑condicionado ou numa caixa de isopor com gelo **sem contato com água**) e calcule ganho e offset. Para o DHT11, **um ponto basta**: o erro dele é praticamente um deslocamento constante.",
  ]),

  H2("5.3 Umidade: sal num pote fechado"),
  P("Uma **solução salina saturada** (sal com um pouco de água, formando uma pasta com sal sobrando) mantém o ar de um recipiente fechado numa **UR fixa**, que quase não depende da temperatura. É o método padrão de laboratório (Greenspan, 1977) e custa centavos."),
  TAB(["Sal", "UR de equilíbrio a 25 °C", "Onde encontrar", "Uso no DHT11"], [
    ["**Cloreto de sódio (NaCl)**, sal de cozinha", "**75,3 %**", "mercado (sem iodo é melhor, mas o iodado serve)", "**Ponto principal**"],
    ["**Cloreto de magnésio (MgCl₂)**", "**32,8 %**", "farmácia / loja de produtos naturais", "Segundo ponto (ganho)"],
    ["Carbonato de potássio (K₂CO₃)", "43,2 %", "loja de química", "Alternativa ao MgCl₂"],
    ["Cloreto de potássio (KCl)", "84,3 %", "\"sal light\"; loja de química", "Ponto alto (perto do limite de 90 %)"],
    ["Cloreto de lítio (LiCl)", "11,3 %", "—", "Não serve: abaixo dos 20 % do DHT11"],
  ], [0.32, 0.18, 0.3, 0.2]),
  ESPACO(),
  P("**Passo a passo (NaCl, 75 %):**"),
  OL([
    "Num **pote de vidro com tampa de rosca** (pote de palmito ou geleia), coloque uma tampinha com **2 colheres de sal e algumas gotas de água**: pasta úmida, **com sal sem dissolver**. Se dissolver tudo, ponha mais sal.",
    "Prenda o DHT11 **suspenso**, sem encostar na pasta (respingo de sal estraga o sensor). Passe os 3 fios pela tampa e **vede o furo** com cola quente ou massa de modelar. O ESP32 fica do lado de fora.",
    "Deixe o pote **longe do sol e de correntes de ar**, numa temperatura estável. Uma variação de temperatura dentro do pote cria condensação e falseia o ensaio.",
    "**Espere de 6 a 12 horas** (de preferência a noite toda) para o ar do pote entrar em equilíbrio. Registre pelo monitor ou pela telemetria (`umidade` do `no19`). A curva sobe e se estabiliza.",
    "Use a **média da última hora**. Com um ponto: **UR_B = 75,3 − UR_lida** (UR_A = 1).",
    "Com o segundo pote (**MgCl₂, 32,8 %**): **UR_A = (75,3 − 32,8) / (L75 − L33)** e **UR_B = 75,3 − UR_A × L75**, onde L75 e L33 são as médias lidas em cada pote.",
  ]),
  NOTA("Exemplo de conta", [
    "Pote de sal de cozinha: DHT11 leu **71 %** (L75). Pote de MgCl₂: leu **36 %** (L33).",
    "UR_A = (75,3 − 32,8) / (71 − 36) = 42,5 / 35 = **1,214**;  UR_B = 75,3 − 1,214 × 71 = **−10,9**.",
    "Na sala, o DHT11 lê 60 % → corrigido = 1,214 × 60 − 10,9 = **61,9 %**. Limite sempre entre 0 e 100.",
  ], AZUL),
  ESPACO(),
  H2("5.4 Colocando a correção no sketch"),
  CODIGO(`// valores achados na calibracao (deixe 0 / 1 / 0 enquanto nao calibrar)
const float T_OFFSET = 0.0;     // C   = T_referencia - T_DHT11
const float UR_A = 1.0;         //     ganho (2 pontos) ou 1.0
const float UR_B = 0.0;         // %   offset

float tAr  = dht.readTemperature() + T_OFFSET;
float umid = constrain(UR_A * dht.readHumidity() + UR_B, 0, 100);
float sensacao = dht.computeHeatIndex(tAr, umid, false);   // usa os valores ja corrigidos`, { arquivo: false, titulo: "Correção de calibração" }),
  ESPACO(),
  H2("5.5 Quando o sensor precisa de cuidado ou troca"),
  UL([
    "**Depois de ficar em UR muito alta** (> 90 %) ou molhado, o DHT11 pode ficar lendo alto por horas. Seque‑o ao ar, desligado. Fabricantes de sensores de umidade recomendam um **recondicionamento**: ~2 h a 50–60 °C em ar seco, depois algumas horas em ~70 % (o pote de sal serve).",
    "**Erro maior que 5 pontos de UR ou 2 °C depois da correção**, ou leitura que não responde ao sopro: troque. Ele custa pouco; para medir com exatidão, o **DHT22** (±2 %) ou um sensor I²C (SHT31, BME280) são melhores.",
    "Poeira, fumaça, solventes e vapores de álcool (álcool em gel perto!) contaminam o elemento e deslocam a leitura.",
    "**Recalibre uma vez por ano** (deriva de ±1 % por ano) ou antes de uma medição importante.",
  ]),

  // ---------------------------------------------------------------
  H1("6. Sensação térmica (índice de calor)"),
  H2("6.1 O que é"),
  P("**Índice de calor** (*heat index*) é a temperatura que, com uma umidade de referência baixa, daria **o mesmo estresse térmico no corpo** que o ar real. Foi definido por **R. G. Steadman (1979)** e adotado pelo serviço meteorológico dos EUA (NWS). O INMET e a imprensa chamam de \"sensação térmica\" no calor. No frio, \"sensação térmica\" é outra conta, o *wind chill*, que usa o vento."),
  P("Ele só existe para o **calor**: abaixo de ~27 °C, ele quase coincide com a temperatura do ar."),

  H2("6.2 A física: por que a umidade esquenta"),
  P("O corpo produz calor o tempo todo (metabolismo) e precisa jogá‑lo fora para ficar em ~37 °C por dentro e ~33–35 °C na pele. Um aluno sentado produz cerca de **100–120 W** (1,2 met ≈ 70 W por m² de pele). O balanço é:"),
  CODIGO(`M  =  C  +  R  +  E  +  S
M  calor produzido pelo metabolismo
C  conveccao:  h_c · (T_pele − T_ar)        o ar leva o calor; cai a zero quando T_ar ≈ T_pele
R  radiacao:   troca com paredes, teto e janelas (telhado quente = R negativo)
E  evaporacao do suor:  h_e · (p_pele − p_ar)
S  o que sobra e fica no corpo  →  a temperatura do corpo sobe`, { arquivo: false, titulo: "Balanço de calor do corpo" }),
  ESPACO(),
  UL([
    "**Convecção e radiação** dependem da **diferença de temperatura** entre a pele e o ambiente. Com o ar a 30 °C e a pele a 34 °C, sobram só 4 °C de diferença, e esses caminhos tiram pouco calor.",
    `**Evaporação do suor** é o principal caminho no calor: cada grama de suor evaporado leva **~2,4 kJ** (calor latente). Ela depende da diferença entre a **pressão de vapor na pele suada** (vapor saturado a 35 °C ≈ **${v(pPele, 0)} hPa**) e a **pressão de vapor do ar**, p_ar = UR × p_sat(T_ar).`,
    `**A umidade entra aqui.** A 30 °C, p_sat = ${v(psat(30), 0)} hPa. Com UR de 40 %, p_ar = ${v(0.4 * psat(30), 0)} hPa e a diferença para a pele é ${v(pPele - 0.4 * psat(30), 0)} hPa. Com UR de 70 %, p_ar = ${v(0.7 * psat(30), 0)} hPa e a diferença cai para ${v(pPele - 0.7 * psat(30), 0)} hPa: o suor evapora **cerca de ${v(100 * (1 - (pPele - 0.7 * psat(30)) / (pPele - 0.4 * psat(30))), 0)} % mais devagar**. O suor escorre sem evaporar, e escorrido não resfria.`,
    "Steadman calculou, para um adulto padrão (roupa leve, à sombra, com vento leve), qual temperatura **com ar seco de referência (p_ar ≈ 16 hPa)** daria o mesmo esforço de resfriamento. Essa temperatura é o índice de calor.",
  ]),
  P("A **pressão de saturação** vem da fórmula de Magnus: p_sat(T) = 6,112 × exp(17,62·T / (243,12 + T)) hPa. Ela praticamente **dobra a cada ~11 °C**: o ar quente carrega muito mais água, e por isso o índice cresce tão depressa no calor úmido."),

  H2("6.3 A conta da biblioteca: computeHeatIndex()"),
  P("Steadman publicou tabelas, não uma fórmula. **Rothfusz (NWS, 1990)** ajustou um polinômio a essas tabelas; é ele que a biblioteca usa, **em °F**:"),
  CODIGO(`float DHT::computeHeatIndex(float temperature, float percentHumidity, bool isFahrenheit) {
  if (!isFahrenheit) temperature = convertCtoF(temperature);       // a conta e em F
  hi = 0.5 * (temperature + 61.0 + ((temperature - 68.0) * 1.2) +   // 1) formula simples de Steadman
              (percentHumidity * 0.094));
  if (hi > 79) {                                                     // 2) acima de 79 F (26,1 C):
    hi = -42.379 + 2.04901523*T + 10.14333127*RH                     //    regressao de Rothfusz
         - 0.22475541*T*RH - 0.00683783*T*T - 0.05481717*RH*RH
         + 0.00122874*T*T*RH + 0.00085282*T*RH*RH - 0.00000199*T*T*RH*RH;
    if (RH < 13 && T >= 80 && T <= 112)                              // 3) ajuste para ar muito seco
      hi -= ((13 - RH) * 0.25) * sqrt((17 - abs(T - 95)) * 0.05882);
    else if (RH > 85 && T >= 80 && T <= 87)                          //    ajuste para ar muito umido
      hi += ((RH - 85) * 0.1) * ((87 - T) * 0.2);
  }
  return isFahrenheit ? hi : convertFtoC(hi);                         // volta para C
}`, { arquivo: false, titulo: "DHT.cpp (T = temperatura em °F, RH = UR em %)" }),
  ESPACO(),
  UL([
    "**Passo 1 (fórmula simples):** uma reta que vale para tempo ameno. **Passo 2:** quando o resultado passa de 79 °F, entra o polinômio de 9 termos, com erro de ±0,7 °C (±1,3 °F) em relação às tabelas de Steadman. **Passo 3:** correções pequenas nas pontas.",
    "**Degrau perto de 26 °C:** o NWS decide a troca de fórmula pela **média** entre o resultado simples e a temperatura; a biblioteca usa o resultado simples direto. Por isso, nas curvas da Figura 3, aparece um salto de ~0,5–1 °C entre 25,5 e 26,5 °C. Não afeta a sala quente (acima de 27 °C, as duas versões dão o mesmo).",
    "**O que o índice não considera:** vento e ventilador, sol direto (que soma até 8 °C), roupa (uniforme, mochila), esforço físico (educação física) e aclimatação. É uma referência para **pessoas paradas à sombra**.",
  ]),
  ...FIGURA(path.join(AQUI, "sensacao.png"), "Índice de calor pela fórmula da biblioteca, de 24 a 36 °C, para UR de 40 a 80 %, com as faixas de alerta do NWS. A faixa verde é a sala de aula com ventiladores num dia quente."),

  H2("6.4 Tabela de sensação térmica"),
  TAB(["Temperatura do ar", "UR 40 %", "UR 50 %", "UR 60 %", "UR 70 %", "UR 80 %"],
    D.tabela_hi.map(([t, ...h]) => [`**${t} °C**`, ...h.map((x) => `${v(x)} °C`)]),
    [0.2, 0.16, 0.16, 0.16, 0.16, 0.16]),
  ESPACO(),
  TAB(["Índice de calor", "Categoria (NWS)", "Efeito com exposição longa ou atividade"], [
    ["< 27 °C", "normal", "Conforto ou leve calor"],
    ["27–32 °C", "**cautela**", "Fadiga, mais sede, queda de concentração"],
    ["32–41 °C", "**cautela extrema**", "Câimbras e exaustão pelo calor possíveis"],
    ["41–54 °C", "**perigo**", "Câimbras e exaustão prováveis; insolação possível"],
    ["> 54 °C", "**perigo extremo**", "Insolação (hipertermia) muito provável"],
  ], [0.2, 0.25, 0.55]),

  // ---------------------------------------------------------------
  H1("7. Sala de aula com ventiladores num dia quente"),
  H2("7.1 Valores esperados"),
  P("Numa escola do Recife, numa tarde quente de verão, com **35–40 alunos**, janelas abertas e ventiladores de teto ou de parede:"),
  TAB(["Momento", "Temperatura", "UR", "Sensação (biblioteca)", "Categoria"], [
    ["Início da manhã, sala vazia", "28 °C", "60 %", `${v(hi(28, 60))} °C`, ex["28/60"].faixa],
    ["Meio da manhã, sala cheia", "30 °C", "65 %", `${v(hi(30, 65))} °C`, ex["30/65"].faixa],
    ["Depois do intervalo", "31 °C", "70 %", `${v(hi(31, 70))} °C`, ex["31/70"].faixa],
    ["Tarde quente, sala lotada, pouco vento", "32 °C", "75 %", `${v(hi(32, 75))} °C`, ex["32/75"].faixa],
    ["Tarde seca e quente (vento oeste)", "33 °C", "60 %", `${v(hi(33, 60))} °C`, ex["33/60"].faixa],
  ], [0.36, 0.14, 0.1, 0.2, 0.2]),
  ESPACO(),
  NOTA("Faixa típica", [
    "**Temperatura 28–32 °C, UR 55–75 %, sensação 29–42 °C.** Numa sala com ventiladores, no verão do Recife, o normal é passar **o começo da manhã em \"cautela\" e o resto do dia em \"cautela extrema\"**; numa tarde abafada com a sala lotada, o índice passa de 41 °C (\"perigo\"). Uma UR abaixo de 50 % num dia assim é rara: confira o sensor (perto do ESP32? em sol?).",
  ]),
  ESPACO(),
  H2("7.2 Por que a sala fica mais quente e mais úmida que o lado de fora"),
  UL([
    "**Calor das pessoas:** 35 alunos × ~100 W ≈ **3,5 kW**, o mesmo que um aquecedor grande ligado o tempo todo, mais lâmpadas, projetor e computadores. Sem renovação de ar, isso aquece a sala em 1–3 °C acima do lado de fora.",
    `**Água das pessoas:** cada aluno solta **~50–70 g de vapor por hora** (respiração e suor). 35 alunos ≈ **${v(agua / 1000, 1)} kg por hora**. Numa sala de 180 m³ a 30 °C, onde o ar saturado carrega ~${v(rhoSat30, 0)} g/m³, isso mantém a UR **~${v(dUR(5), 0)} pontos acima** da externa com 5 renovações de ar por hora (janelas bem abertas), **~${v(dUR(2), 0)} pontos** com 2 renovações e **mais de ${v(dUR(1), 0)} pontos** com 1 (janelas quase fechadas). É o mesmo modelo de caixa usado para o CO₂ no relatório do MH‑Z19C.`,
    "**Telhado e paredes ao sol** irradiam calor (o termo R da seção 6.2), e o ventilador de teto empurra para baixo o ar quente que fica junto do forro.",
  ]),
  H2("7.3 O que o ventilador faz (e o que não faz)"),
  UL([
    "**Não esfria o ar.** Ele até aquece um pouco (o motor dissipa 50–100 W). O DHT11 **mede o mesmo** com o ventilador ligado ou desligado, e o índice de calor também não muda.",
    "**Esfria as pessoas:** o ar em movimento aumenta a convecção (h_c cresce com a raiz da velocidade do ar) e a **evaporação do suor**, porque leva embora o ar úmido junto da pele. Com **0,8–1,2 m/s** sobre os alunos, o alívio equivale a baixar a temperatura em **~2–4 °C** (ASHRAE 55, *elevated air speed*). Uma sala a 31 °C com bom ventilador \"parece\" 27–29 °C.",
    "**O alívio diminui** quando o ar passa de **~35 °C** com umidade alta: o ar fica mais quente que a pele, e a convecção passa a **trazer** calor. A OMS observa que, nessa condição, ventiladores não previnem doenças pelo calor; é preciso resfriar o ambiente, mudar de lugar ou fazer pausas.",
    "Para estimar o que os alunos sentem, desconte **~2–3 °C do índice de calor** em quem está bem embaixo do ventilador. **Não desconte** para quem está fora do fluxo (cantos, fundo da sala).",
  ]),
  H2("7.4 Onde colocar o sensor na sala"),
  UL([
    "Na **altura das cabeças dos alunos sentados** (1,1–1,5 m), numa parede interna, **na sombra**.",
    "**Longe** de janela com sol, de lâmpada, de projetor e computador, da saída do ar‑condicionado e a **mais de 1 m das pessoas**: o hálito e o corpo aquecem e umedecem o sensor (o sopro da seção 3.3).",
    "Com o DHT11 numa **caixa**, ela precisa de furos e do sensor **fora** da parte onde fica o ESP32.",
    "Fluxo do ventilador sobre o sensor **não atrapalha** a medida, mas **poeira** sim: limpe a grade de vez em quando com pincel seco.",
  ]),
  H2("7.5 O que fazer em cada faixa (sugestão para a escola)"),
  TAB(["Sensação", "Semáforo", "Ação"], [
    ["< 27 °C", "verde", "Normal"],
    ["27–32 °C", "amarelo", "Água à vontade, ventiladores ligados, janelas e portas abertas, cortinas no lado do sol"],
    ["32–41 °C", "laranja", "Pausas, menos esforço físico; educação física só na sombra ou no início da manhã; atenção a quem passa mal (tontura, dor de cabeça, náusea)"],
    ["> 41 °C", "vermelho", "Suspender atividades físicas, levar a turma para o lugar mais fresco da escola e comunicar a direção"],
  ], [0.15, 0.15, 0.7]),
  ESPACO(),
  P("**Junto com o CO₂:** abrir as janelas baixa o CO₂ (relatório do MH‑Z19C) e quase sempre baixa também a temperatura e a umidade da sala cheia. Se o ar de fora estiver mais quente que o de dentro (tarde de sol forte), feche as cortinas do lado do sol, mas **mantenha uma renovação mínima de ar**."),

  // ---------------------------------------------------------------
  H1("8. Checklist"),
  OL([
    "Pinos conferidos na serigrafia: **+ no 3V3, DATA no GPIO 4, − no GND**. O LED do módulo acende.",
    "Leituras chegando no monitor (`http://localhost:8019`) ou na telemetria (`umidade`, `temperatura-ar`, `sensacao-termica` do `no19`). Nenhum 0 % e nenhuma sequência de NAN.",
    "Teste do sopro: a UR sobe 15–40 pontos e volta em menos de 1 minuto.",
    "Sensor num cabo, longe do ESP32, à sombra, sem gente perto.",
    "Temperatura comparada com DS18B20 ou DHT22 por 30 min → **T_OFFSET**.",
    "Pote de sal de cozinha por 6–12 h → **UR_B** (e MgCl₂ para o **UR_A**, se quiser dois pontos).",
    "Constantes gravadas no sketch; leitura corrigida confere com a referência a menos de 1 °C e 3 pontos de UR.",
    "Na sala: sensor a 1,1–1,5 m, parede interna, longe de janela, de pessoas e de equipamentos. Índice de calor acompanhado com o semáforo da seção 7.5.",
  ]),

  // ---------------------------------------------------------------
  H1("9. Referências"),
  UL([
    "Aosong / D‑Robotics. *DHT11 Humidity & Temperature Sensor — datasheet* (especificações, protocolo de 1 fio).",
    "Adafruit. *DHT sensor library* 1.4.7 — `DHT.cpp` (`read`, `expectPulse`, `readHumidity`, `readTemperature`, `computeHeatIndex`). github.com/adafruit/DHT-sensor-library",
    "Steadman, R. G. The assessment of sultriness. Part I: A temperature‑humidity index based on human physiology and clothing science. *Journal of Applied Meteorology* 18:861–873 (1979).",
    "Rothfusz, L. P. *The heat index equation*. NWS Southern Region Technical Attachment SR 90‑23 (1990).",
    "NOAA / NWS Weather Prediction Center. *The Heat Index Equation*. wpc.ncep.noaa.gov/html/heatindex_equation.shtml",
    "Greenspan, L. Humidity fixed points of binary saturated aqueous solutions. *Journal of Research of the NBS* 81A:89–96 (1977).",
    "Sonntag, D. / Alduchov, O. A.; Eskridge, R. E. Improved Magnus form approximation of saturation vapor pressure. *J. Appl. Meteorol.* 35:601 (1996).",
    "Sterling, E. M.; Arundel, A.; Sterling, T. D. Criteria for human exposure to humidity in occupied buildings. *ASHRAE Transactions* 91 (1985).",
    "ANVISA. Resolução RE nº 9, de 16/01/2003 — padrões de qualidade do ar interior em ambientes climatizados.",
    "ABNT NBR 16401‑2 — Instalações de ar‑condicionado: parâmetros de conforto térmico.",
    "Ministério do Trabalho. NR‑17 — Ergonomia (condições de conforto em ambientes de trabalho).",
    "ASHRAE Standard 55 — *Thermal Environmental Conditions for Human Occupancy* (velocidade do ar elevada).",
    "Organização Mundial da Saúde (Europa). *Heat and health* — orientações sobre o uso de ventiladores.",
    "Espaço CRIA: `aula-ar/codigo/05c_mhz19c_diagnostico_usb`, `aula-ar/python/monitor_mhz19c.py`, `aula-ar/gerador/relatorio-dht11/graficos.py`.",
  ]),
];

module.exports = DOC({ titulo: "DHT11: calibração e sensação térmica", rodape: "Relatório técnico — DHT11: calibração, valores normais e sensação térmica — Espaço CRIA", corpo });
if (require.main === module) salvar(module.exports, SAIDA);
