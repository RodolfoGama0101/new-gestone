import type { Transaction } from './transaction'

export interface TransactionSeries extends Omit<Transaction, 'id'> {
  id: string
  kind: 'recurring' | 'installment'
  count: number
  nextIndex: number
  timezoneOffset: number
  endDate: unknown | null
  cancelledFrom: unknown | null
}
