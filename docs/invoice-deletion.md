# Exclusão de compras pela fatura — ROD-114

A lixeira da fatura abre o `ConfirmDialog` compartilhado, identificando descrição e valor da compra. Abrir ou cancelar não executa gravações. A confirmação chama a exclusão existente em `useCardInvoice`; o diálogo fecha somente após a operação e a invalidação das consultas financeiras.

Durante o envio, confirmar e cancelar ficam desabilitados. Uma trava síncrona impede chamadas repetidas antes da atualização do estado React e ignora pedidos de fechamento por Escape ou pelo botão de fechar. Em caso de falha, a seleção permanece, o erro aparece em um toast e a pessoa pode tentar novamente ou cancelar. O sucesso exibe uma confirmação.

O hook preserva a invalidação por usuário de `transactions` (incluindo a fatura), `analytics`, `analyticsHistory` e `creditCards`, atualizando os consumidores ativos. A paginação da fatura continua limitada à última página válida após a remoção.

Os testes de interação usam o componente, o diálogo, as linhas e o hook reais com TanStack Query, simulando somente serviços, autenticação e categorias. Cobrem cancelamento sem gravação, identificação da compra, envio único enquanto pendente, bloqueio de Escape, atualização do total e invalidações, falha sem invalidação e nova tentativa. O E2E da fatura de 105 compras também verifica cancelamento, confirmação, 104 compras restantes no banco, total atualizado e novo saldo no dashboard, usando apenas os emuladores locais.

Validação em 21/10/2026: lint e TypeScript aprovados, 18 suítes/120 testes aprovados e seis E2E aprovados nos emuladores de Authentication/Firestore (`demo-gestone-e2e`). Sem deploy ou alterações em dados reais.
