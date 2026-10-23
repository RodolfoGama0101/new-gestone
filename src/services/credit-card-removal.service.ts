import { adminDb } from '@/lib/firebase/admin'

export class CreditCardRemovalError extends Error {
  constructor(public readonly code: 'card/not-found' | 'card/has-links') {
    super(code)
  }
}

export async function removeCreditCard(
  userId: string,
  cardId: string,
): Promise<void> {
  const userPath = `users/${userId}`
  const card = adminDb.doc(`${userPath}/creditCards/${cardId}`)

  // Leituras e exclusão compartilham a mesma transação; não há janela entre
  // a verificação dos vínculos e a remoção do cadastro.
  await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(card)
    if (!existing.exists) throw new CreditCardRemovalError('card/not-found')
    const references = await Promise.all([
      transaction.get(
        adminDb
          .collection(`${userPath}/transactions`)
          .where('creditCardId', '==', cardId)
          .limit(1),
      ),
      transaction.get(
        adminDb
          .collection(`${userPath}/transactionSeries`)
          .where('creditCardId', '==', cardId)
          .limit(1),
      ),
      transaction.get(card.collection('payments').limit(1)),
    ])
    if (references.some((snapshot) => !snapshot.empty)) {
      throw new CreditCardRemovalError('card/has-links')
    }
    transaction.delete(card)
  })
}
