import { CSV_HEADERS, readCsv, previewCsv } from '@/lib/utils/transaction-csv'
import { formatCsvAmount } from '@/lib/utils/format-money'
import type { Category } from '@/types/category'

const categories = [
  { id: 'food', name: 'Alimentação', type: 'expense' },
] as Category[]
const cells = [
  '29/02/2024',
  'Compra; "mercado"\nsegunda linha',
  'Alimentação',
  'Despesa',
  '1.234,56',
  'casa; mercado',
  'Anotação',
]
const csv = (rows: string[][]) =>
  [CSV_HEADERS, ...rows]
    .map((row) => row.map((c) => `"${c.replaceAll('"', '""')}"`).join(';'))
    .join('\r\n')

it('faz round-trip de aspas, delimitador, quebra de linha, centavos e BOM', () => {
  const rows = readCsv('\uFEFF' + csv([cells]))
  expect(rows).toEqual([cells])
  const result = previewCsv(rows, categories)[0]
  expect(result.error).toBeUndefined()
  expect(result.data).toMatchObject({
    amount: 123456,
    description: cells[1],
    type: 'expense',
    categoryId: 'food',
  })
  expect((result.data?.date as Date).getDate()).toBe(29)
  expect(result.data?.tags).toEqual(['casa', 'mercado'])
})

it('rejeita arquivo, data, valor, categoria e tipo inválidos antes da gravação', () => {
  expect(() => readCsv('a;b')).toThrow('cabeçalho')
  expect(() => readCsv(csv([cells]) + '"')).toThrow()
  expect(() => readCsv(csv(Array.from({ length: 501 }, () => cells)))).toThrow(
    '500',
  )
  for (const [column, value] of [
    [0, '31/02/2026'],
    [4, '10,001'],
    [4, '0,00'],
    [4, '999999999999999999,00'],
    [2, 'Inexistente'],
    [3, 'Outro'],
  ] as const) {
    const row = [...cells]
    row[column] = value
    expect(previewCsv([row], categories)[0].error).toBeTruthy()
  }
})

it('exige mapeamento de categorias ambíguas e restaura escape de fórmula como texto', () => {
  const row = [...cells]
  row[1] = "'=SUM(A1)"
  const ambiguous = [...categories, { ...categories[0], id: 'other' }]
  expect(previewCsv([row], ambiguous)[0].error).toBeTruthy()
  expect(
    previewCsv([row], ambiguous, { Alimentação: 'food' })[0].data?.description,
  ).toBe('=SUM(A1)')
})

it('preserva todos os centavos no limite seguro ao exportar e importar', () => {
  const row = [...cells]
  row[4] = formatCsvAmount(Number.MAX_SAFE_INTEGER)
  expect(previewCsv([row], categories)[0].data?.amount).toBe(
    Number.MAX_SAFE_INTEGER,
  )
})
