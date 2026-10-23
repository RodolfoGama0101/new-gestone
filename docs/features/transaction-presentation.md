# Apresentação dos lançamentos

O extrato, os lançamentos recentes, as listas por tipo e a fatura reutilizam `TransactionRow`. O extrato mantém seus agrupamentos por data e oculta a data redundante na linha. O painel usa a mesma apresentação sem ações de edição/exclusão.

Os metadados ficam em `src/lib/utils/transaction-presentation.ts`: receita usa seta de entrada, rótulo Receita e sinal +; despesa usa seta de saída, rótulo Despesa e sinal −; investimento usa moedas, rótulo Investimento e sinal −. Os tipos permanecem identificáveis sem distinguir cores. As classes usam os tokens semânticos income, expense e investment nos dois temas. Badges de categoria mantêm texto na cor do tema e usam a cor configurada apenas no marcador, sem depender do contraste da cor escolhida.

Valores reutilizam `formatMoney`, sem alterar centavos. Datas usam `parseFirestoreDate` e `useCurrentDate`, com Hoje/Ontem recalculados à meia-noite e ao retomar a janela. O cálculo de ontem usa calendário local, inclusive em transições de mês e ano.

Regressões: `tests/unit/transaction-presentation.test.tsx` cobre os três metadados, centavos, timestamps e a passagem da meia-noite. `tests/e2e/transaction-presentation.test.ts` confere rótulos no extrato/painel/lista e gera capturas dos dois temas em `dogfood-output/rod-119/`.

Capturas: [extrato claro](../audits/2026-10-22/rod-119/light-transactions.png), [extrato escuro](../audits/2026-10-22/rod-119/dark-transactions.png), [painel claro](../audits/2026-10-22/rod-119/light-dashboard.png) e [painel escuro](../audits/2026-10-22/rod-119/dark-dashboard.png).
