'use client'

import { formatMoney } from '@/lib/utils/format-money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryShare } from '@/lib/utils/analytics-helper'

export function CategoryDonutChart({ data }: { data: CategoryShare[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem dados de despesas no período selecionado.
          </p>
        ) : (
          <>
            <ul aria-label="Despesas por categoria" className="space-y-5">
              {data.map((item, index) => {
                const ratio = total > 0 ? item.value / total : 0
                return (
                  <li key={index}>
                    <div className="flex flex-wrap justify-between gap-3 text-sm">
                      <span className="[overflow-wrap:anywhere]">
                        {item.name}
                      </span>
                      <span className="tabular-nums">
                        <span>{formatMoney(item.value)}</span>{' '}
                        <span aria-hidden="true">·</span>{' '}
                        <span className="text-muted-foreground">
                          {ratio.toLocaleString('pt-BR', {
                            style: 'percent',
                            maximumFractionDigits: 1,
                          })}
                        </span>
                      </span>
                    </div>
                    <div
                      className="bg-accent mt-3 h-1.5 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="border-border mt-5 flex flex-wrap justify-between gap-3 border-t pt-4 text-sm">
              <span>Total de despesas</span>
              <span className="font-medium tabular-nums">
                {formatMoney(total)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
