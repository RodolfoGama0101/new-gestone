# Validação integrada da consulta financeira — #30

Base: `f997b2dc2033f1f5cc63e7575676b5c81fde0742`, conferida com a `main` remota em 06/11/2026. As issues #31 a #42 estão fechadas e suas implementações fazem parte dessa base. Esta etapa acrescenta uma regressão entre telas à suíte de relatórios e corrige a exportação durante o carregamento das categorias, sem alterar contratos financeiros, schemas ou permissões.

## Correção encontrada na validação

O CSV podia ser exportado enquanto as categorias ainda carregavam, usando a lista provisória vazia para escrever “Sem Categoria” em registros com categoria cadastrada. O botão agora aguarda essa consulta e permanece indisponível se ela falhar. A recuperação habilita a exportação novamente; uma consulta concluída e realmente vazia continua válida. O teste unitário cobre carregamento, falha e recuperação, e o E2E compara todas as colunas do CSV do extrato com o relatório.

## Coerência dos valores

O cenário em `tests/e2e/financial-reports.test.ts` usa fevereiro de 2024 e 109 lançamentos efetivos: uma receita recorrente legada de R$ 1.000,00, um aporte de R$ 800,00, 105 despesas de R$ 1,00, uma compra de janeiro de R$ 200,00 após o fechamento e uma parcela de R$ 100,00 com data de compra em dezembro e competência explícita em fevereiro. Há registros fora do mês e uma quitação de R$ 300,00, que não pode gerar outra despesa.

| Superfície | Resultado esperado |
| --- | --- |
| Dashboard, extrato e relatório de um mês | Receitas R$ 1.000,00; despesas R$ 405,00; aportes R$ 800,00; resultado −R$ 205,00 |
| Listas de receitas, despesas e investimentos | Mesmo total do respectivo tipo |
| Consolidado e fatura do cartão | R$ 300,00, duas compras, fatura quitada |
| Extrato na página 2 | Total dos 109 registros preservado |
| CSV do extrato na página 2 e do relatório | Mesmas 109 linhas, na mesma ordem, com somas verificadas em centavos inteiros |
| Relatório pela data da compra | R$ 105,00 de despesas em fevereiro; compra de janeiro e parcela de dezembro excluídas |

O restante do cenário verifica janelas 1/3/6/12, período personalizado, comparação equivalente, filtros de busca/valor/modalidade, detalhamento por categoria/cartão e retorno, metas mensais, período vazio e resultado negativo. As distribuições usam o conjunto completo.

## Compatibilidade e isolamento

- `transaction-query.test.ts`: competência, parcela com data editada, mais de 100 candidatos, cursores completos, agregação/CSV, cancelamento, falha intermediária e overflow.
- `analytics-data.test.ts` e `analytics-service.test.ts`: padrão por competência na análise, padrão anterior dos serviços preservado, recentes completos, reservas e fechamento/virada de ano.
- `use-transactions.test.tsx`: reconstrução de páginas após mutações, troca de critérios/UID, respostas antigas, falhas e continuação de lote vazio.
- `mcp-contracts.test.ts`, `mcp-finance.test.ts` e E2E MCP: contratos, autorização e compatibilidade externa, inclusive percentuais numéricos anteriores.
- Testes de regras: isolamento por UID e restrições de escrita. E2E usa contas exclusivas e somente `demo-gestone-e2e`; regras usam somente `demo-gestone-rules`.

## Acessibilidade e responsividade

Os E2E de dashboard, relatórios, distribuições, navegação móvel e apresentação financeira cobrem teclado, foco e alternativas textuais dos gráficos. A matriz inclui claro/escuro, 320/390/768/1280 px e largura de 640 px, equivalente ao reflow de uma janela de 1280 px com ampliação de 200%. O teste de layout também verifica larguras menores com redução do viewport pela metade. As verificações de overflow são acompanhadas de capturas em `dogfood-output/`, ignoradas pelo Git.

## Limites operacionais

Consultas por competência ainda percorrem todo o histórico candidato em lotes de até 100 mais um documento de verificação. Agregações, comparação e CSV podem consumir leituras proporcionais ao histórico; o cache por UID e critérios e o cancelamento reduzem repetições, sem impor truncamento silencioso. Erro, cancelamento ou overflow não produzem totais parciais finais. A reconstrução de uma página posterior pode reler os lotes anteriores.

Metas permanecem mensais, sem rateio por filtro ou mês parcial. Séries programadas ainda não geradas não são movimentos. Não há inferência de patrimônio, rentabilidade ou conciliação bancária. Fórmulas e contratos estão em [relatórios](../../features/financial-reports.md), [dashboard](../../features/dashboard.md), [consulta](../../transaction-search.md) e [paginação](../../transaction-pagination.md).

Não houve migração nem publicação de regras ou índices de produção. O push na `main` pode acionar a integração Git da Vercel; a verificação local não atesta o estado desse deployment.

## Comandos e resultados em 06/11/2026

Ambiente: Node 24.15.0 e npm 12.0.2, com as dependências já instaladas. Nenhuma dependência foi alterada.

- `npm run lint`: aprovado novamente após a correção do CSV. Um aviso de exportação anônima no arquivo temporário de configuração de regras foi corrigido nesse artefato; a última execução ficou sem avisos.
- `npm run typecheck`: aprovado, inclusive após a correção do seletor.
- `npm test -- --runInBand`: 62 suítes e 335 testes aprovados, incluindo a regressão do carregamento de categorias no CSV.
- `npm run build`: aprovado com acesso ao diretório de saída e criação dos processos do Next.js.
- `npm run test:rules`: não iniciou na porta padrão 8080, ocupada por um processo preexistente que foi preservado. A mesma suíte foi copiada para `dogfood-output/issue-30/`, mudando apenas a porta para 28080; regras/índices foram copiados sem alteração e os caminhos da configuração foram ajustados. O comando `npm exec --no -- firebase emulators:exec --config dogfood-output/issue-30/firebase.json --only firestore --project demo-gestone-rules "jest --config dogfood-output/issue-30/jest.config.mjs --runInBand"` aprovou os 150 testes. Hub, logs e websocket usaram portas próprias. Após o shutdown do iniciador, o processo Java dessa execução que permaneceu ativo no Windows foi identificado e encerrado; o emulador preexistente na porta 8080 foi preservado.
- `npm run test:e2e`: rodada completa com 54/55 aprovados em 7,1 minutos. O novo cenário primeiro apontou um seletor ambíguo entre navegação e conteúdo; a reexecução com esse seletor corrigido revelou a exportação prematura das categorias. Após a correção do componente, o cenário inteiro passou em nova execução (1/1, 39,6 segundos), incluindo todas as rotas, CSVs, filtros e capturas. A reexecução usou cópia ignorada do iniciador oficial, mudando somente a seleção para `playwright test tests/e2e/financial-reports.test.ts`, com `node_modules/.bin` e JDK 25 no PATH. O restante da suíte não foi repetido após essa correção localizada. Total de 55 cenários validados entre a rodada completa e a reexecução.
- Revisão visual das capturas de dashboard e relatórios em claro/escuro, fatura a 320 px e relatório no reflow a 640 px. Os testes também verificaram foco por teclado e ausência de overflow na matriz completa.
- `git diff --check` e caminhos/links relativos da documentação conferidos.
