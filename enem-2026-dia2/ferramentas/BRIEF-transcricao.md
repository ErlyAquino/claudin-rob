# Transcrição das questões — ENEM 2026, 2º dia, Caderno 5 Amarelo

Origem: prova escaneada (31 páginas, sem camada de texto). Objetivo: um Markdown **fiel ao original**, com as figuras
recortadas da prova, que depois vira um PDF de slides (uma questão ampliada por slide).

Pasta base: `D:/Projetos/claudin-rob/enem-2026-dia2/`

## O que já existe
- `recortes/qNNN_K.jpg` — recorte(s) da questão NNN (K = 1, 2… quando a questão continua em outra coluna/página).
  Ex.: `recortes/q95_1.jpg`, `recortes/q95_2.jpg`. **É a fonte da verdade.** (nomes sem zero à esquerda)
- `recortes/indice.json` — de que página/coluna veio cada recorte.
- `paginas/pagina-NN.jpg` — páginas inteiras (use se um recorte parecer cortado no topo/base; questão 91 está na página 02).
- `ocr/qNNN.txt` — rascunho do Tesseract (cheio de erros: acentos, expoentes, frações, símbolos). Use só como apoio
  para digitar; **toda palavra e número deve ser conferido na imagem**.
- `ferramentas/recortar_figura.py` — recorta figuras:
  `python -I ferramentas/recortar_figura.py recortes/q91_1.jpg imagens/q091_fig1.png x0 y0 x1 y1`
  As coordenadas são do ARQUIVO ORIGINAL do recorte. Atenção: quando você lê uma imagem com a ferramenta Read ela pode vir
  reduzida e a ferramenta informa o fator ("Multiply coordinates by X") — multiplique as coordenadas que você estimar.
  **Depois de recortar, abra o PNG gerado e confira** que a figura está inteira (eixos, rótulos, legendas, letras) e sem
  pedaços de texto vizinho; ajuste e recorte de novo se preciso.

## O que produzir
Para cada questão do seu lote, um arquivo `questoes/qNNN.md` (NNN com 3 dígitos: `q091.md`, `q135.md`) e as imagens
em `imagens/` (nomes `qNNN_figK.png` para figuras do enunciado e `qNNN_altX.png` para alternativas que são figuras).
Os caminhos das imagens no Markdown são relativos à pasta base: `imagens/q091_fig1.png`.

Formato exato:

```markdown
## Questão 91

O modelo de Rutherford para o átomo consiste em um núcleo bastante denso, ...

![Trajetória em espiral do elétron (e) em direção ao núcleo](imagens/q091_fig1.png)

Qual gráfico apresenta a força de atração entre o núcleo e o elétron, em função do tempo ...?

**A)** ![Alternativa A](imagens/q091_altA.png)

**B)** ![Alternativa B](imagens/q091_altB.png)
...
```
Alternativas de texto: uma por parágrafo, `**A)** 7 000 Btu/h`, linha em branco entre elas.

Regras de fidelidade:
1. Texto **palavra por palavra**, com a pontuação, acentuação, itálicos (`*M*`, nomes científicos) e negritos do original.
   Não corrija, não resuma, não "melhore". Junte as hifenizações de fim de linha (`posterior-\nmente` → `posteriormente`).
   Parágrafos como no original.
2. Títulos internos (ex.: "Resíduos sólidos urbanos") como `**Resíduos sólidos urbanos**` em parágrafo próprio.
   Fontes/créditos ("Disponível em: … (adaptado).", "FULANO. Livro…") em parágrafo próprio começando com `> `
   (citação), mantendo o texto exato. Textos-base recuados/citações longas também podem usar `> `.
3. Matemática em LaTeX: `$1{,}2 \times 10^{7}$ kWh`, `$\log_{10}(1+n)$`, `$22\frac{3}{4}$`, fórmulas químicas com
   `$\text{H}_2\text{O}$` ou `H₂O` (Unicode subscrito também é aceito). Use `{,}` para a vírgula decimal dentro do LaTeX.
   Números simples sem expoente podem ficar como texto normal (`7 000 Btu/h`, `0,3 W`). Nunca troque vírgula decimal por ponto.
4. Tabelas: se for uma tabela de dados simples, transcreva como tabela Markdown (cabeçalho em negrito não é preciso).
   Se for algo com desenhos, emojis, mapas, gráficos, esquemas, cupom fiscal com layout especial, tirinha etc., recorte como
   figura. Na dúvida entre transcrever ou recortar, **recorte** (fidelidade visual) — e, se a figura contém texto essencial,
   descreva-o no texto alternativo `![...]`.
5. Alternativas que são gráficos/figuras: recorte cada uma separadamente (`q091_altA.png`…), **sem** a letra-bolinha.
   Alternativas de texto: transcreva (com LaTeX quando houver expoente/fração/raiz).
6. Não inclua o cabeçalho/rodapé de página, códigos de barra, nem o título de área ("CIÊNCIAS DA NATUREZA… Questões de
   91 a 135"). Não inclua gabarito/resolução (não há no original).
7. Se algo estiver ilegível no scan, escreve `[ilegível]` e registre no relatório — não invente.

## Ao terminar
Responda com um relatório curto: questões feitas, nº de figuras, e qualquer dúvida/trecho incerto (questão + trecho).
Não edite arquivos de outras questões fora do seu lote.
