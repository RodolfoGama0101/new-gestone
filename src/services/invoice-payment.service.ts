import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { format } from 'date-fns'

export interface InvoicePayment {
  amount: number
  paidAt: unknown
}
const reference = (uid: string, cardId: string, month: Date) =>
  doc(
    db,
    'users',
    uid,
    'creditCards',
    cardId,
    'payments',
    format(month, 'yyyy-MM'),
  )
export const InvoicePaymentService = {
  async get(
    uid: string,
    cardId: string,
    month: Date,
  ): Promise<InvoicePayment | null> {
    const snapshot = await getDoc(reference(uid, cardId, month))
    return snapshot.exists() ? (snapshot.data() as InvoicePayment) : null
  },
  async pay(uid: string, cardId: string, month: Date, amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error('Total da fatura inválido.')
    await runTransaction(db, async (transaction) => {
      const ref = reference(uid, cardId, month)
      const existing = await transaction.get(ref)
      if (existing.exists()) {
        if (existing.data().amount !== amount)
          throw new Error(
            'Fatura alterada após quitação. Estorne o registro anterior antes de registrar o novo total.',
          )
        return
      }
      transaction.set(ref, { amount, paidAt: serverTimestamp() })
    })
  },
  async reverse(uid: string, cardId: string, month: Date) {
    await runTransaction(db, async (transaction) => {
      const ref = reference(uid, cardId, month)
      if ((await transaction.get(ref)).exists()) transaction.delete(ref)
    })
  },
}
