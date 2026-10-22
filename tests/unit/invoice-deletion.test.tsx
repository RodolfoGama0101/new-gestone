/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreditCardBillSummary } from '@/components/credit-cards/credit-card-bill-summary'
import { TransactionService } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'

jest.mock('@/services/transaction.service', () => ({ TransactionService: { getInvoice: jest.fn(), delete: jest.fn() } }))
jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }))
jest.mock('@/hooks/use-invoice-payment', () => ({ useInvoicePayment: () => ({ data: null, isPending: false, error: null, saving: false }) }))
jest.mock('@/hooks/use-categories', () => ({ useCategories: () => ({ categories: [] }) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const purchase: Transaction = {
  id: 'purchase', description: 'Compra identificada', amount: 12345,
  type: 'expense', categoryId: 'category', creditCardId: 'card',
  date: new Date(2026, 9, 10), tags: [], notes: null, recurring: false,
  createdAt: null, updatedAt: null,
}
const card = { id: 'card', closingDay: 20 } as CreditCard
const getInvoice = jest.mocked(TransactionService.getInvoice)
const deletePurchase = jest.mocked(TransactionService.delete)

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(useAuth).mockReturnValue({ user: { uid: 'user' } } as ReturnType<typeof useAuth>)
  getInvoice.mockResolvedValue([purchase])
})

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><CreditCardBillSummary card={card} /></QueryClientProvider>)
  await screen.findByText(purchase.description)
  fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento' }))
  return { invalidate, dialog: await screen.findByRole('dialog') }
}

test('abrir e cancelar identificam a compra e não executam exclusão', async () => {
  const { dialog } = await setup()
  expect(within(dialog).getByText(/Compra identificada/)).toHaveTextContent('R$ 123,45')
  expect(deletePurchase).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: /^Cancelar$/ }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByText(purchase.description)).toBeVisible()
  expect(screen.getByText(/Total:/)).toHaveTextContent('R$ 123,45 · 1 compras')
  expect(deletePurchase).not.toHaveBeenCalled()
})

test('confirma uma única exclusão, bloqueia fechamento pendente e atualiza total e consultas financeiras', async () => {
  let finish!: () => void
  deletePurchase.mockImplementation(() => new Promise<void>((resolve) => {
    finish = () => { getInvoice.mockResolvedValue([]); resolve() }
  }))
  const { dialog, invalidate } = await setup()
  const confirm = within(dialog).getByRole('button', { name: /^Excluir$/ })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  await waitFor(() => expect(deletePurchase).toHaveBeenCalledTimes(1))
  expect(deletePurchase).toHaveBeenCalledWith('user', 'purchase')
  expect(within(dialog).getByRole('button', { name: 'Carregando...' })).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => finish())
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await screen.findByText('Sem compras registradas')).toBeVisible()
  expect(screen.getByText(/Total:/)).toHaveTextContent('R$ 0,00 · 0 compras')
  for (const key of ['transactions', 'analytics', 'analyticsHistory', 'creditCards']) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key, 'user'] })
  }
  expect(toast.success).toHaveBeenCalledWith('Compra excluída com sucesso!')
})

test('falha preserva compra e confirmação e permite tentar novamente', async () => {
  deletePurchase.mockRejectedValueOnce(new Error('unavailable')).mockImplementationOnce(async () => {
    getInvoice.mockResolvedValue([])
  })
  const { dialog, invalidate } = await setup()
  fireEvent.click(within(dialog).getByRole('button', { name: /^Excluir$/ }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível excluir a compra. Tente novamente.'))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByText(purchase.description)).toBeInTheDocument()
  expect(invalidate).not.toHaveBeenCalled()
  const retry = within(dialog).getByRole('button', { name: /^Excluir$/ })
  expect(retry).toBeEnabled()
  fireEvent.click(retry)
  await screen.findByText('Sem compras registradas')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(deletePurchase).toHaveBeenCalledTimes(2)
})
