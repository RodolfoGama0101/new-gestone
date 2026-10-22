/** @jest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { TransactionService } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { invalidateTransactionData, transactionPaginationKey } from '@/lib/transaction-cache'

jest.mock('@/services/transaction.service', () => ({ TransactionService: { getPaged: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } }))
jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }))
const getPaged = jest.mocked(TransactionService.getPaged)
const auth = jest.mocked(useAuth)

function wrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  auth.mockReturnValue({ user: { uid: 'user' } } as ReturnType<typeof useAuth>)
  getPaged.mockImplementation(async (_uid, filters = {}) => ({
    transactions: [{ id: `${filters.limitCount}-${filters.search}-${filters.startDate?.getTime()}` }] as never,
    lastVisible: { id: `cursor-${filters.limitCount}` } as never,
    hasMore: true,
  }))
})

test('buscar de outra página reinicia o cursor e não recupera resultados do termo anterior', async () => {
  const { result, rerender } = renderHook(({ search }) => useTransactions({ search }), { initialProps: { search: '' }, wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.currentPage).toBe(2))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  rerender({ search: '  ALVO  ' })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ search: 'alvo', lastVisible: undefined }))
  expect(result.current.transactions[0].id).toContain('alvo')
})

test('dashboard com cinco itens e extrato com dez não compartilham página em cache', async () => {
  const { result } = renderHook(() => ({ recent: useTransactions({ limitCount: 5 }), ledger: useTransactions({ limitCount: 10 }) }), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.recent.isLoading || result.current.ledger.isLoading).toBe(false))
  expect(getPaged).toHaveBeenCalledTimes(2)
  expect(result.current.recent.transactions[0].id).toMatch(/^5-/)
  expect(result.current.ledger.transactions[0].id).toMatch(/^10-/)
  act(() => result.current.recent.goToNextPage())
  await waitFor(() => expect(result.current.recent.isLoading).toBe(false))
  expect(result.current.recent.currentPage).toBe(2)
  expect(result.current.ledger.currentPage).toBe(1)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 5, lastVisible: expect.objectContaining({ id: 'cursor-5' }) }))
  act(() => result.current.ledger.goToNextPage())
  await waitFor(() => expect(result.current.ledger.isLoading).toBe(false))
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 10, lastVisible: expect.objectContaining({ id: 'cursor-10' }) }))
})

test('trocar o limite no mesmo consumidor reinicia cursores mesmo ao voltar ao cache fresco', async () => {
  const { result, rerender } = renderHook(({ limitCount }) => useTransactions({ limitCount }), {
    initialProps: { limitCount: 5 }, wrapper: wrapper(),
  })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)

  rerender({ limitCount: 10 })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(result.current.hasPreviousPage).toBe(false)
  expect(result.current.transactions[0].id).toMatch(/^10-/)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 10, lastVisible: undefined }))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)

  const calls = getPaged.mock.calls.length
  rerender({ limitCount: 5 })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(result.current.hasPreviousPage).toBe(false)
  expect(result.current.transactions[0].id).toMatch(/^5-/)
  expect(getPaged).toHaveBeenCalledTimes(calls)
})

test.each(['startDate', 'endDate'] as const)('alterar somente %s reinicia a página, mas datas equivalentes mantêm o cursor', async (field) => {
  const initialProps = { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 31) }
  const { result, rerender } = renderHook((filters) => useTransactions(filters), { initialProps, wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  const calls = getPaged.mock.calls.length
  rerender({ startDate: new Date(initialProps.startDate), endDate: new Date(initialProps.endDate) })
  expect(result.current.currentPage).toBe(2)
  expect(getPaged).toHaveBeenCalledTimes(calls)

  const changed = { ...initialProps, [field]: new Date(2026, 0, 15) }
  rerender(changed)
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(result.current.hasPreviousPage).toBe(false)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ ...changed, lastVisible: undefined }))
})

test('digitação rápida consulta apenas o termo final após a pausa', async () => {
  const { result, rerender } = renderHook(({ search }) => useTransactions({ search }), { initialProps: { search: '' }, wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  rerender({ search: 'a' })
  rerender({ search: 'al' })
  rerender({ search: 'alvo' })
  expect(getPaged).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(getPaged).toHaveBeenCalledTimes(2)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ search: 'alvo' }))
})

test('alterar o intervalo reinicia a página e consulta dados próprios mesmo com cache fresco', async () => {
  const { result, rerender } = renderHook(({ startDate, endDate }) => useTransactions({ startDate, endDate }), {
    initialProps: { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 31) }, wrapper: wrapper(),
  })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  rerender({ startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28), lastVisible: undefined }))
  expect(result.current.transactions[0].id).toContain(String(new Date(2026, 1, 1).getTime()))
})

test.each(['create', 'update', 'delete'] as const)('%s reinicia todas as listas e não reutiliza cursores/cache anteriores', async (operation) => {
  let generation = 0
  getPaged.mockImplementation(async (_uid, filters = {}) => ({
    transactions: [{ id: `${generation}-${filters.lastVisible ? 'next' : 'first'}` }] as never,
    lastVisible: { id: 'same-boundary-id', generation } as never,
    hasMore: !filters.lastVisible,
  }))
  jest.mocked(TransactionService.create).mockImplementation(async () => { generation++; return 'new' })
  jest.mocked(TransactionService.update).mockImplementation(async () => { generation++ })
  jest.mocked(TransactionService.delete).mockImplementation(async () => { generation++ })
  const { result } = renderHook(() => ({ ledger: useTransactions(), expenses: useTransactions({ type: 'expense' }) }), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.ledger.isLoading || result.current.expenses.isLoading).toBe(false))
  act(() => { result.current.ledger.goToNextPage(); result.current.expenses.goToNextPage() })
  await waitFor(() => expect(result.current.ledger.isLoading || result.current.expenses.isLoading).toBe(false))
  expect(result.current.ledger.currentPage).toBe(2)
  expect(result.current.expenses.currentPage).toBe(2)

  await act(async () => {
    if (operation === 'create') await result.current.ledger.createTransaction({} as never)
    if (operation === 'update') await result.current.ledger.updateTransaction({ transactionId: 'item', data: { date: new Date() } })
    if (operation === 'delete') await result.current.ledger.deleteTransaction('item')
  })
  await waitFor(() => expect(result.current.ledger.isLoading || result.current.expenses.isLoading).toBe(false))
  expect(result.current.ledger.currentPage).toBe(1)
  expect(result.current.expenses.currentPage).toBe(1)
  expect(result.current.ledger.transactions[0].id).toBe('1-first')
  expect(result.current.expenses.transactions[0].id).toBe('1-first')

  act(() => result.current.ledger.goToNextPage())
  await waitFor(() => expect(result.current.ledger.isLoading).toBe(false))
  expect(result.current.ledger.transactions[0].id).toBe('1-next')
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ lastVisible: expect.objectContaining({ generation: 1 }) }))
})

test('alteração externa ao hook reinicia a página e preserva o estado de outro usuário', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(transactionPaginationKey('other'), 7)
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)
  await act(async () => { await invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(1)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ lastVisible: undefined }))
  expect(client.getQueryData(transactionPaginationKey('other'))).toBe(7)
})

test('falha ao excluir mantém a página e seus cursores', async () => {
  jest.mocked(TransactionService.delete).mockRejectedValue(new Error('unavailable'))
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  const calls = getPaged.mock.calls.length
  await act(async () => { await expect(result.current.deleteTransaction('item')).rejects.toThrow('unavailable') })
  expect(result.current.currentPage).toBe(2)
  expect(getPaged).toHaveBeenCalledTimes(calls)
})

test('refetch mantém os dados e não reabre carregamento inicial', async () => {
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  const previous = result.current.transactions
  let finish!: (value: Awaited<ReturnType<typeof TransactionService.getPaged>>) => void
  getPaged.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  act(() => { void result.current.refetch() })
  await waitFor(() => expect(result.current.isFetching).toBe(true))
  expect(result.current.isLoading).toBe(false)
  expect(result.current.transactions).toBe(previous)
  await act(async () => { finish({ transactions: [], lastVisible: null, hasMore: false }) })
  await waitFor(() => expect(result.current.isFetching).toBe(false))
})
