'use client'

import * as React from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  LineChart
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  // Mock de transações recentes para visualização
  const recentTransactions = [
    { id: '1', description: 'Supermercado Silva', amount: -154.50, category: 'Alimentação', date: 'Hoje', type: 'expense' },
    { id: '2', description: 'Salário Gestone Inc', amount: 4500.00, category: 'Salário', date: 'Ontem', type: 'income' },
    { id: '3', description: 'Assinatura Netflix', amount: -55.90, category: 'Lazer', date: '04 Jul', type: 'expense' },
    { id: '4', description: 'Posto de Gasolina', amount: -120.00, category: 'Transporte', date: '02 Jul', type: 'expense' },
    { id: '5', description: 'Freelance Design', amount: 800.00, category: 'Freelance', date: '30 Jun', type: 'income' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Painel Geral</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Olá, {user?.email}! Aqui está o resumo das suas finanças.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-1.5 shadow-sm">
            <Plus className="size-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">R$ 5.240,50</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todas as suas contas</p>
          </CardContent>
        </Card>

        {/* Income Card */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
            <TrendingUp className="size-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-income">R$ 8.000,00</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-income bg-income/10 px-2 py-0.5 rounded-full w-fit">
              <ArrowUpCircle className="size-3" />
              +12.4% em relação ao mês anterior
            </div>
          </CardContent>
        </Card>

        {/* Expense Card */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <TrendingDown className="size-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-expense">R$ 2.759,50</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-expense bg-expense/10 px-2 py-0.5 rounded-full w-fit">
              <ArrowDownCircle className="size-3" />
              Dentro do limite estipulado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Quick analytics card mockup */}
        <Card className="shadow-sm border-border lg:col-span-4 bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Evolução Patrimonial</CardTitle>
            <CardDescription>Resumo dos últimos 6 meses de receitas e despesas</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/20">
            <div className="text-center space-y-2">
              <LineChart className="size-10 text-muted-foreground mx-auto animate-pulse" />
              <p className="text-sm text-muted-foreground font-medium">Os gráficos serão disponibilizados na Etapa 8.</p>
              <p className="text-xs text-muted-foreground/80">Configure suas contas para ver o fluxo de caixa.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions list */}
        <Card className="shadow-sm border-border lg:col-span-3 bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Últimas Transações</CardTitle>
            <CardDescription>Seus últimos 5 lançamentos financeiros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tx.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[150px]">{tx.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    tx.type === 'income' ? 'text-income' : 'text-foreground'
                  }`}>
                    {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
