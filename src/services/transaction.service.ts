import {
  collection,
  doc,
  getDocs,
  getDoc,
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
import type { CreditCard } from '@/types/credit-card'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { matchesTransactionSearch, normalizeTransactionSearch } from '@/lib/utils/transaction-search'

// Uma busca lê no máximo 100 candidatos e um documento de lookahead por página.
// O cursor permite continuar mesmo se esse lote não contiver correspondências.
export const TRANSACTION_SEARCH_BATCH_SIZE = 100

export interface GetTransactionsFilters {
  type?: 'income' | 'expense' | 'investment'
  categoryId?: string
  creditCardId?: string
  limitCount?: number
  startDate?: Date
  endDate?: Date
  search?: string
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
      cardClosingDay: data.cardClosingDay ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  },

  getQueryConstraints(filters: GetTransactionsFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = []

    if (filters.type) constraints.push(where('type', '==', filters.type))
    if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId))
    if (filters.creditCardId) constraints.push(where('creditCardId', '==', filters.creditCardId))
    if (filters.startDate) constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)))
    if (filters.endDate) constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)))

    constraints.push(orderBy('date', 'desc'))
    // O snapshot inclui o ID usado pelo Firestore para desempatar datas iguais.
    // Usar apenas a data no cursor omitiria compras com o mesmo timestamp.
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
    const search = normalizeTransactionSearch(filters.search ?? '')
    const scanLimit = search ? TRANSACTION_SEARCH_BATCH_SIZE : limitVal
    constraints.push(limit(scanLimit + 1))

    const q = query(colRef, ...constraints)
    const snapshot = await getDocs(q)
    const candidates = snapshot.docs.slice(0, scanLimit)
    const pageDocs: QueryDocumentSnapshot<DocumentData>[] = []
    let scanned = 0
    for (const candidate of candidates) {
      scanned++
      if (!search || matchesTransactionSearch(candidate.data().description, search)) {
        pageDocs.push(candidate)
      }
      if (pageDocs.length === limitVal) break
    }
    const lastVisible = candidates[scanned - 1] ?? null

    return {
      transactions: pageDocs.map((docSnap) => this.toTransaction(docSnap)),
      lastVisible,
      hasMore: snapshot.docs.length > scanned,
    }
  },

  async getAll(userId: string, filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {}) {
    const q = query(this.getCollection(userId), ...this.getQueryConstraints(filters))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((docSnap) => this.toTransaction(docSnap))
      .filter((transaction) => matchesTransactionSearch(transaction.description, filters.search ?? ''))
  },

  async getInvoice(userId: string, card: CreditCard, month: Date) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const purchases = await this.getAll(userId, { creditCardId: card.id, startDate: subMonths(start, 1), endDate: end })
    return filterTransactionPeriod(purchases.filter((tx) => tx.type === 'expense'), start, end, [card])
  },

  async create(userId: string, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const colRef = this.getCollection(userId)
    
    // Se data.date for uma data JavaScript, converte para Timestamp
    const txDate = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date

    const docRef = await addDoc(colRef, {
      ...data,
      cardClosingDay: data.type === 'expense' && data.creditCardId
        ? (await getDoc(doc(db, 'users', userId, 'creditCards', data.creditCardId))).data()?.closingDay ?? 10
        : null,
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
    const existing = (await getDoc(docRef)).data()
    const nextCardId = data.creditCardId === undefined ? existing?.creditCardId : data.creditCardId
    const nextType = data.type ?? existing?.type
    updateData.cardClosingDay = nextType === 'expense' && nextCardId
      ? (nextCardId === existing?.creditCardId && existing?.cardClosingDay != null
        ? existing.cardClosingDay
        : (await getDoc(doc(db, 'users', userId, 'creditCards', nextCardId))).data()?.closingDay ?? 10)
      : null
    
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
