import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Transaction } from '@/types/transaction'

export interface GetTransactionsFilters {
  type?: 'income' | 'expense' | 'investment'
  categoryId?: string
  creditCardId?: string
  limitCount?: number
  lastVisible?: QueryDocumentSnapshot<DocumentData>
}

export const TransactionService = {
  getCollection(userId: string) {
    return collection(db, 'users', userId, 'transactions')
  },

  toTransaction(docSnap: QueryDocumentSnapshot<DocumentData>): Transaction {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      date: data.date,
      tags: data.tags ?? [],
      notes: data.notes ?? null,
      recurring: data.recurring ?? false,
      creditCardId: data.creditCardId ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  },

  getQueryConstraints(filters: GetTransactionsFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = []

    if (filters.type) constraints.push(where('type', '==', filters.type))
    if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId))
    if (filters.creditCardId) constraints.push(where('creditCardId', '==', filters.creditCardId))

    constraints.push(orderBy('date', 'desc'))
    if (filters.lastVisible) constraints.push(startAfter(filters.lastVisible))

    return constraints
  },

  async getPaged(
    userId: string,
    filters: GetTransactionsFilters = {}
  ): Promise<{
    transactions: Transaction[]
    lastVisible: QueryDocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    const colRef = this.getCollection(userId)
    const constraints = this.getQueryConstraints(filters)

    const limitVal = filters.limitCount || 20
    constraints.push(limit(limitVal + 1))

    const q = query(colRef, ...constraints)
    const snapshot = await getDocs(q)
    const pageDocs = snapshot.docs.slice(0, limitVal)
    const lastVisible = pageDocs[pageDocs.length - 1] || null

    return {
      transactions: pageDocs.map((docSnap) => this.toTransaction(docSnap)),
      lastVisible,
      hasMore: snapshot.docs.length > limitVal,
    }
  },

  async getAll(userId: string, filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {}) {
    const q = query(this.getCollection(userId), ...this.getQueryConstraints(filters))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => this.toTransaction(docSnap))
  },

  async create(userId: string, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const colRef = this.getCollection(userId)
    
    // Se data.date for uma data JavaScript, converte para Timestamp
    const txDate = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date

    const docRef = await addDoc(colRef, {
      ...data,
      date: txDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(
    userId: string,
    transactionId: string,
    data: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'transactions', transactionId)
    
    // Constrói objeto de atualização tipado como Record<string, unknown>
    const updateData: Record<string, unknown> = { 
      ...data, 
      updatedAt: serverTimestamp() 
    }
    
    if (data.date instanceof Date) {
      updateData.date = Timestamp.fromDate(data.date)
    }

    await updateDoc(docRef, updateData)
  },

  async delete(userId: string, transactionId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, 'transactions', transactionId)
    await deleteDoc(docRef)
  },
}
