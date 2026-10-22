import {
  parsePeriodDate,
  transactionPeriod,
} from '@/lib/utils/transaction-period'

describe('período do extrato', () => {
  it('inclui o dia inteiro no fuso local e aceita ano bissexto', () => {
    const { startDate, endDate, error } = transactionPeriod(
      '2024-02-29',
      '2024-02-29',
    )
    expect(error).toBe('')
    expect(startDate?.getDate()).toBe(29)
    expect(startDate?.getHours()).toBe(0)
    expect(endDate?.getHours()).toBe(23)
    expect(endDate?.getMilliseconds()).toBe(999)
  })
  it('rejeita inversão e datas inexistentes vindas da URL', () => {
    expect(transactionPeriod('2026-10-02', '2026-10-01').error).toBeTruthy()
    expect(parsePeriodDate('2026-02-29')).toBeUndefined()
    expect(transactionPeriod('inválida', '').error).toBeTruthy()
    expect(transactionPeriod('', '').error).toBe('')
  })
})
