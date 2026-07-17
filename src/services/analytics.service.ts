import { Transaction } from '@/types/transaction'
import { CreditCard } from '@/types/credit-card'
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import { getEffectiveDebitMonth, hasCardExpenseDebited } from '@/lib/utils/credit-card-billing'

export interface DailyBalancePoint {
  date: string // Formato "dd/MM"
  balance: number // Valor acumulado em centavos
}

export interface PeriodSummary {
  income: number // em centavos
  expense: number // em centavos
  investment: number // em centavos
  balance: number // em centavos
  incomeChangePercent: number
  expenseChangePercent: number
  investmentChangePercent: number
  balanceChangePercent: number
  futureCardExpenses: number // em centavos (NOVO)
  availableBalance: number // em centavos (NOVO)
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
    selectedDate: Date,
    creditCards: CreditCard[] = []
  ): PeriodSummary {
    const startOfCurrent = startOfMonth(selectedDate)
    const endOfCurrent = endOfMonth(selectedDate)

    const startOfPrevious = startOfMonth(subMonths(selectedDate, 1))
    const endOfPrevious = endOfMonth(subMonths(selectedDate, 1))

    // Cria um mapa de cartões para busca rápida de closingDay
    const cardClosingDays = new Map<string, number>()
    creditCards.forEach((c) => cardClosingDays.set(c.id, c.closingDay))

    let income = 0
    let expense = 0
    let investment = 0

    let prevIncome = 0
    let prevExpense = 0
    let prevInvestment = 0

    let futureCardExpenses = 0
    const today = new Date()

    // Filtra as transações correspondentes a cada período
    transactions.forEach((tx) => {
      const txDate = parseToDate(tx.date)
      
      // Se for uma despesa de cartão de crédito
      let effectiveDate = txDate
      let isCardExpense = false
      let closingDay = 10 // Padrão caso o cartão não seja encontrado

      if (tx.type === 'expense' && tx.creditCardId) {
        isCardExpense = true
        closingDay = cardClosingDays.get(tx.creditCardId) ?? 10
        
        // Calcula o mês efetivo em que essa despesa debita
        const { month, year } = getEffectiveDebitMonth(closingDay, txDate)
        // Cria uma data correspondente para ver se cai no mês selecionado
        effectiveDate = new Date(year, month, 15) // Dia 15 para evitar problemas de fuso horário
      }

      const isCurrent = isWithinInterval(effectiveDate, { start: startOfCurrent, end: endOfCurrent })
      const isPrevious = isWithinInterval(effectiveDate, { start: startOfPrevious, end: endOfPrevious })

      if (isCurrent) {
        if (tx.type === 'income') income += tx.amount
        else if (tx.type === 'expense') expense += tx.amount
        else if (tx.type === 'investment') investment += tx.amount
      } else if (isPrevious) {
        if (tx.type === 'income') prevIncome += tx.amount
        else if (tx.type === 'expense') prevExpense += tx.amount
        else if (tx.type === 'investment') prevInvestment += tx.amount
      }

      // Calcula as despesas futuras (compras no cartão que ainda não viraram/debitaram)
      if (isCardExpense && !hasCardExpenseDebited(closingDay, txDate, today)) {
        futureCardExpenses += tx.amount
      }
    })

    const balance = income - expense - investment
    const prevBalance = prevIncome - prevExpense - prevInvestment
    const availableBalance = balance - futureCardExpenses

    // Calcula a variação percentual
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return 0
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
        let effectiveDate = txDate

        if (tx.type === 'expense' && tx.creditCardId) {
          const closingDay = cardClosingDays.get(tx.creditCardId) ?? 10
          const { month, year } = getEffectiveDebitMonth(closingDay, txDate)
          effectiveDate = new Date(year, month, 15)
        }

        return isWithinInterval(effectiveDate, { start: startOfCurrent, end: endOfCurrent })
      })
      .sort((a, b) => {
        const dateA = parseToDate(a.date).getTime()
        const dateB = parseToDate(b.date).getTime()
        return dateA - dateB
      })

    // Monta o saldo acumulado dia a dia
    const dailyBalanceMap = new Map<string, number>()
    let runningBalance = 0
    
    // Percorre e acumula o saldo diário
    currentMonthTxs.forEach((tx) => {
      const dayKey = format(parseToDate(tx.date), 'dd/MM')
      if (tx.type === 'income') {
        runningBalance += tx.amount
      } else {
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
      futureCardExpenses,
      availableBalance,
      dailyBalance,
    }
  },
}
