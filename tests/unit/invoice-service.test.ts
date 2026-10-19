jest.mock('@/lib/firebase/config', () => ({ db: {} }))
import { TransactionService } from '@/services/transaction.service'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
test('consulta ciclo delimitado e inclui todas as 150 compras, filtrando outras competências', async () => {
  const purchases = Array.from({ length: 150 }, (_, i) => ({ id: String(i), type: 'expense', amount: 100, date: new Date(2026, 8, 5), cardClosingDay: 20, creditCardId: 'card' } as Transaction))
  const spy = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([...purchases, { ...purchases[0], id: 'next', date: new Date(2026, 8, 25) }])
  try {
    const result = await TransactionService.getInvoice('user', { id: 'card', closingDay: 20 } as CreditCard, new Date(2026, 8, 1))
    expect(result).toHaveLength(150)
    expect(result.reduce((sum, tx) => sum + tx.amount, 0)).toBe(15000)
    expect(spy).toHaveBeenCalledWith('user', { creditCardId: 'card', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 30, 23, 59, 59, 999) })
  } finally { spy.mockRestore() }
})
