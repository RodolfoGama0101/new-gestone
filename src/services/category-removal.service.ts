import { adminDb } from '@/lib/firebase/admin'

export async function removeCategory(userId: string, categoryId: string): Promise<'archived' | 'deleted'> {
  const category = adminDb.doc(`users/${userId}/categories/${categoryId}`)
  // Primeiro fecha a entrada de novos vínculos. Uma falha posterior deixa um arquivo seguro,
  // nunca uma categoria removida com lançamentos órfãos.
  await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(category)
    if (!existing.exists) throw new Error('category/not-found')
    transaction.update(category, { archived: true, updatedAt: new Date() })
  })
  return adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(category)
    if (!existing.exists) throw new Error('category/not-found')
    const linked = await transaction.get(adminDb.collection(`users/${userId}/transactions`).where('categoryId', '==', categoryId).limit(1))
    if (!linked.empty) {
      return 'archived'
    }
    transaction.delete(category)
    return 'deleted'
  })
}
