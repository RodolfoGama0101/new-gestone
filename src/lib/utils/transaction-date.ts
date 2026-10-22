import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import { parseFirestoreDate } from './parse-date'
import { getDebitLimitDate } from './credit-card-billing'

// Datas de compra permanecem no lançamento. A competência do cartão é o fechamento da fatura.
export function getTransactionDate(transaction: Transaction, cards: CreditCard[] = []): Date {
  const purchaseDate = parseFirestoreDate(transaction.date)
  if (transaction.type !== 'expense' || !transaction.creditCardId) return purchaseDate
  const closingDay = transaction.cardClosingDay ?? cards.find((card) => card.id === transaction.creditCardId)?.closingDay ?? 10
  if (transaction.installmentMonth) {
    const [year, month] = transaction.installmentMonth.split('-').map(Number)
    return new Date(year, month - 1, Math.min(closingDay, new Date(year, month, 0).getDate()))
  }
  return getDebitLimitDate(closingDay, purchaseDate)
}

export function filterTransactionPeriod(transactions: Transaction[], start: Date, end: Date, cards: CreditCard[] = []) {
  return transactions.filter((transaction) => {
    const date = getTransactionDate(transaction, cards)
    return date >= start && date <= end
  })
}
