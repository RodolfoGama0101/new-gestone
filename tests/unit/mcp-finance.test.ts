import { Timestamp } from 'firebase-admin/firestore'
import {
  financialBudget,
  financialInvoice,
  financialSummary,
} from '@/lib/mcp/finance'
import { prepareOperationsSchema, operationScope } from '@/lib/mcp/operations'
import { civilTimestamp } from '@/lib/mcp/transaction'
import {
  MCP_DEFAULT_SCOPES,
  MCP_SCOPES,
  authorizationRequest,
} from '@/lib/mcp/config'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import { QueryClient } from '@tanstack/react-query'
import { invalidateTransactionData } from '@/lib/transaction-cache'

const card = { id: 'card', closingDay: 20, dueDay: 10 } as CreditCard
function row(
  id: string,
  type: Transaction['type'],
  amount: number,
  date: string,
  extra: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    type,
    amount,
    date: Timestamp.fromDate(civilTimestamp(date)),
    description: 'Teste',
    categoryId: type,
    tags: [],
    notes: null,
    recurring: false,
    createdAt: null,
    updatedAt: null,
    ...extra,
  }
}
test('resumo distingue competência, reserva e investimento sem depender do fuso do runtime', () => {
  const rows = [
    row('salary', 'income', 100000, '2026-12-01'),
    row('investment', 'investment', 10000, '2026-12-02'),
    row('expense', 'expense', 5000, '2026-12-20', {
      creditCardId: 'card',
      cardClosingDay: 20,
    }),
    row('reserve', 'expense', 20000, '2026-12-21', {
      creditCardId: 'card',
      cardClosingDay: 20,
    }),
  ]
  const summary = financialSummary(rows, [card], '2026-12', '2026-12-22')
  expect(summary).toMatchObject({
    income: 100000,
    expense: 5000,
    investment: 10000,
    balance: 85000,
    futureCardExpenses: 20000,
    availableBalance: 65000,
    reservationReferenceDate: '2026-12-22',
  })
  expect(financialSummary(rows, [card], '2027-01', '2027-01-22').expense).toBe(
    20000,
  )
  expect(financialBudget(rows, [card], '2026-12')).toMatchObject({
    savings: 95000,
    expenses: { expense: 5000 },
  })
})
test('fatura preserva mês da parcela, vencimento e mudança após quitação', () => {
  const feb = { ...card, closingDay: 31, dueDay: 10 }
  const rows = [
    row('a', 'expense', 3334, '2026-01-31', {
      creditCardId: 'card',
      cardClosingDay: 31,
      installmentMonth: '2026-02',
      installmentTotal: 3,
      occurrenceIndex: 1,
    }),
  ]
  expect(
    financialInvoice(rows, feb, '2026-02', null, '2026-02-28'),
  ).toMatchObject({
    total: 3334,
    closing: '2026-02-28',
    due: '2026-03-10',
    status: 'open',
  })
  expect(
    financialInvoice(
      rows,
      feb,
      '2026-02',
      { amount: 3334, paidAt: null },
      '2026-03-01',
    ).status,
  ).toBe('paid')
  expect(
    financialInvoice(
      rows,
      feb,
      '2026-02',
      { amount: 3333, paidAt: null },
      '2026-03-01',
    ).status,
  ).toBe('changed_after_payment')
})
test('agregações rejeitam overflow sem entregar totais arredondados', () => {
  const rows = [
    row('a', 'expense', Number.MAX_SAFE_INTEGER, '2026-10-01'),
    row('b', 'expense', 1, '2026-10-02'),
  ]
  expect(() => financialSummary(rows, [], '2026-10')).toThrow('limite seguro')
  expect(() => financialBudget(rows, [], '2026-10')).toThrow('limite seguro')
})
test('operações aceitam patches sem aplicar valores padrão e rejeitam metadados e caminhos', () => {
  const input = {
    idempotencyKey: 'operation-contract-0001',
    operations: [
      {
        action: 'update_transaction',
        id: 'one',
        changes: { description: 'Novo nome' },
      },
    ],
  }
  expect(prepareOperationsSchema.parse(input).operations[0]).toEqual(
    input.operations[0],
  )
  for (const changes of [
    {},
    { uid: 'other' },
    { seriesId: 'x' },
    { installmentMonth: '2026-10' },
    { recurring: true },
    { amount: 1.5 },
    { categoryId: '../other' },
  ])
    expect(
      prepareOperationsSchema.safeParse({
        ...input,
        operations: [{ ...input.operations[0], changes }],
      }).success,
    ).toBe(false)
  expect(
    prepareOperationsSchema.safeParse({
      ...input,
      operations: [...input.operations, ...input.operations],
    }).success,
  ).toBe(false)
  expect(
    prepareOperationsSchema.safeParse({
      ...input,
      operations: [
        { action: 'set_budget_goal', month: '2026-10', amount: 100 },
        ...input.operations,
      ],
    }).success,
  ).toBe(false)
})
test('escopos são separados por módulo e o consentimento sem scope mantém o padrão antigo', () => {
  expect(MCP_SCOPES).toHaveLength(12)
  expect(MCP_DEFAULT_SCOPES).toEqual([
    'transactions:read',
    'transactions:write',
  ])
  expect(operationScope({ action: 'generate_series', id: 'one' })).toBe(
    'series:write',
  )
  expect(
    operationScope({ action: 'pay_invoice', cardId: 'one', month: '2026-10' }),
  ).toBe('invoices:write')
  const previous = { ...process.env }
  try {
    Object.assign(process.env, {
      MCP_ORIGIN: 'https://example.test',
      MCP_ALLOWED_UIDS: 'owner',
      MCP_CLIENT_ID: 'client',
      MCP_REDIRECT_URIS: 'https://example.test/callback',
    })
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'client',
      redirect_uri: 'https://example.test/callback',
      resource: 'https://example.test/api/mcp',
      state: 'state',
      code_challenge_method: 'S256',
      code_challenge: 'a'.repeat(43),
    })
    expect(authorizationRequest(params).scopes).toEqual(MCP_DEFAULT_SCOPES)
    params.set('scope', 'budgets:read budgets:write')
    expect(authorizationRequest(params).scopes).toEqual([
      'budgets:read',
      'budgets:write',
    ])
  } finally {
    process.env = previous
  }
})

test('retorno à aba invalida categorias e quitações sem afetar outra conta', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  })
  const categories = ['categories', 'owner']
  const payments = ['invoicePayments', 'owner', 'card', '2026-10']
  const other = ['invoicePayments', 'another', 'card', '2026-10']
  for (const key of [categories, payments, other])
    client.setQueryData(key, { amount: 100 })
  await invalidateTransactionData(client, 'owner')
  expect(client.getQueryState(categories)?.isInvalidated).toBe(true)
  expect(client.getQueryState(payments)?.isInvalidated).toBe(true)
  expect(client.getQueryState(other)?.isInvalidated).toBe(false)
  expect(client.getQueryData(['transactionPagination', 'owner'])).toBe(1)
  client.clear()
})

test('parcelamento não aceita término que descarte parte do total e recorrência não ignora count', () => {
  const transaction = {
    type: 'expense',
    amount: 10000,
    description: 'Compra',
    categoryId: 'food',
    creditCardId: 'card',
  }
  const input = (data: object) => ({
    idempotencyKey: 'series-contract-0001',
    operations: [{ action: 'create_series', transaction, ...data }],
  })
  expect(
    prepareOperationsSchema.safeParse(input({ kind: 'installment', count: 3 }))
      .success,
  ).toBe(true)
  expect(
    prepareOperationsSchema.safeParse(
      input({ kind: 'installment', count: 3, endDate: '2026-10-31' }),
    ).success,
  ).toBe(false)
  expect(
    prepareOperationsSchema.safeParse(input({ kind: 'installment' })).success,
  ).toBe(false)
  expect(
    prepareOperationsSchema.safeParse(input({ kind: 'recurring', count: 3 }))
      .success,
  ).toBe(false)
})
