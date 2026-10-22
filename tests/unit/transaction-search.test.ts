jest.mock('@/lib/firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(() => ({})),
  query: jest.fn((...args) => args),
  getDocs: jest.fn(),
  limit: jest.fn((count) => ({ count })),
  orderBy: jest.fn(),
  startAfter: jest.fn(),
  where: jest.fn(),
}))

import { getDocs, limit, startAfter, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore'
import { TransactionService } from '@/services/transaction.service'

const mockGetDocs = jest.mocked(getDocs)
function documents(count: number, description: (index: number) => string) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    data: () => ({ description: description(index + 1), type: 'expense', amount: 100 }),
  } as unknown as QueryDocumentSnapshot<DocumentData>))
}
function snapshot(docs: ReturnType<typeof documents>) {
  return { docs } as Awaited<ReturnType<typeof getDocs>>
}
beforeEach(() => jest.clearAllMocks())

test('encontra o item 21 entre 25, com a mesma normalização do CSV', async () => {
  const docs = documents(25, (n) => n === 21 ? 'Compra exclusiva ÁRVORE' : `Compra ${n}`)
  mockGetDocs.mockResolvedValue(snapshot(docs))
  const page = await TransactionService.getPaged('user', { search: '  EXCLUSIVA árvore  ', limitCount: 10 })
  const exported = await TransactionService.getAll('user', { search: '  EXCLUSIVA árvore  ' })
  expect(page.transactions.map((tx) => tx.id)).toEqual(['21'])
  expect(exported).toEqual(page.transactions)
  expect(page.hasMore).toBe(false)
  expect(limit).toHaveBeenCalledWith(101)
})

test('um lote sem correspondências conserva cursor e continuação, sem varrer toda a coleção', async () => {
  const docs = documents(130, (n) => n === 121 ? 'Alvo distante' : `Compra ${n}`)
  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(0, 101)))
  const first = await TransactionService.getPaged('user', { search: 'alvo', limitCount: 10 })
  expect(mockGetDocs).toHaveBeenCalledTimes(1)
  expect(first.transactions).toEqual([])
  expect(first.lastVisible?.id).toBe('100')
  expect(first.hasMore).toBe(true)

  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(100)))
  const next = await TransactionService.getPaged('user', { search: 'alvo', limitCount: 10, lastVisible: first.lastVisible! })
  expect(startAfter).toHaveBeenLastCalledWith(docs[99])
  expect(next.transactions.map((tx) => tx.id)).toEqual(['121'])
  expect(next.hasMore).toBe(false)
})

test('o cursor para na décima correspondência, sem descartar outros resultados já lidos', async () => {
  const docs = documents(25, (n) => n % 2 === 0 ? `Alvo ${n}` : `Compra ${n}`)
  mockGetDocs.mockResolvedValueOnce(snapshot(docs))
  const first = await TransactionService.getPaged('user', { search: 'alvo', limitCount: 10 })
  expect(first.transactions).toHaveLength(10)
  expect(first.lastVisible?.id).toBe('20')
  expect(first.hasMore).toBe(true)
  mockGetDocs.mockResolvedValueOnce(snapshot(docs.slice(20)))
  const next = await TransactionService.getPaged('user', { search: 'alvo', limitCount: 10, lastVisible: first.lastVisible! })
  expect(next.transactions.map((tx) => tx.id)).toEqual(['22', '24'])
  expect(next.hasMore).toBe(false)
})

test('fim sem correspondências é distinguido de um lote que ainda tem continuação', async () => {
  mockGetDocs.mockResolvedValue(snapshot(documents(25, (n) => `Compra ${n}`)))
  const result = await TransactionService.getPaged('user', { search: 'inexistente' })
  expect(result.transactions).toEqual([])
  expect(result.hasMore).toBe(false)
})

test('busca em branco preserva a leitura paginada comum com lookahead', async () => {
  mockGetDocs.mockResolvedValue(snapshot(documents(4, (n) => `Compra ${n}`)))
  const result = await TransactionService.getPaged('user', { search: '   ', limitCount: 3 })
  expect(limit).toHaveBeenCalledWith(4)
  expect(result.transactions).toHaveLength(3)
  expect(result.lastVisible?.id).toBe('3')
  expect(result.hasMore).toBe(true)
})

test('falha da consulta é propagada, sem resposta vazia de sucesso', async () => {
  mockGetDocs.mockRejectedValue(new Error('unavailable'))
  await expect(TransactionService.getPaged('user', { search: 'alvo' })).rejects.toThrow('unavailable')
})
