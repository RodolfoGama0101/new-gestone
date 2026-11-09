import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Coins,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Repeat2,
  Settings,
  Tag,
  Target,
} from 'lucide-react'

export const navigationGroups = [
  {
    label: 'Visão geral',
    items: [{ label: 'Painel', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Movimentações',
    items: [
      { label: 'Extrato', href: '/transactions', icon: Receipt },
      { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
      { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
      { label: 'Investimentos', href: '/investments', icon: Coins },
      { label: 'Cartões', href: '/credit-cards', icon: CreditCard },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Séries', href: '/series', icon: Repeat2 },
      { label: 'Orçamentos', href: '/budgets', icon: Target },
      { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Organização',
    items: [
      { label: 'Categorias', href: '/categories', icon: Tag },
      { label: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
]

export const navigationItems = navigationGroups.flatMap(({ items }) => items)
