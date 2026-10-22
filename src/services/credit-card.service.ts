import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
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
        dueDay: data.dueDay ?? null,
        color: data.color,
        isActive: data.isActive ?? true,
        archived: data.archived ?? false,
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

  async archive(userId: string, cardId: string): Promise<void> {
    // Uma única gravação fecha novos vínculos sem remover a referência histórica.
    const docRef = doc(db, 'users', userId, 'creditCards', cardId)
    await updateDoc(docRef, { archived: true, isActive: false, updatedAt: serverTimestamp() })
  },
}
