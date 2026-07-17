import { Transaction } from '@/types/transaction'
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

export interface DailyBalancePoint {
  date: string // Formato "dd/MM"
  balance: number // Valor acumulado em centavos
}

export interface PeriodSummary {
  income: number // em centavos
  expense: number // em centavos
  investment: number // em centavos (NOVO)
  balance: number // em centavos
  incomeChangePercent: number // Variação em relação ao mês anterior
  expenseChangePercent: number // Variação em relação ao mês anterior
  investmentChangePercent: number // Variação em relação ao mês anterior (NOVO)
  balanceChangePercent: number // Variação em relação ao mês anterior
  dailyBalance: DailyBalancePoint[]
}

// Auxiliar para converter timestamps Firestore em datas reais
function parseToDate(dateVal: unknown): Date {
  if (!dateVal) return new Date()
  if (dateVal instanceof Date || (dateVal && typeof dateVal === 'object' && 'getTime' in dateVal)) return dateVal as Date
  if (dateVal instanceof Timestamp) return dateVal.toDate()
  const record = dateVal as { seconds?: number }
  if (record && typeof record.seconds === 'number') {
    return new Date(record.seconds * 1000)
  }
  return new Date(dateVal as string | number)
}

export const AnalyticsService = {
  calculateSummary(
    transactions: Transaction[],
    selectedDate: Date
  ): PeriodSummary {
    const startOfCurrent = startOfMonth(selectedDate)
    const endOfCurrent = endOfMonth(selectedDate)

    const startOfPrevious = startOfMonth(subMonths(selectedDate, 1))
    const endOfPrevious = endOfMonth(subMonths(selectedDate, 1))

    let income = 0
    let expense = 0
    let investment = 0

    let prevIncome = 0
    let prevExpense = 0
    let prevInvestment = 0

    // Filtra as transações correspondentes a cada período
    transactions.forEach((tx) => {
      const txDate = parseToDate(tx.date)
      const isCurrent = isWithinInterval(txDate, { start: startOfCurrent, end: endOfCurrent })
      const isPrevious = isWithinInterval(txDate, { start: startOfPrevious, end: endOfPrevious })

      if (isCurrent) {
        if (tx.type === 'income') income += tx.amount
        else if (tx.type === 'expense') expense += tx.amount
        else if (tx.type === 'investment') investment += tx.amount
      } else if (isPrevious) {
        if (tx.type === 'income') prevIncome += tx.amount
        else if (tx.type === 'expense') prevExpense += tx.amount
        else if (tx.type === 'investment') prevInvestment += tx.amount
      }
    })

    const balance = income - expense - investment
    const prevBalance = prevIncome - prevExpense - prevInvestment

    // Calcula a variação percentual
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const incomeChangePercent = calculateChange(income, prevIncome)
    const expenseChangePercent = calculateChange(expense, prevExpense)
    const investmentChangePercent = calculateChange(investment, prevInvestment)
    const balanceChangePercent = calculateChange(balance, prevBalance)

    // Agrupamento diário do saldo para o Sparkline
    // Filtra transações do mês ativo ordenadas por data crescente
    const currentMonthTxs = transactions
      .filter((tx) => {
        const txDate = parseToDate(tx.date)
        return isWithinInterval(txDate, { start: startOfCurrent, end: endOfCurrent })
      })
      .sort((a, b) => {
        const dateA = parseToDate(a.date).getTime()
        const dateB = parseToDate(b.date).getTime()
        return dateA - dateB
      })

    // Monta o saldo acumulado dia a dia
    const dailyBalanceMap = new Map<string, number>()
    
    // Inicializa todos os dias do mês com saldo 0
    let runningBalance = 0
    
    // Percorre e acumula o saldo diário
    currentMonthTxs.forEach((tx) => {
      const dayKey = format(parseToDate(tx.date), 'dd/MM')
      if (tx.type === 'income') {
        runningBalance += tx.amount
      } else {
        // Reduz o saldo tanto para expense quanto para investment
        runningBalance -= tx.amount
      }
      dailyBalanceMap.set(dayKey, runningBalance)
    })

    const dailyBalance: DailyBalancePoint[] = Array.from(dailyBalanceMap.entries()).map(([date, bal]) => ({
      date,
      balance: bal,
    }))

    // Se não houver transações no mês, retorna ponto zerado inicial
    if (dailyBalance.length === 0) {
      dailyBalance.push({ date: format(startOfCurrent, 'dd/MM'), balance: 0 })
      dailyBalance.push({ date: format(endOfCurrent, 'dd/MM'), balance: 0 })
    }

    return {
      income,
      expense,
      investment,
      balance,
      incomeChangePercent,
      expenseChangePercent,
      investmentChangePercent,
      balanceChangePercent,
      dailyBalance,
    }
  },
}
