import { TransactionSeriesService } from '@/services/transaction-series.service'
import { runTransaction, getDocs } from 'firebase/firestore'
import type { Transaction } from '@/types/transaction'

jest.mock('@/lib/firebase/config', () => ({ db: {} }))
jest.mock('@/services/transaction.service', () => ({
  TransactionService: { getCardClosingDay: async () => 28 },
}))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  query: (path: string) => path,
  where: jest.fn(),
  getDocs: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: () => new Date(),
  Timestamp: { fromDate: (date: Date) => date },
}))
const stored = new Map<string, Record<string, unknown>>()
const data = () =>
  ({
    type: 'expense',
    amount: 10000,
    description: 'Compra mensal',
    categoryId: 'expense',
    date: new Date(2026, 0, 31),
    tags: [],
    notes: null,
    recurring: false,
    creditCardId: 'card',
  }) as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 2, 31, 12))
  stored.clear()
  jest.mocked(runTransaction).mockImplementation(async (_db, operation) => {
    const writes: Array<() => void> = []
    const result = await operation({
      get: async (ref: string) => ({
        exists: () => stored.has(ref),
        data: () => stored.get(ref),
      }),
      set: (ref: string, value: Record<string, unknown>) =>
        writes.push(() => {
          stored.set(ref, value)
        }),
      update: (ref: string, value: Record<string, unknown>) =>
        writes.push(() => {
          stored.set(ref, { ...stored.get(ref), ...value })
        }),
      delete: (ref: string) =>
        writes.push(() => {
          stored.delete(ref)
        }),
    } as never)
    writes.forEach((write) => write())
    return result
  })
  jest.mocked(getDocs).mockImplementation(
    async (path: unknown) =>
      ({
        docs: Array.from(stored)
          .filter(([key]) => key.startsWith(String(path) + '/'))
          .map(([ref, value]) => ({
            ref,
            id: ref.split('/').at(-1),
            data: () => value,
          })),
      }) as never,
  )
})
afterEach(() => jest.useRealTimers())

it('repete criação e geração sem duplicar, preserva fuso e não recria ocorrência excluída', async () => {
  await TransactionSeriesService.create(
    'alice',
    'monthly',
    data(),
    'recurring',
    1200,
  )
  await TransactionSeriesService.create(
    'alice',
    'monthly',
    data(),
    'recurring',
    1200,
  )
  const occurrences = () =>
    Array.from(stored.keys()).filter((k) => k.includes('/transactions/'))
  expect(occurrences()).toHaveLength(3)
  stored.delete(occurrences()[1])
  expect(await TransactionSeriesService.generate('alice', 'monthly')).toBe(0)
  expect(occurrences()).toHaveLength(2)
  await TransactionSeriesService.editFuture(
    'alice',
    'monthly',
    12000,
    'Futuras editadas',
  )
  expect(stored.get('users/alice/transactions/series-monthly-0')?.amount).toBe(
    10000,
  )
  expect(
    await TransactionSeriesService.generate(
      'alice',
      'monthly',
      new Date(2026, 3, 30, 12),
    ),
  ).toBe(1)
  expect(stored.get('users/alice/transactions/series-monthly-3')?.amount).toBe(
    12000,
  )
})
it('não antecipa a ocorrência ao abrir em outro fuso antes da meia-noite da série', async () => {
  stored.set('users/alice/transactionSeries/zone', {
    ...data(), date: new Date('2026-03-31T10:00:00Z'), kind: 'recurring',
    count: 1200, nextIndex: 0, timezoneOffset: 600, endDate: null,
    cancelledFrom: null, cardClosingDay: 28,
  })
  expect(await TransactionSeriesService.generate('alice', 'zone', new Date('2026-03-31T08:00:00Z'))).toBe(0)
  expect(await TransactionSeriesService.generate('alice', 'zone', new Date('2026-03-31T10:00:00Z'))).toBe(1)
})
