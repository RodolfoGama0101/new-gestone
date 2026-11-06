import {
  parseFilterAmount,
  resolveTransactionFilters,
  type TransactionFilterValues,
} from '@/lib/utils/transaction-filters'

const empty: TransactionFilterValues = {
  search: '',
  type: '',
  categoryId: '',
  creditCardId: '',
  startDate: '',
  endDate: '',
  dateBasis: 'competence',
  minAmount: '',
  maxAmount: '',
  modality: '',
}

describe('filtros financeiros', () => {
  it('interpreta reais em centavos exatos e rejeita valores inválidos ou inseguros', () => {
    expect(parseFilterAmount('10,01')).toBe(1001)
    expect(parseFilterAmount('0.1')).toBe(10)
    expect(parseFilterAmount('')).toBeUndefined()
    for (const value of ['-1', '1,234', '1e3', 'abc', '90071992547409,92'])
      expect(parseFilterAmount(value)).toBeNull()
    expect(parseFilterAmount('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('combina filtros e usa a competência do mês global por padrão', () => {
    const result = resolveTransactionFilters(
      {
        ...empty,
        search: 'Árvore',
        type: 'expense',
        categoryId: 'cat',
        creditCardId: 'card',
        minAmount: '1,01',
        maxAmount: '20',
        modality: 'installment',
      },
      '2026-02',
    )
    expect(result.valid).toBe(true)
    expect(result.criteria).toMatchObject({
      search: 'Árvore',
      type: 'expense',
      categoryId: 'cat',
      creditCardId: 'card',
      minAmount: 101,
      maxAmount: 2000,
      modality: 'installment',
      dateBasis: 'competence',
    })
    expect(result.criteria.startDate?.getDate()).toBe(1)
    expect(result.criteria.endDate?.getDate()).toBe(28)
  })

  it('rejeita intervalo e valores inválidos antes da consulta', () => {
    expect(
      resolveTransactionFilters(
        { ...empty, startDate: '2026-02-31' },
        '2026-02',
      ).valid,
    ).toBe(false)
    expect(
      resolveTransactionFilters(
        { ...empty, startDate: '2026-02-20', endDate: '2026-02-01' },
        '2026-02',
      ).valid,
    ).toBe(false)
    expect(
      resolveTransactionFilters(
        { ...empty, minAmount: '10', maxAmount: '9,99' },
        '2026-02',
      ).valid,
    ).toBe(false)
    expect(
      resolveTransactionFilters({ ...empty, minAmount: '1,001' }, '2026-02')
        .valid,
    ).toBe(false)
  })

  it('fixa o tipo e ignora cartão e parcelamento incompatíveis em links diretos', () => {
    const result = resolveTransactionFilters(
      {
        ...empty,
        type: 'expense',
        creditCardId: 'card',
        modality: 'installment',
        dateBasis: 'purchase',
        startDate: '2026-01-01',
      },
      '2026-02',
      'income',
    )
    expect(result.criteria).toMatchObject({
      type: 'income',
      creditCardId: undefined,
      modality: undefined,
      dateBasis: 'purchase',
      endDate: undefined,
    })
    expect(result.criteria.startDate?.getMonth()).toBe(0)
  })
})
