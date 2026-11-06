'use client'

import { useState } from 'react'
import { useWorkMonth } from '@/providers/work-month-provider'
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
import { Label } from '@/components/ui/label'
import {
  ManagementFilters,
  useManagementFilters,
} from '@/components/shared/management-filters'
import { matchesBudget } from '@/lib/utils/management-filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BudgetsPage() {
  const { month } = useWorkMonth()
  return <BudgetMonth key={month} month={month} />
}

function BudgetMonth({ month }: { month: string }) {
  const budget = useBudget(month)
  const {
    categories,
    isLoading: categoriesLoading,
    error,
    refetch,
  } = useCategories()
  const { values, setValues } = useManagementFilters()
  const [message, setMessage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [isLimitFormOpen, setIsLimitFormOpen] = useState(false)
  const [goal, setGoal] = useState('')
  const budgetCategories = categories.filter(
    (category) => category.type === 'expense' || category.type === 'both',
  )
  const rows = [
    ...budgetCategories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      archived: !!category.archived,
      amount: budget.data?.limits.find(
        (item) => item.categoryId === category.id,
      )?.amount,
    })),
    ...(budget.data?.limits ?? [])
      .filter(
        (item) =>
          !budgetCategories.some((category) => category.id === item.categoryId),
      )
      .map((item) => ({ ...item, archived: true })),
  ]
  const filteredRows = rows.filter((item) =>
    matchesBudget(
      item.categoryId,
      item.amount,
      budget.data?.expenses[item.categoryId] || 0,
      values,
    ),
  )
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
        description="Defina sua meta de economia e os limites de gastos do mês."
      />

      <details className="text-muted-foreground text-sm">
        <summary className="cursor-pointer">
          Sobre as metas e a competência
        </summary>
        <p>
          Compras no cartão seguem a competência da fatura, como no painel.
          Limites não são transportados para o mês seguinte. Investimentos
          contam como economia, sem dedução adicional de reservas futuras.
        </p>
      </details>
      {budget.isLoading || categoriesLoading ? (
        <p role="status">Carregando orçamento…</p>
      ) : (
        <>
          <Card>
            <CardHeader className="border-border border-b">
              <CardTitle>Meta de economia</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void act(() => budget.save({ goal: parseBudgetAmount(goal) }))
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-2 text-[13px]">
                    Meta em R$
                    <Input
                      inputMode="decimal"
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      placeholder={
                        budget.data?.goal
                          ? formatCsvAmount(budget.data.goal)
                          : '500,00'
                      }
                      required
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-[13px]">
                    Economia atual
                    <Input
                      readOnly
                      value={formatCurrency(budget.data?.savings || 0)}
                    />
                  </label>
                </div>
                {budget.data?.goal ? (
                  <>
                    <progress
                      className="[&::-webkit-progress-bar]:bg-accent h-1.5 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-current [&::-webkit-progress-value]:bg-current"
                      style={{
                        color:
                          budget.data.savings >= budget.data.goal
                            ? 'var(--income)'
                            : 'var(--primary)',
                      }}
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
                    <p className="flex flex-wrap justify-between gap-3 text-[13px]">
                      <span
                        className={
                          budget.data.savings >= budget.data.goal
                            ? 'text-income'
                            : 'text-muted-foreground'
                        }
                      >
                        {budget.data.savings >= budget.data.goal
                          ? 'Meta atingida'
                          : 'Meta em andamento'}
                      </span>
                      <span>
                        {budget.data.savings >= budget.data.goal
                          ? formatCurrency(
                              budget.data.savings - budget.data.goal,
                            ) + ' acima da meta'
                          : 'Faltam ' +
                            formatCurrency(
                              budget.data.goal - budget.data.savings,
                            )}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma meta definida para este mês.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
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
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-border border-b">
              <CardTitle>Limites por categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ManagementFilters
                values={values}
                setValues={setValues}
                fields={[
                  {
                    key: 'categoryId',
                    label: 'Filtrar categoria',
                    options: rows.map((item) => ({
                      value: item.categoryId,
                      label: `${item.name}${item.archived ? ' (arquivada)' : ''}`,
                    })),
                  },
                  {
                    key: 'status',
                    label: 'Situação do limite',
                    options: [
                      { value: 'none', label: 'Sem limite' },
                      { value: 'within', label: 'Dentro do limite' },
                      { value: 'exceeded', label: 'Excedido' },
                    ],
                  },
                ]}
              />
              {!budget.data?.limits.length && (
                <p>Nenhum limite definido para este mês.</p>
              )}
              {!rows.length && <p>Nenhuma categoria de despesa cadastrada.</p>}
              {rows.length > 0 && !filteredRows.length && (
                <p>
                  Nenhuma categoria corresponde aos filtros. Altere ou limpe os
                  filtros.
                </p>
              )}
              {filteredRows.map((item) => {
                const spent = budget.data?.expenses[item.categoryId] || 0
                return (
                  <div
                    key={item.categoryId}
                    className="border-border min-w-0 space-y-4 border-b pb-6 [overflow-wrap:anywhere]"
                  >
                    <h3 className="font-medium">
                      {item.name}
                      {item.archived ? ' (arquivada)' : ''}
                    </h3>
                    {item.amount === undefined ? (
                      <p className="text-sm">
                        Sem limite · Realizado: {formatCurrency(spent)}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm">
                          Limite: {formatCurrency(item.amount)} · Realizado:{' '}
                          {formatCurrency(spent)} ·{' '}
                          {spent > item.amount
                            ? `Excesso: ${formatCurrency(spent - item.amount)}`
                            : `Restante: ${formatCurrency(item.amount - spent)}`}
                        </p>
                        <progress
                          className="[&::-webkit-progress-bar]:bg-muted h-1.5 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-current [&::-webkit-progress-value]:bg-current"
                          style={{
                            color:
                              spent >= item.amount
                                ? 'var(--expense)'
                                : spent / item.amount >= 0.8
                                  ? 'var(--warning)'
                                  : 'var(--primary)',
                          }}
                          max={item.amount}
                          value={Math.min(spent, item.amount)}
                          aria-label={'Consumo de ' + item.name}
                          aria-valuetext={
                            formatCurrency(spent) +
                            ' de ' +
                            formatCurrency(item.amount)
                          }
                        />
                      </>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {item.amount !== undefined && (
                        <>
                          <Button
                            variant="outline"
                            disabled={budget.saving || item.archived}
                            onClick={() => {
                              if (item.amount === undefined) return
                              setIsLimitFormOpen(true)
                              setCategoryId(item.categoryId)
                              setLimit(
                                formatCsvAmount(item.amount).replaceAll(
                                  '.',
                                  '',
                                ),
                              )
                            }}
                          >
                            Editar limite
                          </Button>
                          <Button
                            variant="outline"
                            disabled={budget.saving}
                            onClick={() =>
                              act(() =>
                                budget.save({ remove: item.categoryId }),
                              )
                            }
                          >
                            Remover limite
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <Button
                variant="outline"
                onClick={() => setIsLimitFormOpen((value) => !value)}
                aria-expanded={isLimitFormOpen}
              >
                Adicionar limite
              </Button>
              {isLimitFormOpen && (
                <form
                  className="border-border flex min-w-0 flex-wrap items-end gap-3 border-t pt-6"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void act(async () => {
                      const category = categories.find(
                        (c) => c.id === categoryId,
                      )
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
                  <div className="grid w-full min-w-0 gap-2 text-[13px] sm:w-auto">
                    <Label htmlFor="budget-category">Categoria</Label>
                    <Select
                      required
                      disabled={budget.saving}
                      value={categoryId}
                      onValueChange={(value) => setCategoryId(value ?? '')}
                      items={categories
                        .filter(
                          (c) =>
                            !c.archived &&
                            (c.type === 'expense' || c.type === 'both'),
                        )
                        .map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <SelectTrigger
                        id="budget-category"
                        className="h-10 min-w-0 sm:min-w-44"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent side="top" alignItemWithTrigger={false}>
                        {categories
                          .filter(
                            (c) =>
                              !c.archived &&
                              (c.type === 'expense' || c.type === 'both'),
                          )
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="grid w-full min-w-0 gap-2 text-[13px] sm:w-auto">
                    Limite em R$
                    <Input
                      className="h-10"
                      disabled={budget.saving}
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
              )}

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
