/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditCardBillSummary } from '@/components/credit-cards/credit-card-bill-summary'
import { useCardInvoice } from '@/hooks/use-card-invoice'
import type { CreditCard } from '@/types/credit-card'
jest.mock('@/hooks/use-card-invoice', () => ({ useCardInvoice: jest.fn() }))
jest.mock('@/hooks/use-categories', () => ({ useCategories: () => ({ categories: [] }) }))
jest.mock('@/components/transactions/transaction-row', () => ({ TransactionRow: ({ transaction }: { transaction: { description: string } }) => <p>{transaction.description}</p> }))
const card = { id: 'card', closingDay: 20 } as CreditCard
const mockInvoice = jest.mocked(useCardInvoice)
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 10))
  mockInvoice.mockReturnValue({ data: Array.from({ length: 105 }, (_, i) => ({ id: String(i), amount: 100, description: `Compra ${i}` })), isPending: false, isError: false } as never)
})
afterEach(() => jest.useRealTimers())
test('total completo permanece correto ao navegar mais de 100 compras', () => {
  render(<CreditCardBillSummary card={card} />)
  expect(screen.getByText(/Total:/)).toHaveTextContent('R$ 105,00 · 105 compras')
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('Mais compras'))
  expect(screen.getByText('Compra 104')).toBeVisible()
  expect(screen.getByText(/Total:/)).toHaveTextContent('R$ 105,00')
  fireEvent.click(screen.getByText('Compras anteriores'))
  expect(screen.getByText('Compra 80')).toBeVisible()
})
test('navegação cronológica passa por setembro, outubro, novembro, dezembro e janeiro', () => {
  render(<CreditCardBillSummary card={card} />)
  for (const label of ['setembro 2026', 'outubro 2026', 'novembro 2026', 'dezembro 2026', 'janeiro 2027']) {
    expect(screen.getByText(`Fatura de ${label}`)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima fatura' }))
  }
})
test('consulta com erro oferece nova tentativa, sem total parcial', () => {
  const refetch = jest.fn()
  mockInvoice.mockReturnValue({ isError: true, isPending: false, refetch } as never)
  render(<CreditCardBillSummary card={card} />)
  fireEvent.click(screen.getByText('Tentar novamente'))
  expect(refetch).toHaveBeenCalled()
  expect(screen.queryByText(/Total:/)).not.toBeInTheDocument()
})
test('ciclo vazio é identificado', () => {
  mockInvoice.mockReturnValue({ isError: false, isPending: false, data: [] } as never)
  render(<CreditCardBillSummary card={card} />)
  expect(screen.getByText('Sem compras registradas')).toBeVisible()
})
