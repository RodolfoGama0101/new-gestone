import { transactionSchema } from '@/lib/validations/transaction.schema'

const valid = {
  type: 'expense',
  amount: 12345,
  description: 'Compra de teste',
  categoryId: 'category',
  date: new Date(),
  tags: [],
  notes: null,
}

describe('limites dos lançamentos alinhados às regras', () => {
  test.each([1, Number.MAX_SAFE_INTEGER, '1', String(Number.MAX_SAFE_INTEGER)])(
    'aceita centavos inteiros seguros: %s',
    (amount) => {
      expect(transactionSchema.safeParse({ ...valid, amount }).success).toBe(
        true,
      )
    },
  )

  test.each([
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    '',
    '0',
    '-1',
    '1.5',
    '10abc',
    String(Number.MAX_SAFE_INTEGER + 1),
  ])('nega valor inválido: %s', (amount) => {
    expect(transactionSchema.safeParse({ ...valid, amount }).success).toBe(
      false,
    )
  })

  test('aceita o limite de tags e nega excesso e conteúdo inválido', () => {
    expect(
      transactionSchema.safeParse({
        ...valid,
        tags: Array(20).fill('a'.repeat(40)),
      }).success,
    ).toBe(true)
    for (const tags of [Array(21).fill('tag'), ['a'.repeat(41)], [''], [123]]) {
      expect(transactionSchema.safeParse({ ...valid, tags }).success).toBe(
        false,
      )
    }
  })
})
