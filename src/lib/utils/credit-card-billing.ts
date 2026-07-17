import { addMonths, setDate, setMonth, setYear } from 'date-fns'

/**
 * Retorna o mês e ano em que a compra será efetivamente faturada/debitada,
 * baseado no dia de fechamento do cartão.
 * 
 * Se o dia da compra é menor ou igual ao dia de fechamento, cai no mês da própria compra.
 * Se é maior, cai no mês seguinte.
 */
export function getEffectiveDebitMonth(closingDay: number, purchaseDate: Date): { month: number; year: number } {
  const day = purchaseDate.getDate()
  if (day <= closingDay) {
    return {
      month: purchaseDate.getMonth(), // 0-indexed (0 = Jan, 11 = Dez)
      year: purchaseDate.getFullYear(),
    }
  } else {
    const nextMonth = addMonths(purchaseDate, 1)
    return {
      month: nextMonth.getMonth(),
      year: nextMonth.getFullYear(),
    }
  }
}

/**
 * Retorna a data exata do fechamento do ciclo de fatura em que a despesa cai.
 * É a partir desta data (exclusive) que a despesa debita do saldo.
 */
export function getDebitLimitDate(closingDay: number, purchaseDate: Date): Date {
  const { month, year } = getEffectiveDebitMonth(closingDay, purchaseDate)
  
  // Cria uma data no dia de fechamento daquele mês/ano
  let limitDate = new Date(purchaseDate)
  limitDate = setYear(limitDate, year)
  limitDate = setMonth(limitDate, month)
  
  // Tratamento de segurança caso o dia de fechamento seja maior do que os dias do mês
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  const actualClosingDay = Math.min(closingDay, lastDayOfMonth)
  limitDate = setDate(limitDate, actualClosingDay)
  
  // Zera as horas para comparação justa de datas
  limitDate.setHours(0, 0, 0, 0)
  return limitDate
}

/**
 * Retorna se a despesa do cartão de crédito já foi debitada do saldo geral
 * em uma determinada data de referência (geralmente "hoje").
 */
export function hasCardExpenseDebited(closingDay: number, purchaseDate: Date, referenceDate: Date = new Date()): boolean {
  const limitDate = getDebitLimitDate(closingDay, purchaseDate)
  
  // Clona e zera a data de referência para comparar apenas ano, mês e dia
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)
  
  return ref.getTime() >= limitDate.getTime()
}
