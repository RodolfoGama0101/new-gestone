// Datas civis são interpretadas no fuso local, sem o deslocamento UTC de Date('yyyy-MM-dd').
export function parsePeriodDate(value: string, end = false): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return undefined
  if (end) date.setHours(23, 59, 59, 999)
  return date
}

export function transactionPeriod(start: string, end: string) {
  const startDate = parsePeriodDate(start)
  const endDate = parsePeriodDate(end, true)
  const error =
    (start && !startDate) || (end && !endDate)
      ? 'Informe uma data válida.'
      : startDate && endDate && startDate > endDate
        ? 'A data final deve ser igual ou posterior à inicial.'
        : ''
  return { startDate, endDate, error }
}
