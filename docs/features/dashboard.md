# Dashboard mensal

O painel usa o mês de trabalho do cabeçalho e a competência financeira. Receitas, despesas e aportes aparecem antes do resultado projetado; os links abrem as respectivas listas no mesmo mês. Compras no cartão entram na competência da fatura, usando os metadados registrados e os mesmos utilitários das listas e faturas.

- Resultado projetado = receitas − despesas − aportes.
- Reserva = compras realizadas no mês selecionado, até a menor data entre hoje e o fim desse mês, cuja competência é posterior ao mês. A regra existente não incorpora compras feitas depois dessa referência nem antecipa compras de meses futuros.
- Disponível após reserva = resultado projetado − reserva. A fatura da própria competência já está nas despesas e não é deduzida novamente. Quitações não criam despesas.
- Meta de economia = receitas − despesas, incluindo o dinheiro aportado. Usa a meta cadastrada naquele mês, sem transporte de outro período. Meta ausente aparece como não cadastrada; valores negativos e excedentes permanecem no texto, limitando somente a barra visual.

Resultado e disponível são projeções dos lançamentos cadastrados, sem conciliação bancária ou inferência de patrimônio. A data de referência e a definição das reservas ficam visíveis. Comparações são com o mês imediatamente anterior; uma base zero aparece como “Sem base de comparação”, inclusive em meses vazios. Base válida com valor igual mantém 0%. O contrato MCP preserva a resposta numérica anterior para comparação sem base.

O fluxo de caixa mensal reutiliza o gráfico e sua alternativa textual por período. A evolução diária oferece os valores acumulados em um controle expansível por teclado. A distribuição de despesas conserva a lista integral e os nomes completos, inclusive categorias arquivadas ou indisponíveis; cada categoria abre sua lista de despesas com o mês e filtro correspondentes. O consolidado dos cartões usa o mesmo mês e leva às faturas.

Os cinco recentes são selecionados após consultar todos os registros da competência, ordenados por data registrada decrescente e ID como desempate. A data da compra permanece visível; uma compra de outro mês pode pertencer à fatura consultada. “Ver extrato” abre o mês por competência, sem limitar a cinco registros. Esses dados reutilizam a consulta completa do resumo, sem nova consulta paginada. Falhas do resumo não apresentam zeros como resultados finais; meta, categorias e cartões têm estados próprios de carregamento/erro e nova tentativa.

Consultas por competência podem percorrer todo o histórico em lotes, conforme [Período e cartão no extrato](transaction-period.md). Os dados têm cache por UID, mês e referência, cancelamento de consultas substituídas e invalidação nas operações existentes. O orçamento e o consolidado reutilizam seus hooks; não há migração, alteração de schema, índice ou regra Firestore.

A cobertura da issue #40 inclui unitários de comparações, recentes completos com mais de 100 candidatos e compra de competência posterior, reservas, indicadores e metas ausentes/negativas/excedidas. O E2E cobre mês histórico, atual, futuro e vazio, cartões, aportes, meta, detalhamento por categoria/indicador e retorno. A matriz responsiva usa 320/390/768/1280 px nos dois temas e 640 px como reflow equivalente a uma janela de 1280 px com zoom de 200%, além de teclado para expandir os valores diários.

## Verificação em 06/11/2026 — issue #40

- `npm run lint` e `npm run typecheck`: aprovados.
- `npm test -- --runInBand`: 58 suítes e 314 testes aprovados, incluindo regressões de reservas e do contrato MCP.
- `npm run test:e2e`: 54 cenários aprovados em `demo-gestone-e2e`, com o JDK 25 diretamente no PATH. A tentativa inicial dentro do sandbox não abriu a porta 4400 do hub; a execução com acesso às portas locais iniciou corretamente os emuladores. A primeira rodada funcional apontou dois seletores de testes desatualizados (contêiner dos recentes e nome acessível da evolução); foram corrigidos e a rodada completa seguinte passou.
- Capturas em `dogfood-output/issue-40/` revisadas nos dois temas, com matriz 320/390/640/768/1280 px. Os testes verificam ausência de rolagem horizontal e expansão pelo teclado; os arquivos são artefatos locais ignorados pelo Git.
- `git diff --check`: aprovado. Build e testes de regras não foram executados nesta entrega, sem alterações de configuração, dependências, schema ou permissões. Não houve publicação manual de regras/índices, migração ou acesso a dados de produção.
