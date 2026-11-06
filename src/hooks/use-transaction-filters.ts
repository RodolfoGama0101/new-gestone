'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useWorkMonth } from '@/providers/work-month-provider'
import {
  resolveTransactionFilters,
  type FinancialType,
} from '@/lib/utils/transaction-filters'

const parsers = {
  search: parseAsString.withDefault(''),
  type: parseAsString.withDefault(''),
  categoryId: parseAsString.withDefault(''),
  creditCardId: parseAsString.withDefault(''),
  startDate: parseAsString.withDefault(''),
  endDate: parseAsString.withDefault(''),
  dateBasis: parseAsString.withDefault('competence'),
  minAmount: parseAsString.withDefault(''),
  maxAmount: parseAsString.withDefault(''),
  modality: parseAsString.withDefault(''),
}

export function useTransactionFilters(fixedType?: FinancialType) {
  const { month } = useWorkMonth()
  const [values, setValues] = useQueryStates(parsers)
  return {
    values,
    setValues,
    month,
    ...resolveTransactionFilters(values, month, fixedType),
  }
}
