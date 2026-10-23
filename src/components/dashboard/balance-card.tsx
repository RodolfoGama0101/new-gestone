'use client'

import { formatMoney } from '@/lib/utils/format-money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface BalanceCardProps {
  balance: number
  changePercent: number
  data: { date: string; balance: number }[]
  isLoading?: boolean
  futureCardExpenses?: number
  availableBalance?: number
  referenceDate?: Date
}

export function BalanceCard({
  balance,
  changePercent,
  data,
  isLoading = false,
  futureCardExpenses = 0,
  availableBalance = balance,
  referenceDate,
}: BalanceCardProps) {
  if (isLoading)
    return (
      <Card aria-label="Carregando resumo financeiro" aria-busy="true">
        <CardContent className="space-y-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  const changeLabel = Number.isFinite(changePercent)
    ? (changePercent > 0 ? '+' : '') +
      changePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) +
      '% vs. mês anterior'
    : 'Sem base anterior'
  return (
    <Card className="border-t-primary relative min-w-0 gap-5 border-t-2">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm">
          Saldo projetado do mês
        </CardTitle>
        <p className="text-3xl font-semibold tracking-tight break-words tabular-nums sm:text-4xl">
          {formatMoney(balance)}
        </p>
        <p className="text-muted-foreground text-xs">{changeLabel}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Receitas menos despesas e investimentos do mês, incluindo a fatura
          deste mês.
        </p>
        <dl className="bg-muted grid gap-4 rounded-lg p-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <dt className="text-muted-foreground text-xs">
              Reserva para faturas após este mês
            </dt>
            <dd className="text-lg font-semibold break-words tabular-nums">
              {formatMoney(futureCardExpenses)}
            </dd>
          </div>
          <div className="min-w-0 space-y-2">
            <dt className="text-muted-foreground text-xs">
              Disponível após reservas
            </dt>
            <dd className="text-lg font-semibold break-words tabular-nums">
              {formatMoney(availableBalance)}
            </dd>
          </div>
        </dl>
        <Collapsible className="space-y-2">
          <CollapsibleTrigger
            render={<Button variant="ghost" className="-ml-3 text-sm" />}
          >
            Entenda esta projeção
          </CollapsibleTrigger>
          <CollapsibleContent className="text-muted-foreground text-sm leading-relaxed">
            {referenceDate
              ? 'Reservas de compras realizadas até ' +
                referenceDate.toLocaleDateString('pt-BR') +
                '.'
              : 'Reservas de compras realizadas para faturas dos próximos meses.'}{' '}
            Projeção dos lançamentos cadastrados; não representa o saldo de uma
            conta bancária. A reserva apenas evidencia compromissos futuros.
          </CollapsibleContent>
        </Collapsible>
        {data.length > 1 ? (
          <div aria-hidden="true" className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="var(--primary)"
                  fillOpacity={0.06}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground border-t pt-4 text-xs">
            A evolução aparece quando houver mais dados no período.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
