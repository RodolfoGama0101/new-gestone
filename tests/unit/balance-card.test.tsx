/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BalanceCard } from '@/components/dashboard/balance-card'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AreaChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
}))

describe('explicação do saldo mensal', () => {
  test('distingue saldo do mês, reservas posteriores e disponível', async () => {
    render(
      <BalanceCard
        balance={100000}
        futureCardExpenses={10000}
        availableBalance={90000}
        referenceDate={new Date(2026, 6, 22)}
        changePercent={0}
        data={[]}
      />,
    )
    expect(screen.getByText('Saldo projetado do mês')).toBeVisible()
    expect(screen.getByText(/incluindo a fatura deste mês/)).toBeVisible()
    expect(
      screen.getByText('Reserva para faturas após este mês').parentElement,
    ).toHaveTextContent('R$ 100,00')
    expect(
      screen.getByText('Disponível após reservas').parentElement,
    ).toHaveTextContent('R$ 900,00')
    fireEvent.click(
      screen.getByRole('button', { name: 'Entenda esta projeção' }),
    )
    expect(
      await screen.findByText(/compras realizadas até 22\/07\/2026/),
    ).toBeVisible()
    expect(
      screen.getByText(/Projeção dos lançamentos cadastrados/),
    ).toBeVisible()
  })

  test('sem reservas, disponível acompanha saldo e os rótulos continuam visíveis', () => {
    render(<BalanceCard balance={90000} changePercent={0} data={[]} />)
    expect(
      screen.getByText('Reserva para faturas após este mês').parentElement,
    ).toHaveTextContent('R$ 0,00')
    expect(
      screen.getByText('Disponível após reservas').parentElement,
    ).toHaveTextContent('R$ 900,00')
  })
})
