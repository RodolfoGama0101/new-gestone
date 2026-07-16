'use client'

import { TransactionList } from '@/components/transactions/transaction-list'
import { ArrowDownRight } from 'lucide-react'

export default function ExpensesPage() {
  return (
    <TransactionList
      type="expense"
      title="Despesas"
      description="Visualize e cadastre seus gastos (saídas financeiras)."
      listTitle="Histórico de Saídas"
      listDescription="Lista cronológica de despesas cadastradas"
      addButtonLabel="Nova Despesa"
      addDialogTitle="Nova Despesa"
      addDialogDescription="Adicione as informações sobre a nova saída financeira."
      editDialogTitle="Editar Despesa"
      editDialogDescription="Modifique as informações do lançamento de despesa."
      emptyIcon={ArrowDownRight}
      emptyTitle="Sem despesas registradas"
      emptyDescription="Você ainda não cadastrou nenhuma despesa. Clique no botão acima para adicionar o primeiro gasto."
      deleteDescription="Esta ação removerá permanentemente a despesa selecionada e atualizará o saldo geral."
    />
  )
}
