'use client'

import * as React from 'react'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Plus, CreditCard as CardIcon, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { CreditCardForm } from '@/components/credit-cards/credit-card-form'
import { CreditCardVisual } from '@/components/credit-cards/credit-card-visual'
import { CreditCardBillSummary } from '@/components/credit-cards/credit-card-bill-summary'
import { CreditCard } from '@/types/credit-card'

export default function CreditCardsPage() {
  const { creditCards, isLoading, deleteCreditCard } = useCreditCards()

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedCard, setSelectedCard] = React.useState<CreditCard | null>(null)
  const [editingCard, setEditingCard] = React.useState<CreditCard | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Auto-seleciona o primeiro cartão ao carregar
  React.useEffect(() => {
    if (creditCards.length > 0 && !selectedCard) {
      setSelectedCard(creditCards[0])
    } else if (creditCards.length === 0) {
      setSelectedCard(null)
    } else if (selectedCard) {
      // Atualiza referência do cartão selecionado se a lista mudar
      const updated = creditCards.find((c) => c.id === selectedCard.id)
      if (updated) setSelectedCard(updated)
    }
  }, [creditCards, selectedCard])

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteCreditCard(deletingId)
      if (selectedCard?.id === deletingId) {
        setSelectedCard(null)
      }
      setDeletingId(null)
    } catch (error) {
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <PageHeader
        title="Meus Cartões"
        description="Gerencie seus cartões de crédito e veja os lançamentos futuros."
        action={
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 font-semibold text-xs h-9 pr-4 pl-3 cursor-pointer">
            <Plus className="size-4" />
            Adicionar Cartão
          </Button>
        }
      />

      {creditCards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Você ainda não adicionou nenhum cartão de crédito. Adicione um para gerenciar suas faturas e despesas futuras."
          icon={CardIcon}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Coluna da esquerda: Lista de cartões */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Cartões Ativos ({creditCards.length})
            </h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-3 pl-1 py-1">
              {creditCards.map((card) => {
                const isSelected = selectedCard?.id === card.id
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-1 border-2 ${
                      isSelected
                        ? 'border-primary shadow-md scale-[1.01]'
                        : 'border-transparent hover:scale-[1.005] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <CreditCardVisual
                      name={card.name}
                      bankName={card.bankName}
                      brand={card.brand}
                      holderName={card.holderName}
                      closingDay={card.closingDay}
                      color={card.color}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Coluna da direita: Detalhes e Fatura do cartão selecionado */}
          <div className="md:col-span-2 space-y-4">
            {selectedCard ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border/40 pb-3 px-1">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedCard.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedCard.bankName} • Titular: {selectedCard.holderName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs cursor-pointer"
                      onClick={() => setEditingCard(selectedCard)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60 hover:border-destructive/20 cursor-pointer"
                      onClick={() => setDeletingId(selectedCard.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>

                <CreditCardBillSummary card={selectedCard} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl text-muted-foreground bg-muted/5 text-sm">
                Selecione um cartão para ver os detalhes da fatura.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal - Adicionar Cartão */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] md:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Cadastre um cartão para organizar suas despesas futuras e ciclos de fatura.
            </DialogDescription>
          </DialogHeader>
          <CreditCardForm onSuccess={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal - Editar Cartão */}
      <Dialog open={editingCard !== null} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="sm:max-w-[450px] md:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Altere as propriedades do cartão selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingCard && (
            <CreditCardForm
              editingCard={editingCard}
              onSuccess={() => setEditingCard(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Cartão de Crédito?"
        description="Esta ação removerá permanentemente este cartão. Você só poderá excluí-lo se não houver compras vinculadas a ele."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
