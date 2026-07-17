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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Check,
  Plus
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
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<'income' | 'expense' | 'investment'>('expense')
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
    if (cat.type === 'income' || cat.type === 'expense' || cat.type === 'investment') {
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
        setIsAddOpen(false)
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
  const investments = categories.filter((c) => c.type === 'investment' || c.type === 'both')

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
        action={
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 font-semibold text-xs h-9 pr-4 pl-3 cursor-pointer">
            <Plus className="size-4" />
            Nova Categoria
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="Sem categorias cadastradas"
          description="Nenhuma categoria foi encontrada. Você pode criar novas categorias usando o botão acima."
          icon={Tag}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Receitas */}
          <Card className="border-border bg-card hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300 flex flex-col">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-income">Receitas</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Categorias aplicadas a entradas financeiras</CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-income/10 text-income border border-income/20">
                  {incomes.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-6 py-4">
              {incomes.length === 0 ? (
                <EmptyState
                  title="Sem categorias de receita"
                  description="Adicione categorias para classificar suas entradas."
                  icon={Tag}
                  compact
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {incomes.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/10 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div 
                          className="size-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${cat.color}15`, 
                            borderColor: `${cat.color}30`,
                            color: cat.color 
                          }}
                        >
                          <DynamicIcon name={cat.icon} className="size-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
                          {cat.isDefault && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span className="size-1 rounded-full bg-muted-foreground/50" />
                              Padrão do Sistema
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
          <Card className="border-border bg-card hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300 flex flex-col">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-expense">Despesas</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Categorias aplicadas a saídas financeiras</CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-expense/10 text-expense border border-expense/20">
                  {expenses.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-6 py-4">
              {expenses.length === 0 ? (
                <EmptyState
                  title="Sem categorias de despesa"
                  description="Adicione categorias para classificar suas saídas."
                  icon={Tag}
                  compact
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {expenses.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/10 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div 
                          className="size-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${cat.color}15`, 
                            borderColor: `${cat.color}30`,
                            color: cat.color 
                          }}
                        >
                          <DynamicIcon name={cat.icon} className="size-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
                          {cat.isDefault && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span className="size-1 rounded-full bg-muted-foreground/50" />
                              Padrão do Sistema
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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

          {/* Investimentos */}
          <Card className="border-border bg-card hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300 flex flex-col">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-violet-600 dark:text-violet-500">Investimentos</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Categorias aplicadas a aportes e investimentos</CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  {investments.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-6 py-4">
              {investments.length === 0 ? (
                <EmptyState
                  title="Sem categorias de investimento"
                  description="Adicione categorias para classificar seus aportes."
                  icon={Tag}
                  compact
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {investments.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/10 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div 
                          className="size-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-105"
                          style={{ 
                            backgroundColor: `${cat.color}15`, 
                            borderColor: `${cat.color}30`,
                            color: cat.color 
                          }}
                        >
                          <DynamicIcon name={cat.icon} className="size-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
                          {cat.isDefault && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span className="size-1 rounded-full bg-muted-foreground/50" />
                              Padrão do Sistema
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
        </div>
      )}

      {/* Modal - Criar Categoria */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Adicione uma categoria personalizada para classificar suas despesas e receitas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-4">
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
                  onValueChange={(val) => setType(val as 'income' | 'expense' | 'investment')}
                  disabled={isSubmitting}
                  items={[
                    { value: 'expense', label: 'Despesa' },
                    { value: 'income', label: 'Receita' },
                    { value: 'investment', label: 'Investimento' }
                  ]}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Cores */}
              <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <div className="grid grid-cols-5 gap-y-3 justify-items-center">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="size-9 rounded-full border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 animate-transition"
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
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Criar Categoria'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal - Editar Categoria */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Altere as propriedades da categoria selecionada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Categoria</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Alimentação, Investimentos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as 'income' | 'expense' | 'investment')}
                  disabled={isSubmitting}
                  items={[
                    { value: 'expense', label: 'Despesa' },
                    { value: 'income', label: 'Receita' },
                    { value: 'investment', label: 'Investimento' }
                  ]}
                >
                  <SelectTrigger id="edit-type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Cores */}
              <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <div className="grid grid-cols-5 gap-y-3 justify-items-center">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="size-9 rounded-full border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 animate-transition"
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
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
