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
