import { Timestamp } from 'firebase/firestore'

/**
 * Converte qualquer representação de data do Firestore em um objeto Date nativo.
 * Centraliza a lógica que estava duplicada nas páginas de receitas, despesas e
 * no componente de transações recentes.
 */
export function parseFirestoreDate(dateVal: unknown): Date {
  if (!dateVal) return new Date()
  if (dateVal instanceof Date) return dateVal
  if (dateVal instanceof Timestamp) return dateVal.toDate()

  const record = dateVal as { seconds?: number }
  if (record && typeof record.seconds === 'number') {
    return new Date(record.seconds * 1000)
  }

  return new Date(dateVal as string | number)
}
