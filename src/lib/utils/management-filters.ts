import type { Category } from '@/types/category'
import type { CreditCard } from '@/types/credit-card'
import type { TransactionSeries } from '@/types/transaction-series'
import type { ManagementFilterValues } from '@/components/shared/management-filters'
import { parseFirestoreDate } from './parse-date'
import { occurrenceDate, installmentMonth } from './transaction-series'

function matchesText(value: string, search: string) {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
  return normalize(value).includes(normalize(search.trim()))
}

export function matchesCategory(
  category: Category,
  values: ManagementFilterValues,
) {
  return (
    matchesText(category.name, values.search) &&
    (!values.type ||
      category.type === values.type ||
      category.type === 'both') &&
    (!values.status ||
      (values.status === 'archived' ? !!category.archived : !category.archived))
  )
}

export function matchesCard(card: CreditCard, values: ManagementFilterValues) {
  const status = card.archived
    ? 'archived'
    : card.isActive
      ? 'active'
      : 'inactive'
  return (
    matchesText(`${card.name} ${card.bankName}`, values.search) &&
    (!values.status || values.status === status)
  )
}

function validOccurrence(item: TransactionSeries, index: number) {
  if (index >= item.count || index >= 1200) return null
  const date = occurrenceDate(
    parseFirestoreDate(item.date),
    index,
    item.timezoneOffset,
  )
  if (
    (item.endDate && date > parseFirestoreDate(item.endDate)) ||
    (item.cancelledFrom && date >= parseFirestoreDate(item.cancelledFrom))
  )
    return null
  return date
}

export function seriesHasPending(item: TransactionSeries, now = new Date()) {
  const date = validOccurrence(item, item.nextIndex)
  return !!date && (item.kind === 'installment' || date <= now)
}

export function seriesScheduledInMonth(item: TransactionSeries, month: string) {
  const start = parseFirestoreDate(item.date)
  for (let index = 0; index < Math.min(item.count, 1200); index++) {
    const date = validOccurrence(item, index)
    if (!date) break
    const civil = new Date(date.getTime() - item.timezoneOffset * 60000)
    let occurrenceMonth = `${civil.getUTCFullYear()}-${String(civil.getUTCMonth() + 1).padStart(2, '0')}`
    if (item.creditCardId && item.cardClosingDay) {
      occurrenceMonth =
        item.kind === 'installment'
          ? installmentMonth(
              start,
              index,
              item.cardClosingDay,
              item.timezoneOffset,
            )
          : (() => {
              const shifted = new Date(
                Date.UTC(
                  civil.getUTCFullYear(),
                  civil.getUTCMonth() +
                    (civil.getUTCDate() > item.cardClosingDay! ? 1 : 0),
                  1,
                ),
              )
              return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
            })()
    }
    if (occurrenceMonth === month) return true
    if (occurrenceMonth > month) break
  }
  return false
}

export function matchesSeries(
  item: TransactionSeries,
  values: ManagementFilterValues,
  month: string,
  now = new Date(),
) {
  return (
    matchesText(item.description, values.search) &&
    (!values.modality || values.modality === item.kind) &&
    (!values.type || values.type === item.type) &&
    (!values.categoryId || values.categoryId === item.categoryId) &&
    (!values.creditCardId || values.creditCardId === item.creditCardId) &&
    (!values.status ||
      (values.status === 'cancelled'
        ? !!item.cancelledFrom
        : !item.cancelledFrom)) &&
    (!values.pending ||
      (values.pending === 'yes'
        ? seriesHasPending(item, now)
        : !seriesHasPending(item, now))) &&
    (values.scope !== 'month' || seriesScheduledInMonth(item, month))
  )
}

export function matchesBudget(
  categoryId: string,
  amount: number | undefined,
  spent: number,
  values: ManagementFilterValues,
) {
  const status =
    amount === undefined ? 'none' : spent > amount ? 'exceeded' : 'within'
  return (
    (!values.categoryId || values.categoryId === categoryId) &&
    (!values.status || values.status === status)
  )
}
