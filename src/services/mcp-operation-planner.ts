import {
  Timestamp,
  type Query,
  type DocumentData,
  type Transaction as AdminTransaction,
} from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { McpError } from '@/lib/mcp/config'
import {
  civilDate,
  civilTimestamp,
  normalizeMcpTransaction,
} from '@/lib/mcp/transaction'
import { civilDayBounds } from '@/lib/mcp/batch'
import { financialInvoice, safeMoney } from '@/lib/mcp/finance'
import type { McpOperation } from '@/lib/mcp/operations'
import {
  occurrenceDate,
  installmentAmount,
  installmentMonth,
} from '@/lib/utils/transaction-series'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import {
  boundedMcpRead,
  recordVersion,
  serializeMcp,
} from './mcp-query.service'

export type PlannedWrite = {
  path: string
  data: DocumentData | null
  create?: boolean
  occurrence?: boolean
}
export type OperationPlan = {
  action: string
  target: string
  before: unknown
  after: unknown
  impacts: string[]
  blockers: string[]
}
export type QueryGuard = {
  path: string
  field: string | null
  value: string | null
  rows: { id: string; version: string }[]
}
export async function planMcpOperations(
  uid: string,
  tx: AdminTransaction,
  operations: McpOperation[],
  previewId: string,
  today: string,
) {
  const root = `users/${uid}/`
  const dependencies: Record<string, string> = {}
  const writes: PlannedWrite[] = []
  const views: OperationPlan[] = []
  const queries: QueryGuard[] = []
  async function read(path: string) {
    const doc = await tx.get(adminDb.doc(root + path))
    dependencies[path] = recordVersion(doc.exists ? doc.data() : null)
    return doc.data() ?? null
  }
  async function many(
    path: string,
    field?: string,
    value?: string,
    limit = 5000,
  ) {
    let query: Query = adminDb.collection(root + path)
    if (field) query = query.where(field, '==', value)
    const docs = await boundedMcpRead(query, tx, limit)
    queries.push({
      path,
      field: field ?? null,
      value: value ?? null,
      rows: docs.map((d) => ({ id: d.id, version: recordVersion(d.data()) })),
    })
    return docs.map((d) => ({ ...d.data(), id: d.id }) as DocumentData)
  }
  async function resolve(
    data: DocumentData,
    old?: DocumentData,
  ): Promise<DocumentData> {
    const category = await read(`categories/${data.categoryId}`)
    const sameCategory =
      old?.categoryId === data.categoryId && old?.type === data.type
    if (
      !category ||
      (category.archived && !sameCategory) ||
      ![data.type, 'both'].includes(category.type)
    )
      throw new McpError(
        'invalid_category',
        'Categoria indisponível ou incompatível.',
      )
    if (!data.creditCardId)
      return { ...data, creditCardId: null, cardClosingDay: null }
    const card = await read(`creditCards/${data.creditCardId}`)
    const sameCard =
      old?.creditCardId === data.creditCardId && old?.type === data.type
    if (
      data.type !== 'expense' ||
      !card ||
      ((!card.isActive || card.archived) && !sameCard)
    )
      throw new McpError('invalid_card', 'Cartão indisponível.')
    const closingDay =
      sameCard && old?.cardClosingDay != null
        ? old.cardClosingDay
        : card.closingDay
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
      throw new McpError('invalid_card', 'Fechamento inválido.')
    return { ...data, cardClosingDay: closingDay }
  }
  function write(
    path: string,
    data: DocumentData | null,
    create = false,
    occurrence = false,
  ) {
    writes.push({ path, data, create, occurrence })
  }
  function requireRecord(
    data: DocumentData | null,
  ): asserts data is DocumentData {
    if (!data)
      throw new McpError(
        'not_found',
        'Registro não encontrado nesta conta.',
        404,
      )
  }
  for (const [index, op] of operations.entries()) {
    const view: OperationPlan = {
      action: op.action,
      target: '',
      before: null,
      after: null,
      impacts: [],
      blockers: [],
    }
    views.push(view)
    if (
      op.action === 'update_transaction' ||
      op.action === 'delete_transaction'
    ) {
      const path = `transactions/${op.id}`
      const old = await read(path)
      requireRecord(old)
      view.target = op.id
      view.before = old
      if (old.seriesId)
        view.impacts.push(
          'Apenas esta ocorrência será alterada. A série e as demais ocorrências serão preservadas.',
        )
      if (old.creditCardId) {
        const payments = await many(`creditCards/${old.creditCardId}/payments`)
        if (payments.length)
          view.impacts.push(
            'O cartão tem quitações registradas. A alteração pode exigir revisão da fatura.',
          )
      }
      if (op.action === 'delete_transaction') write(path, null)
      else {
        const next = await resolve(
          {
            ...old,
            ...op.changes,
            date: op.changes.date
              ? Timestamp.fromDate(civilTimestamp(op.changes.date))
              : old.date,
          },
          old,
        )
        view.after = next
        if (
          next.creditCardId &&
          next.creditCardId !== old.creditCardId &&
          (await many(`creditCards/${next.creditCardId}/payments`)).length
        )
          view.impacts.push(
            'O cartão de destino tem quitações; revise a fatura após a alteração.',
          )
        write(path, next)
      }
    } else if (
      op.action === 'create_category' ||
      op.action === 'update_category' ||
      op.action === 'remove_category'
    ) {
      const id = 'id' in op ? op.id : `mcp-${previewId}-${index}`
      const path = `categories/${id}`
      const old = await read(path)
      view.target = id
      view.before = old
      if (op.action === 'create_category') {
        if (old) throw new McpError('conflict', 'Categoria já existe.')
        view.after = { ...op.data, isDefault: false, archived: false }
        write(path, view.after as DocumentData, true)
      } else {
        requireRecord(old)
        if (op.action === 'remove_category') {
          const links = [
            ...(await many('transactions', 'categoryId', id)),
            ...(await many('transactionSeries', 'categoryId', id)),
          ]
          // listDocuments inclui meses cujo documento pai foi removido, mas ainda têm limites.
          const months = await adminDb
            .collection(root + 'budgets')
            .listDocuments()
          if (months.length > 5000)
            throw new McpError(
              'query_limit',
              'Há muitos meses para verificar os vínculos da categoria.',
            )
          let budgetLink = false
          for (const month of months)
            if (await read(`budgets/${month.id}/limits/${id}`))
              budgetLink = true
          view.after =
            links.length || budgetLink ? { ...old, archived: true } : null
          view.impacts.push(
            view.after
              ? 'Categoria arquivada; lançamentos, séries e limites históricos permanecem vinculados.'
              : 'Categoria sem vínculos será excluída permanentemente.',
          )
        } else {
          if (old.archived)
            view.blockers.push('Categoria arquivada não aceita edição.')
          if (op.changes.type && op.changes.type !== old.type) {
            const linked = [
              ...(await many('transactions', 'categoryId', id)),
              ...(await many('transactionSeries', 'categoryId', id)),
            ]
            if (
              linked.some(
                (row) => ![row.type, 'both'].includes(op.changes.type!),
              )
            )
              view.blockers.push(
                'O novo tipo é incompatível com lançamentos ou séries existentes.',
              )
            if (!['expense', 'both'].includes(op.changes.type)) {
              const months = await adminDb
                .collection(root + 'budgets')
                .listDocuments()
              if (months.length > 5000)
                throw new McpError(
                  'query_limit',
                  'Há muitos meses para verificar os limites.',
                )
              for (const month of months)
                if (await read(`budgets/${month.id}/limits/${id}`)) {
                  view.blockers.push(
                    'A categoria tem limites mensais de despesa. Remova-os antes de alterar o tipo.',
                  )
                  break
                }
            }
          }
          view.after = { ...old, ...op.changes }
        }
        write(path, view.after as DocumentData)
      }
    } else if (
      op.action === 'create_card' ||
      op.action === 'update_card' ||
      op.action === 'archive_card' ||
      op.action === 'delete_card'
    ) {
      const id = 'id' in op ? op.id : `mcp-${previewId}-${index}`
      const path = `creditCards/${id}`
      const old = await read(path)
      view.target = id
      view.before = old
      if (op.action === 'create_card') {
        if (old) throw new McpError('conflict', 'Cartão já existe.')
        view.after = { ...op.data, archived: false }
        write(path, view.after as DocumentData, true)
      } else {
        requireRecord(old)
        if (op.action === 'delete_card') {
          const links = [
            ...(await many('transactions', 'creditCardId', id)),
            ...(await many('transactionSeries', 'creditCardId', id)),
            ...(await many(`${path}/payments`)),
          ]
          if (links.length)
            view.blockers.push(
              'Cartão com compras, séries ou quitações não pode ser excluído. Use arquivamento.',
            )
          write(path, null)
        } else {
          if (
            old.archived &&
            op.action === 'update_card' &&
            op.changes.isActive === true
          )
            view.blockers.push(
              'Arquivamento é permanente; o cartão não pode ser reativado.',
            )
          view.after =
            op.action === 'archive_card'
              ? { ...old, archived: true, isActive: false }
              : { ...old, ...op.changes }
          if (
            op.action === 'update_card' &&
            op.changes.closingDay !== undefined &&
            op.changes.closingDay !== old.closingDay
          )
            view.impacts.push(
              'O novo fechamento vale para novos vínculos; compras com fechamento registrado preservam sua competência.',
            )
          write(path, view.after as DocumentData)
        }
      }
    } else if (
      op.action === 'pay_invoice' ||
      op.action === 'reverse_invoice_payment'
    ) {
      const card = await read(`creditCards/${op.cardId}`)
      requireRecord(card)
      const path = `creditCards/${op.cardId}/payments/${op.month}`
      const payment = await read(path)
      const records = await many('transactions', 'creditCardId', op.cardId)
      const invoice = financialInvoice(
        records as Transaction[],
        { ...card, id: op.cardId } as CreditCard,
        op.month,
        payment as { amount: number; paidAt: unknown } | null,
        today,
      )
      view.target = `${op.cardId}/${op.month}`
      view.before = { payment, total: invoice.total, status: invoice.status }
      view.impacts.push(
        'Registro informativo de pagamento externo; não transfere dinheiro nem cria uma despesa.',
      )
      if (op.action === 'pay_invoice') {
        if (invoice.total <= 0)
          view.blockers.push('A fatura deve ter total positivo.')
        if (payment && payment.amount !== invoice.total)
          view.blockers.push(
            'Estorne a quitação anterior antes de registrar o novo total.',
          )
        view.after = { amount: invoice.total }
        if (!payment) write(path, { amount: invoice.total }, true)
      } else {
        view.after = null
        if (payment) write(path, null)
      }
    } else if (
      op.action === 'set_budget_goal' ||
      op.action === 'remove_budget_goal' ||
      op.action === 'set_budget_limit' ||
      op.action === 'remove_budget_limit'
    ) {
      const isLimit = 'categoryId' in op
      const path = `budgets/${op.month}${isLimit ? `/limits/${op.categoryId}` : ''}`
      const old = await read(path)
      view.target = path
      view.before = old
      if (op.action === 'set_budget_limit') {
        const category = await read(`categories/${op.categoryId}`)
        if (
          !category ||
          category.archived ||
          !['expense', 'both'].includes(category.type)
        )
          view.blockers.push('Escolha uma categoria ativa de despesa.')
        view.after = { name: category?.name ?? '', amount: op.amount }
      } else if (op.action === 'set_budget_goal')
        view.after = { amount: op.amount }
      write(path, view.after as DocumentData | null)
      view.impacts.push(
        isLimit
          ? 'A meta mensal e os demais limites serão preservados.'
          : 'Os limites por categoria serão preservados.',
      )
    } else {
      const id = 'id' in op ? op.id : `mcp-${previewId}-${index}`
      const path = `transactionSeries/${id}`
      const old = await read(path)
      view.target = id
      view.before = old
      let series: DocumentData
      if (op.action === 'create_series') {
        if (old) throw new McpError('conflict', 'Série já existe.')
        const data = await resolve(normalizeMcpTransaction(op.transaction))
        const day = data.date as string
        if (op.endDate && op.endDate < day)
          throw new McpError('invalid_series', 'Data final anterior à inicial.')
        if (op.kind === 'installment') {
          if (
            data.type !== 'expense' ||
            !data.creditCardId ||
            op.count === undefined
          )
            throw new McpError(
              'invalid_series',
              'Parcelamento exige despesa, cartão e quantidade.',
            )
          installmentAmount(data.amount, op.count, 0)
        }
        const start = civilDayBounds(day).start
        const [year, month, date] = day.split('-').map(Number)
        const offset =
          (start.getTime() - Date.UTC(year, month - 1, date)) / 60000
        series = {
          ...data,
          date: Timestamp.fromDate(start),
          kind: op.kind,
          count: op.kind === 'recurring' ? 1200 : op.count,
          recurring: op.kind === 'recurring',
          nextIndex: 0,
          timezoneOffset: offset,
          endDate: op.endDate
            ? Timestamp.fromMillis(civilDayBounds(op.endDate).end.getTime() - 1)
            : null,
          cancelledFrom: null,
        }
      } else {
        requireRecord(old)
        series = { ...old }
      }
      if (op.action === 'edit_series_future') {
        if (series.kind !== 'recurring')
          view.blockers.push(
            'Parcelas são editadas individualmente; apenas recorrências aceitam edição das futuras não geradas.',
          )
        series.amount = op.amount
        series.description = op.description
        await resolve(series, old ?? undefined)
        write(path, series)
        view.after = series
      } else if (op.action === 'cancel_series') {
        if (op.from < today)
          throw new McpError(
            'invalid_series',
            'O corte deve ser hoje ou uma data futura.',
          )
        const cutoff = civilDayBounds(op.from).start
        series.cancelledFrom =
          series.cancelledFrom &&
          series.cancelledFrom.toMillis() < cutoff.getTime()
            ? series.cancelledFrom
            : Timestamp.fromDate(cutoff)
        // Primeiro bloqueia novas gerações; limpeza posterior é retomável.
        write(path, series)
        const rows = await many('transactions', 'seriesId', id)
        const removed = rows.filter(
          (row) => row.date.toMillis() >= series.cancelledFrom.toMillis(),
        )
        for (const row of removed) write(`transactions/${row.id}`, null)
        view.after = { series, removedIds: removed.map((row) => row.id) }
        view.impacts.push(
          'Ocorrências anteriores ao corte serão preservadas. A limpeza é retomável.',
        )
      } else {
        await resolve(series)
        const generated = []
        let next = series.nextIndex
        const anchor = series.date.toDate()
        for (; next < series.count && generated.length < 120; next++) {
          const date = occurrenceDate(anchor, next, series.timezoneOffset)
          if (
            (series.endDate && date > series.endDate.toDate()) ||
            (series.cancelledFrom && date >= series.cancelledFrom.toDate()) ||
            (series.kind === 'recurring' && civilDate(date) > today)
          )
            break
          const occurrenceId = `series-${id}-${next}`
          const existing = await read(`transactions/${occurrenceId}`)
          const amount =
            series.kind === 'installment'
              ? installmentAmount(series.amount, series.count, next)
              : series.amount
          safeMoney(amount)
          if (!existing) {
            const item = {
              type: series.type,
              amount,
              description: series.description,
              categoryId: series.categoryId,
              date: Timestamp.fromDate(date),
              tags: series.tags,
              notes: series.notes,
              recurring: series.kind === 'recurring',
              creditCardId: series.creditCardId,
              cardClosingDay: series.cardClosingDay,
              seriesId: id,
              occurrenceIndex: next,
              installmentTotal:
                series.kind === 'installment' ? series.count : null,
              installmentMonth:
                series.kind === 'installment'
                  ? installmentMonth(
                      anchor,
                      next,
                      series.cardClosingDay,
                      series.timezoneOffset,
                    )
                  : null,
            }
            generated.push({ id: occurrenceId, ...item })
            write(`transactions/${occurrenceId}`, item, true, true)
          }
        }
        series.nextIndex = next
        // A série precede as ocorrências na aplicação dos writes, mas todas as leituras já ocorreram.
        writes.unshift({
          path,
          data: series,
          create: op.action === 'create_series',
        })
        view.after = {
          series,
          generated,
          nextIndex: next,
          mayHavePending: next < series.count,
        }
        view.impacts.push(
          'Sem execução em segundo plano. Cada solicitação gera até 120 ocorrências; pendências restantes exigem outra prévia.',
        )
      }
    }
  }
  return {
    views: serializeMcp(views) as OperationPlan[],
    dependencies,
    queries,
    writes,
  }
}
