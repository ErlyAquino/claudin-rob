# Revisão de fidelidade — ENEM 2026, 2º dia, Caderno 5 Amarelo

Você é revisor(a). Outra pessoa transcreveu questões escaneadas da prova para Markdown. Sua tarefa é conferir, questão
por questão, se a transcrição está **igual ao original** e corrigir o que não estiver.

Pasta base: `D:/Projetos/claudin-rob/enem-2026-dia2/` (rode comandos a partir dela)

- Original (fonte da verdade): `recortes/qNNN_K.jpg` (nomes sem zero à esquerda, ex. `recortes/q95_1.jpg`, `q95_2.jpg`);
  páginas inteiras em `paginas/pagina-NN.jpg` (use se o recorte parecer cortado). `recortes/indice.json` diz a página.
- Transcrição: `questoes/qNNN.md` (3 dígitos, ex. `q095.md`) e figuras em `imagens/`.
- Regras de formato que a transcrição deve seguir: `ferramentas/BRIEF-transcricao.md` (leia antes).
- Ferramenta para refazer recortes de figura: `ferramentas/recortar_figura.py` (instruções no BRIEF-transcricao).
  Ao ler imagens com Read, atenção ao fator de escala informado ("Multiply coordinates by X").

## Como revisar cada questão
1. Abra o(s) recorte(s) originais e leia com atenção (amplie mentalmente; se precisar, recorte um trecho em arquivo
   temporário no scratchpad/`%TEMP%` com Python/PIL para ver maior — não grave arquivos extras na pasta base).
2. Compare com o `.md`, frase a frase:
   - palavras trocadas, faltando ou sobrando; acentos; pontuação; maiúsculas; itálicos/negritos relevantes;
   - **todos os números, unidades, expoentes, índices, sinais, frações, fórmulas químicas e matemáticas**;
   - tabelas (células e cabeçalhos); créditos/fontes ("Disponível em…", datas de acesso);
   - as 5 alternativas (letra certa, texto exato, ordem);
   - nada da questão ficou de fora (texto após figuras, legendas, notas tipo "Utilize π = 3").
3. Abra cada figura em `imagens/` usada pela questão e confira: está inteira (nenhum eixo, rótulo, legenda ou letra
   cortado), não traz pedaço de texto que já está transcrito, nem a letra-bolinha das alternativas, e é a figura certa.
   O texto alternativo `![...]` não pode conter lixo/código. Recorte de novo se preciso.
4. Confira que o LaTeX é válido (chaves balanceadas, `{,}` para vírgula decimal, nada de `$` solto; "R$" fora de
   fórmula fica como texto `R$ 2,70`).
5. Corrija direto no arquivo. Não reescreva o que está certo; não "melhore" o português do original.

## Relatório final (curto)
Para cada questão: `OK` ou a lista de correções feitas (antes → depois). No fim, quaisquer pontos que você não conseguiu
resolver (ilegível no scan, dúvida). Não edite questões fora do seu lote.
