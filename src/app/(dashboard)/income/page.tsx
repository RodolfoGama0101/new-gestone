'use client'

import { TransactionList } from '@/components/transactions/transaction-list'
import { ArrowUpRight } from 'lucide-react'

export default function IncomePage() {
  return (
    <TransactionList
      type="income"
      title="Receitas"
      description="Visualize e cadastre suas fontes de receita (entradas)."
      listTitle="Histórico de Entradas"
      listDescription="Lista cronológica de receitas cadastradas"
      addButtonLabel="Nova Receita"
      addDialogTitle="Nova Receita"
      addDialogDescription="Adicione as informações sobre a nova entrada financeira."
      editDialogTitle="Editar Receita"
      editDialogDescription="Modifique as informações do lançamento de receita."
      emptyIcon={ArrowUpRight}
      emptyTitle="Sem receitas registradas"
      emptyDescription="Você ainda não cadastrou nenhuma receita. Clique no botão acima para adicionar o primeiro lançamento."
      deleteDescription="Esta ação removerá permanentemente a receita selecionada e atualizará o saldo geral."
    />
  )
}
