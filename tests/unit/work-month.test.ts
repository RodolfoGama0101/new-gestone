import {
  isWorkMonth,
  resolveWorkMonth,
  workMonthDate,
  workMonthHref,
  workMonthPeriod,
} from '@/lib/utils/work-month'

test('valida o mês e aplica a precedência URL, preferência e data local', () => {
  const now = new Date(2026, 10, 6)
  for (const value of [
    '',
    '0000-01',
    '2026-00',
    '2026-13',
    '2026-1',
    '2026-11-01',
  ]) {
    expect(isWorkMonth(value)).toBe(false)
  }
  expect(resolveWorkMonth('2025-12', '2024-01', now)).toBe('2025-12')
  expect(resolveWorkMonth('inválido', '2024-01', now)).toBe('2024-01')
  expect(resolveWorkMonth(null, 'inválido', now)).toBe('2026-11')
})

test('constrói os limites locais e preserva parâmetros em links', () => {
  const period = workMonthPeriod('2024-02')
  expect(period.startDate).toEqual(new Date(2024, 1, 1))
  expect(period.endDate).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999))
  expect(workMonthDate('0001-01').getFullYear()).toBe(1)
  expect(workMonthHref('/transactions?type=expense', '2024-02')).toBe(
    '/transactions?type=expense&month=2024-02',
  )
})
