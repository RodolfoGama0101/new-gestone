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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
}: {
  item: TransactionSeries
  busy: boolean
  perform: ReturnType<typeof useTransactionSeries>['perform']
  month: string
}) {
  const [amount, setAmount] = useState(
    formatCsvAmount(item.amount).replaceAll('.', ''),
  )
  const [description, setDescription] = useState(item.description)
  const [from, setFrom] = useState(() =>
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  )
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const run = async (operation: () => Promise<unknown>) => {
    setMessage('')
    try {
      await operation()
      setConfirm(false)
      setMessage('Série atualizada.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Operação interrompida. Repita para retomar.',
      )
    }
  }
  return (
    <Card>
      <CardHeader className="border-border border-b">
        <CardTitle className="break-words">{item.description}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-2xl font-medium tracking-tight tabular-nums">
          {formatMoney(item.amount)}{' '}
          <span className="text-muted-foreground text-xs font-normal">
            {item.kind === 'recurring' ? '/ mês' : 'no total'}
          </span>
        </p>
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
            : item.endDate
              ? `Até ${format(parseFirestoreDate(item.endDate), 'dd/MM/yyyy')}`
              : 'Sem data final (limite de 1.200 meses)'}
        </p>
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
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Cancelar futuras
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
              const date = parsePeriodDate(from)
              if (
                !date ||
                date < parsePeriodDate(format(new Date(), 'yyyy-MM-dd'))!
              )
                throw new Error('Escolha hoje ou uma data futura.')
              return perform({ kind: 'cancel', id: item.id, from: date })
            })
          }
          title="Cancelar futuras?"
          description={`As ocorrências de “${item.description}” a partir de ${from} serão removidas. As anteriores serão preservadas. Em falha, repita o cancelamento para concluir a limpeza.`}
          confirmText="Confirmar cancelamento"
          isDestructive
          isLoading={busy}
        />
        {message && <p role="status">{message}</p>}
      </CardContent>
    </Card>
  )
}
export default function SeriesPage() {
  const { month } = useWorkMonth()
  const series = useTransactionSeries()
  const categories = useCategories()
  const cards = useCreditCards()
  const { values, setValues } = useManagementFilters()
  const [message, setMessage] = useState('')
  const filteredSeries = (series.data ?? []).filter((item) =>
    matchesSeries(item, values, month),
  )
  if (series.error)
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
        description={`Mês de trabalho: ${month}. Todas as séries estão disponíveis abaixo. Crie uma série pelo formulário de lançamento.`}
      />
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
          } catch {
            setMessage(
              'Geração interrompida. Repita para retomar sem duplicatas.',
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
                    perform={series.perform}
                    month={month}
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
