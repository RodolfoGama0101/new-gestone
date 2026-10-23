import {
  LayoutDashboard,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
  CreditCard,
  Repeat2,
  Target,
  BarChart3,
  Tag,
  Settings,
} from 'lucide-react'

export const navigationGroups = [
  {
    label: 'Visão geral',
    items: [
      { label: 'Painel', href: '/', icon: LayoutDashboard },
      { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Movimentações',
    items: [
      { label: 'Extrato', href: '/transactions', icon: Receipt },
      { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
      { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
      { label: 'Investimentos', href: '/investments', icon: Coins },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Cartões', href: '/credit-cards', icon: CreditCard },
      { label: 'Recorrências e parcelas', href: '/series', icon: Repeat2 },
      { label: 'Orçamentos e metas', href: '/budgets', icon: Target },
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

export const navigationItems = navigationGroups.flatMap((group) => group.items)
export const mobileNavigationItems = [
  '/',
  '/transactions',
  '/credit-cards',
].map((href) => navigationItems.find((item) => item.href === href)!)
