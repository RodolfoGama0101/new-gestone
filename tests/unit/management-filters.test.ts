import {
  matchesBudget,
  matchesCard,
  matchesCategory,
  matchesSeries,
  seriesHasPending,
  seriesScheduledInMonth,
} from '@/lib/utils/management-filters'
import type { ManagementFilterValues } from '@/components/shared/management-filters'
import type { Category } from '@/types/category'
import type { CreditCard } from '@/types/credit-card'
import type { TransactionSeries } from '@/types/transaction-series'

const empty: ManagementFilterValues = {
  search: '',
  type: '',
  status: '',
  modality: '',
  categoryId: '',
  creditCardId: '',
  pending: '',
  scope: '',
}
const category: Category = {
  id: 'cat',
  name: 'Saúde',
  type: 'expense',
  archived: true,
  icon: 'Heart',
  color: '#fff',
  isDefault: false,
  createdAt: null,
  updatedAt: null,
}
const card: CreditCard = {
  id: 'card',
  name: 'Viagem',
  bankName: 'Banco Azul',
  brand: 'visa',
  holderName: '',
  closingDay: 10,
  color: '#000',
  isActive: false,
  archived: true,
  createdAt: null,
  updatedAt: null,
}
const series: TransactionSeries = {
  id: 's',
  kind: 'recurring',
  count: 1200,
  nextIndex: 1,
  timezoneOffset: 0,
  endDate: null,
  cancelledFrom: null,
  type: 'expense',
  amount: 500,
  description: 'Mensalidade',
  categoryId: 'cat',
  creditCardId: 'card',
  cardClosingDay: 10,
  date: new Date('2024-01-31T00:00:00Z'),
  tags: [],
  notes: null,
  recurring: true,
  createdAt: null,
  updatedAt: null,
}

describe('filtros de gestão', () => {
  it('combina nome, tipo e arquivamento sem excluir histórico', () => {
    expect(
      matchesCategory(category, {
        ...empty,
        search: 'saude',
        type: 'expense',
        status: 'archived',
      }),
    ).toBe(true)
    expect(matchesCategory(category, { ...empty, status: 'active' })).toBe(
      false,
    )
    expect(
      matchesCard(card, { ...empty, search: 'azul', status: 'archived' }),
    ).toBe(true)
    expect(matchesCard(card, { ...empty, status: 'inactive' })).toBe(false)
  })

  it('distingue programação por competência, cancelamento e geração pendente', () => {
    expect(seriesScheduledInMonth(series, '2024-02')).toBe(true)
    expect(seriesScheduledInMonth(series, '2024-01')).toBe(false)
    expect(seriesHasPending(series, new Date('2024-02-28T12:00:00Z'))).toBe(
      false,
    )
    expect(seriesHasPending(series, new Date('2024-02-29T12:00:00Z'))).toBe(
      true,
    )
    expect(
      matchesSeries(
        series,
        {
          ...empty,
          scope: 'month',
          modality: 'recurring',
          categoryId: 'cat',
          creditCardId: 'card',
          pending: 'yes',
        },
        '2024-03',
        new Date('2024-03-01T00:00:00Z'),
      ),
    ).toBe(true)
    expect(
      seriesScheduledInMonth(
        { ...series, cancelledFrom: new Date('2024-02-01T00:00:00Z') },
        '2024-03',
      ),
    ).toBe(false)
    expect(
      seriesHasPending(
        { ...series, cancelledFrom: new Date('2024-02-01T00:00:00Z') },
        new Date('2024-03-01T00:00:00Z'),
      ),
    ).toBe(false)
  })

  it('distingue ausência de limite, limite igual ao gasto e excesso em centavos', () => {
    expect(
      matchesBudget('cat', undefined, 100, { ...empty, status: 'none' }),
    ).toBe(true)
    expect(matchesBudget('cat', 100, 100, { ...empty, status: 'within' })).toBe(
      true,
    )
    expect(
      matchesBudget('cat', 100, 101, {
        ...empty,
        status: 'exceeded',
        categoryId: 'cat',
      }),
    ).toBe(true)
    expect(
      matchesBudget('other', 100, 101, {
        ...empty,
        status: 'exceeded',
        categoryId: 'cat',
      }),
    ).toBe(false)
  })
})
