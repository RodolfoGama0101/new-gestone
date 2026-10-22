import { formatMoney, formatCsvAmount } from '@/lib/utils/format-money'
test.each([0, 1, 12345, -12345])('BRL e CSV usam os mesmos centavos: %s', (cents) => {
  const original = cents
  expect(formatMoney(cents).replace(/\u00a0/g, ' ')).toBe((cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' '))
  expect(formatCsvAmount(cents)).toBe((cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  expect(cents).toBe(original)
})
