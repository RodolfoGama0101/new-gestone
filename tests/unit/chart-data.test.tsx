/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'
import { BalanceTrendAreaChart } from '@/components/charts/balance-trend-area-chart'
import { formatMoney } from '@/lib/utils/format-money'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PieChart: () => null,
  BarChart: () => null,
  AreaChart: () => null,
}))

it('expõe todas as 20 categorias, valores e percentuais sem hover', () => {
  const data = Array.from({ length: 20 }, (_, i) => ({
    name: `Categoria longa ${i} com descrição completa`,
    value: 101,
    color: '#777777',
  }))
  render(<CategoryDonutChart data={data} />)
  const list = screen.getByRole('list', { name: 'Despesas por categoria' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(20)
  for (const entry of data)
    expect(within(list).getByText(entry.name)).toBeVisible()
  expect(within(list).getAllByText('5%')).toHaveLength(20)
  expect(
    within(list).getAllByText(formatMoney(101).replaceAll('\u00a0', ' ')),
  ).toHaveLength(20)
  expect(
    screen.getByText(formatMoney(2020).replaceAll('\u00a0', ' ')),
  ).toBeVisible()
})

it('expõe as séries e o saldo acumulado a partir dos mesmos centavos dos gráficos', () => {
  const data = [
    {
      monthLabel: 'jan/26',
      income: 10001,
      expense: 3002,
      investment: 1003,
      balance: 5996,
    },
  ]
  render(
    <>
      <CashFlowBarChart data={data} />
      <BalanceTrendAreaChart data={data} />
    </>,
  )
  for (const summary of screen.getAllByText('Ver dados por período'))
    fireEvent.click(summary)
  for (const value of [10001, 3002, 1003, 5996])
    expect(
      screen.getByText(formatMoney(value).replaceAll('\u00a0', ' ')),
    ).toBeInTheDocument()
  expect(screen.getByText('Saldo acumulado')).toBeInTheDocument()
})

it('mantém estados vazios sem dados inventados', () => {
  render(<CategoryDonutChart data={[]} />)
  expect(
    screen.getByText('Sem dados de despesas no período selecionado.'),
  ).toBeVisible()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})
