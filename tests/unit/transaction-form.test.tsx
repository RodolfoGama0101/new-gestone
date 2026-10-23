/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionService } from '@/services/transaction.service'
import type { Transaction } from '@/types/transaction'

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'form-test' } }),
}))
jest.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    categories: [{ id: 'food', name: 'Alimentação', type: 'expense' }],
    isLoading: false,
  }),
}))
jest.mock('@/hooks/use-credit-cards', () => ({
  useCreditCards: () => ({ creditCards: [] }),
}))
jest.mock('@/services/transaction.service', () => ({
  TransactionService: { create: jest.fn(), update: jest.fn() },
}))
jest.mock('@/services/transaction-series.service', () => ({
  TransactionSeriesService: { create: jest.fn() },
}))
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

function setup(editingTransaction?: Transaction) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TransactionForm editingTransaction={editingTransaction} />
    </QueryClientProvider>,
  )
}

const transaction: Transaction = {
  id: 'existing',
  type: 'expense',
  amount: 2500,
  description: 'Compra de teste',
  categoryId: 'food',
  date: new Date(2026, 9, 23),
  tags: ['essencial'],
  notes: 'Nota existente',
  recurring: false,
  creditCardId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => jest.clearAllMocks())

test('mostra só os campos da seção ativa e conserva valores ao navegar', () => {
  setup()
  expect(screen.getByLabelText('Descrição')).toBeVisible()
  expect(
    screen.getByLabelText('Tags (separadas por vírgula)'),
  ).not.toBeVisible()
  expect(screen.getByLabelText('Modo do lançamento')).not.toBeVisible()
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: 'Descrição preservada' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }))
  fireEvent.change(screen.getByLabelText('Anotações / Notas'), {
    target: { value: 'Nota preservada' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Repetição' }))
  expect(screen.getByLabelText('Modo do lançamento')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Confirmar Lançamento' }),
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Lançamento' }))
  expect(screen.getByLabelText('Descrição')).toHaveValue('Descrição preservada')
  fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }))
  expect(screen.getByLabelText('Anotações / Notas')).toHaveValue(
    'Nota preservada',
  )
})

test('abre a seção de um campo inválido e move o foco ao confirmar', async () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Lançamento' }))
  await waitFor(() => expect(screen.getByLabelText('Descrição')).toHaveFocus())
  expect(screen.getByLabelText('Descrição')).toBeVisible()
  expect(TransactionService.create).not.toHaveBeenCalled()
})

test('edita notas sem perder os campos de outra seção e revela erros nos detalhes', async () => {
  setup(transaction)
  expect(
    screen.queryByRole('button', { name: 'Repetição' }),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }))
  expect(screen.getByLabelText('Tags (separadas por vírgula)')).toHaveValue(
    'essencial',
  )
  expect(screen.getByLabelText('Anotações / Notas')).toHaveValue(
    'Nota existente',
  )
  fireEvent.change(screen.getByLabelText('Anotações / Notas'), {
    target: { value: 'a'.repeat(501) },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lançamento' }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Lançamento' }))
  await waitFor(() =>
    expect(screen.getByLabelText('Anotações / Notas')).toHaveFocus(),
  )
  fireEvent.change(screen.getByLabelText('Anotações / Notas'), {
    target: { value: 'Nota atualizada' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Lançamento' }))
  await waitFor(() =>
    expect(TransactionService.update).toHaveBeenCalledWith(
      'form-test',
      'existing',
      expect.objectContaining({
        amount: 2500,
        description: transaction.description,
        tags: ['essencial'],
        notes: 'Nota atualizada',
      }),
    ),
  )
})
