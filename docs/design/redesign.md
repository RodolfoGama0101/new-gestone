# Redesign de UX/UI — outubro de 2026

## Implementação

O redesign consolida o sistema visual em DESIGN.md e globals.css, reutilizando Shadcn/Base UI, Geist e Tailwind. Não altera serviços, armazenamento monetário, regras Firestore ou rotas públicas.

A navegação é definida uma vez em src/components/layout/navigation.ts, com grupos idênticos em desktop e celular. Séries passa a se chamar Recorrências e parcelas, mantendo /series. O atalho Novo lançamento abre o mesmo formulário em qualquer página autenticada.

ResponsiveDialog mantém uma única instância de formulário ao alternar entre a apresentação centralizada e o sheet móvel. Criação e edição no extrato, nas listas por tipo e na fatura usam esse componente. O formulário ordena tipo, valor, descrição, categoria e data; tags e observações ficam em Mais detalhes, que se abre automaticamente se tiverem erros. Uma trava síncrona impede envio duplicado enquanto a validação/gravação está pendente.

O extrato preserva os parâmetros search, type, categoryId, creditCardId, startDate e endDate, bem como a comparação textual, limites de consulta, cursor e significado de Continuar busca. Busca e datas ficam visíveis; os outros filtros podem ser expandidos. Importar / exportar reúne as ações de CSV sem alterar seus contratos.

Painel e faturas compartilham MonthSelector, com retorno ao mês atual. O painel distingue saldo projetado, reserva futura e disponível após reservas; dados curtos não geram sparkline sem informação. Cartões têm seleção compacta no celular e detalhes separados do gerenciamento. A edição de uma compra na fatura agora abre um formulário em vez de executar um callback vazio.

Orçamentos usam Progress com valores acessíveis e texto de excesso, preservando centavos e competência. Recorrências separam resumo de gerenciamento futuro. Configurações usam Tabs do Base UI, com navegação por teclado e painéis associados. Autenticação compartilha AuthShell.

## Compatibilidade

Moeda BRL, isolamento por UID, cache, buscas e cálculos permanecem nos serviços/hooks existentes. Quitação é informativa; não movimenta dinheiro. Compras usam competência da fatura para indicadores e data da compra no filtro do extrato. Os temas continuam persistidos na conta.

## Validação

Os resultados efetivamente executados e limitações estão em [verificação do redesign](../audits/2026-10-23/redesign.md). As capturas históricas de 22/10 não comprovam o novo layout.

Os testes Jest usam roots explícitos de tests/unit e tests/rules para não carregar cópias de outras worktrees. O ambiente de emuladores usa o distDir .next/e2e, separado do servidor de desenvolvimento local; npm run test:e2e permanece o ponto de entrada.
