'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Category } from '@/types/category'
import { 
  Tag, 
  Trash2, 
  Pencil, 
  Loader2,
  Briefcase,
  Laptop,
  TrendingUp,
  Coins,
  Utensils,
  Car,
  Home,
  Sparkles,
  HeartPulse,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Plane,
  Gift,
  DollarSign,
  PiggyBank,
  Check
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'

// Mapeamento dos ícones para o selecionador
const AVAILABLE_ICONS = [
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Laptop', icon: Laptop },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Coins', icon: Coins },
  { name: 'Utensils', icon: Utensils },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'HeartPulse', icon: HeartPulse },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Plane', icon: Plane },
  { name: 'Gift', icon: Gift },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'PiggyBank', icon: PiggyBank },
]

// Mapeamento de cores pré-definidas
const PRESET_COLORS = [
  '#dc2626', // Vermelho
  '#ea580c', // Laranja
  '#d97706', // Âmbar
  '#16a34a', // Verde
  '#0891b2', // Ciano
  '#2563eb', // Azul
  '#7c3aed', // Violeta
  '#db2777', // Rosa
  '#a855f7', // Fuchsia
  '#4b5563', // Cinza
]

// Renderizador dinâmico de ícones Lucide
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] || Icons.HelpCircle
  return <IconComponent className={className} />
}

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories()

  // Estados do Formulário
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<'income' | 'expense'>('expense')
  const [selectedIcon, setSelectedIcon] = React.useState('Utensils')
  const [selectedColor, setSelectedColor] = React.useState('#dc2626')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Estados de Deleção
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Resetar Formulário
  const resetForm = () => {
    setEditingId(null)
    setName('')
    setType('expense')
    setSelectedIcon('Utensils')
    setSelectedColor('#dc2626')
  }

  // Preencher formulário para edição
  const handleEditClick = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    if (cat.type === 'income' || cat.type === 'expense') {
      setType(cat.type)
    } else {
      setType('expense')
    }
    setSelectedIcon(cat.icon)
    setSelectedColor(cat.color)
  }

  // Submeter Criação/Edição
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingId) {
        await updateCategory({
          categoryId: editingId,
          data: { name, type, icon: selectedIcon, color: selectedColor },
        })
        toast.success('Categoria atualizada com sucesso!')
      } else {
        await createCategory({
          name,
          type,
          icon: selectedIcon,
          color: selectedColor,
          isDefault: false,
        })
        toast.success('Categoria criada com sucesso!')
      }
      resetForm()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar categoria. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirmar Exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteCategory(deletingId)
      setDeletingId(null)
      toast.success('Categoria excluída com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir categoria. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar categorias
  const incomes = categories.filter((c) => c.type === 'income' || c.type === 'both')
  const expenses = categories.filter((c) => c.type === 'expense' || c.type === 'both')

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <PageHeader
        title="Categorias"
        description="Crie e gerencie as categorias para classificar suas despesas e receitas."
      />

      <div className="grid gap-6 md:grid-cols-5 items-start">
        {/* Formulário de Criação/Edição */}
        <Card className="border-border bg-card md:col-span-2 hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300">
          <CardHeader className="pb-3 pt-6 px-6">
            <CardTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
            <CardDescription className="text-xs">
              {editingId ? 'Altere as propriedades da categoria selecionada' : 'Adicione uma categoria personalizada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  placeholder="Ex: Alimentação, Investimentos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as 'income' | 'expense')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Cores */}
              <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <div className="grid grid-cols-5 gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="size-9 rounded-full border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && (
                        <Check className="size-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Ícones */}
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="grid grid-cols-4 gap-2 border border-border rounded-xl p-3 max-h-[150px] overflow-y-auto">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        className={`p-2.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all hover:bg-accent ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        <item.icon className="size-5" />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : editingId ? (
                    'Salvar Alterações'
                  ) : (
                    'Criar Categoria'
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Categorias cadastradas */}
        <div className="md:col-span-3 space-y-6">
          {categories.length === 0 ? (
            <EmptyState
              title="Sem categorias cadastradas"
              description="Nenhuma categoria foi encontrada. Você pode criar novas categorias usando o formulário ao lado."
              icon={Tag}
            />
          ) : (
            <>
              {/* Receitas */}
              <Card className="border-border bg-card hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300">
                <CardHeader className="pb-3 pt-6 px-6">
                  <CardTitle className="text-lg font-bold text-income">Receitas</CardTitle>
                  <CardDescription className="text-xs">Categorias aplicadas a entradas financeiras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-6 pb-6">
                  {incomes.length === 0 ? (
                    <EmptyState
                      title="Sem categorias de receita"
                      description="Adicione categorias para classificar suas entradas."
                      icon={Tag}
                      compact
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {incomes.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 hover:border-border/80 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="size-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              <DynamicIcon name={cat.icon} className="size-4" />
                            </div>
                            <span className="text-sm font-semibold">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted"
                              onClick={() => handleEditClick(cat)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            {!cat.isDefault && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg hover:bg-muted"
                                onClick={() => setDeletingId(cat.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Despesas */}
              <Card className="border-border bg-card hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300">
                <CardHeader className="pb-3 pt-6 px-6">
                  <CardTitle className="text-lg font-bold text-expense">Despesas</CardTitle>
                  <CardDescription className="text-xs">Categorias aplicadas a saídas financeiras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-6 pb-6">
                  {expenses.length === 0 ? (
                    <EmptyState
                      title="Sem categorias de despesa"
                      description="Adicione categorias para classificar suas saídas."
                      icon={Tag}
                      compact
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {expenses.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 hover:border-border/80 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="size-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              <DynamicIcon name={cat.icon} className="size-4" />
                            </div>
                            <span className="text-sm font-semibold">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted"
                              onClick={() => handleEditClick(cat)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            {!cat.isDefault && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg hover:bg-muted"
                                onClick={() => setDeletingId(cat.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Categoria?"
        description="Esta ação é permanente e removerá a categoria do Firestore. Lançamentos existentes associados a esta categoria precisarão ser reclassificados manualmente."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
