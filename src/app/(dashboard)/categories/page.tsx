'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { toast } from 'sonner'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Plus,
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
function DynamicIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const IconComponent =
    (
      Icons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[name] || Icons.HelpCircle
  return <IconComponent className={className} />
}

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories()

  // Estados do Formulário
  const [categoryTab, setCategoryTab] = React.useState<
    'expense' | 'income' | 'investment'
  >('expense')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<'income' | 'expense' | 'investment'>(
    'expense',
  )
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
    if (
      cat.type === 'income' ||
      cat.type === 'expense' ||
      cat.type === 'investment'
    ) {
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
      toast.success('Categoria removida. O histórico foi preservado.')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir categoria. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar categorias
  const incomes = categories
    .filter((c) => !c.archived)
    .filter((c) => c.type === 'income' || c.type === 'both')
  const expenses = categories
    .filter((c) => !c.archived)
    .filter((c) => c.type === 'expense' || c.type === 'both')
  const investments = categories
    .filter((c) => !c.archived)
    .filter((c) => c.type === 'investment' || c.type === 'both')

  if (error) return <LoadError error={error} retry={refetch} />

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Categorias"
        description="Crie e gerencie as categorias para classificar suas despesas e receitas."
        action={
          <Button
            onClick={() => setIsAddOpen(true)}
            className="min-h-10 gap-2 px-3 text-sm font-medium"
          >
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
        <div className="space-y-6">
          <div
            className="border-border flex gap-6 overflow-auto border-b"
            role="group"
            aria-label="Tipos de categoria"
          >
            {(
              [
                ['expense', 'Despesas'],
                ['income', 'Receitas'],
                ['investment', 'Investimentos'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={categoryTab === value}
                onClick={() => setCategoryTab(value)}
                className={`focus-visible:outline-ring shrink-0 border-b-2 pb-3.5 text-sm ${categoryTab === value ? 'border-foreground font-medium' : 'text-muted-foreground border-transparent'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>
                Categorias de{' '}
                {categoryTab === 'expense'
                  ? 'despesas'
                  : categoryTab === 'income'
                    ? 'receitas'
                    : 'investimentos'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="financial-table w-full text-left text-[13px]">
                <thead>
                  <tr>
                    <th scope="col">Categoria</th>
                    <th scope="col">Tipo</th>
                    <th scope="col" className="text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(categoryTab === 'expense'
                    ? expenses
                    : categoryTab === 'income'
                      ? incomes
                      : investments
                  ).map((cat) => (
                    <tr key={cat.id}>
                      <td data-label="Categoria">
                        <div className="flex items-center gap-2.5">
                          <span className="border-border bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
                            <DynamicIcon name={cat.icon} className="size-4" />
                          </span>
                          <span className="[overflow-wrap:anywhere]">
                            {cat.name}
                            {cat.isDefault && (
                              <small className="text-muted-foreground block text-xs">
                                Padrão do sistema
                              </small>
                            )}
                          </span>
                        </div>
                      </td>
                      <td data-label="Tipo">
                        <span className="bg-accent text-muted-foreground rounded-full px-2.5 py-1 text-xs">
                          {categoryTab === 'expense'
                            ? 'Despesa'
                            : categoryTab === 'income'
                              ? 'Receita'
                              : 'Investimento'}
                        </span>
                      </td>
                      <td data-label="Ações">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => handleEditClick(cat)}
                            aria-label={'Editar categoria ' + cat.name}
                          >
                            <Pencil className="size-4" />
                            Editar
                          </Button>
                          {!cat.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingId(cat.id)}
                              aria-label={'Excluir categoria ' + cat.name}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(categoryTab === 'expense'
                ? expenses
                : categoryTab === 'income'
                  ? incomes
                  : investments
              ).length === 0 && (
                <EmptyState
                  title="Sem categorias neste tipo"
                  description="Adicione uma categoria para classificar seus lançamentos."
                  icon={Tag}
                  compact
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal - Criar Categoria */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Adicione uma categoria personalizada para classificar suas
              despesas e receitas.
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
                  onValueChange={(val) =>
                    setType(val as 'income' | 'expense' | 'investment')
                  }
                  disabled={isSubmitting}
                  items={[
                    { value: 'expense', label: 'Despesa' },
                    { value: 'income', label: 'Receita' },
                    { value: 'investment', label: 'Investimento' },
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
                <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] justify-items-center gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={'Selecionar cor ' + color}
                      aria-pressed={selectedColor === color}
                      onClick={() => setSelectedColor(color)}
                      className="border-border animate-transition flex size-11 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-105 active:scale-95"
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
                <div className="border-border grid max-h-[150px] scrollbar-thin grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2 overflow-y-auto rounded-xl border p-3">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        aria-label={'Selecionar ícone ' + item.name}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedIcon(item.name)}
                        className={`hover:bg-accent flex cursor-pointer items-center justify-center rounded-lg border p-2.5 transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'text-muted-foreground border-transparent'
                        }`}
                      >
                        <item.icon className="size-5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="border-border mt-6 flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-semibold"
              >
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
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) resetForm()
        }}
      >
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
                  onValueChange={(val) =>
                    setType(val as 'income' | 'expense' | 'investment')
                  }
                  disabled={isSubmitting}
                  items={[
                    { value: 'expense', label: 'Despesa' },
                    { value: 'income', label: 'Receita' },
                    { value: 'investment', label: 'Investimento' },
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
                <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] justify-items-center gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={'Selecionar cor ' + color}
                      aria-pressed={selectedColor === color}
                      onClick={() => setSelectedColor(color)}
                      className="border-border animate-transition flex size-11 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-105 active:scale-95"
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
                <div className="border-border grid max-h-[150px] scrollbar-thin grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2 overflow-y-auto rounded-xl border p-3">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        aria-label={'Selecionar ícone ' + item.name}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedIcon(item.name)}
                        className={`hover:bg-accent flex cursor-pointer items-center justify-center rounded-lg border p-2.5 transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'text-muted-foreground border-transparent'
                        }`}
                      >
                        <item.icon className="size-5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="border-border mt-6 flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-semibold"
              >
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
        description="Categorias com lançamentos serão arquivadas para preservar o histórico e deixarão de aparecer em novas compras. Categorias sem lançamentos serão excluídas."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
