// Cada data deriva da âncora original, evitando que 31/jan vire 28/mar.
export function occurrenceDate(
  start: Date,
  index: number,
  timezoneOffset = start.getTimezoneOffset(),
) {
  if (!Number.isInteger(index) || index < 0 || index >= 1200)
    throw new Error('Ocorrência fora do limite.')
  const civil = new Date(start.getTime() - timezoneOffset * 60000)
  const month = new Date(
    Date.UTC(civil.getUTCFullYear(), civil.getUTCMonth() + index, 1),
  )
  const last = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate()
  return new Date(
    Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth(),
      Math.min(civil.getUTCDate(), last),
    ) +
      timezoneOffset * 60000,
  )
}

export function installmentAmount(total: number, count: number, index: number) {
  if (
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    !Number.isInteger(count) ||
    count < 2 ||
    count > 120 ||
    total < count ||
    index < 0 ||
    index >= count
  )
    throw new Error(
      'Use de 2 a 120 parcelas, com pelo menos um centavo por parcela.',
    )
  const value = BigInt(total),
    divisor = BigInt(count)
  return Number(
    value / divisor + (BigInt(index) < value % divisor ? BigInt(1) : BigInt(0)),
  )
}

export function installmentMonth(
  start: Date,
  index: number,
  closingDay: number,
  timezoneOffset = start.getTimezoneOffset(),
) {
  const civil = new Date(start.getTime() - timezoneOffset * 60000)
  const shift = civil.getUTCDate() > closingDay ? 1 : 0
  const month = new Date(
    Date.UTC(civil.getUTCFullYear(), civil.getUTCMonth() + shift + index, 1),
  )
  return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`
}
