'use client'

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react'
import { useSearchParams } from 'next/navigation'
import {
  isWorkMonth,
  resolveWorkMonth,
  workMonthDate,
} from '@/lib/utils/work-month'

interface WorkMonthContextValue {
  month: string
  date: Date
  setMonth: (month: string) => void
}

const WorkMonthContext = createContext<WorkMonthContextValue | null>(null)
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}
const serverSnapshot = () => null

export function WorkMonthProvider({
  uid,
  children,
}: {
  uid: string
  children: React.ReactNode
}) {
  const params = useSearchParams()
  const urlMonth = params.get('month')
  const key = `gestone:work-month:${uid}`
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? ''
      } catch {
        return ''
      }
    },
    serverSnapshot,
  )
  const ready = saved !== null

  const month = resolveWorkMonth(urlMonth, saved)
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(key, month)
    } catch {
      /* Manter seleção em memória. */
    }
    if (!isWorkMonth(urlMonth)) {
      const url = new URL(window.location.href)
      url.searchParams.set('month', month)
      window.history.replaceState(null, '', url)
    }
  }, [key, month, ready, urlMonth])

  const setMonth = (value: string) => {
    if (!isWorkMonth(value)) return
    // A preferência acompanha o mês confirmado pela URL no efeito acima.
    const url = new URL(window.location.href)
    url.searchParams.set('month', value)
    url.searchParams.delete('startDate')
    url.searchParams.delete('endDate')
    window.history.pushState(null, '', url)
  }

  if (!ready)
    return (
      <p role="status" className="p-4">
        Carregando mês de trabalho…
      </p>
    )
  return (
    <WorkMonthContext.Provider
      value={{ month, date: workMonthDate(month), setMonth }}
    >
      {children}
    </WorkMonthContext.Provider>
  )
}

export function useWorkMonth() {
  const context = useContext(WorkMonthContext)
  if (!context) throw new Error('WorkMonthProvider ausente')
  return context
}
