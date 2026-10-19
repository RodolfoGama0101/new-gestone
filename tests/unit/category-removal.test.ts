jest.mock('@/lib/firebase/admin', () => ({ adminDb: { doc: jest.fn(), collection: jest.fn(), runTransaction: jest.fn() } }))
import { adminDb } from '@/lib/firebase/admin'
import { removeCategory } from '@/services/category-removal.service'
test.each([true, false])('categoria com vínculos = %s preserva histórico ou exclui vazia', async (hasLinks) => {
  const reference = { path: 'users/user/categories/category' }
  const query = { limit: jest.fn().mockReturnValue('query') }
  jest.mocked(adminDb.doc).mockReturnValue(reference as never)
  jest.mocked(adminDb.collection).mockReturnValue({ where: () => query } as never)
  const transaction = { get: jest.fn().mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ empty: !hasLinks }), update: jest.fn(), delete: jest.fn() }
  jest.mocked(adminDb.runTransaction).mockImplementation(async (operation) => operation(transaction as never))
  expect(await removeCategory('user', 'category')).toBe(hasLinks ? 'archived' : 'deleted')
  expect(adminDb.doc).toHaveBeenCalledWith('users/user/categories/category')
  expect(hasLinks ? transaction.update : transaction.delete).toHaveBeenCalledWith(reference, ...(hasLinks ? [{ archived: true, updatedAt: expect.any(Date) }] : []))
})
