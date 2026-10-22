/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import { TransactionRow } from '@/components/transactions/transaction-row'
import {
  formatTransactionAmount,
  formatTransactionDate,
  transactionDateKey,
  transactionPresentation,
} from '@/lib/utils/transaction-presentation'
import { ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react'

it.each([
  ['income', 'Receita', '+', ArrowUpRight],
  ['expense', 'Despesa', '−', ArrowDownRight],
  ['investment', 'Investimento', '−', Coins],
] as const)(
  'seleciona rótulo, ícone e sinal de %s',
  (type, label, sign, icon) => {
    expect(transactionPresentation[type]).toMatchObject({ label, sign, icon })
    expect(formatTransactionAmount(type, 10001)).toBe(sign + 'R$\u00a0100,01')
  },
)

it('normaliza timestamps e preserva a data local na virada do ano', () => {
  const today = new Date(2027, 0, 1, 12)
  const yesterday = new Date(2026, 11, 31, 12)
  expect(transactionDateKey({ seconds: yesterday.getTime() / 1000 })).toBe(
    '2026-12-31',
  )
  expect(formatTransactionDate(yesterday, today)).toBe('Ontem')
  expect(formatTransactionDate(today, today)).toBe('Hoje')
})

it('atualiza a data relativa quando a tela atravessa a meia-noite', () => {
  jest.useFakeTimers()
  const date = new Date(2026, 9, 22, 23, 59, 59)
  jest.setSystemTime(date)
  const { unmount } = render(
    <TransactionRow
      category={undefined}
      transaction={{
        id: '1',
        type: 'investment',
        amount: 100,
        description: 'Reserva',
        date,
        categoryId: 'c',
        notes: null,
        recurring: false,
        tags: [],
        createdAt: date,
        updatedAt: date,
      }}
    />,
  )
  expect(screen.getByText('Investimento')).toBeVisible()
  expect(screen.getByText('Hoje')).toBeVisible()
  act(() => jest.advanceTimersByTime(2000))
  expect(screen.getByText('Ontem')).toBeVisible()
  unmount()
  jest.useRealTimers()
})
