'use client'

import { TransactionList } from '@/components/transactions/transaction-list'
import { Coins } from 'lucide-react'

export default function InvestmentsPage() {
  return (
    <TransactionList
      type="investment"
      title="Investimentos"
      description="Visualize e gerencie seus aportes financeiros e investimentos."
      listTitle="Histórico de Investimentos"
      listDescription="Lista cronológica de investimentos realizados"
      addButtonLabel="Novo Investimento"
      addDialogTitle="Novo Investimento"
      addDialogDescription="Adicione as informações sobre o seu novo investimento."
      editDialogTitle="Editar Investimento"
      editDialogDescription="Modifique as informações do lançamento de investimento."
      emptyIcon={Coins}
      emptyTitle="Nenhum investimento registrado"
      emptyDescription="Você ainda não registrou nenhum investimento este mês. Comece a investir clicando no botão acima."
      deleteDescription="Esta ação removerá permanentemente o investimento selecionado e atualizará o saldo geral."
    />
  )
}
