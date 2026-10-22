import type { QueryClient } from '@tanstack/react-query'

export const transactionPaginationKey = (userId: string) => ['transactionPagination', userId] as const

export async function invalidateTransactionData(client: QueryClient, userId: string) {
  // Uma nova revisão invalida também os snapshots de cursor mantidos pelos hooks.
  // Invalidar só os dados pode deixar uma página refazer a consulta com um cursor antigo.
  client.setQueryData<number>(transactionPaginationKey(userId), (revision = 0) => revision + 1)
  await Promise.all(['transactions', 'analytics', 'analyticsHistory', 'creditCards', 'budgets', 'transactionSeries'].map((key) =>
    client.invalidateQueries({ queryKey: [key, userId] })))
}
