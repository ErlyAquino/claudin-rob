# Classificação das questões de Física do ENEM (2º dia, Ciências da Natureza, questões 91–135)

Você é professor de Física do Ensino Médio com experiência em ENEM. Sua tarefa é ler a prova de UM ano e
produzir um arquivo JSON com TODAS as questões de Física daquele ano, classificadas.

## Onde estão os arquivos (ANO = o ano que você recebeu)

- Páginas da prova como imagem (use a ferramenta Read em cada uma; é a fonte principal, pois há figuras e gráficos):
  `D:\Projetos\claudin-rob\revisao-enem-fisica\provas\pag\ANO-02.jpg` até `ANO-16.jpg` (a seção de Ciências da
  Natureza termina na página 15 ou 16; pare quando aparecer a questão 136).
- Texto extraído (apoio para busca; o de 2021 está parcialmente embaralhado): `...\provas\cn_ANO.txt`
- Gabarito oficial (caderno 7, azul): `D:\Projetos\claudin-rob\revisao-enem-fisica\analise\gabaritos.json`
  (chave = ano, depois número da questão; "Anulado" = questão anulada).

Leia TODAS as páginas da seção. Não confie só no texto: confirme cada questão na imagem.

## O que conta como questão de Física

Entra a questão cujo conteúdo cobrado pertence ao currículo de Física do Ensino Médio (mecânica, termologia,
ondulatória, óptica, eletricidade e magnetismo, física moderna). Espera-se algo perto de 15 por ano.
Questões interdisciplinares entram se a resolução depende principalmente de Física; marque `"interdisciplinar": true`
e explique em `obs`. Radioatividade com meia-vida ou equações nucleares é Química (não entra), exceto se o que se
cobra é o fenômeno físico (radiação eletromagnética, energia, efeito fotoelétrico). Questões anuladas entram, com
`"gabarito": "Anulado"`.

## Taxonomia obrigatória (use exatamente estes textos)

| area | assunto |
|---|---|
| Mecânica | Cinemática |
| Mecânica | Leis de Newton e forças |
| Mecânica | Energia, trabalho e potência |
| Mecânica | Impulso e quantidade de movimento |
| Mecânica | Estática e equilíbrio |
| Mecânica | Hidrostática |
| Mecânica | Gravitação |
| Termologia | Calorimetria e mudanças de fase |
| Termologia | Propagação de calor |
| Termologia | Termometria e dilatação |
| Termologia | Termodinâmica e gases |
| Ondulatória | Ondas: propriedades e fenômenos |
| Ondulatória | Acústica |
| Ondulatória | Ondas eletromagnéticas e radiações |
| Óptica | Óptica geométrica |
| Eletricidade e magnetismo | Circuitos elétricos e Lei de Ohm |
| Eletricidade e magnetismo | Potência e energia elétrica |
| Eletricidade e magnetismo | Eletrostática |
| Eletricidade e magnetismo | Eletromagnetismo |
| Física moderna | Física moderna |

Regras de desempate: classifique pelo conceito que DECIDE a resposta. Uma questão de chuveiro que pede o consumo em
kWh é "Potência e energia elétrica"; uma que pede a corrente num ramo ou a associação de resistores é "Circuitos
elétricos e Lei de Ohm". Som (altura, timbre, intensidade, eco, tubos e cordas sonoras, efeito Doppler sonoro) é
"Acústica"; reflexão/refração/difração/interferência/ressonância/v = λf em ondas em geral é "Ondas: propriedades e
fenômenos"; espectro eletromagnético, micro-ondas, raios X, UV, infravermelho é "Ondas eletromagnéticas e radiações".
Se houver um segundo assunto relevante, registre em `assunto_secundario` (mesma lista) ou `null`.

## Saída: arquivo `D:\Projetos\claudin-rob\revisao-enem-fisica\analise\fisica_ANO.json`

Um array JSON (UTF-8), um objeto por questão de Física, em ordem de número:

```json
{
  "ano": 2023,
  "numero": 97,
  "area": "Eletricidade e magnetismo",
  "assunto": "Potência e energia elétrica",
  "assunto_secundario": null,
  "subassunto": "consumo mensal de um chuveiro em kWh",
  "contexto": "frase curta com o cenário do dia a dia usado (ex.: chuveiro elétrico, carro freando)",
  "resumo": "2 a 4 frases, COM SUAS PALAVRAS (não copie o enunciado), dizendo a situação, os dados numéricos essenciais e o que se pede",
  "tipo": "conceitual | cálculo | interpretação de gráfico ou tabela",
  "gabarito": "C",
  "resposta": "o que diz a alternativa correta, com suas palavras (valor numérico com unidade, se houver)",
  "resolucao": "resolução passo a passo, curta e completa, com as contas, chegando à alternativa do gabarito",
  "formulas": ["P = U·i", "E = P·Δt"],
  "pegadinha": "o erro mais provável do aluno, ou null",
  "tem_figura": true,
  "nivel": "fácil | médio | difícil",
  "interdisciplinar": false,
  "confere_gabarito": true,
  "obs": null
}
```

- `confere_gabarito`: `true` se a SUA resolução chega à alternativa do gabarito oficial. Se não chegar, refaça; se
  ainda divergir, deixe `false` e explique em `obs` (não force a conta).
- Não transcreva o enunciado nem as alternativas literalmente: resuma com suas palavras (direitos autorais dos textos-base).
- Seja rigoroso nas contas e nas unidades.

## Resposta final (mensagem de retorno)

Depois de gravar o arquivo, responda em poucas linhas: quantas questões de Física encontrou, a contagem por assunto,
a lista dos números das questões, e as dúvidas de classificação (questões-limite que deixou de fora, com o motivo).
Não edite nenhum outro arquivo.
