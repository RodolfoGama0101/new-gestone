/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  TransactionPageSummary,
  hasAdditionalFilters,
} from '@/components/transactions/transaction-page-summary'
import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { workMonthPeriod } from '@/lib/utils/work-month'

jest.mock('@/hooks/use-transaction-totals', () => ({
  useTransactionTotals: jest.fn(),
}))
const useTotals = jest.mocked(useTransactionTotals)
const period = workMonthPeriod('2026-10')
const base = { ...period, dateBasis: 'competence' as const }
const monthly = { income: 10001, expense: 3002, investment: 1003, count: 13 }
const filtered = { income: 0, expense: 200, investment: 0, count: 1 }
const refetch = jest.fn()

function query(data: typeof monthly | undefined, extra = {}) {
  return {
    data,
    isFetching: false,
    isPending: false,
    isSettling: false,
    isError: false,
    refetch,
    ...extra,
  } as unknown as ReturnType<typeof useTransactionTotals>
}

beforeEach(() => {
  useTotals.mockReset()
  refetch.mockReset()
  useTotals
    .mockReturnValueOnce(query(monthly))
    .mockReturnValueOnce(query(filtered))
})

test('mostra o resultado mensal e não duplica o resumo sem filtros', () => {
  render(<TransactionPageSummary criteria={base} month="2026-10" valid />)
  const region = screen.getByRole('region', {
    name: 'Mês completo por competência — 2026-10',
  })
  expect(region).toHaveTextContent('Receitas: R$ 100,01')
  expect(region).toHaveTextContent('Despesas: R$ 30,02')
  expect(region).toHaveTextContent('Aportes: R$ 10,03')
  expect(region).toHaveTextContent('Resultado: R$ 59,96')
  expect(region).toHaveTextContent('13 lançamentos')
  expect(
    screen.queryByRole('region', { name: 'Totais dos resultados filtrados' }),
  ).not.toBeInTheDocument()
  expect(useTotals).toHaveBeenNthCalledWith(2, base, false)
})

test('mantém o mês separado da consulta filtrada e de critérios inválidos', () => {
  const criteria = {
    ...base,
    type: 'expense' as const,
    categoryId: 'x',
    dateBasis: 'purchase' as const,
  }
  const { rerender } = render(
    <TransactionPageSummary criteria={criteria} month="2026-10" valid />,
  )
  expect(
    screen.getByRole('region', { name: /Mês completo/ }),
  ).toHaveTextContent('13 lançamentos')
  expect(
    screen.getByRole('region', { name: 'Totais dos resultados filtrados' }),
  ).toHaveTextContent('1 lançamentos')
  useTotals
    .mockReturnValueOnce(query(monthly))
    .mockReturnValueOnce(query(undefined, { isPending: true }))
  rerender(
    <TransactionPageSummary
      criteria={criteria}
      month="2026-10"
      valid={false}
    />,
  )
  expect(
    screen.getByRole('region', { name: /Mês completo/ }),
  ).toHaveTextContent('13 lançamentos')
  expect(
    screen.queryByRole('region', { name: 'Totais dos resultados filtrados' }),
  ).not.toBeInTheDocument()
})

test('espera agregação e permite repetir falhas sem mostrar valores antigos', () => {
  useTotals.mockReset()
  useTotals
    .mockReturnValueOnce(query(monthly, { isFetching: true }))
    .mockReturnValueOnce(query(undefined))
  const { rerender } = render(
    <TransactionPageSummary criteria={base} month="2026-10" valid />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Calculando totais')
  expect(screen.queryByText(/100,01/)).not.toBeInTheDocument()
  useTotals
    .mockReturnValueOnce(query(monthly, { isError: true }))
    .mockReturnValueOnce(query(undefined))
  rerender(<TransactionPageSummary criteria={base} month="2026-10" valid />)
  fireEvent.click(
    within(screen.getByRole('alert')).getByRole('button', {
      name: 'Tentar novamente',
    }),
  )
  expect(refetch).toHaveBeenCalled()
})

test('detecta período, busca, tipo e valores adicionais', () => {
  expect(
    hasAdditionalFilters({ ...base, type: 'income' }, '2026-10', 'income'),
  ).toBe(false)
  expect(hasAdditionalFilters({ ...base, search: ' ' }, '2026-10')).toBe(false)
  expect(hasAdditionalFilters({ ...base, minAmount: 0 }, '2026-10')).toBe(true)
  expect(
    hasAdditionalFilters({ ...base, startDate: undefined }, '2026-10'),
  ).toBe(true)
  expect(hasAdditionalFilters({ ...base, type: 'expense' }, '2026-10')).toBe(
    true,
  )
})

test('página específica mostra o valor e quantidade completos do tipo', () => {
  render(
    <TransactionPageSummary
      criteria={{ ...base, type: 'expense' }}
      month="2026-10"
      valid
      type="expense"
    />,
  )
  const region = screen.getByRole('region', { name: /Mês completo/ })
  expect(region).toHaveTextContent('Total: R$ 30,02')
  expect(region).toHaveTextContent('13 lançamentos')
  expect(
    screen.queryByRole('region', { name: 'Totais dos resultados filtrados' }),
  ).not.toBeInTheDocument()
})
