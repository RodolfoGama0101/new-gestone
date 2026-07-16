'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dados considerados "frescos" por 5 minutos — evita refetches desnecessários
            staleTime: 5 * 60 * 1000,
            // Mantém o cache por 10 minutos após o último subscriber sair
            gcTime: 10 * 60 * 1000,
            // Firestore já tem retry interno; 1 tentativa extra é suficiente
            retry: 1,
            // Desativa refetch automático ao focar a janela — muito agressivo para
            // um app financeiro com dados que só mudam por ação explícita do usuário
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
