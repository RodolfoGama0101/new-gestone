# Vencimento e quitação de faturas — ROD-124

Cada cartão pode informar dueDay de 1 a 31. O campo é opcional para compatibilidade; cartões antigos mostram vencimento não definido. Dias inexistentes usam o último dia do mês. Se o dia nominal de vencimento for igual ou anterior ao fechamento, vence no mês seguinte; caso contrário, no mesmo mês. A interface exibe início/fim do ciclo, fechamento, vencimento, total e status.

O MVP aprovado oferece pagamento integral: pagamentos parciais ficam fora. Antes do fim do dia de fechamento, a fatura está Aberta; depois, Fechada. Registrar pagamento integral pede confirmação e salva amount e paidAt em /users/{uid}/creditCards/{cardId}/payments/{yyyy-MM}. Uma transação retorna sem nova gravação quando esse registro já existe com o mesmo total. A quitação é imutável: para corrigir, estorne e registre novamente. Um novo total de compras diferente do valor quitado exibe Alterada após quitação, evitando tratar o valor anterior como pagamento do novo total.

O registro é informativo: confirma um pagamento realizado fora do aplicativo e não movimenta dinheiro, não cria despesa e não é incluído nos indicadores. As compras já entram nos totais por competência; quitação e estorno não descontam essas compras novamente. Saldo por competência não é extrato bancário de caixa. Cancelar uma compra pode mudar o total e exigir revisão da quitação.

As regras isolam registros por UID, exigem cartão existente, mês válido, valor inteiro positivo e timestamp. Atualização direta é negada; dono pode remover e recriar. Subcoleções são removidas pela exclusão em cascata de conta. A publicação das regras continua separada e exige autorização explícita.

No redesign Geist (ROD-127), “Cartões” apresenta o resumo atual e as duas
próximas competências usando as consultas existentes. “Ver fatura” abre a
competência escolhida em largura total; “Voltar aos cartões” preserva o cartão
selecionado. O detalhe mostra total, valor registrado de quitação e saldo a pagar.
Quando o total muda após a quitação, o saldo pede revisão do registro, mantendo
as regras de quitação integral e estorno descritas acima.

## Consolidado e detalhe por competência — issue #37

A tela Cartões apresenta a soma das faturas da competência de todos os cartões, inclusive arquivados, e o total dos cartões visíveis quando a busca ou situação restringem a lista. Cada linha mostra fechamento, vencimento e quitação. Um cartão abre sua fatura em largura integral com `invoiceCard` e `month` na URL; voltar preserva o cartão, os filtros de gestão e a posição da página durante a navegação. A mesma soma é exibida no painel e nos relatórios para o mês global.

O total integral permanece independente da paginação e dos filtros do detalhe. Descrição, categoria, modalidade, valores e intervalo por data da compra ou competência restringem somente as compras da fatura, seu subtotal e a distribuição por categoria. O pagamento integral continua usando o total de todas as compras. Exclusões invalidam as consultas compartilhadas; uma quitação com valor diferente passa a ser identificada como alterada.

Cada fatura usa a consulta completa existente, inclusive compras após fechamento, parcelas e cartões arquivados. O consolidado aguarda todas as consultas e não publica um valor parcial se alguma falhar. A leitura cresce com o número de cartões e o histórico de candidatos; as consultas por usuário, cartão e mês são compartilhadas pelo cache. Não há migração nem novas gravações financeiras.
