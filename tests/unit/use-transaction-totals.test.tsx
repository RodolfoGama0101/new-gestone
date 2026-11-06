/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { TransactionService } from '@/services/transaction.service'

jest.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: { uid: 'uid' } }) }))
jest.mock('@/services/transaction.service', () => ({ TransactionService: { getTotals: jest.fn() } }))

test('mudança de critério cancela a consulta anterior e não apresenta seu total', async () => {
  const getTotals = jest.mocked(TransactionService.getTotals)
  let firstSignal: AbortSignal | undefined
  getTotals.mockImplementation((_uid, filters, options) => {
    if (filters?.search === 'primeiro') {
      firstSignal = options?.signal
      return new Promise(() => {})
    }
    return Promise.resolve({ income: 0, expense: 101, investment: 0, count: 1 })
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  const { result, rerender } = renderHook(({ search }) => useTransactionTotals({ search }), { initialProps: { search: 'primeiro' }, wrapper })
  await waitFor(() => expect(firstSignal).toBeDefined())
  rerender({ search: 'segundo' })
  await waitFor(() => expect(result.current.data?.expense).toBe(101))
  expect(firstSignal?.aborted).toBe(true)
  expect(getTotals).toHaveBeenLastCalledWith('uid', { search: 'segundo' }, { signal: expect.any(AbortSignal) })
})
