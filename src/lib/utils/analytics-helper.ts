import { Transaction } from '@/types/transaction'
import { Category } from '@/types/category'
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CreditCard } from '@/types/credit-card'
import { getTransactionDate } from './transaction-date'

export interface CategoryShare {
  name: string
  value: number // valor acumulado em centavos (ex: 1550 = R$ 15,50)
  color: string
}

export interface MonthlySummary {
  monthLabel: string // ex: "jan/26"
  income: number // em centavos
  expense: number // em centavos
  investment: number // em centavos (NOVO)
  balance: number // em centavos
}

export const AnalyticsHelper = {
  // Distribuição de gastos por categoria
  getCategoryShare(
    transactions: Transaction[],
    categories: Category[],
    type: 'income' | 'expense' | 'investment' = 'expense'
  ): CategoryShare[] {
    const sumMap = new Map<string, number>()

    transactions
      .filter((tx) => tx.type === type)
      .forEach((tx) => {
        const currentSum = sumMap.get(tx.categoryId) ?? 0
        sumMap.set(tx.categoryId, currentSum + tx.amount)
      })

    const shares: CategoryShare[] = []
    sumMap.forEach((amount, catId) => {
      const cat = categories.find((c) => c.id === catId)
      shares.push({
        name: cat?.name ?? 'Sem Categoria',
        value: amount,
        color: cat?.color ?? '#6b7280',
      })
    })

    return shares.sort((a, b) => b.value - a.value)
  },

  // Agrupamento histórico mensal de receitas, despesas, investimentos e saldos
  getMonthlyHistory(
    transactions: Transaction[],
    monthsCount: number,
    referenceDate: Date = new Date(),
    creditCards: CreditCard[] = []
  ): MonthlySummary[] {
    const startDate = startOfMonth(subMonths(referenceDate, monthsCount - 1))
    const endDate = endOfMonth(referenceDate)

    const months = eachMonthOfInterval({ start: startDate, end: endDate })

    const monthlySummaryMap = new Map<string, MonthlySummary>()
    months.forEach((month) => {
      const key = format(month, 'yyyy-MM')
      const label = format(month, "MMM/yy", { locale: ptBR })
      monthlySummaryMap.set(key, {
        monthLabel: label,
        income: 0,
        expense: 0,
        investment: 0,
        balance: 0,
      })
    })

    transactions.forEach((tx) => {
      const txDate = getTransactionDate(tx, creditCards)
      if (isWithinInterval(txDate, { start: startDate, end: endDate })) {
        const key = format(txDate, 'yyyy-MM')
        const summary = monthlySummaryMap.get(key)
        if (summary) {
          if (tx.type === 'income') {
            summary.income += tx.amount
          } else if (tx.type === 'investment') {
            summary.investment += tx.amount
          } else {
            summary.expense += tx.amount
          }
        }
      }
    })

    const history: MonthlySummary[] = []
    let runningBalance = 0
    months.forEach((month) => {
      const key = format(month, 'yyyy-MM')
      const summary = monthlySummaryMap.get(key)
      if (summary) {
        runningBalance += summary.income - summary.expense - summary.investment
        summary.balance = runningBalance
        history.push(summary)
      }
    })

    return history
  },
}
