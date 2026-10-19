import { Transaction } from '@/types/transaction'
import { CreditCard } from '@/types/credit-card'
import {
  startOfMonth,
  endOfMonth,
  endOfDay,
  isWithinInterval,
  subMonths,
  format,
} from 'date-fns'
import { parseFirestoreDate as parseToDate } from '@/lib/utils/parse-date'
import { getTransactionDate } from '@/lib/utils/transaction-date'


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
  futureCardExpenses: number // Compras realizadas até a referência, faturadas após o mês selecionado
  availableBalance: number // Saldo projetado do mês menos reservas para faturas de meses posteriores
  reservationReferenceDate: Date // Menor data entre a referência informada e o fim do mês selecionado
  dailyBalance: DailyBalancePoint[]
  incomeCount: number
  expenseCount: number
  investmentCount: number
}

export const AnalyticsService = {
  calculateSummary(
    transactions: Transaction[],
    selectedDate: Date,
    creditCards: CreditCard[],
    referenceDate: Date,
  ): PeriodSummary {
    const startOfCurrent = startOfMonth(selectedDate)
    const endOfCurrent = endOfMonth(selectedDate)
    const reservationReferenceDate = new Date(
      Math.min(endOfDay(referenceDate).getTime(), endOfCurrent.getTime()),
    )

    const startOfPrevious = startOfMonth(subMonths(selectedDate, 1))
    const endOfPrevious = endOfMonth(subMonths(selectedDate, 1))

    let income = 0
    let expense = 0
    let investment = 0

    let incomeCount = 0
    let expenseCount = 0
    let investmentCount = 0

    let prevIncome = 0
    let prevExpense = 0
    let prevInvestment = 0

    let futureCardExpenses = 0

    // Filtra as transações correspondentes a cada período
    transactions.forEach((tx) => {
      const txDate = parseToDate(tx.date)

      const effectiveDate = getTransactionDate(tx, creditCards)
      const isCardExpense = tx.type === 'expense' && !!tx.creditCardId

      const isCurrent = isWithinInterval(effectiveDate, {
        start: startOfCurrent,
        end: endOfCurrent,
      })
      const isPrevious = isWithinInterval(effectiveDate, {
        start: startOfPrevious,
        end: endOfPrevious,
      })

      if (isCurrent) {
        if (tx.type === 'income') {
          income += tx.amount
          incomeCount++
        } else if (tx.type === 'expense') {
          expense += tx.amount
          expenseCount++
        } else if (tx.type === 'investment') {
          investment += tx.amount
          investmentCount++
        }
      } else if (isPrevious) {
        if (tx.type === 'income') prevIncome += tx.amount
        else if (tx.type === 'expense') prevExpense += tx.amount
        else if (tx.type === 'investment') prevInvestment += tx.amount
      }

      // Faturas do mês já fazem parte de expense. Reserve somente compras conhecidas
      // na referência cuja competência é posterior, sem misturar o mês com "hoje".
      if (
        isCardExpense &&
        effectiveDate > endOfCurrent &&
        txDate <= reservationReferenceDate
      ) {
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
        const effectiveDate = getTransactionDate(tx, creditCards)

        return isWithinInterval(effectiveDate, {
          start: startOfCurrent,
          end: endOfCurrent,
        })
      })
      .sort((a, b) => {
        const dateA = getTransactionDate(a, creditCards).getTime()
        const dateB = getTransactionDate(b, creditCards).getTime()
        return dateA - dateB
      })

    // Monta o saldo acumulado dia a dia
    const dailyBalanceMap = new Map<string, number>()
    let runningBalance = 0

    // Percorre e acumula o saldo diário
    currentMonthTxs.forEach((tx) => {
      const dayKey = format(getTransactionDate(tx, creditCards), 'dd/MM')
      if (tx.type === 'income') {
        runningBalance += tx.amount
      } else {
        runningBalance -= tx.amount
      }
      dailyBalanceMap.set(dayKey, runningBalance)
    })

    const dailyBalance: DailyBalancePoint[] = Array.from(
      dailyBalanceMap.entries(),
    ).map(([date, bal]) => ({
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
      reservationReferenceDate,
      dailyBalance,
      incomeCount,
      expenseCount,
      investmentCount,
    }
  },
}
