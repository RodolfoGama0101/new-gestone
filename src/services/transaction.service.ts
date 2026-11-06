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
import { startOfMonth, endOfMonth } from 'date-fns'
import { CreditCardService } from './credit-card.service'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { matchesTransactionFilters } from '@/lib/utils/transaction-query'
export { matchesTransactionFilters } from '@/lib/utils/transaction-query'

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
  dateBasis?: 'purchase' | 'competence'
  minAmount?: number
  maxAmount?: number
  modality?: 'all' | 'single' | 'recurring' | 'installment'
  lastVisible?: QueryDocumentSnapshot<DocumentData>
}

type TransactionQueryOptions = { signal?: AbortSignal; cards?: CreditCard[] }

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError')
}

function checkedAdd(sum: number, amount: number) {
  const result = sum + amount
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(result)) throw new RangeError('Total em centavos excede o limite seguro.')
  return result
}

export const TransactionService = {
  getCollection(userId: string) {
    return collection(db, 'users', userId, 'transactions')
  },

  toTransaction(docSnap: QueryDocumentSnapshot<DocumentData>): Transaction {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      seriesId: data.seriesId ?? null,
      occurrenceIndex: data.occurrenceIndex ?? null,
      installmentTotal: data.installmentTotal ?? null,
      installmentMonth: data.installmentMonth ?? null,
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
    if (filters.dateBasis !== 'competence') {
      if (filters.startDate) constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)))
      if (filters.endDate) constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)))
    }

    constraints.push(orderBy('date', 'desc'))
    // O snapshot inclui o ID usado pelo Firestore para desempatar datas iguais.
    // Usar apenas a data no cursor omitiria compras com o mesmo timestamp.
    if (filters.lastVisible) constraints.push(startAfter(filters.lastVisible))

    return constraints
  },

  async getPaged(
    userId: string,
    filters: GetTransactionsFilters = {},
    options: TransactionQueryOptions = {},
  ): Promise<{
    transactions: Transaction[]
    lastVisible: QueryDocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    throwIfAborted(options.signal)
    const cards = filters.dateBasis === 'competence'
      ? options.cards ?? await CreditCardService.getAll(userId)
      : []
    throwIfAborted(options.signal)
    const constraints = this.getQueryConstraints(filters)

    const limitVal = filters.limitCount || 20
    const needsScan = Boolean(normalizeTransactionSearch(filters.search ?? '') || filters.dateBasis === 'competence' || filters.minAmount != null || filters.maxAmount != null || (filters.modality && filters.modality !== 'all'))
    const scanLimit = needsScan ? TRANSACTION_SEARCH_BATCH_SIZE : Math.min(limitVal, TRANSACTION_SEARCH_BATCH_SIZE)
    constraints.push(limit(scanLimit + 1))

    const q = query(this.getCollection(userId), ...constraints)
    const snapshot = await getDocs(q)
    throwIfAborted(options.signal)
    const candidates = snapshot.docs.slice(0, scanLimit)
    const transactions: Transaction[] = []
    let scanned = 0
    for (const candidate of candidates) {
      scanned++
      const transaction = this.toTransaction(candidate)
      if (matchesTransactionFilters(transaction, filters, cards)) transactions.push(transaction)
      if (transactions.length === limitVal) break
    }
    const lastVisible = candidates[scanned - 1] ?? null

    return {
      transactions,
      lastVisible,
      hasMore: snapshot.docs.length > scanned,
    }
  },

  async getAll(userId: string, filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {}, options: TransactionQueryOptions = {}) {
    throwIfAborted(options.signal)
    const cards = filters.dateBasis === 'competence'
      ? options.cards ?? await CreditCardService.getAll(userId)
      : []
    const transactions: Transaction[] = []
    let cursor: QueryDocumentSnapshot<DocumentData> | undefined
    do {
      throwIfAborted(options.signal)
      const page = await this.getPaged(userId, { ...filters, limitCount: TRANSACTION_SEARCH_BATCH_SIZE, lastVisible: cursor }, { ...options, cards })
      transactions.push(...page.transactions)
      if (!page.hasMore) break
      if (!page.lastVisible) throw new Error('Não foi possível continuar a consulta de lançamentos.')
      cursor = page.lastVisible
    } while (true)
    throwIfAborted(options.signal)
    return transactions
  },

  async getTotals(userId: string, filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {}, options: TransactionQueryOptions = {}) {
    throwIfAborted(options.signal)
    const cards = filters.dateBasis === 'competence'
      ? options.cards ?? await CreditCardService.getAll(userId)
      : []
    const totals = { income: 0, expense: 0, investment: 0, count: 0 }
    let cursor: QueryDocumentSnapshot<DocumentData> | undefined
    do {
      throwIfAborted(options.signal)
      const page = await this.getPaged(userId, { ...filters, limitCount: TRANSACTION_SEARCH_BATCH_SIZE, lastVisible: cursor }, { ...options, cards })
      for (const transaction of page.transactions) {
        totals[transaction.type] = checkedAdd(totals[transaction.type], transaction.amount)
        totals.count = checkedAdd(totals.count, 1)
      }
      if (!page.hasMore) break
      if (!page.lastVisible) throw new Error('Não foi possível continuar a consulta de lançamentos.')
      cursor = page.lastVisible
    } while (true)
    throwIfAborted(options.signal)
    return totals
  },

  async getInvoice(userId: string, card: CreditCard, month: Date, signal?: AbortSignal) {
    return this.getAll(userId, { type: 'expense', creditCardId: card.id, dateBasis: 'competence', startDate: startOfMonth(month), endDate: endOfMonth(month) }, { cards: [card], ...(signal ? { signal } : {}) })
  },

  async getCardClosingDay(userId: string, cardId: string, preserveExistingLink = false): Promise<number> {
    const snapshot = await getDoc(doc(db, 'users', userId, 'creditCards', cardId))
    const card = snapshot.data()
    if (!card || (!preserveExistingLink && (card.archived || card.isActive !== true)))
      throw new Error('Este cartão não está disponível para novas compras.')
    return card.closingDay
  },

  async create(userId: string, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const colRef = this.getCollection(userId)
    
    // Se data.date for uma data JavaScript, converte para Timestamp
    const txDate = data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date

    const docRef = await addDoc(colRef, {
      ...data,
      cardClosingDay: data.type === 'expense' && data.creditCardId
        ? await this.getCardClosingDay(userId, data.creditCardId)
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
        : await this.getCardClosingDay(userId, nextCardId, existing?.type === 'expense' && nextCardId === existing?.creditCardId))
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
