/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import {
  ReportIndicators,
  ReportBudgets,
} from '@/components/analytics/financial-report'
import {
  reportTotals,
  reportMonthlyHistory,
} from '@/lib/utils/financial-report'

jest.mock('@/lib/firebase/config', () => ({ db: {} }))
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'owner' } }),
}))
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }))
jest.mock('recharts', () => ({}))

const totals = {
  income: 10000,
  expense: 2000,
  investment: 1000,
  savings: 8000,
  result: 7000,
  investmentRate: 10,
}

test('indicadores preservam filtros de tipo; economia oferece os conjuntos que a compõem', () => {
  render(
    <ReportIndicators
      totals={totals}
      previous={reportTotals([])}
      comparisonLoading={false}
      selectedType="income"
      detail={(overrides) =>
        `/transactions?type=${overrides?.type ?? 'income'}`
      }
    />,
  )
  expect(
    screen.getByRole('link', { name: 'Receitas no período' }),
  ).toHaveAttribute('href', '/transactions?type=income')
  expect(
    screen.queryByRole('link', { name: 'Despesas no período' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Investimentos no período' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Ver receitas da economia' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('link', { name: 'Ver despesas da economia' }),
  ).not.toBeInTheDocument()
  expect(screen.getAllByText('Sem base de comparação').length).toBeGreaterThan(
    0,
  )
})

test('comparação em carregamento ou indisponível não é apresentada como denominador zero', () => {
  const { rerender } = render(
    <ReportIndicators
      totals={totals}
      comparisonLoading
      detail={() => '/transactions'}
    />,
  )
  expect(screen.getAllByText(/Carregando comparação/).length).toBeGreaterThan(0)
  expect(screen.queryByText('Sem base de comparação')).not.toBeInTheDocument()
  rerender(
    <ReportIndicators
      totals={totals}
      comparisonLoading={false}
      detail={() => '/transactions'}
    />,
  )
  expect(screen.getAllByText(/Comparação indisponível/).length).toBeGreaterThan(
    0,
  )
})

test('meses sem movimento distinguem meta ausente, não atingida e erro, com estados independentes', () => {
  jest.mocked(useQuery).mockImplementation((options) => {
    const month = (options as { queryKey: string[] }).queryKey[2]
    return {
      data:
        month === '2024-01'
          ? { goal: undefined, limits: [] }
          : month === '2024-02'
            ? { goal: 1000, limits: [] }
            : undefined,
      error: month === '2024-03' ? new Error('Sem conexão') : null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>
  })
  const monthly = reportMonthlyHistory(
    [],
    new Date(2024, 0, 10),
    new Date(2024, 2, 31),
    [],
    'competence',
  )
  render(
    <ReportBudgets
      monthly={monthly}
      transactions={[]}
      start={new Date(2024, 0, 10)}
      end={new Date(2024, 2, 31)}
    />,
  )
  const region = screen.getByRole('region', { name: 'Metas e limites por mês' })
  expect(
    within(region).getByText('Meta não cadastrada para este mês.', {
      exact: false,
    }),
  ).toBeVisible()
  expect(within(region).getByText(/Meta não atingida/)).toBeVisible()
  expect(within(region).getByText(/2024-01 · mês parcial/)).toBeVisible()
  expect(within(region).getByRole('alert')).toBeVisible()
  expect(
    within(region).getByRole('button', { name: /Tentar novamente/i }),
  ).toBeVisible()
})
