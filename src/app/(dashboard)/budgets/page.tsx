'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useBudget } from '@/hooks/use-budget'
import { useCategories } from '@/hooks/use-categories'
import { parseBudgetAmount } from '@/lib/utils/budget'
import {
  formatMoney as formatCurrency,
  formatCsvAmount,
} from '@/lib/utils/format-money'
import { PageHeader } from '@/components/shared/page-header'
import { LoadError } from '@/components/shared/load-error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
    <div className="space-y-8">
      <PageHeader
        title="Orçamentos e metas"
        description="Limites de consumo e meta de economia por mês, em reais."
      />
      <label className="block max-w-xs space-y-1 text-sm">
        Mês de competência
        <Input
          type="month"
          value={month}
          disabled={budget.saving}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value)
              setMessage('')
              setGoal('')
              setLimit('')
            }
          }}
        />
      </label>
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
            <CardHeader className="border-border border-b pb-6">
              <CardTitle>Meta de economia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p>
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
              {budget.data?.goal && (
                <progress
                  className="[&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary h-2 w-full appearance-none overflow-hidden rounded-full"
                  max={budget.data.goal}
                  value={Math.max(
                    0,
                    Math.min(budget.data.savings, budget.data.goal),
                  )}
                  aria-label="Progresso da meta de economia"
                  aria-valuetext={
                    formatCurrency(budget.data.savings) +
                    ' de ' +
                    formatCurrency(budget.data.goal)
                  }
                />
              )}
              <p className="text-muted-foreground text-sm">
                Economia = receitas menos despesas de consumo; inclui o valor
                investido e o saldo mantido.
              </p>
              <form
                className="border-border flex min-w-0 flex-wrap items-end gap-3 border-t pt-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  void act(() => budget.save({ goal: parseBudgetAmount(goal) }))
                }}
              >
                <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
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
            <CardHeader className="border-border border-b pb-6">
              <CardTitle>Limites por categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    className="border-border min-w-0 space-y-4 border-b pb-6 [overflow-wrap:anywhere]"
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
                    <progress
                      className="[&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary h-2 w-full appearance-none overflow-hidden rounded-full"
                      max={item.amount}
                      value={Math.min(spent, item.amount)}
                      aria-label={'Consumo de ' + (category?.name || item.name)}
                      aria-valuetext={
                        formatCurrency(spent) +
                        ' de ' +
                        formatCurrency(item.amount)
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
                className="border-border flex min-w-0 flex-wrap items-end gap-3 border-t pt-6"
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
                <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
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
                <label className="grid w-full min-w-0 gap-2 text-sm sm:w-auto">
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
