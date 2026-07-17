export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'investment' | 'both'
  icon: string // Nome do ícone Lucide (ex: 'ShoppingCart')
  color: string // Cor HSL, HEX ou OKLCH
  isDefault: boolean
  createdAt: unknown
  updatedAt: unknown
}
