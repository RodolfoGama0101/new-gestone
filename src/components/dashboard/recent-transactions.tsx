'use client'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function RecentTransactions() {
  const { categories } = useCategories()
  
  // Busca os lançamentos mais recentes
  const { transactions, isLoading } = useTransactions({ limitCount: 5 })

  const recent = transactions.slice(0, 5)

  const getCategoryDetails = (catId: string) => {
    return categories.find((c) => c.id === catId)
  }

  const formatDate = (dateVal: unknown): string => {
    if (!dateVal) return ''
    let d: Date
    if (dateVal instanceof Date) {
      d = dateVal
    } else if (dateVal instanceof Timestamp) {
      d = dateVal.toDate()
    } else {
      const record = dateVal as { seconds?: number }
      if (record && typeof record.seconds === 'number') {
        d = new Date(record.seconds * 1000)
      } else {
        d = new Date(dateVal as string | number)
      }
    }
    return format(d, 'dd/MM/yyyy')
  }

  if (isLoading) {
    return (
      <Card className="shadow-xs border-border bg-card flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  return (
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4 pt-6 px-6 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold text-foreground">Lançamentos Recentes</CardTitle>
          <CardDescription className="text-xs">Suas últimas 5 movimentações financeiras</CardDescription>
        </div>
        <Link 
          href="/expenses" 
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {recent.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação"
            description="Você ainda não registrou lançamentos financeiros nesta conta."
            icon={Wallet}
          />
        ) : (
          <div className="divide-y divide-border/40">
            {recent.map((tx) => {
              const cat = getCategoryDetails(tx.categoryId)
              const isIncome = tx.type === 'income'
              return (
                <div key={tx.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 gap-4 hover:bg-muted/15 rounded-xl px-2.5 -mx-2.5 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`size-8.5 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                    }`}>
                      {isIncome ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight group-hover:text-primary transition-colors">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {formatDate(tx.date)}
                        </span>
                        {cat && (
                          <Badge
                            className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full shrink-0 border-none"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm sm:text-base font-extrabold shrink-0 ${
                    isIncome ? 'text-income' : 'text-expense'
                  }`}>
                    {isIncome ? '+' : '-'}
                    {(tx.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
