'use client'
import { useEffect, useState } from 'react'

export function useCurrentDate() {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(refresh, Math.max(1000, midnight.getTime() - now.getTime() + 50))
    }
    const refresh = () => {
      const now = new Date()
      setDate((previous) => previous.toDateString() === now.toDateString() ? previous : now)
      clearTimeout(timer)
      schedule()
    }
    schedule()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return date
}
