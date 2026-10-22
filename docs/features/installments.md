# Compras parceladas — ROD-125

No formulário de lançamento, escolha Compra parcelada no cartão e informe valor total, quantidade entre 2 e 120 e cartão ativo. Cada parcela tem pelo menos um centavo. O quociente inteiro é distribuído entre todas; os centavos restantes vão para as primeiras. R$ 100,00 em três resulta em R$ 33,34 + R$ 33,33 + R$ 33,33.

O modelo de [séries](transaction-series.md) coordena geração e recuperação por transações e IDs determinísticos. Diferente da recorrência, todas as parcelas futuras são geradas na criação, até 120. Falha após salvar a série mantém o mesmo ID de requisição e permite retomar pelo formulário ou Gerar pendentes.

Cada lançamento guarda seriesId, occurrenceIndex, installmentTotal e installmentMonth. O mês inicial é a competência central da compra original; os seguintes avançam um mês cada. O fechamento é capturado na compra. Isso evita duas parcelas na mesma fatura quando a compra após fechamento cai no último dia de um mês curto. Data do lançamento representa a compra original deslocada pela posição; competência registrada é usada nos totais e faturas. A edição individual não altera posição, série ou mês de competência; para reorganizar o plano, cancele futuras e cadastre outro.

O extrato identifica parcela atual/total. Séries mostra o total original e a distribuição projetada por fatura; edições e cancelamentos posteriores podem alterar os valores reais. Cada parcela pode ser editada/excluída pelo extrato. Cancelar futuras preserva ocorrências anteriores ao corte e não recria parcelas removidas. Compras avulsas anteriores permanecem compatíveis; nenhuma migração é necessária.
