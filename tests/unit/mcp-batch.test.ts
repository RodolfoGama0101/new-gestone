import {
  canonicalJson,
  civilDayBounds,
  commitMcpTransactionsSchema,
  duplicateSignature,
  listMcpTransactionsSchema,
  prepareMcpTransactionsSchema,
} from '@/lib/mcp/batch'

const item = {
  type: 'expense',
  amount: 4000,
  description: 'Mercado',
  categoryId: 'food',
}
test('prévia limita tamanho, rejeita imagens/UID e preserva centavos inteiros', () => {
  const input = {
    idempotencyKey: 'batch-contract-123456',
    transactions: [item],
  }
  expect(prepareMcpTransactionsSchema.parse(input).source).toBe('text')
  for (const change of [
    { transactions: [] },
    { transactions: Array(21).fill(item) },
    { uid: 'other' },
    { image: 'base64' },
    { transactions: [{ ...item, amount: 40.5 }] },
  ]) {
    expect(
      prepareMcpTransactionsSchema.safeParse({ ...input, ...change }).success,
    ).toBe(false)
  }
})
test('commit exige confirmação, hash e prévia exatos; não permite substituir itens', () => {
  const input = {
    previewId: `preview-${'a'.repeat(64)}`,
    previewHash: 'b'.repeat(64),
    confirmed: true,
  }
  expect(commitMcpTransactionsSchema.parse(input).allowDuplicates).toBe(false)
  expect(
    commitMcpTransactionsSchema.safeParse({ ...input, confirmed: false })
      .success,
  ).toBe(false)
  expect(
    commitMcpTransactionsSchema.safeParse({ ...input, transactions: [item] })
      .success,
  ).toBe(false)
  expect(
    commitMcpTransactionsSchema.safeParse({ ...input, previewId: '../other' })
      .success,
  ).toBe(false)
})
test('consulta valida intervalo inclusivo, limite e ausência de UID', () => {
  expect(listMcpTransactionsSchema.parse({}).limit).toBe(20)
  for (const input of [
    { startDate: '2026-11-01', endDate: '2026-10-31' },
    { endDate: '2026-02-30' },
    { limit: 51 },
    { uid: 'other' },
  ]) {
    expect(listMcpTransactionsSchema.safeParse(input).success).toBe(false)
  }
})
test.each([
  ['2026-10-24', '2026-10-24T03:00:00.000Z', '2026-10-25T03:00:00.000Z'],
  ['2018-11-04', '2018-11-04T03:00:00.000Z', '2018-11-05T02:00:00.000Z'],
  ['2019-02-16', '2019-02-16T02:00:00.000Z', '2019-02-17T03:00:00.000Z'],
  ['2026-12-31', '2026-12-31T03:00:00.000Z', '2027-01-01T03:00:00.000Z'],
])(
  'fronteiras civis de %s incluem dias de 23 e 25 horas',
  (day, start, end) => {
    const range = civilDayBounds(day)
    expect(range.start.toISOString()).toBe(start)
    expect(range.end.toISOString()).toBe(end)
  },
)
test('duplicatas consideram dia/tipo/valor e normalizam descrição', () => {
  const value = { ...item, date: '2026-10-24' }
  expect(duplicateSignature({ ...value, description: '  MÉRCADO   ' })).toBe(
    duplicateSignature(value),
  )
  expect(duplicateSignature({ ...value, amount: 4100 })).not.toBe(
    duplicateSignature(value),
  )
})
test('hash de prévia não depende da ordem dos campos ao persistir no Firestore', () => {
  expect(canonicalJson({ b: [1, { z: null, a: 2 }], a: 1 })).toBe(
    canonicalJson({ a: 1, b: [1, { a: 2, z: null }] }),
  )
})
