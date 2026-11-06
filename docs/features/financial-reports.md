# Relatórios financeiros — #42

As janelas de 1, 3, 6 e 12 meses terminam no mês de trabalho global, incluindo-o inteiro, mesmo se futuro. A janela escolhida fica em `reportWindow` na URL. Datas nos filtros ativam o intervalo personalizado; ambas são obrigatórias. Alterar o mês global remove datas personalizadas. Busca, tipo, categoria, cartão, valores mínimo/máximo e modalidade usam os mesmos critérios do extrato, persistidos na URL. Voltar pelo navegador recupera o contexto do relatório.

Competência é o padrão: compras no cartão entram no fechamento, parcelas na competência registrada em `installmentMonth`. Data da compra é uma opção explícita. Totais, evolução, categorias, cartões, detalhamento e CSV usam o conjunto completo filtrado. Cartões não são somados novamente; quitações não são lançamentos de despesa. Recorrências e parcelas entram somente se efetivamente registradas, sem geração ou projeção pelo relatório.

Janelas mensais comparam o mesmo número de meses imediatamente anteriores. Intervalos personalizados comparam o mesmo número de dias civis imediatamente anteriores, incluindo as duas pontas, sem depender de durações de 24 horas ou UTC. O período anterior aparece junto ao atual e recebe os mesmos filtros.

- Resultado = receitas − despesas − aportes.
- Economia antes dos aportes = receitas − despesas.
- Percentual de aportes = aportes / receitas × 100.
- Variação = (atual − anterior) / valor absoluto do anterior × 100.
- Receita zero ou denominador anterior zero: **Sem base de comparação**.
- Concentração = soma das cinco maiores categorias / total do respectivo tipo × 100. Os rankings mantêm categorias arquivadas e indisponíveis.

Todos os cálculos monetários usam centavos inteiros com verificação de inteiro seguro. O resultado acumulado começa em zero no início do período; não representa saldo bancário, carteira, patrimônio ou rentabilidade. Meses sem registros mantêm o acumulado.

Metas e limites são lidos separadamente para cada mês do intervalo, inclusive meses sem movimentos. Ausência de meta difere de meta não atingida. O realizado segue os filtros e o critério de data exibidos; o objetivo permanece mensal e não é rateado. Meses parciais são identificados e não equivalem a fechamento mensal. O relatório não transporta metas nem altera configurações.

Links dos indicadores levam ao extrato com os mesmos critérios e datas. Economia oferece os dois conjuntos de receitas e despesas. Indicadores de tipos excluídos pelo filtro não oferecem links para conjuntos que contradigam esse filtro. Categorias e cartões têm detalhamento próprio. CSV percorre todas as páginas do mesmo conjunto, independentemente da paginação do extrato. A primeira coluna do CSV continua sendo a data registrada da compra; o critério do relatório determina a seleção das linhas.

O carregamento/erro da comparação não bloqueia os resultados atuais; categorias e cada mês de metas têm estados próprios. Gráficos reutilizam listas textuais acessíveis, mantendo os dados e links disponíveis por teclado.

Não há mudança de schema, regras, índices ou migração. As consultas por competência percorrem todo o histórico candidato em lotes de até 100 mais um documento de verificação. O relatório atual e a comparação exigem consultas separadas; histórias extensas podem consumir muitas leituras. As consultas têm cache por UID e critérios durante 60 segundos, invalidação nas mutações financeiras e sinal de cancelamento quando substituídas. Metas usam o cache `budgets` por UID e mês; só as configurações são lidas, sem consultar transações novamente por mês. Falhas ou estouro do limite não publicam totais parciais.

## Verificação em 06/11/2026

- Node 24.15.0 e npm 12.0.2. `npm run lint`, `npm run typecheck` e `npm test -- --runInBand` aprovados: 61 suítes, 334 testes.
- `npm run build` aprovado. A primeira tentativa no sandbox falhou com `EPERM` ao criar a saída do Next.js; a execução com acesso ao diretório de build passou.
- `npm run test:rules` encontrou a porta 8080 ocupada por um emulador preexistente, preservado. A mesma suíte foi copiada para uma pasta temporária ignorada, alterando somente a porta para 28080 e os caminhos da configuração. `firebase emulators:exec --only firestore --project demo-gestone-rules` com essa configuração passou nos 150 testes.
- `npm run test:e2e` executou 55 cenários: 53 passaram na primeira rodada. Dois seletores antigos/incorretos foram corrigidos nos testes e a reexecução com `playwright test --last-failed`, através de cópia temporária do mesmo iniciador de emuladores, aprovou os dois restantes. Todos usaram `demo-gestone-e2e` e Node 24.
- O fluxo novo verifica janelas 1/3/6/12, datas personalizadas e comparação, competência/compra, busca, valores/modalidade, metas por mês, ausência de meta, zeros, resultado negativo, parcelas/quitação, detalhamento e CSV acima de um lote. Capturas em claro/escuro a 320, 640 e 1280 px foram revisadas, com alternativas textuais acionadas pelo teclado e sem overflow horizontal.
