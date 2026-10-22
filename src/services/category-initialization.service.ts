import { adminDb } from '@/lib/firebase/admin'
import { defaultCategories } from '@/lib/default-categories'

export async function initializeCategories(userId: string): Promise<void> {
  const collection = adminDb.collection(`users/${userId}/categories`)
  // Subcoleção exclusiva do servidor, negada pelas regras dos clientes.
  const marker = adminDb.doc(`users/${userId}/internal/category-initialization-v1`)
  await adminDb.runTransaction(async (transaction) => {
    const version = await transaction.get(marker)
    if (version.exists) return
    const existing = await transaction.get(collection)
    const legacy = existing.docs.find((item) => item.data().name === 'Investimentos' &&
      item.data().type === 'income' && item.data().isDefault === true)
    const hasInvestments = existing.docs.some((item) => item.data().type === 'investment')
    const additions = existing.empty ? defaultCategories : hasInvestments ? [] :
      defaultCategories.filter((category) => category.type === 'investment' &&
        !(legacy && category.name === 'Outros Investimentos'))
    const now = new Date()
    if (legacy && !hasInvestments) {
      transaction.update(legacy.ref, {
        name: 'Outros Investimentos', type: 'investment', icon: 'Wallet', color: '#7c3aed', updatedAt: now,
      })
    }
    for (const category of additions) {
      const id = `default-v1-${defaultCategories.indexOf(category)}`
      if (existing.docs.some((item) => item.id === id)) continue
      transaction.create(collection.doc(id), { ...category, createdAt: now, updatedAt: now })
    }
    transaction.create(marker, { completedAt: now })
  })
}
