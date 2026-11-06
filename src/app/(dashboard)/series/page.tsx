'use client'

import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { useTransactionSeries } from '@/hooks/use-transaction-series'
import type { TransactionSeries } from '@/types/transaction-series'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import { parsePeriodDate } from '@/lib/utils/transaction-period'
import { parseBudgetAmount } from '@/lib/utils/budget'
import { formatMoney, formatCsvAmount } from '@/lib/utils/format-money'
import {
  installmentAmount,
  installmentMonth,
} from '@/lib/utils/transaction-series'
import { PageHeader } from '@/components/shared/page-header'
import { LoadError } from '@/components/shared/load-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/shared/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { seriesSchedule } from '@/lib/utils/series-presentation'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useWorkMonth } from '@/providers/work-month-provider'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import {
  ManagementFilters,
  useManagementFilters,
} from '@/components/shared/management-filters'
import { matchesSeries } from '@/lib/utils/management-filters'

function SeriesItem({
  item,
  busy,
  perform,
  month,
  category,
  card,
  previewCancellation,
}: {
  item: TransactionSeries
  busy: boolean
  perform: ReturnType<typeof useTransactionSeries>['perform']
  month: string
  category: string
  card: string
  previewCancellation: ReturnType<
    typeof useTransactionSeries
  >['previewCancellation']
}) {
  const [amount, setAmount] = useState(
    formatCsvAmount(item.amount).replaceAll('.', ''),
  )
  const [description, setDescription] = useState(item.description)
  const [from, setFrom] = useState(() =>
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  )
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewCancellation>
  > | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const schedule = seriesSchedule(item)
  const next = schedule.find((row) => !row.processed)
  const monthRows = schedule.filter((row) => row.month === month)
  const future = schedule.filter((row) => !row.processed)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const run = async (operation: () => Promise<unknown>) => {
    setMessage('')
    try {
      await operation()
      setConfirm(false)
      setMessage('Série atualizada.')
    } catch (error) {
      setConfirm(false)
      setMessage(
        error instanceof Error
          ? `${error.message} Operação interrompida; o progresso já salvo foi preservado. Repita para retomar.`
          : 'Operação interrompida. Repita para retomar.',
      )
    }
  }
  return (
    <details className="border-border min-w-0 rounded-lg border">
      <summary className="focus-visible:outline-ring cursor-pointer space-y-2 p-4 focus-visible:outline-2">
        <span className="font-medium break-words">{item.description}</span>
        <span className="text-muted-foreground block text-sm break-words">
          {category} · {card}
        </span>
        <span className="block text-sm tabular-nums">
          {formatMoney(item.amount)}{' '}
          {item.kind === 'recurring' ? '/ mês' : 'no total'}
          {' · '}
          {item.kind === 'installment' ? item.count + ' parcelas · ' : ''}
          {item.cancelledFrom
            ? 'Cancelada · histórico disponível'
            : item.nextIndex + ' ocorrências processadas'}
        </span>
        {item.kind === 'installment' && (
          <span className="block text-sm tabular-nums">
            Parcelas de{' '}
            {formatMoney(
              installmentAmount(item.amount, item.count, item.count - 1),
            )}{' '}
            a {formatMoney(installmentAmount(item.amount, item.count, 0))}
          </span>
        )}
        <span className="text-muted-foreground block text-xs">
          Ver programação e gerenciar série
        </span>
      </summary>
      <div className="border-border space-y-6 border-t p-4">
        <p className="text-sm">
          {item.kind === 'recurring' ? 'Mensal' : `${item.count} parcelas`} ·{' '}
          {formatMoney(item.amount)}{' '}
          {item.kind === 'installment' ? 'no total' : 'por mês'} · Início:{' '}
          {format(parseFirestoreDate(item.date), 'dd/MM/yyyy')} ·{' '}
          {item.nextIndex} ocorrências processadas
        </p>
        <p className="text-sm">
          {item.cancelledFrom
            ? `Cancelada a partir de ${format(parseFirestoreDate(item.cancelledFrom), 'dd/MM/yyyy')}`
            : item.kind === 'installment'
              ? `Fim da programação: ${schedule.at(-1)?.month ?? 'encerrada'}`
              : item.endDate
                ? `Até ${format(parseFirestoreDate(item.endDate), 'dd/MM/yyyy')}`
                : 'Sem data final (limite de 1.200 meses)'}
        </p>
        <p className="text-muted-foreground text-sm">
          Processamento indica geração, sem controle de pagamento. Ocorrências
          processadas podem ter sido editadas ou excluídas no extrato.
        </p>
        <p className="text-sm">
          {next
            ? 'Próxima ocorrência a gerar: ' +
              format(next.date, 'dd/MM/yyyy') +
              ' · ' +
              formatMoney(next.amount)
            : 'Nenhuma ocorrência restante para gerar.'}
          {item.kind === 'installment' &&
            ' Parcelamentos inteiramente processados ainda podem ter faturas futuras.'}
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer py-2">
            Programação do mês {month} · {monthRows.length} ocorrências
          </summary>
          {!monthRows.length && <p>Nenhuma ocorrência programada neste mês.</p>}
          <ul className="space-y-2">
            {monthRows.map((row) => (
              <li key={row.index}>
                {format(row.date, 'dd/MM/yyyy')} · {formatMoney(row.amount)} ·{' '}
                {row.processed
                  ? 'Processada (consulte o extrato)'
                  : 'Programada, ainda não gerada'}
                {item.kind === 'installment' &&
                  ' · Parcela ' + (row.index + 1) + '/' + item.count}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Programação original, sem somar lançamentos ou antecipar geração.
            Valores atuais podem diferir após edição no extrato.
          </p>
        </details>
        {item.kind === 'installment' && (
          <details className="border-border bg-muted rounded-md border p-4 text-sm">
            <summary className="cursor-pointer">
              Impacto nas faturas: {item.count} parcelas
            </summary>
            <ol className="mt-2 max-h-64 space-y-1 overflow-auto">
              {Array.from({ length: item.count }, (_, i) => {
                const invoiceMonth = installmentMonth(
                  parseFirestoreDate(item.date),
                  i,
                  item.cardClosingDay!,
                  item.timezoneOffset,
                )
                return (
                  <li key={i}>
                    Parcela {i + 1}/{item.count} · Fatura {invoiceMonth}{' '}
                    {invoiceMonth === month && '(mês de trabalho) '}·{' '}
                    {formatMoney(installmentAmount(item.amount, item.count, i))}
                  </li>
                )
              })}
            </ol>
            <p>
              Projeção original. Edições e cancelamentos podem alterar os
              valores exibidos nas faturas atuais.
            </p>
          </details>
        )}
        {item.kind === 'recurring' && !item.cancelledFrom && (
          <details>
            <summary className="border-border inline-flex cursor-pointer rounded-md border px-3 py-2 text-sm font-medium">
              Editar próximos lançamentos
            </summary>
            <p className="mt-4 text-sm">
              Somente {future.length} ocorrências ainda não geradas serão
              alteradas.
              {next &&
                ' A partir de ' + format(next.date, 'dd/MM/yyyy') + '.'}{' '}
              Ocorrências já geradas permanecem inalteradas, mesmo com data
              futura.
            </p>
            <p className="my-3 text-sm break-words" role="status">
              Prévia: “{description}” · R$ {amount} por mês, em lugar de “
              {item.description}” · {formatMoney(item.amount)}.
            </p>
            <form
              className="border-border flex min-w-0 flex-wrap items-end gap-3 border-t pt-6"
              onSubmit={(e) => {
                e.preventDefault()
                void run(() =>
                  perform({
                    kind: 'edit',
                    id: item.id,
                    amount: parseBudgetAmount(amount),
                    description,
                  }),
                )
              }}
            >
              <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
                Descrição futura
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                />
              </label>
              <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
                Valor mensal em R$
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
              <Button type="submit" disabled={busy}>
                Salvar futuras
              </Button>
            </form>
          </details>
        )}
        <p className="text-muted-foreground text-sm">
          O histórico e as ocorrências já geradas são editados individualmente
          no extrato. Cancelar remove somente ocorrências com data igual ou
          posterior ao corte escolhido.
        </p>
        <details>
          <summary className="border-border inline-flex cursor-pointer rounded-md border px-3 py-2 text-sm font-medium">
            Encerrar série
          </summary>
          <div className="border-border flex min-w-0 flex-wrap items-end gap-3 border-t pt-6">
            <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
              Cancelar a partir de
              <DatePicker
                aria-label="Cancelar a partir de"
                date={parsePeriodDate(from)}
                minDate={parsePeriodDate(format(new Date(), 'yyyy-MM-dd'))}
                setDate={(date) =>
                  setFrom(date ? format(date, 'yyyy-MM-dd') : '')
                }
              />
            </label>
            <Button
              variant="outline"
              disabled={busy || previewBusy}
              onClick={async () => {
                setMessage('')
                setPreview(null)
                setPreviewBusy(true)
                try {
                  const date = parsePeriodDate(from)
                  if (!date) throw new Error('Escolha hoje ou uma data futura.')
                  setPreview(await previewCancellation(item.id, date))
                  setConfirm(true)
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : 'Não foi possível carregar a prévia. Tente novamente.',
                  )
                } finally {
                  setPreviewBusy(false)
                }
              }}
            >
              {previewBusy ? 'Consultando ocorrências…' : 'Cancelar futuras'}
            </Button>
          </div>
        </details>
        <ConfirmDialog
          isOpen={confirm}
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
          onConfirm={() =>
            run(() => {
              const date = preview && parsePeriodDate(from)
              if (
                !date ||
                date < parsePeriodDate(format(new Date(), 'yyyy-MM-dd'))!
              )
                throw new Error('Escolha hoje ou uma data futura.')
              return perform({ kind: 'cancel', id: item.id, from: date })
            })
          }
          title="Cancelar futuras?"
          description={
            preview
              ? 'Corte local: ' +
                format(preview.from, 'dd/MM/yyyy') +
                '. ' +
                preview.affected +
                ' ocorrências existentes serão removidas; ' +
                preview.preserved +
                ' anteriores serão preservadas. A programação posterior será encerrada. A prévia reflete a consulta atual; alterações concorrentes podem mudar a quantidade. Em falha, repita para concluir a limpeza.'
              : 'Consulte a prévia antes de cancelar.'
          }
          confirmText="Confirmar cancelamento"
          isDestructive
          isLoading={busy}
        />
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  )
}
export default function SeriesPage() {
  const { month } = useWorkMonth()
  const series = useTransactionSeries()
  const categories = useCategories()
  const cards = useCreditCards()
  const { values, setValues } = useManagementFilters()
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState<'recurring' | 'installment' | null>(
    null,
  )
  const context = JSON.stringify([month, values])
  const [recovery, setRecovery] = useState<{
    id: string
    context: string
  } | null>(null)
  const perform: typeof series.perform = async (action, options) => {
    // O refetch de onSettled pode mudar os filtros antes de a Promise rejeitar.
    if (action.kind !== 'generate') setRecovery({ id: action.id, context })
    try {
      const result = await series.perform(action, options)
      setRecovery(null)
      return result
    } catch (error) {
      if (action.kind !== 'generate') setRecovery({ id: action.id, context })
      throw error
    }
  }
  const filteredSeries = (series.data ?? []).filter(
    (item) =>
      matchesSeries(item, values, month) ||
      (recovery?.context === context && recovery.id === item.id),
  )
  if (series.error && !series.data)
    return <LoadError error={series.error} retry={series.refetch} />
  if (categories.error || cards.error)
    return (
      <LoadError
        error={categories.error || cards.error}
        retry={() => Promise.all([categories.refetch(), cards.refetch()])}
      />
    )
  return (
    <div className="space-y-8">
      <PageHeader
        title="Séries de lançamentos"
        description={`Mês de trabalho: ${month}. Consulte a programação e gerencie recorrências e compras parceladas.`}
      />
      {series.error && (
        <LoadError error={series.error} retry={series.refetch} />
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setCreating('recurring')}>
          Nova recorrência
        </Button>
        <Button variant="outline" onClick={() => setCreating('installment')}>
          Nova compra parcelada
        </Button>
      </div>
      <Dialog
        open={!!creating}
        onOpenChange={(open) => {
          if (!open) setCreating(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creating === 'installment'
                ? 'Nova compra parcelada'
                : 'Nova recorrência'}
            </DialogTitle>
            <DialogDescription>
              {creating === 'installment'
                ? 'Informe o valor total e um cartão ativo. Confira a quantidade em Repetição.'
                : 'Informe o valor mensal. Confira o término opcional em Repetição.'}{' '}
              A data inicial é a data do lançamento, independente do mês de
              consulta.
            </DialogDescription>
          </DialogHeader>
          {creating && (
            <TransactionForm
              key={creating}
              defaultSchedule={creating}
              onSuccess={() => setCreating(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ManagementFilters
        values={values}
        setValues={setValues}
        searchLabel="Buscar por descrição"
        fields={[
          {
            key: 'scope',
            label: 'Programação',
            options: [{ value: 'month', label: 'Mês de trabalho' }],
          },
          {
            key: 'modality',
            label: 'Modalidade',
            options: [
              { value: 'recurring', label: 'Recorrência' },
              { value: 'installment', label: 'Parcelamento' },
            ],
          },
          {
            key: 'type',
            label: 'Tipo financeiro',
            options: [
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
              { value: 'investment', label: 'Investimento' },
            ],
          },
          {
            key: 'categoryId',
            label: 'Categoria',
            options: categories.categories.map((item) => ({
              value: item.id,
              label: `${item.name}${item.archived ? ' (arquivada)' : ''}`,
            })),
          },
          {
            key: 'creditCardId',
            label: 'Cartão',
            options: cards.creditCards.map((item) => ({
              value: item.id,
              label: `${item.name}${item.archived ? ' (arquivado)' : ''}`,
            })),
          },
          {
            key: 'status',
            label: 'Cancelamento',
            options: [
              { value: 'active', label: 'Não canceladas' },
              { value: 'cancelled', label: 'Canceladas' },
            ],
          },
          {
            key: 'pending',
            label: 'Geração pendente',
            options: [
              { value: 'yes', label: 'Pendente' },
              { value: 'no', label: 'Sem pendência' },
            ],
          },
        ]}
      />
      <details className="text-muted-foreground text-sm">
        <summary className="cursor-pointer py-2">
          Sobre a geração de recorrências
        </summary>
        <p>
          Recorrências mensais vencidas são geradas ao abrir o app. Não há
          execução em segundo plano com o app fechado. Cada execução processa
          até 120 ocorrências por série; use o botão novamente para atrasos
          maiores. Categorias ou cartões indisponíveis exigem corrigir o
          cadastro ou cancelar a série.
        </p>
      </details>
      <Button
        disabled={series.busy}
        onClick={async () => {
          try {
            await series.perform({ kind: 'generate' })
            setMessage(
              'Geração concluída. Se houver mais de 120 meses atrasados, repita para continuar.',
            )
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : 'Geração interrompida. Repita para retomar sem duplicatas.',
            )
          }
        }}
      >
        Gerar pendentes
      </Button>
      {message && <p role="status">{message}</p>}
      {series.isLoading || categories.isLoading || cards.isLoading ? (
        <p role="status">Carregando séries…</p>
      ) : !series.data?.length ? (
        <p>Nenhuma série cadastrada.</p>
      ) : !filteredSeries.length ? (
        <p>
          Nenhuma série corresponde aos filtros. Altere ou limpe os filtros para
          ver as séries cadastradas.
        </p>
      ) : (
        <div className="space-y-6">
          {(['recurring', 'installment'] as const).map((kind) => (
            <section key={kind} className="space-y-4">
              <h2 className="text-base font-medium">
                {kind === 'recurring' ? 'Recorrências' : 'Parcelamentos'}
              </h2>
              {filteredSeries
                .filter((item) => item.kind === kind)
                .map((item) => (
                  <SeriesItem
                    key={item.id}
                    item={item}
                    busy={series.busy}
                    perform={perform}
                    month={month}
                    category={
                      categories.categories.find(
                        (category) => category.id === item.categoryId,
                      )?.name ?? 'Categoria indisponível'
                    }
                    card={
                      item.creditCardId
                        ? (cards.creditCards.find(
                            (card) => card.id === item.creditCardId,
                          )?.name ?? 'Cartão indisponível')
                        : 'Sem cartão'
                    }
                    previewCancellation={series.previewCancellation}
                  />
                ))}
              {!filteredSeries.some((item) => item.kind === kind) && (
                <p className="text-muted-foreground text-sm">
                  Nenhuma série deste tipo corresponde aos filtros.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
