/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { ReportSummary } from '@/components/analytics/report-summary'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { GeistChartTooltip } from '@/components/charts/geist-chart-tooltip'
import { formatMoney } from '@/lib/utils/format-money'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: () => null,
  PieChart: () => null,
}))
const data = [
  {
    monthLabel: 'set/26',
    income: 10001,
    expense: 3002,
    investment: 1003,
    balance: 5996,
  },
  {
    monthLabel: 'out/26',
    income: 20000,
    expense: 40000,
    investment: 3000,
    balance: -17004,
  },
]

test('resumo soma os mesmos centavos dos gráficos e usa o acumulado final, inclusive negativo', () => {
  render(<ReportSummary data={data} />)
  for (const [label, value] of [
    ['Receitas no período', 30001],
    ['Despesas no período', 43002],
    ['Investimentos no período', 4003],
    ['Resultado do período', -17004],
  ] as const) {
    const metric = screen.getByText(label).closest('div')!
    expect(
      within(metric).getByText(formatMoney(value).replaceAll('\u00a0', ' ')),
    ).toBeVisible()
  }
})

test('legenda permite comparar séries e mantém pelo menos uma visível, sem retirar os valores textuais', () => {
  render(<CashFlowBarChart data={data} />)
  const group = screen.getByRole('group', { name: 'Séries do fluxo de caixa' })
  const income = within(group).getByRole('button', { name: 'Receitas' })
  const expense = within(group).getByRole('button', { name: 'Despesas' })
  const investment = within(group).getByRole('button', {
    name: 'Investimentos',
  })
  fireEvent.click(income)
  fireEvent.click(expense)
  expect(income).toHaveAttribute('aria-pressed', 'false')
  expect(investment).toBeDisabled()
  fireEvent.click(screen.getByText('Ver dados por período'))
  expect(
    screen.getByText(formatMoney(10001).replaceAll('\u00a0', ' ')),
  ).toBeInTheDocument()
  fireEvent.click(income)
  expect(investment).toBeEnabled()
})

test('agrupa somente a representação visual e conserva todas as categorias com percentuais integrais', () => {
  const categories = Array.from({ length: 7 }, (_, index) => ({
    name: `Categoria ${index}`,
    value: 100,
    color: '#fff',
  }))
  render(<CategoryDonutChart data={categories} />)
  expect(screen.getByText(/A rosca destaca as 5 maiores/)).toBeVisible()
  expect(
    within(
      screen.getByRole('list', { name: 'Despesas por categoria' }),
    ).getAllByRole('listitem'),
  ).toHaveLength(7)
  expect(
    screen.getByText(formatMoney(700).replaceAll('\u00a0', ' ')),
  ).toBeVisible()
})

test('tooltip apresenta investimentos em português e respeita os centavos', () => {
  render(
    <GeistChartTooltip
      active
      label="out/26"
      payload={[{ name: 'investment', value: 1003 }]}
      valueFormatter={formatMoney}
    />,
  )
  expect(screen.getByText('Investimentos')).toBeVisible()
  expect(
    screen.getByText(formatMoney(1003).replaceAll('\u00a0', ' ')),
  ).toBeVisible()
})
