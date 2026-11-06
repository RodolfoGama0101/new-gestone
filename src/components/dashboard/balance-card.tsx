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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-44 w-full" />
        </CardContent>
      </Card>
    )

  // O SVG também representa séries constantes ou com um único ponto.
  // Somente a coordenada visual é normalizada; os valores são centavos.
  const points = data.filter((point) => Number.isFinite(point.balance))
  const min = Math.min(0, ...points.map((point) => point.balance))
  const max = Math.max(0, ...points.map((point) => point.balance))
  const range = max - min || 1
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
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
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
          <span className="bg-accent text-muted-foreground rounded-full px-2.5 py-1 text-xs">
            {selectedMonth.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-3xl leading-10 font-medium tracking-tight break-all tabular-nums">
          {formatMoney(balance)}
        </p>
        <p className="text-muted-foreground mt-2 text-[13px]">
          Receitas − despesas − aportes
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {changeLabel}. Inclui a fatura deste mês.
        </p>
        {path ? (
          <>
            <svg
              className="mt-5 block h-[180px] w-full"
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
              <path d={`${path}V155H0Z`} fill="var(--chart-soft)" />
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
          <p className="text-muted-foreground py-8 text-sm">
            Sem dados de evolução para este mês.
          </p>
        )}
        <details className="text-muted-foreground mt-4 text-sm">
          <summary className="focus-visible:outline-ring cursor-pointer py-2">
            Ver resultado acumulado por dia
          </summary>
          <dl>
            {points.map((point) => (
              <div
                key={point.date}
                className="flex flex-wrap justify-between gap-2 py-1"
              >
                <dt>{point.date}</dt>
                <dd className="tabular-nums">{formatMoney(point.balance)}</dd>
              </div>
            ))}
          </dl>
        </details>
        <dl className="mt-2 text-[13px]">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b py-4">
            <dt className="text-muted-foreground">
              Reserva para faturas futuras
            </dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(futureCardExpenses)}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <dt>Saldo disponível após reserva</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(availableBalance)}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-xs">
          Reservas de compras realizadas{' '}
          {referenceDate
            ? `até ${referenceDate.toLocaleDateString('pt-BR')}`
            : 'até a referência'}
          , com competência posterior ao mês. Disponível = resultado − reservas.
        </p>
        <details className="text-muted-foreground text-xs">
          <summary className="focus-visible:outline-ring cursor-pointer py-2">
            Sobre a projeção
          </summary>
          <p>
            Projeção dos lançamentos cadastrados, sem conciliação de saldo
            bancário. {changeLabel}.
          </p>
        </details>
      </CardContent>
    </Card>
  )
}
