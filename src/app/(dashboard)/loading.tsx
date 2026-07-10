import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Header Section Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Grid Principal do Dashboard */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Coluna Esquerda/Meio: Cards Financeiros */}
        <div className="md:col-span-2 space-y-8">
          {/* Card de Saldo Líquido com Sparkline */}
          <Skeleton className="h-[160px] w-full rounded-2xl" />

          {/* Cards de Receitas e Despesas */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-[130px] w-full rounded-2xl" />
            <Skeleton className="h-[130px] w-full rounded-2xl" />
          </div>
        </div>

        {/* Coluna Direita: Lançamentos Recentes */}
        <div className="md:col-span-1">
          <Skeleton className="h-[380px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
