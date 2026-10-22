jest.mock('@/lib/firebase/admin', () => ({ adminDb: { doc: jest.fn(), collection: jest.fn(), runTransaction: jest.fn() } }))
import { adminDb } from '@/lib/firebase/admin'
import { initializeCategories } from '@/services/category-initialization.service'
import { defaultCategories } from '@/lib/default-categories'

beforeEach(() => jest.clearAllMocks())

function setup(docs: { id: string; ref: string; data: () => Record<string, unknown> }[] = [], initialized = false) {
  const collection = { doc: (id: string) => id }
  jest.mocked(adminDb.doc).mockReturnValue('marker' as never)
  jest.mocked(adminDb.collection).mockReturnValue(collection as never)
  const transaction = {
    get: jest.fn().mockResolvedValueOnce({ exists: initialized }).mockResolvedValueOnce({ docs, empty: docs.length === 0 }),
    update: jest.fn(), create: jest.fn(),
  }
  jest.mocked(adminDb.runTransaction).mockImplementation(async (operation) => operation(transaction as never))
  return transaction
}

test('inicializa catálogo com IDs estáveis e marcador na mesma transação', async () => {
  const transaction = setup()
  await initializeCategories('owner')
  expect(transaction.create).toHaveBeenCalledTimes(defaultCategories.length + 1)
  expect(transaction.create).toHaveBeenCalledWith('default-v1-0', expect.objectContaining({ name: 'Salário' }))
  expect(adminDb.doc).toHaveBeenCalledWith('users/owner/internal/category-initialization-v1')
})

test('repetição não consulta categorias nem regrava timestamps ou categorias removidas', async () => {
  const transaction = setup([], true)
  await initializeCategories('owner')
  expect(transaction.get).toHaveBeenCalledTimes(1)
  expect(transaction.create).not.toHaveBeenCalled()
})

test('migração preserva ID legado e categorias personalizadas', async () => {
  const transaction = setup([
    { id: 'legacy', ref: 'legacy-ref', data: () => ({ name: 'Investimentos', type: 'income', isDefault: true }) },
    { id: 'custom', ref: 'custom-ref', data: () => ({ name: 'Minha categoria', type: 'expense' }) },
  ])
  await initializeCategories('owner')
  expect(transaction.update).toHaveBeenCalledTimes(1)
  expect(transaction.update).toHaveBeenCalledWith('legacy-ref', expect.objectContaining({ type: 'investment' }))
  expect(transaction.create).toHaveBeenCalledTimes(5)
})

test('categoria personalizada chamada Investimentos não é reescrita', async () => {
  const transaction = setup([{ id: 'custom', ref: 'custom', data: () => ({ name: 'Investimentos', type: 'income', isDefault: false }) }])
  await initializeCategories('owner')
  expect(transaction.update).not.toHaveBeenCalled()
})

test('falha da transação é propagada para permitir retry', async () => {
  setup()
  jest.mocked(adminDb.runTransaction).mockRejectedValueOnce(new Error('unavailable'))
  await expect(initializeCategories('owner')).rejects.toThrow('unavailable')
})
