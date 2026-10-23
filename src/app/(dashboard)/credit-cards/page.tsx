'use client'

import { LoadError } from '@/components/shared/load-error'

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
  const { creditCards, isLoading, error, refetch, archiveCreditCard } = useCreditCards()

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [editingCard, setEditingCard] = React.useState<CreditCard | null>(null)
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [isArchiving, setIsArchiving] = React.useState(false)

  const selectedCard = creditCards.find((card) => card.id === selectedCardId) ?? creditCards[0] ?? null

  const handleArchiveConfirm = async () => {
    if (!archivingId) return
    setIsArchiving(true)
    try {
      await archiveCreditCard(archivingId)
      setArchivingId(null)
    } catch (error) {
      console.error(error)
    } finally {
      setIsArchiving(false)
    }
  }

  if (error) return <LoadError error={error} retry={refetch} />

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <PageHeader
        title="Meus Cartões"
        description="Gerencie seus cartões de crédito e veja os lançamentos futuros."
        action={
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 font-medium text-sm min-h-10 px-3">
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
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Coluna da esquerda: Lista de cartões */}
          <div className="xl:col-span-1 min-w-0 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Cartões cadastrados ({creditCards.length})
            </h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin pr-3 pl-1 py-1">
              {creditCards.map((card) => {
                const isSelected = selectedCard?.id === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    aria-pressed={isSelected}
                    aria-label={`Selecionar cartão ${card.name}`}
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-1 border-2 ${
                      isSelected
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
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
                    {card.archived && <span className="block mt-2 text-xs text-muted-foreground">Arquivado · histórico disponível</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Coluna da direita: Detalhes e Fatura do cartão selecionado */}
          <div className="xl:col-span-2 min-w-0 space-y-4">
            {selectedCard ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3 px-1">
                  <div>
                    <h2 className="break-words text-xl font-medium text-foreground">{selectedCard.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedCard.bankName} • Titular: {selectedCard.holderName}
                    </p>
                  </div>
                  {!selectedCard.archived && <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-h-11 text-sm cursor-pointer"
                      onClick={() => setEditingCard(selectedCard)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 min-h-11 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60 hover:border-destructive/20 cursor-pointer"
                      onClick={() => setArchivingId(selectedCard.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Arquivar
                    </Button>
                  </div>}
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

      {/* Confirmação de Arquivamento */}
      <ConfirmDialog
        isOpen={archivingId !== null}
        onClose={() => setArchivingId(null)}
        onConfirm={handleArchiveConfirm}
        title="Arquivar cartão de crédito?"
        description="O cartão deixará de aceitar novas compras. O cadastro e as faturas serão preservados para consulta, mesmo se ainda não houver compras. O arquivamento é permanente."
        confirmText="Arquivar"
        isDestructive
        isLoading={isArchiving}
      />
    </div>
  )
}
