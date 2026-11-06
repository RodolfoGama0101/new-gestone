jest.mock('@/lib/firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(() => ({})), query: jest.fn((...args) => args),
  getDocs: jest.fn(), limit: jest.fn(), orderBy: jest.fn(),
  startAfter: jest.fn(), where: jest.fn(),
}))

import { getDocs, startAfter, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore'
import { TransactionService, matchesTransactionFilters } from '@/services/transaction.service'
import type { Transaction } from '@/types/transaction'

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: '1', type: 'expense', amount: 101, description: 'Árvore', categoryId: 'cat',
  date: new Date(2025, 0, 1), tags: [], notes: null, recurring: false,
  creditCardId: 'card', cardClosingDay: 10, installmentMonth: '2026-02',
  createdAt: null, updatedAt: null, ...overrides,
})
const doc = (id: string, value: Transaction) => ({ id, data: () => value }) as unknown as QueryDocumentSnapshot<DocumentData>
const snapshot = (docs: QueryDocumentSnapshot<DocumentData>[]) => ({ docs }) as Awaited<ReturnType<typeof getDocs>>
const mockGetDocs = jest.mocked(getDocs)
beforeEach(() => jest.clearAllMocks())

test('competência combina filtros e reconhece parcela com data editada', () => {
  const item = tx({ recurring: true, installmentTotal: 3 })
  const filters = { dateBasis: 'competence' as const, startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28), search: ' ÁRVORE ', minAmount: 101, maxAmount: 101, modality: 'installment' as const, categoryId: 'cat', creditCardId: 'card', type: 'expense' as const }
  expect(matchesTransactionFilters(item, filters)).toBe(true)
  expect(matchesTransactionFilters(item, { ...filters, modality: 'recurring' })).toBe(false)
  expect(matchesTransactionFilters(item, { ...filters, dateBasis: 'purchase' })).toBe(false)
  expect(matchesTransactionFilters(tx({ recurring: true }), { modality: 'recurring' })).toBe(true)
})

test('consulta por competência percorre mais de 100 candidatos com cursor completo', async () => {
  const docs = Array.from({ length: 102 }, (_, i) => doc(String(i), tx({ date: new Date(2025, 0, 1), installmentMonth: i === 101 ? '2026-02' : '2026-01' })))
  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(0, 101))).mockResolvedValueOnce(snapshot(docs.slice(100)))
  const filters = { dateBasis: 'competence' as const, startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28) }
  const first = await TransactionService.getPaged('uid', filters, { cards: [] })
  expect(first.transactions).toEqual([])
  expect(first.hasMore).toBe(true)
  const second = await TransactionService.getPaged('uid', { ...filters, lastVisible: first.lastVisible! }, { cards: [] })
  expect(startAfter).toHaveBeenCalledWith(docs[99])
  expect(second.transactions.map((item) => item.id)).toEqual(['101'])
  expect(where).not.toHaveBeenCalledWith('date', expect.anything(), expect.anything())
})

test('totais completos propagam falha intermediária, cancelamento e overflow', async () => {
  const docs = Array.from({ length: 101 }, (_, i) => doc(String(i), tx({ amount: 1 })))
  mockGetDocs.mockResolvedValueOnce(snapshot(docs)).mockRejectedValueOnce(new Error('offline'))
  await expect(TransactionService.getTotals('uid')).rejects.toThrow('offline')
  mockGetDocs.mockResolvedValueOnce(snapshot([doc('1', tx({ amount: Number.MAX_SAFE_INTEGER })), doc('2', tx({ amount: 1 }))]))
  await expect(TransactionService.getTotals('uid')).rejects.toThrow(RangeError)
  const controller = new AbortController()
  mockGetDocs.mockImplementationOnce(async () => { controller.abort(); return snapshot(docs) })
  await expect(TransactionService.getTotals('uid', {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
})

test('agregação e exportação percorrem os mesmos lotes e somam centavos exatos', async () => {
  const docs = Array.from({ length: 102 }, (_, i) => doc(String(i), tx({ amount: 101, installmentMonth: i === 101 ? '2026-02' : '2026-01' })))
  const filters = { dateBasis: 'competence' as const, startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28) }
  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(0, 101))).mockResolvedValueOnce(snapshot(docs.slice(100)))
  expect(await TransactionService.getTotals('uid', filters, { cards: [] })).toEqual({ income: 0, expense: 101, investment: 0, count: 1 })
  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(0, 101))).mockResolvedValueOnce(snapshot(docs.slice(100)))
  expect((await TransactionService.getAll('uid', filters, { cards: [] })).map((item) => item.id)).toEqual(['101'])
})
