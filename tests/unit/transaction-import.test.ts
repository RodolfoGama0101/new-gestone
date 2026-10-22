import { TransactionImportService } from '@/services/transaction-import.service'
import { CategoryService } from '@/services/category.service'
import { runTransaction } from 'firebase/firestore'

jest.mock('@/lib/firebase/config', () => ({ db: {} }))
jest.mock('@/services/category.service', () => ({
  CategoryService: { getAll: jest.fn() },
}))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  runTransaction: jest.fn(),
  serverTimestamp: () => 'timestamp',
  Timestamp: { fromDate: (date: Date) => date },
}))
const text =
  'Data;Descrição;Categoria;Tipo;Valor (BRL);Tags;Anotações\n01/10/2026;Compra CSV;Casa;Despesa;1,25;;\n02/10/2026;Outra compra;Casa;Despesa;2,00;;'

it('retoma após falha sem duplicar a primeira linha confirmada e isola por UID', async () => {
  jest
    .mocked(CategoryService.getAll)
    .mockResolvedValue([
      {
        id: 'home',
        name: 'Casa',
        type: 'expense',
        icon: 'Wallet',
        color: '#000',
        isDefault: false,
        createdAt: null,
        updatedAt: null,
      },
    ])
  const stored = new Map<string, unknown>()
  let calls = 0,
    fail = true
  jest.mocked(runTransaction).mockImplementation(async (_db, callback) => {
    if (++calls === 2 && fail) throw new Error('rede')
    return callback({
      get: async (ref: string) => ({ exists: () => stored.has(ref) }),
      set: (ref: string, data: unknown) => stored.set(ref, data),
    } as never)
  })
  const progress = jest.fn()
  await expect(
    TransactionImportService.import('alice', text, {}, progress),
  ).rejects.toThrow('rede')
  expect(stored.size).toBe(1)
  expect(progress).toHaveBeenLastCalledWith(1, 2)
  fail = false
  await expect(
    TransactionImportService.import('alice', text, {}, progress),
  ).resolves.toEqual({ imported: 1, skipped: 1 })
  await expect(
    TransactionImportService.import('alice', text, {}, progress),
  ).resolves.toEqual({ imported: 0, skipped: 2 })
  await expect(
    TransactionImportService.import('bob', text, {}, progress),
  ).resolves.toEqual({ imported: 2, skipped: 0 })
  expect(stored.size).toBe(4)
})

it('não inicia gravação quando qualquer linha é inválida', async () => {
  jest.mocked(runTransaction).mockClear()
  await expect(
    TransactionImportService.import(
      'alice',
      text.replace('2,00', '0,00'),
      {},
      jest.fn(),
    ),
  ).rejects.toThrow('Corrija')
  expect(runTransaction).not.toHaveBeenCalled()
})
