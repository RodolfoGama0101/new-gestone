import { transactionSchema } from '@/lib/validations/transaction.schema'
import { parsePeriodDate } from './transaction-period'
import type { Category } from '@/types/category'
import type { Transaction } from '@/types/transaction'

export const CSV_MAX_BYTES = 1024 * 1024
export const CSV_MAX_ROWS = 500
export const CSV_HEADERS = [
  'Data',
  'Descrição',
  'Categoria',
  'Tipo',
  'Valor (BRL)',
  'Tags',
  'Anotações',
]
export type ImportTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt'
>
export type CsvPreview = {
  line: number
  cells: string[]
  data?: ImportTransaction
  error?: string
}

// Suporta delimitador dentro de aspas, aspas duplicadas, BOM, CRLF e campos multilinha.
export function readCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).length > CSV_MAX_BYTES)
    throw new Error('O arquivo deve ter até 1 MiB.')
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        quoted = false
        closed = true
      } else cell += c
    } else if (c === '"' && !cell && !closed) quoted = true
    else if (c === ';' || c === '\n' || c === '\r') {
      row.push(cell)
      cell = ''
      closed = false
      if (c !== ';') {
        if (c === '\r' && text[i + 1] === '\n') i++
        rows.push(row)
        row = []
      }
    } else {
      if (closed || c === '"') throw new Error('Aspas inválidas no CSV.')
      cell += c
    }
  }
  if (quoted) throw new Error('Há um campo com aspas não fechadas.')
  if (cell || closed || row.length) rows.push([...row, cell])
  if (rows.length - 1 > CSV_MAX_ROWS)
    throw new Error('Use no máximo 500 lançamentos por arquivo.')
  if (JSON.stringify(rows.shift()) !== JSON.stringify(CSV_HEADERS))
    throw new Error(
      'Use o cabeçalho do CSV exportado pelo GestOne, separado por ponto e vírgula.',
    )
  if (!rows.length) throw new Error('O arquivo não contém lançamentos.')
  return rows
}

// O exportador prefixa fórmulas com apóstrofo; restaura apenas esse escape conhecido.
function restore(value: string) {
  return /^'[=+\-@']/.test(value) ? value.slice(1) : value
}

export function previewCsv(
  rows: string[][],
  categories: Category[],
  mapping: Record<string, string> = {},
): CsvPreview[] {
  return rows.map((cells, index) => {
    try {
      if (cells.length !== CSV_HEADERS.length)
        throw new Error('A linha deve conter sete colunas.')
      const [
        dateText,
        description,
        categoryName,
        typeText,
        value,
        tags,
        notes,
      ] = cells.map(restore)
      const type = (
        {
          Receita: 'income',
          Despesa: 'expense',
          Investimento: 'investment',
        } as const
      )[typeText as 'Receita']
      if (!type)
        throw new Error('Tipo inválido: use Receita, Despesa ou Investimento.')
      const matches = categories.filter(
        (c) =>
          !c.archived &&
          (c.type === type || c.type === 'both') &&
          (mapping[categoryName]
            ? c.id === mapping[categoryName]
            : c.name === categoryName),
      )
      if (matches.length !== 1)
        throw new Error(
          'Selecione uma categoria ativa e compatível; nomes repetidos exigem mapeamento.',
        )
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateText)
      const date =
        match && parsePeriodDate(`${match[3]}-${match[2]}-${match[1]}`)
      if (!date) throw new Error('Data inválida. Use dd/MM/aaaa.')
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(value))
        throw new Error(
          'Valor inválido. Use reais com duas casas, como 100,25.',
        )
      const [reais, cents] = value.replaceAll('.', '').split(',')
      const amountBig = BigInt(reais) * BigInt(100) + BigInt(cents)
      if (amountBig > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error('O valor excede o limite permitido.')
      const parsed = transactionSchema.safeParse({
        type,
        amount: Number(amountBig),
        description,
        categoryId: matches[0].id,
        date,
        tags: tags ? tags.split(';').map((t) => t.trim()) : [],
        notes: notes || null,
        recurring: false,
        creditCardId: null,
      })
      if (!parsed.success)
        throw new Error(parsed.error.issues.map((i) => i.message).join(' '))
      return {
        line: index + 2,
        cells,
        data: {
          ...parsed.data,
          amount: Number(parsed.data.amount),
          notes: parsed.data.notes ?? null,
        },
      }
    } catch (error) {
      return {
        line: index + 2,
        cells,
        error: error instanceof Error ? error.message : 'Linha inválida.',
      }
    }
  })
}
