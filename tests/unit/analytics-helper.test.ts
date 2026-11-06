import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import { Transaction } from '@/types/transaction'
import { Category } from '@/types/category'

describe('AnalyticsHelper', () => {
  const categories: Category[] = [
    { 
      id: 'cat-1', 
      name: 'Alimentação', 
      type: 'expense', 
      icon: 'Utensils', 
      color: '#ff0000', 
      isDefault: true, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
    { 
      id: 'cat-2', 
      name: 'Salário', 
      type: 'income', 
      icon: 'Briefcase', 
      color: '#00ff00', 
      isDefault: true, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    },
  ]

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount: 5000, // R$ 50,00
      description: 'Supermercado',
      categoryId: 'cat-1',
      date: new Date(2026, 6, 5), // Julho 5, 2026 local
      tags: [],
      notes: null,
      recurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'tx-2',
      type: 'income',
      amount: 150000, // R$ 1.500,00
      description: 'Salário Mensal',
      categoryId: 'cat-2',
      date: new Date(2026, 6, 1), // Julho 1, 2026 local
      tags: [],
      notes: null,
      recurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  test('deve calcular a distribuição de gastos por categoria corretamente', () => {
    const shares = AnalyticsHelper.getCategoryShare(transactions, categories, 'expense')
    expect(shares).toHaveLength(1)
    expect(shares[0].name).toBe('Alimentação')
    expect(shares[0].value).toBe(5000)
    expect(shares[0].color).toBe('#ff0000')
  })

  test('deve agrupar histórico mensal de saldo, receitas e despesas corretamente', () => {
    const history = AnalyticsHelper.getMonthlyHistory(transactions, 3, new Date(2026, 6, 15))
    expect(history).toHaveLength(3)
    
    // O último mês representa o mês ativo das transações configuradas (Julho/26)
    const currentMonth = history[history.length - 1]
    expect(currentMonth.income).toBe(150000)
    expect(currentMonth.expense).toBe(5000)
    expect(currentMonth.balance).toBe(145000)
  })
})

test.each(['investment', 'income'] as const)(
  'agrupa %s em centavos e preserva categorias arquivadas e indisponíveis',
  (type) => {
    const tx = (categoryId: string, amount: number) =>
      ({ type, categoryId, amount }) as Transaction
    const archived = {
      id: 'old',
      name: 'Antiga',
      archived: true,
      color: '#777',
    } as Category
    const shares = AnalyticsHelper.getCategoryShare(
      [
        tx('old', 101),
        tx('old', 2),
        tx('missing', 7),
        { ...tx('old', 999), type: 'expense' },
      ],
      [archived],
      type,
    )
    expect(shares.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: 'Antiga (arquivada)', value: 103 },
      { name: 'Categoria indisponível', value: 7 },
    ])
    expect(shares.reduce((sum, item) => sum + item.value, 0)).toBe(110)
    expect(AnalyticsHelper.getCategoryShare([], [], type)).toEqual([])
    expect(() =>
      AnalyticsHelper.getCategoryShare(
        [tx('old', Number.MAX_SAFE_INTEGER), tx('old', 1)],
        [archived],
        type,
      ),
    ).toThrow(RangeError)
  },
)
