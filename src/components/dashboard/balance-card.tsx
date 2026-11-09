'use client'

import { formatMoney } from '@/lib/utils/format-money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { workMonthHref } from '@/lib/utils/work-month'
import { format } from 'date-fns'
import { formatDashboardChange } from './summary-cards'
import { Skeleton } from '@/components/ui/skeleton'

interface DailyPoint {
  date: string
  balance: number
}
interface BalanceCardProps {
  balance: number
  changePercent: number | null
  data: DailyPoint[]
  isLoading?: boolean
  futureCardExpenses?: number
  availableBalance?: number
  referenceDate?: Date
  selectedMonth?: Date
}

export function BalanceCard({
  balance,
  changePercent,
  data,
  isLoading = false,
  futureCardExpenses = 0,
  availableBalance = balance,
  referenceDate,
  selectedMonth,
}: BalanceCardProps) {
  if (isLoading)
    return (
      <Card role="status" aria-label="Carregando resultado projetado">
        <CardContent className="bg-chart-soft space-y-4 p-4 min-[601px]:p-6">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-10 w-44 max-w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
        <div className="border-border flex gap-4 border-t p-4 min-[601px]:p-6">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </Card>
    )

  // O SVG também representa séries constantes ou com um único ponto.
  // Somente a coordenada visual é normalizada; os valores são centavos.
  const points = data.filter((point) => Number.isFinite(point.balance))
  const min = Math.min(0, ...points.map((point) => point.balance))
  const max = Math.max(0, ...points.map((point) => point.balance))
  const range = max - min || 1
  const baseline = 155 - ((0 - min) / range) * 135
  const coordinates = points.map(
    (point, index) =>
      `${points.length === 1 ? 300 : (index / (points.length - 1)) * 600},${155 - ((point.balance - min) / range) * 135}`,
  )
  const path =
    coordinates.length === 1
      ? `M0 ${coordinates[0].split(',')[1]}H600`
      : coordinates.length
        ? `M${coordinates.join('L')}`
        : ''
  const labels =
    points.length > 2
      ? [
          points[0],
          points[Math.floor((points.length - 1) / 2)],
          points[points.length - 1],
        ]
      : points
  const changeLabel = formatDashboardChange(changePercent)

  return (
    <Card className="rounded-xl">
      <div className="bg-chart-soft">
        <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-none border-0 px-4 pt-4 pb-1 min-[601px]:px-6 min-[601px]:pt-6">
          <CardTitle className="text-sm">
            <Link
              className="underline-offset-4 hover:underline"
              href={workMonthHref(
                '/transactions',
                format(selectedMonth ?? new Date(), 'yyyy-MM'),
              )}
            >
              Resultado projetado do mês
            </Link>
          </CardTitle>
          {selectedMonth && (
            <span className="text-muted-foreground text-xs">
              {selectedMonth.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
        </CardHeader>
        <CardContent className="px-4 pt-1 pb-3 min-[601px]:px-6">
          <p className="text-[32px] leading-10 font-semibold tracking-[-0.04em] [overflow-wrap:anywhere] tabular-nums min-[601px]:text-[40px] min-[601px]:leading-12">
            {formatMoney(balance)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{changeLabel}</p>
          {path ? (
            <>
              <svg
                className="mt-3 block h-24 w-full min-[601px]:h-32"
                viewBox="0 0 600 180"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Evolução do resultado do mês. Resultado projetado: ${formatMoney(balance)}`}
              >
                <path
                  d="M0 20H600 M0 65H600 M0 110H600 M0 155H600"
                  stroke="var(--border)"
                  fill="none"
                />
                <path
                  d={`${path}V${baseline}H0Z`}
                  fill="var(--link)"
                  fillOpacity=".09"
                />
                <path
                  d={path}
                  stroke="var(--link)"
                  strokeWidth="2"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
                {labels.map((point, index) => (
                  <span key={index}>{point.date}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground mt-3 flex min-h-24 items-center text-sm">
              Sem dados de evolução para este mês.
            </p>
          )}
        </CardContent>
      </div>
      <CardContent className="border-border border-t p-4 min-[601px]:p-6">
        <dl className="divide-border grid gap-y-3 divide-y text-sm min-[601px]:grid-cols-2 min-[601px]:gap-x-4 min-[601px]:divide-x min-[601px]:divide-y-0">
          <div className="min-w-0 pb-3 min-[601px]:pb-0">
            <dt className="text-muted-foreground text-xs">
              Reserva para faturas futuras
            </dt>
            <dd className="mt-1 text-xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
              {formatMoney(futureCardExpenses)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">
              Saldo disponível após reserva
            </dt>
            <dd className="mt-1 text-xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
              {formatMoney(availableBalance)}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground mt-3 text-xs">
          Reservas de compras realizadas{' '}
          {referenceDate
            ? `até ${referenceDate.toLocaleDateString('pt-BR')}`
            : 'até a referência'}
          , com competência posterior ao mês. Disponível = resultado − reservas.
        </p>
        <details className="text-muted-foreground mt-2 text-xs">
          <summary className="hover:text-foreground focus-visible:outline-ring min-h-8 cursor-pointer py-2">
            Sobre a projeção
          </summary>
          <p>
            Projeção dos lançamentos cadastrados, sem conciliação de saldo
            bancário. Receitas − despesas − aportes. Inclui a fatura deste mês.
          </p>
        </details>
        <details className="text-muted-foreground text-xs">
          <summary className="hover:text-foreground focus-visible:outline-ring min-h-8 cursor-pointer py-2">
            Ver resultado acumulado por dia
          </summary>
          <dl>
            {points.map((point) => (
              <div
                key={point.date}
                className="border-border flex flex-wrap justify-between gap-2 border-b py-2"
              >
                <dt>{point.date}</dt>
                <dd className="tabular-nums">{formatMoney(point.balance)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </CardContent>
    </Card>
  )
}
