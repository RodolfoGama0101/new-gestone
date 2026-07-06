export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number // Valor armazenado em centavos (ex: 1550 = R$ 15,50)
  description: string
  categoryId: string
  date: unknown // Firestore Timestamp ou Date
  tags: string[]
  notes: string | null
  recurring: boolean
  createdAt: unknown
  updatedAt: unknown
}
