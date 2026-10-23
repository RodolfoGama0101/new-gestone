'use client'

interface TooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
}

interface GeistChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  valueFormatter?: (value: number) => string
}

const SERIES_LABELS: Record<string, string> = {
  income: 'Receitas',
  expense: 'Despesas',
  investment: 'Investimentos',
  balance: 'Saldo acumulado',
}

export function GeistChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: GeistChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground max-w-[min(280px,calc(100vw-2rem))] rounded-lg border p-3 text-xs shadow-sm">
      {label && (
        <p className="mb-3 border-b pb-2 font-medium capitalize">{label}</p>
      )}
      <dl className="space-y-2">
        {payload.map((item, index) => {
          const value = Number(item.value)
          return (
            <div
              key={index}
              className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"
            >
              <dt className="text-muted-foreground flex min-w-0 items-start gap-2">
                <span
                  className="mt-1 size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color ?? 'var(--chart-1)' }}
                  aria-hidden="true"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {SERIES_LABELS[item.name ?? ''] ?? item.name}
                </span>
              </dt>
              <dd className="font-medium [overflow-wrap:anywhere] tabular-nums">
                {Number.isFinite(value)
                  ? valueFormatter
                    ? valueFormatter(value)
                    : value.toLocaleString('pt-BR')
                  : String(item.value ?? '')}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
