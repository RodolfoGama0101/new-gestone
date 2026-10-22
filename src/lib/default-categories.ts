import { Category } from '@/types/category'

export const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Receitas
  { name: 'Salário', type: 'income', icon: 'Briefcase', color: '#2563eb', isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#16a34a', isDefault: true },
  { name: 'Prêmios / Presentes', type: 'income', icon: 'Gift', color: '#ec4899', isDefault: true },
  { name: 'Outras Receitas', type: 'income', icon: 'Coins', color: '#4b5563', isDefault: true },
  // Despesas
  { name: 'Alimentação', type: 'expense', icon: 'Utensils', color: '#dc2626', isDefault: true },
  { name: 'Supermercado', type: 'expense', icon: 'ShoppingBag', color: '#059669', isDefault: true },
  { name: 'Transporte', type: 'expense', icon: 'Car', color: '#ea580c', isDefault: true },
  { name: 'Moradia', type: 'expense', icon: 'Home', color: '#d97706', isDefault: true },
  { name: 'Saúde', type: 'expense', icon: 'HeartPulse', color: '#0891b2', isDefault: true },
  { name: 'Educação', type: 'expense', icon: 'GraduationCap', color: '#4f46e5', isDefault: true },
  { name: 'Lazer', type: 'expense', icon: 'Sparkles', color: '#db2777', isDefault: true },
  { name: 'Assinaturas / Serviços', type: 'expense', icon: 'Tv', color: '#0284c7', isDefault: true },
  { name: 'Vestuário', type: 'expense', icon: 'Shirt', color: '#8b5cf6', isDefault: true },
  { name: 'Outras Despesas', type: 'expense', icon: 'CreditCard', color: '#6b7280', isDefault: true },
  // Investimentos
  { name: 'Renda Fixa', type: 'investment', icon: 'Landmark', color: '#2563eb', isDefault: true },
  { name: 'Renda Variável', type: 'investment', icon: 'TrendingUp', color: '#16a34a', isDefault: true },
  { name: 'FIIs', type: 'investment', icon: 'Building2', color: '#06b6d4', isDefault: true },
  { name: 'Cripto', type: 'investment', icon: 'Bitcoin', color: '#f97316', isDefault: true },
  { name: 'Outros Investimentos', type: 'investment', icon: 'Wallet', color: '#7c3aed', isDefault: true },
]
