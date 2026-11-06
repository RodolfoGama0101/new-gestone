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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ search: 'alvo', lastVisible: undefined }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 5, lastVisible: expect.objectContaining({ id: 'cursor-5' }) }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  act(() => result.current.ledger.goToNextPage())
  await waitFor(() => expect(result.current.ledger.isLoading).toBe(false))
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 10, lastVisible: expect.objectContaining({ id: 'cursor-10' }) }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ limitCount: 10, lastVisible: undefined }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ ...changed, lastVisible: undefined }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ search: 'alvo' }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
})

test('filtros avançados reiniciam a página e critérios inválidos suspendem a consulta', async () => {
  const initialProps = { minAmount: 100, maxAmount: 500, modality: 'recurring' as const, enabled: true }
  const { result, rerender } = renderHook(({ enabled, ...filters }) => useTransactions(filters, enabled), { initialProps, wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.currentPage).toBe(2))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  const calls = getPaged.mock.calls.length
  rerender({ ...initialProps, minAmount: 600, enabled: false })
  expect(result.current.currentPage).toBe(1)
  expect(getPaged).toHaveBeenCalledTimes(calls)
  rerender({ ...initialProps, minAmount: 200 })
  await waitFor(() => expect(getPaged).toHaveBeenCalledTimes(calls + 1))
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ minAmount: 200, maxAmount: 500, modality: 'recurring', lastVisible: undefined }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28), lastVisible: undefined }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  expect(result.current.transactions[0].id).toContain(String(new Date(2026, 1, 1).getTime()))
})

test.each(['create', 'update', 'delete'] as const)('%s preserva as listas e reconstrói cursores/cache anteriores', async (operation) => {
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
  expect(result.current.ledger.currentPage).toBe(2)
  expect(result.current.expenses.currentPage).toBe(2)
  expect(result.current.ledger.transactions[0].id).toBe('1-next')
  expect(result.current.expenses.transactions[0].id).toBe('1-next')
  expect(getPaged).toHaveBeenCalledWith('user', expect.objectContaining({ lastVisible: expect.objectContaining({ generation: 1 }) }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
})

test('alteração externa ao hook reconstrói a página e preserva o estado de outro usuário', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(transactionPaginationKey('other'), 7)
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)
  await act(async () => { await invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)
  expect(getPaged).toHaveBeenLastCalledWith('user', expect.objectContaining({ lastVisible: expect.objectContaining({ id: 'cursor-10' }) }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  expect(client.getQueryData(transactionPaginationKey('other'))).toBe(7)
})

test('exclusão da última página retorna à última página válida', async () => {
  let removed = false
  getPaged.mockImplementation(async (_uid, filters = {}) => ({
    transactions: filters.lastVisible && removed ? [] : [{ id: filters.lastVisible ? 'last' : 'first' }] as never,
    lastVisible: filters.lastVisible && removed ? null : { id: 'cursor' } as never,
    hasMore: !filters.lastVisible && !removed,
  }))
  jest.mocked(TransactionService.delete).mockImplementation(async () => { removed = true })
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('last'))
  await act(async () => { await result.current.deleteTransaction('last') })
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('first'))
  expect(result.current.currentPage).toBe(1)
  expect(result.current.hasNextPage).toBe(false)
})

test('reconstrução conserva lote vazio que ainda oferece continuação', async () => {
  let generation = 0
  getPaged.mockImplementation(async (_uid, filters = {}) => {
    const cursor = filters.lastVisible?.id
    return {
      transactions: cursor === 'one' ? [] : [{ id: cursor ?? 'first' }] as never,
      lastVisible: { id: cursor === 'one' ? 'two' : 'one', generation } as never,
      hasMore: cursor !== 'two',
    }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.currentPage).toBe(2))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.transactions).toHaveLength(0)
  expect(result.current.hasNextPage).toBe(true)
  generation++
  await act(async () => { await invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.currentPage).toBe(2)
  expect(result.current.hasNextPage).toBe(true)
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('two'))
  expect(result.current.currentPage).toBe(3)
})

test('navegação até lote final sem resultados mostra o fim da busca', async () => {
  getPaged.mockImplementation(async (_uid, filters = {}) => ({
    transactions: filters.lastVisible ? [] : [{ id: 'first' }] as never,
    lastVisible: { id: 'boundary' } as never,
    hasMore: !filters.lastVisible,
  }))
  const { result } = renderHook(() => useTransactions({ search: 'alvo' }), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.currentPage).toBe(2))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.transactions).toHaveLength(0)
  expect(result.current.hasPreviousPage).toBe(true)
  expect(result.current.hasNextPage).toBe(false)
})

test('reconstrução de busca totalmente vazia retorna à primeira página', async () => {
  let empty = false
  getPaged.mockImplementation(async (_uid, filters = {}) => {
    const page = filters.lastVisible?.id === 'one' ? 2 : filters.lastVisible?.id === 'two' ? 3 : 1
    return {
      transactions: empty ? [] : [{ id: String(page) }] as never,
      lastVisible: { id: page === 1 ? 'one' : 'two' } as never,
      hasMore: page < 3,
    }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('2'))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('3'))
  empty = true
  await act(async () => { await invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(result.current.currentPage).toBe(1))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.transactions).toHaveLength(0)
})

test('restaura posição ao remontar a mesma lista sem compartilhar com outro usuário', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const first = renderHook(() => useTransactions({}, true, 'ledger'), { wrapper: wrapper(client) })
  await waitFor(() => expect(first.result.current.isLoading).toBe(false))
  act(() => first.result.current.goToNextPage())
  await waitFor(() => expect(first.result.current.isLoading).toBe(false))
  first.unmount()
  const second = renderHook(() => useTransactions({}, true, 'ledger'), { wrapper: wrapper(client) })
  await waitFor(() => expect(second.result.current.isLoading).toBe(false))
  expect(second.result.current.currentPage).toBe(2)
  auth.mockReturnValue({ user: { uid: 'other' } } as ReturnType<typeof useAuth>)
  second.rerender()
  await waitFor(() => expect(second.result.current.isLoading).toBe(false))
  expect(second.result.current.currentPage).toBe(1)
})

test('uma resposta antiga não sobrescreve a reconstrução da revisão mais recente', async () => {
  let finishOld!: (value: Awaited<ReturnType<typeof TransactionService.getPaged>>) => void
  let generation = 0
  getPaged.mockImplementation(async (_uid, filters = {}) => {
    if (generation === 1 && !filters.lastVisible) {
      return new Promise((resolve) => { finishOld = resolve })
    }
    return {
      transactions: [{ id: `${generation}-${filters.lastVisible ? 'next' : 'first'}` }] as never,
      lastVisible: { id: 'boundary', generation } as never,
      hasMore: !filters.lastVisible,
    }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const { result } = renderHook(() => useTransactions(), { wrapper: wrapper(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.goToNextPage())
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('0-next'))
  generation = 1
  act(() => { void invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(finishOld).toBeDefined())
  generation = 2
  await act(async () => { await invalidateTransactionData(client, 'user') })
  await waitFor(() => expect(result.current.transactions[0]?.id).toBe('2-next'))
  await act(async () => {
    finishOld({ transactions: [{ id: 'old' }] as never, lastVisible: { id: 'boundary' } as never, hasMore: true })
  })
  expect(result.current.transactions[0]?.id).toBe('2-next')
  expect(result.current.currentPage).toBe(2)
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
