import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { TransactionService } from './transaction.service'
import { CreditCardService } from './credit-card.service'
import { budgetProgress } from '@/lib/utils/budget'
import { parsePeriodDate } from '@/lib/utils/transaction-period'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'

export type BudgetLimit = { categoryId: string; name: string; amount: number }
function monthDate(month: string) {
  const date = parsePeriodDate(`${month}-01`)
  if (!date) throw new Error('Mês inválido.')
  return date
}
function amountIsValid(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error('Informe centavos positivos dentro do limite permitido.')
}
export const BudgetService = {
  async get(userId: string, month: string) {
    const date = monthDate(month)
    const root = doc(db, 'users', userId, 'budgets', month)
    const [goal, limits, transactions, cards] = await Promise.all([
      getDoc(root),
      getDocs(collection(root, 'limits')),
      TransactionService.getAll(userId, {
        startDate: subMonths(startOfMonth(date), 2),
        endDate: endOfMonth(date),
      }),
      CreditCardService.getAll(userId),
    ])
    return {
      goal: goal.data()?.amount as number | undefined,
      limits: limits.docs.map(
        (d) => ({ categoryId: d.id, ...d.data() }) as BudgetLimit,
      ),
      ...budgetProgress(transactions, date, cards),
    }
  },
  async saveGoal(userId: string, month: string, amount: number) {
    monthDate(month)
    amountIsValid(amount)
    await setDoc(doc(db, 'users', userId, 'budgets', month), {
      amount,
      updatedAt: serverTimestamp(),
    })
  },
  async saveLimit(userId: string, month: string, limit: BudgetLimit) {
    monthDate(month)
    amountIsValid(limit.amount)
    await setDoc(
      doc(db, 'users', userId, 'budgets', month, 'limits', limit.categoryId),
      { name: limit.name, amount: limit.amount, updatedAt: serverTimestamp() },
    )
  },
  async remove(userId: string, month: string, categoryId?: string) {
    monthDate(month)
    await deleteDoc(
      categoryId
        ? doc(db, 'users', userId, 'budgets', month, 'limits', categoryId)
        : doc(db, 'users', userId, 'budgets', month),
    )
  },
}
