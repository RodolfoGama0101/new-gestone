/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MonthlyGoal } from '@/components/dashboard/monthly-insights'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { useBudget } from '@/hooks/use-budget'

jest.mock('@/hooks/use-budget', () => ({ useBudget: jest.fn() }))
jest.mock('@/hooks/use-categories', () => ({ useCategories: jest.fn() }))
jest.mock('@/providers/work-month-provider', () => ({
  useWorkMonth: () => ({ month: '2024-02' }),
}))
jest.mock('@/components/charts/cash-flow-bar-chart', () => ({
  CashFlowBarChart: () => null,
}))
jest.mock('@/components/charts/category-donut-chart', () => ({
  CategoryDonutChart: () => null,
}))

function budget(goal: number | undefined, savings: number) {
  jest
    .mocked(useBudget)
    .mockReturnValue({
      data: { goal, savings },
      isPending: false,
    } as ReturnType<typeof useBudget>)
}

test('meta ausente não vira meta zero e preserva mês no acesso', () => {
  budget(undefined, 10000)
  render(<MonthlyGoal />)
  expect(screen.getByText('Meta não cadastrada para este mês.')).toBeVisible()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    '/budgets?month=2024-02',
  )
})

test.each([
  [-10000, 'Faltam R$ 200,00', 0],
  [15000, 'Meta atingida', 10000],
])(
  'economia %i preserva valores e limita somente o desenho',
  (savings, text, progress) => {
    budget(10000, savings)
    render(<MonthlyGoal />)
    expect(
      screen.getByText(new RegExp(text.replaceAll('$', '\\$'))),
    ).toBeVisible()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'value',
      String(progress),
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining(savings < 0 ? '-R$' : '150,00'),
    )
  },
)

test('indicadores distinguem base ausente de variação zero e levam às listas do mês', () => {
  render(
    <SummaryCards
      income={10000}
      incomeChange={null}
      expense={100}
      expenseChange={0}
      investment={200}
      investmentChange={null}
    />,
  )
  expect(screen.getAllByText(/Sem base de comparação/)).toHaveLength(2)
  expect(screen.getByText(/0% vs. mês anterior/)).toBeVisible()
  for (const [label, path] of [
    ['Receitas', '/income'],
    ['Despesas', '/expenses'],
    ['Aportes', '/investments'],
  ])
    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      `${path}?month=2024-02`,
    )
})
