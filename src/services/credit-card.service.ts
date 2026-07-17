import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { CreditCard } from '@/types/credit-card'

export const CreditCardService = {
  getCollection(userId: string) {
    return collection(db, 'users', userId, 'creditCards')
  },

  async getAll(userId: string): Promise<CreditCard[]> {
    const colRef = this.getCollection(userId)
    const snapshot = await getDocs(colRef)
    const cards: CreditCard[] = []

    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      cards.push({
        id: docSnap.id,
        name: data.name,
        bankName: data.bankName,
        brand: data.brand,
        holderName: data.holderName,
        closingDay: data.closingDay,
        color: data.color,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    })

    return cards
  },

  async create(userId: string, data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const colRef = this.getCollection(userId)
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(
    userId: string,
    cardId: string,
    data: Partial<Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'creditCards', cardId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  },

  async delete(userId: string, cardId: string): Promise<void> {
    // Verifica se existem transações vinculadas
    const txColRef = collection(db, 'users', userId, 'transactions')
    const q = query(txColRef, where('creditCardId', '==', cardId), limit(1))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      throw new Error('Não é possível excluir um cartão que possui despesas vinculadas.')
    }

    const docRef = doc(db, 'users', userId, 'creditCards', cardId)
    await deleteDoc(docRef)
  },
}
