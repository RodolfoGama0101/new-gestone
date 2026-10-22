export interface CreditCard {
  id: string
  name: string            // Ex: "Nubank", "Itaú Platinum"
  bankName: string        // Ex: "Nubank", "Itaú", "Bradesco"
  brand: 'visa' | 'mastercard' | 'elo' | 'other'
  holderName: string      // Nome do titular
  closingDay: number      // Dia do fechamento (1-31)
  dueDay?: number | null // Vencimento opcional; registros antigos continuam válidos
  color: string           // Cor do cartão (hex/hsl) para visual
  isActive: boolean       // Permite desativar sem deletar
  archived?: boolean     // Arquivamento permanente preserva referências e faturas
  createdAt: unknown
  updatedAt: unknown
}
