/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import DashboardPage from '@/app/(dashboard)/page'
import { useAnalytics } from '@/hooks/use-analytics'
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { displayName: 'Pessoa' } }),
}))
jest.mock('@/components/transactions/transaction-form', () => ({
  TransactionForm: () => null,
}))
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: jest.fn() }))
jest.mock('@/components/dashboard/balance-card', () => ({
  BalanceCard: () => <p>Saldo zero indevido</p>,
}))
jest.mock('@/components/dashboard/summary-cards', () => ({
  SummaryCards: () => <p>Resumo indevido</p>,
}))
jest.mock('@/components/dashboard/recent-transactions', () => ({
  RecentTransactions: () => null,
}))

test('falha de resumo não apresenta saldo zero e permite tentar novamente', () => {
  const retry = jest.fn()
  jest
    .mocked(useAnalytics)
    .mockReturnValue({
      summary: undefined,
      isLoading: false,
      error: new Error('internal'),
      refetch: retry,
    } as never)
  render(<DashboardPage />)
  expect(screen.queryByText('Saldo zero indevido')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retry).toHaveBeenCalledTimes(1)
})
