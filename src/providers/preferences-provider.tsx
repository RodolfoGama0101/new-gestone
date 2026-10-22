'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { PreferencesService } from '@/services/preferences.service'
import type { ThemePreference } from '@/types/preferences'
import { toast } from 'sonner'

const PreferencesContext = createContext({
  theme: 'system', isLoading: false, isSaving: false, error: null as Error | null,
  changeTheme: async (theme: ThemePreference): Promise<void> => { void theme },
  refetch: () => {},
})

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const client = useQueryClient()
  const userId = user?.uid ?? ''
  const queryKey = ['preferences', userId]
  const query = useQuery({ queryKey, queryFn: () => PreferencesService.get(userId), enabled: !!userId })
  const mutation = useMutation({
    mutationFn: (next: { userId: string; theme: ThemePreference }) => PreferencesService.save(next.userId, { theme: next.theme }),
    onSuccess: (_result, next) => { client.setQueryData(['preferences', next.userId], { theme: next.theme }) },
    onError: () => toast.error('Não foi possível salvar o tema. Tente novamente.'),
  })
  useEffect(() => {
    if (userId) setTheme(query.data?.theme ?? 'system')
  }, [userId, query.data?.theme, setTheme])

  const changeTheme = async (next: ThemePreference) => {
    if (!userId) { setTheme(next); return }
    await mutation.mutateAsync({ userId, theme: next })
  }
  return <PreferencesContext.Provider value={{
    theme: userId ? query.data?.theme ?? 'system' : theme ?? 'system',
    isLoading: !!userId && query.isPending, isSaving: mutation.isPending,
    error: query.error, changeTheme, refetch: () => { void query.refetch() },
  }}>{children}</PreferencesContext.Provider>
}

export function usePreferences() { return useContext(PreferencesContext) }
