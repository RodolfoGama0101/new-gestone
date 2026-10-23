'use client'

import { useState } from 'react'
import { format, parse } from 'date-fns'
import { useBudget } from '@/hooks/use-budget'
import { useCategories } from '@/hooks/use-categories'
import { parseBudgetAmount } from '@/lib/utils/budget'
import {
  formatMoney as formatCurrency,
  formatCsvAmount,
} from '@/lib/utils/format-money'
import { PageHeader } from '@/components/shared/page-header'
import { LoadError } from '@/components/shared/load-error'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { MonthSelector } from '@/components/shared/month-selector'
import { Button } from '@/components/ui/button'

export default function BudgetsPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const budget = useBudget(month)
  const { categories, error, refetch } = useCategories()
  const [message, setMessage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [goal, setGoal] = useState('')
  const act = async (operation: () => Promise<unknown>) => {
    setMessage('')
    try {
      await operation()
      setMessage('Orçamento atualizado.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar. Tente novamente.',
      )
    }
  }
  if (budget.error || error)
    return (
      <LoadError
        error={budget.error || error}
        retry={() => Promise.all([budget.refetch(), refetch()])}
      />
    )
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos e metas"
        description="Limites de consumo e meta de economia por mês, em reais."
      />
      <MonthSelector
        value={parse(month, 'yyyy-MM', new Date())}
        disabled={budget.saving}
        label="Mês de competência"
        onChange={(date) => {
          setMonth(format(date, 'yyyy-MM'))
          setMessage('')
          setGoal('')
          setLimit('')
        }}
      />
      <p className="text-muted-foreground text-sm">
        Compras no cartão seguem a competência da fatura, como no painel.
        Limites não são transportados para o mês seguinte. Investimentos contam
        como economia, sem dedução adicional de reservas futuras.
      </p>
      {budget.isLoading ? (
        <p role="status">Carregando orçamento…</p>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 pt-5">
              <h2 className="font-semibold">Meta de economia</h2>
              <p className="text-xl font-semibold break-words tabular-nums">
                Economia realizada: {formatCurrency(budget.data?.savings || 0)}
              </p>
              {budget.data?.goal ? (
                <p>
                  Meta: {formatCurrency(budget.data.goal)} ·{' '}
                  {budget.data.savings >= budget.data.goal
                    ? 'Meta atingida'
                    : `Faltam ${formatCurrency(budget.data.goal - budget.data.savings)}`}
                </p>
              ) : (
                <p>Nenhuma meta definida para este mês.</p>
              )}
              {!!budget.data?.goal && (
                <Progress
                  aria-label="Progresso da meta de economia"
                  aria-valuetext={
                    formatCurrency(budget.data.savings) +
                    ' de ' +
                    formatCurrency(budget.data.goal)
                  }
                  value={Math.max(
                    0,
                    Math.min(
                      100,
                      (budget.data.savings / budget.data.goal) * 100,
                    ),
                  )}
                />
              )}
              <p className="text-muted-foreground text-sm">
                Economia = receitas menos despesas de consumo; inclui o valor
                investido e o saldo mantido.
              </p>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void act(() => budget.save({ goal: parseBudgetAmount(goal) }))
                }}
              >
                <label className="text-sm">
                  Meta em R$
                  <Input
                    inputMode="decimal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="500,00"
                    required
                  />
                </label>
                <Button type="submit" disabled={budget.saving}>
                  Salvar meta
                </Button>
                {budget.data?.goal && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={budget.saving}
                    onClick={() =>
                      act(() => budget.save({ remove: undefined }))
                    }
                  >
                    Remover meta
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-5">
              <h2 className="font-semibold">Limites por categoria</h2>
              {!budget.data?.limits.length && (
                <p>Nenhum limite definido para este mês.</p>
              )}
              {budget.data?.limits.map((item) => {
                const spent = budget.data.expenses[item.categoryId] || 0
                const category = categories.find(
                  (c) => c.id === item.categoryId,
                )
                return (
                  <div
                    key={item.categoryId}
                    className="space-y-3 border-b pb-5 last:border-0"
                  >
                    <h3 className="font-medium">
                      {category?.name || item.name}
                      {!category || category.archived ? ' (arquivada)' : ''}
                    </h3>
                    <p className="text-sm">
                      Limite: {formatCurrency(item.amount)} · Realizado:{' '}
                      {formatCurrency(spent)} ·{' '}
                      {spent > item.amount
                        ? `Excesso: ${formatCurrency(spent - item.amount)}`
                        : `Restante: ${formatCurrency(item.amount - spent)}`}
                    </p>
                    <Progress
                      aria-label={'Consumo de ' + (category?.name || item.name)}
                      aria-valuetext={
                        formatCurrency(spent) +
                        ' de ' +
                        formatCurrency(item.amount) +
                        (spent > item.amount ? ' — limite excedido' : '')
                      }
                      value={Math.max(
                        0,
                        Math.min(100, (spent / item.amount) * 100),
                      )}
                      className={
                        spent > item.amount
                          ? '[&_[data-slot=progress-indicator]]:bg-expense'
                          : ''
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={budget.saving}
                        onClick={() => {
                          setCategoryId(item.categoryId)
                          setLimit(
                            formatCsvAmount(item.amount).replaceAll('.', ''),
                          )
                        }}
                      >
                        Editar limite
                      </Button>
                      <Button
                        variant="outline"
                        disabled={budget.saving}
                        onClick={() =>
                          act(() => budget.save({ remove: item.categoryId }))
                        }
                      >
                        Remover limite
                      </Button>
                    </div>
                  </div>
                )
              })}
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void act(async () => {
                    const category = categories.find((c) => c.id === categoryId)
                    if (!category || category.archived)
                      throw new Error(
                        'Selecione uma categoria ativa de despesa.',
                      )
                    await budget.save({
                      limit: {
                        categoryId,
                        name: category.name,
                        amount: parseBudgetAmount(limit),
                      },
                    })
                  })
                }}
              >
                <label className="min-w-0 text-sm">
                  Categoria
                  <select
                    aria-label="Categoria"
                    className="bg-background block h-11 w-full rounded-md border px-2"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {categories
                      .filter(
                        (c) =>
                          !c.archived &&
                          (c.type === 'expense' || c.type === 'both'),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm">
                  Limite em R$
                  <Input
                    required
                    inputMode="decimal"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="300,00"
                  />
                </label>
                <Button type="submit" disabled={budget.saving}>
                  Salvar limite
                </Button>
              </form>
              <p className="text-muted-foreground text-sm">
                Categorias arquivadas mantêm o histórico e permitem remover
                limites. Para editar, use uma categoria ativa.
              </p>
            </CardContent>
          </Card>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  )
}
