# Apresentação dos lançamentos

O extrato, os lançamentos recentes, as listas por tipo e a fatura reutilizam
`TransactionTable`. Extrato e listas exibem o título e a quantidade de
lançamentos na página antes da tabela. Em telas largas, as colunas separam
data, descrição, categoria, valor e ações. Nas estreitas, a descrição abre
a linha e os metadados refluem em uma ou duas colunas, conforme a largura da
tabela. Os valores ganham peso e as linhas têm faixas alternadas. O painel
usa a mesma apresentação sem ações de edição e exclusão.

Os metadados ficam em `src/lib/utils/transaction-presentation.ts`: receita usa seta de entrada, rótulo Receita e sinal +; despesa usa seta de saída, rótulo Despesa e sinal −; investimento usa moedas, rótulo Investimento e sinal −. Os tipos permanecem identificáveis sem distinguir cores. As classes usam escalas Tailwind válidas nos dois temas.

Valores reutilizam `formatMoney`, sem alterar centavos. Datas usam `parseFirestoreDate` e `useCurrentDate`, com Hoje/Ontem recalculados à meia-noite e ao retomar a janela. O cálculo de ontem usa calendário local, inclusive em transições de mês e ano.

Regressões: `tests/unit/transaction-presentation.test.tsx` cobre os três metadados, centavos, timestamps e a passagem da meia-noite. `tests/e2e/transaction-presentation.test.ts` confere rótulos no extrato/painel/lista e gera capturas dos dois temas em `dogfood-output/rod-119/`.

Capturas: [extrato claro](../audits/2026-10-22/rod-119/light-transactions.png), [extrato escuro](../audits/2026-10-22/rod-119/dark-transactions.png), [painel claro](../audits/2026-10-22/rod-119/light-dashboard.png) e [painel escuro](../audits/2026-10-22/rod-119/dark-dashboard.png).
