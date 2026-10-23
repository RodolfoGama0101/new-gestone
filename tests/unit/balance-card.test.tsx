/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { BalanceCard } from '@/components/dashboard/balance-card'

describe('explicação do saldo mensal', () => {
  test('representa um único dia e séries zeradas sem curva invisível ou data inválida', () => {
    const { rerender } = render(
      <BalanceCard
        balance={10000}
        changePercent={0}
        data={[{ date: '05/10', balance: 10000 }]}
        selectedMonth={new Date(2026, 9, 1)}
      />,
    )
    const chart = screen.getByRole('img', { name: /Evolução do saldo/ })
    expect(chart.querySelector('path[stroke="var(--link)"]')).toHaveAttribute(
      'd',
      'M0 20H600',
    )
    expect(screen.getByText('outubro de 2026')).toBeVisible()
    expect(screen.queryByText(/Invalid Date/)).toBeNull()
    rerender(
      <BalanceCard
        balance={0}
        changePercent={0}
        data={[
          { date: '01/10', balance: 0 },
          { date: '31/10', balance: 0 },
        ]}
      />,
    )
    expect(
      screen.getByRole('img').querySelector('path[stroke="var(--link)"]'),
    ).toHaveAttribute('d', 'M0,155L600,155')
  })
  test('distingue saldo do mês, reservas posteriores e disponível', () => {
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
    expect(screen.getByText('Saldo do mês')).toBeVisible()
    fireEvent.click(screen.getByText('Sobre a projeção'))
    expect(screen.getByText(/Inclui a fatura deste mês/)).toBeInTheDocument()
    expect(
      screen.getByText('Reserva para faturas futuras').parentElement,
    ).toHaveTextContent('R$ 100,00')
    expect(
      screen.getByText('Saldo disponível após reserva').parentElement,
    ).toHaveTextContent('R$ 900,00')
    expect(
      screen.getByText(/compras realizadas até 22\/07\/2026/),
    ).toBeVisible()
    expect(
      screen.getByText(/Projeção dos lançamentos cadastrados/),
    ).toBeVisible()
  })

  test('sem reservas, disponível acompanha saldo e os rótulos continuam visíveis', () => {
    render(<BalanceCard balance={90000} changePercent={0} data={[]} />)
    expect(
      screen.getByText('Reserva para faturas futuras').parentElement,
    ).toHaveTextContent('R$ 0,00')
    expect(
      screen.getByText('Saldo disponível após reserva').parentElement,
    ).toHaveTextContent('R$ 900,00')
  })
})
