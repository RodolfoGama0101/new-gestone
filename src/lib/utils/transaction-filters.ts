import { transactionPeriod } from '@/lib/utils/transaction-period'
import { workMonthPeriod } from '@/lib/utils/work-month'
import type { GetTransactionsFilters } from '@/services/transaction.service'

export type FinancialType = 'income' | 'expense' | 'investment'
export interface TransactionFilterValues {
  search: string
  type: string
  categoryId: string
  creditCardId: string
  startDate: string
  endDate: string
  dateBasis: string
  minAmount: string
  maxAmount: string
  modality: string
}

// Converte reais digitados em centavos sem usar multiplicação em ponto flutuante.
export function parseFilterAmount(value: string): number | undefined | null {
  if (!value.trim()) return undefined
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim())
  if (!match) return null
  const cents =
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0'))
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null
}

export function resolveTransactionFilters(
  values: TransactionFilterValues,
  month: string,
  fixedType?: FinancialType,
) {
  const period = transactionPeriod(values.startDate, values.endDate)
  const min = parseFilterAmount(values.minAmount)
  const max = parseFilterAmount(values.maxAmount)
  const amountError =
    min === null || max === null
      ? 'Informe valores não negativos com até duas casas decimais.'
      : min !== undefined && max !== undefined && min > max
        ? 'O valor mínimo deve ser menor ou igual ao máximo.'
        : ''
  const type =
    fixedType ??
    (['income', 'expense', 'investment'].includes(values.type)
      ? (values.type as FinancialType)
      : undefined)
  const supportsCard = !type || type === 'expense'
  const modality =
    ['single', 'recurring', 'installment'].includes(values.modality) &&
    (supportsCard || values.modality !== 'installment')
      ? (values.modality as GetTransactionsFilters['modality'])
      : undefined
  const criteria: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {
    type,
    categoryId: values.categoryId || undefined,
    creditCardId: supportsCard ? values.creditCardId || undefined : undefined,
    search: values.search,
    dateBasis: values.dateBasis === 'purchase' ? 'purchase' : 'competence',
    ...(values.startDate || values.endDate
      ? { startDate: period.startDate, endDate: period.endDate }
      : workMonthPeriod(month)),
    minAmount: min ?? undefined,
    maxAmount: max ?? undefined,
    modality,
  }
  return {
    criteria,
    periodError: period.error,
    amountError,
    valid: !period.error && !amountError,
  }
}
