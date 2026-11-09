const shortMonth = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
})

export function formatChartMonth(value: string, fullYear = false) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value)
  if (!match) return value

  const [, year, month] = match
  const name = shortMonth.format(new Date(Date.UTC(2000, Number(month) - 1, 1)))
  return `${name.replace(/\.$/, '')}/${fullYear ? year : year.slice(-2)}`
}

const compactMoney = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatChartAmount(cents: number) {
  return compactMoney.format(cents / 100)
}
