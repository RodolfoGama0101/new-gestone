import type { CreditCard } from '@/types/credit-card'
import type { Transaction } from '@/types/transaction'
import type { GetTransactionsFilters } from '@/services/transaction.service'
import { getTransactionDate } from '@/lib/utils/transaction-date'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import { matchesTransactionSearch } from '@/lib/utils/transaction-search'

export function matchesTransactionFilters(
  transaction: Transaction,
  filters: GetTransactionsFilters,
  cards: CreditCard[] = [],
) {
  if (filters.type && transaction.type !== filters.type) return false
  if (filters.categoryId && transaction.categoryId !== filters.categoryId)
    return false
  if (filters.creditCardId && transaction.creditCardId !== filters.creditCardId)
    return false
  if (!matchesTransactionSearch(transaction.description, filters.search ?? ''))
    return false
  if (filters.minAmount != null && transaction.amount < filters.minAmount)
    return false
  if (filters.maxAmount != null && transaction.amount > filters.maxAmount)
    return false
  const modality =
    transaction.installmentTotal != null
      ? 'installment'
      : transaction.recurring
        ? 'recurring'
        : 'single'
  if (
    filters.modality &&
    filters.modality !== 'all' &&
    filters.modality !== modality
  )
    return false
  if (filters.startDate || filters.endDate) {
    const date =
      filters.dateBasis === 'competence'
        ? getTransactionDate(transaction, cards)
        : parseFirestoreDate(transaction.date)
    if (filters.startDate && date < filters.startDate) return false
    if (filters.endDate && date > filters.endDate) return false
  }
  return true
}
