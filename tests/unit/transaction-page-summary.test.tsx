/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { TransactionPageSummary } from '@/components/transactions/transaction-page-summary'
import { formatMoney } from '@/lib/utils/format-money'
import type { Transaction } from '@/types/transaction'

test('o resumo da página inclui aportes nas saídas sem alterar os centavos', () => {
  const transactions: Transaction[] = (
    ['income', 'expense', 'investment'] as const
  ).map((type, index) => ({
    id: type,
    type,
    amount: [10001, 3002, 1003][index],
    description: type,
    categoryId: 'category',
    date: new Date(2026, 9, 23),
    notes: null,
    tags: [],
    recurring: false,
    createdAt: null,
    updatedAt: null,
  }))
  render(<TransactionPageSummary transactions={transactions} />)
  for (const [name, value] of [
    ['Entradas nesta página', 10001],
    ['Saídas nesta página', 4005],
    ['Saldo nesta página', 5996],
  ] as const) {
    expect(
      within(screen.getByRole('region', { name })).getByText(
        formatMoney(value).replaceAll('\u00a0', ' '),
      ),
    ).toBeVisible()
  }
})
