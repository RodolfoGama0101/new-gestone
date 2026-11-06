import { endOfMonth, format, startOfMonth } from 'date-fns'

export function isWorkMonth(value: string | null | undefined): value is string {
  return !!value && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function currentWorkMonth(now = new Date()) {
  return format(now, 'yyyy-MM')
}

export function resolveWorkMonth(
  url: string | null,
  saved: string | null,
  now = new Date(),
) {
  return isWorkMonth(url)
    ? url
    : isWorkMonth(saved)
      ? saved
      : currentWorkMonth(now)
}

export function workMonthDate(month: string) {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, number - 1, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function workMonthPeriod(month: string) {
  const date = workMonthDate(month)
  return { startDate: startOfMonth(date), endDate: endOfMonth(date) }
}

export function workMonthHref(path: string, month: string) {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('month', month)
  return `${pathname}?${params.toString()}`
}
