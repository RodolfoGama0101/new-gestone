import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Transaction } from '@/types/transaction'
import type { TransactionSeries } from '@/types/transaction-series'
import { transactionSchema } from '@/lib/validations/transaction.schema'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import {
  occurrenceDate,
  installmentAmount,
  installmentMonth,
} from '@/lib/utils/transaction-series'
import { endOfDay, startOfDay } from 'date-fns'
import { TransactionService } from './transaction.service'

const seriesRef = (uid: string, id: string) =>
  doc(db, 'users', uid, 'transactionSeries', id)
export const TransactionSeriesService = {
  async list(uid: string): Promise<TransactionSeries[]> {
    const result = await getDocs(
      collection(db, 'users', uid, 'transactionSeries'),
    )
    return result.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as TransactionSeries,
    )
  },
  async create(
    uid: string,
    id: string,
    input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    kind: TransactionSeries['kind'],
    count: number,
    endDate?: Date,
  ) {
    const parsed = transactionSchema.parse({
      ...input,
      date: parseFirestoreDate(input.date),
    })
    const amount = Number(parsed.amount)
    if (kind === 'installment') {
      installmentAmount(amount, count, 0)
      if (input.type !== 'expense' || !input.creditCardId)
        throw new Error('Parcelamento exige despesa em cartão ativo.')
    } else count = 1200
    if (endDate && endOfDay(endDate) < parsed.date)
      throw new Error('A data final deve ser posterior ou igual à inicial.')
    const closingDay = input.creditCardId
      ? await TransactionService.getCardClosingDay(uid, input.creditCardId)
      : null
    await runTransaction(db, async (transaction) => {
      const ref = seriesRef(uid, id)
      if ((await transaction.get(ref)).exists()) return
      transaction.set(ref, {
        ...parsed,
        amount,
        date: Timestamp.fromDate(startOfDay(parsed.date)),
        notes: parsed.notes || null,
        creditCardId: parsed.creditCardId || null,
        cardClosingDay: closingDay,
        recurring: kind === 'recurring',
        kind,
        count,
        nextIndex: 0,
        timezoneOffset: parsed.date.getTimezoneOffset(),
        endDate: endDate ? Timestamp.fromDate(endOfDay(endDate)) : null,
        cancelledFrom: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    await this.generate(uid, id)
  },
  async generate(uid: string, id: string, today = new Date()) {
    let generated = 0
    for (let step = 0; step < 120; step++) {
      const created = await runTransaction(db, async (transaction) => {
        const ref = seriesRef(uid, id)
        const snapshot = await transaction.get(ref)
        if (!snapshot.exists()) return false
        const series = snapshot.data() as TransactionSeries
        const index = series.nextIndex
        if (index >= series.count) return false
        const date = occurrenceDate(
          parseFirestoreDate(series.date),
          index,
          series.timezoneOffset,
        )
        if (
          (series.endDate && date > parseFirestoreDate(series.endDate)) ||
          (series.cancelledFrom &&
            date >= parseFirestoreDate(series.cancelledFrom)) ||
          (series.kind === 'recurring' && date > today)
        )
          return false
        const occurrence = doc(
          db,
          'users',
          uid,
          'transactions',
          `series-${id}-${index}`,
        )
        const existing = await transaction.get(occurrence)
        if (!existing.exists())
          transaction.set(occurrence, {
            type: series.type,
            amount:
              series.kind === 'installment'
                ? installmentAmount(series.amount, series.count, index)
                : series.amount,
            description: series.description,
            categoryId: series.categoryId,
            date: Timestamp.fromDate(date),
            tags: series.tags,
            notes: series.notes,
            recurring: series.kind === 'recurring',
            creditCardId: series.creditCardId || null,
            cardClosingDay: series.cardClosingDay ?? null,
            seriesId: id,
            occurrenceIndex: index,
            installmentTotal:
              series.kind === 'installment' ? series.count : null,
            installmentMonth:
              series.kind === 'installment'
                ? installmentMonth(
                    parseFirestoreDate(series.date),
                    index,
                    series.cardClosingDay!,
                    series.timezoneOffset,
                  )
                : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        transaction.update(ref, {
          nextIndex: index + 1,
          updatedAt: serverTimestamp(),
        })
        return true
      })
      if (!created) break
      generated++
    }
    return generated
  },
  async generateDue(uid: string) {
    let generated = 0
    let failed = 0
    for (const series of await this.list(uid)) {
      try {
        generated += await this.generate(uid, series.id)
      } catch {
        failed++
      }
    }
    if (failed)
      throw new Error(
        `${failed} séries pendentes. As demais foram processadas; repita para retomar as pendentes.`,
      )
    return generated
  },
  async editFuture(
    uid: string,
    id: string,
    amount: number,
    description: string,
  ) {
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      description.length < 3 ||
      description.length > 200
    )
      throw new Error('Informe valor e descrição válidos.')
    await runTransaction(db, async (transaction) => {
      const ref = seriesRef(uid, id)
      const snapshot = await transaction.get(ref)
      if (snapshot.data()?.kind !== 'recurring')
        throw new Error('Edite parcelas individualmente pelo extrato.')
      transaction.update(ref, {
        amount,
        description,
        updatedAt: serverTimestamp(),
      })
    })
  },
  async cancel(uid: string, id: string, from: Date) {
    const cutoff = startOfDay(from)
    if (cutoff < startOfDay(new Date()))
      throw new Error(
        'Escolha hoje ou uma data futura para preservar o histórico.',
      )
    const effectiveCutoff = await runTransaction(db, async (transaction) => {
      const ref = seriesRef(uid, id)
      const snapshot = await transaction.get(ref)
      const old = snapshot.data()?.cancelledFrom
      const effective =
        old && parseFirestoreDate(old) < cutoff
          ? parseFirestoreDate(old)
          : cutoff
      transaction.update(ref, {
        cancelledFrom: Timestamp.fromDate(effective),
        updatedAt: serverTimestamp(),
      })
      return effective
    })
    // O bloqueio da série já foi confirmado. A remoção pode ser repetida após falha.
    const rows = await getDocs(
      query(
        collection(db, 'users', uid, 'transactions'),
        where('seriesId', '==', id),
      ),
    )
    for (const row of rows.docs) {
      await runTransaction(db, async (transaction) => {
        const current = await transaction.get(row.ref)
        if (
          current.exists() &&
          parseFirestoreDate(current.data().date) >= effectiveCutoff
        )
          transaction.delete(row.ref)
      })
    }
  },
}
