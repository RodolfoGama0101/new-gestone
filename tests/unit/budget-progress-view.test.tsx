/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import BudgetsPage from '@/app/(dashboard)/budgets/page'
import { formatMoney } from '@/lib/utils/format-money'

const mockBudget = {
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  save: jest.fn(),
  saving: false,
  data: {
    goal: 10000,
    savings: 15000,
    limits: [{ categoryId: 'food', name: 'Alimentação', amount: 10000 }],
    expenses: { food: 15000 },
  },
}

jest.mock('@/hooks/use-budget', () => ({ useBudget: () => mockBudget }))
jest.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'food', name: 'Alimentação', type: 'expense' }],
    error: null,
    refetch: jest.fn(),
  }),
}))

it('limita as barras sem esconder economia acima da meta ou consumo excedente', () => {
  mockBudget.data.savings = 15000
  render(<BudgetsPage />)
  const goal = screen.getByRole('progressbar', {
    name: 'Progresso da meta de economia',
  })
  const category = screen.getByRole('progressbar', {
    name: 'Consumo de Alimentação',
  })
  for (const progress of [goal, category]) {
    expect(progress).toHaveAttribute('max', '10000')
    expect(progress).toHaveAttribute('value', '10000')
    expect(progress).toHaveAttribute(
      'aria-valuetext',
      formatMoney(15000) + ' de ' + formatMoney(10000),
    )
  }
  expect(screen.getByText(/Excesso:/)).toBeVisible()
})

it('mantém o valor negativo na alternativa textual e a barra de economia vazia', () => {
  mockBudget.data.savings = -5000
  render(<BudgetsPage />)
  const goal = screen.getByRole('progressbar', {
    name: 'Progresso da meta de economia',
  })
  expect(goal).toHaveAttribute('value', '0')
  expect(goal).toHaveAttribute(
    'aria-valuetext',
    formatMoney(-5000) + ' de ' + formatMoney(10000),
  )
})
