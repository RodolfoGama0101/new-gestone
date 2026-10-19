import { Timestamp } from 'firebase/firestore'
import { AnalyticsService } from '@/services/analytics.service'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'

function transaction(
  type: Transaction['type'],
  amount: number,
  date: Date,
  creditCardId: string | null = null,
): Transaction {
  return {
    id: 'transaction',
    type,
    amount,
    date,
    creditCardId,
    description: 'Teste',
    categoryId: 'category',
    tags: [],
    notes: null,
    recurring: false,
    createdAt: date,
    updatedAt: date,
  }
}

const card = (closingDay = 20): CreditCard => ({
  id: 'card',
  name: 'Cartão',
  bankName: 'Banco',
  brand: 'visa',
  holderName: 'Titular',
  closingDay,
  color: '#2563eb',
  isActive: true,
  createdAt: null,
  updatedAt: null,
})
const july = new Date(2026, 6, 1)
const julyIncome = transaction('income', 100000, july)

describe('saldo mensal e reservas sem dupla dedução', () => {
  test('R$ 1.000 de receita e compra de R$ 100 antes do fechamento deixam R$ 900 disponíveis', () => {
    const summary = AnalyticsService.calculateSummary(
      [julyIncome, transaction('expense', 10000, new Date(2026, 6, 5), 'card')],
      july,
      [card()],
      new Date(2026, 6, 10),
    )

    expect(summary).toMatchObject({
      income: 100000,
      expense: 10000,
      balance: 90000,
      futureCardExpenses: 0,
      availableBalance: 90000,
      expenseCount: 1,
    })
  })

  test.each([19, 20, 21])(
    'dia de compra %i em relação ao fechamento no dia 20',
    (purchaseDay) => {
      const summary = AnalyticsService.calculateSummary(
        [
          julyIncome,
          transaction('expense', 10000, new Date(2026, 6, purchaseDay), 'card'),
        ],
        july,
        [card()],
        new Date(2026, 6, 22),
      )
      expect(summary.expense).toBe(purchaseDay <= 20 ? 10000 : 0)
      expect(summary.futureCardExpenses).toBe(purchaseDay <= 20 ? 0 : 10000)
      expect(summary.availableBalance).toBe(90000)
    },
  )

  test('a mesma compra sai da reserva e entra na despesa ao selecionar o mês da fatura', () => {
    const purchase = transaction(
      'expense',
      10000,
      new Date(2026, 6, 21),
      'card',
    )
    const transactions = [
      julyIncome,
      transaction('income', 100000, new Date(2026, 7, 1)),
      purchase,
    ]
    const julySummary = AnalyticsService.calculateSummary(
      transactions,
      july,
      [card()],
      new Date(2026, 6, 22),
    )
    const augustSummary = AnalyticsService.calculateSummary(
      transactions,
      new Date(2026, 7, 1),
      [card()],
      new Date(2026, 6, 22),
    )
    expect(julySummary).toMatchObject({
      expense: 0,
      futureCardExpenses: 10000,
      availableBalance: 90000,
    })
    expect(augustSummary).toMatchObject({
      expense: 10000,
      futureCardExpenses: 0,
      availableBalance: 90000,
    })
  })

  test('dias de referência antes, no dia e após fechamento não descontam novamente a fatura do próprio mês', () => {
    const transactions = [
      julyIncome,
      transaction('expense', 10000, new Date(2026, 6, 5), 'card'),
    ]
    for (const day of [10, 20, 21]) {
      expect(
        AnalyticsService.calculateSummary(
          transactions,
          july,
          [card()],
          new Date(2026, 6, day),
        ),
      ).toMatchObject({
        expense: 10000,
        futureCardExpenses: 0,
        availableBalance: 90000,
      })
    }
  })

  test('mês passado usa o fim daquele mês, sem incorporar compras realizadas depois', () => {
    const transactions = [
      julyIncome,
      transaction('expense', 10000, new Date(2026, 6, 25), 'card'),
      transaction('expense', 30000, new Date(2026, 7, 25), 'card'),
    ]
    const summary = AnalyticsService.calculateSummary(
      transactions,
      july,
      [card()],
      new Date(2026, 8, 15),
    )
    expect(summary).toMatchObject({
      expense: 0,
      futureCardExpenses: 10000,
      availableBalance: 90000,
    })
    expect(summary.reservationReferenceDate).toEqual(
      new Date(2026, 6, 31, 23, 59, 59, 999),
    )
    const later = AnalyticsService.calculateSummary(
      transactions,
      july,
      [card()],
      new Date(2026, 11, 15),
    )
    expect(later).toEqual(summary)
  })

  test('mês futuro projeta os lançamentos do mês sem reservar compras ainda não realizadas', () => {
    const august = new Date(2026, 7, 1)
    const summary = AnalyticsService.calculateSummary(
      [
        transaction('income', 100000, august),
        transaction('expense', 10000, new Date(2026, 6, 25), 'card'),
        transaction('expense', 20000, new Date(2026, 7, 25), 'card'),
      ],
      august,
      [card()],
      new Date(2026, 6, 26),
    )
    expect(summary).toMatchObject({
      expense: 10000,
      balance: 90000,
      futureCardExpenses: 0,
      availableBalance: 90000,
    })
    expect(summary.reservationReferenceDate).toEqual(
      new Date(2026, 6, 26, 23, 59, 59, 999),
    )
  })

  test('a reserva só entra a partir da data da compra, incluindo horários desse dia', () => {
    const transactions = [
      julyIncome,
      transaction('expense', 10000, new Date(2026, 6, 25, 18), 'card'),
    ]
    expect(
      AnalyticsService.calculateSummary(
        transactions,
        july,
        [card()],
        new Date(2026, 6, 24),
      ),
    ).toMatchObject({ futureCardExpenses: 0, availableBalance: 100000 })
    expect(
      AnalyticsService.calculateSummary(
        transactions,
        july,
        [card()],
        new Date(2026, 6, 25),
      ),
    ).toMatchObject({ futureCardExpenses: 10000, availableBalance: 90000 })
  })

  test('sem cartão, despesas e investimentos entram somente no saldo do respectivo mês', () => {
    const summary = AnalyticsService.calculateSummary(
      [
        julyIncome,
        transaction('expense', 10000, new Date(2026, 6, 5)),
        transaction('investment', 20000, new Date(2026, 6, 6)),
        transaction('expense', 50000, new Date(2026, 7, 1)),
      ],
      july,
      [],
      new Date(2026, 6, 10),
    )
    expect(summary).toMatchObject({
      expense: 10000,
      investment: 20000,
      balance: 70000,
      futureCardExpenses: 0,
      availableBalance: 70000,
    })
  })

  test('compras de cartões distintos permanecem em conjuntos separados', () => {
    const cards = [card(10), { ...card(25), id: 'other-card' }]
    const summary = AnalyticsService.calculateSummary(
      [
        julyIncome,
        transaction('expense', 10000, new Date(2026, 6, 15), 'card'),
        transaction('expense', 20000, new Date(2026, 6, 15), 'other-card'),
      ],
      july,
      cards,
      new Date(2026, 6, 16),
    )
    expect(summary).toMatchObject({
      expense: 20000,
      futureCardExpenses: 10000,
      balance: 80000,
      availableBalance: 70000,
    })
  })

  test('não zera saldo disponível negativo quando reservas excedem o saldo do mês', () => {
    const summary = AnalyticsService.calculateSummary(
      [
        julyIncome,
        transaction('expense', 150000, new Date(2026, 6, 25), 'card'),
      ],
      july,
      [card()],
      new Date(2026, 6, 26),
    )
    expect(summary.availableBalance).toBe(-50000)
  })

  test('ausência de lançamentos retorna valores zerados e referência explícita', () => {
    expect(
      AnalyticsService.calculateSummary([], july, [], new Date(2026, 6, 10)),
    ).toMatchObject({
      income: 0,
      expense: 0,
      investment: 0,
      balance: 0,
      futureCardExpenses: 0,
      availableBalance: 0,
      reservationReferenceDate: new Date(2026, 6, 10, 23, 59, 59, 999),
    })
  })

  test('virada de ano transfere reserva de dezembro para despesa de janeiro', () => {
    const transactions = [
      transaction('expense', 10000, new Date(2026, 11, 21), 'card'),
    ]
    expect(
      AnalyticsService.calculateSummary(
        transactions,
        new Date(2026, 11, 1),
        [card()],
        new Date(2026, 11, 22),
      ),
    ).toMatchObject({
      expense: 0,
      futureCardExpenses: 10000,
      availableBalance: -10000,
    })
    expect(
      AnalyticsService.calculateSummary(
        transactions,
        new Date(2027, 0, 1),
        [card()],
        new Date(2026, 11, 22),
      ),
    ).toMatchObject({
      expense: 10000,
      futureCardExpenses: 0,
      availableBalance: -10000,
    })
  })

  test('fechamento no dia 31 em fevereiro mantém a despesa no mês da compra', () => {
    const summary = AnalyticsService.calculateSummary(
      [transaction('expense', 10000, new Date(2026, 1, 28), 'card')],
      new Date(2026, 1, 1),
      [card(31)],
      new Date(2026, 1, 28),
    )
    expect(summary).toMatchObject({
      expense: 10000,
      futureCardExpenses: 0,
      availableBalance: -10000,
    })
  })

  test('aceita Timestamp do Firestore no cálculo de reservas', () => {
    const purchase = transaction(
      'expense',
      10000,
      new Date(2026, 6, 21),
      'card',
    )
    purchase.date = Timestamp.fromDate(new Date(2026, 6, 21))
    expect(
      AnalyticsService.calculateSummary(
        [julyIncome, purchase],
        july,
        [card()],
        new Date(2026, 6, 22),
      ),
    ).toMatchObject({ futureCardExpenses: 10000, availableBalance: 90000 })
  })

  test('resultado usa a referência informada e independe do relógio do sistema', () => {
    jest.useFakeTimers()
    try {
      const transactions = [
        julyIncome,
        transaction('expense', 10000, new Date(2026, 6, 21), 'card'),
      ]
      jest.setSystemTime(new Date(2000, 0, 1))
      const first = AnalyticsService.calculateSummary(
        transactions,
        july,
        [card()],
        new Date(2026, 6, 22),
      )
      jest.setSystemTime(new Date(2099, 0, 1))
      expect(
        AnalyticsService.calculateSummary(
          transactions,
          july,
          [card()],
          new Date(2026, 6, 22),
        ),
      ).toEqual(first)
    } finally {
      jest.useRealTimers()
    }
  })
})
