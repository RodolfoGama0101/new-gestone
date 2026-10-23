'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  CreditCard as CardIcon,
  Loader2,
  Pencil,
  Trash2,
  Check,
  Wallet,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { CreditCardForm } from '@/components/credit-cards/credit-card-form'
import { CreditCardVisual } from '@/components/credit-cards/credit-card-visual'
import { UpcomingInvoices } from '@/components/credit-cards/upcoming-invoices'
import { CreditCardBillSummary } from '@/components/credit-cards/credit-card-bill-summary'
import { CreditCard } from '@/types/credit-card'

export default function CreditCardsPage() {
  const { creditCards, isLoading, error, refetch, archiveCreditCard } =
    useCreditCards()

  const [invoiceMonth, setInvoiceMonth] = React.useState<Date | null>(null)
  const openInvoice = (month: Date) => setInvoiceMonth(month)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  )
  const [editingCard, setEditingCard] = React.useState<CreditCard | null>(null)
  const [archivingId, setArchivingId] = React.useState<string | null>(null)
  const [isArchiving, setIsArchiving] = React.useState(false)

  const selectedCard =
    creditCards.find((card) => card.id === selectedCardId) ??
    creditCards[0] ??
    null

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
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <PageHeader
        title={invoiceMonth ? 'Fatura do cartão' : 'Meus Cartões'}
        description={
          invoiceMonth && selectedCard
            ? selectedCard.name
            : 'Gerencie seus cartões e acompanhe as próximas faturas.'
        }
        action={
          invoiceMonth ? (
            <Button variant="outline" onClick={() => setInvoiceMonth(null)}>
              Voltar aos cartões
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="min-h-10 gap-2 px-3 text-sm font-medium"
            >
              <Plus className="size-4" />
              Adicionar Cartão
            </Button>
          )
        }
      />

      {creditCards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Você ainda não adicionou nenhum cartão de crédito. Adicione um para gerenciar suas faturas e despesas futuras."
          icon={CardIcon}
        />
      ) : invoiceMonth && selectedCard ? (
        <CreditCardBillSummary
          key={selectedCard.id + invoiceMonth.toISOString()}
          card={selectedCard}
          initialMonth={invoiceMonth}
        />
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[1.4fr_1fr]">
          {/* Coluna da esquerda: Lista de cartões */}
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              <h2 className="text-sm font-medium">Sua carteira</h2>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {creditCards.length}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Selecione um cartão para acompanhar suas faturas.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-5">
              {creditCards.map((card) => {
                const isSelected = selectedCard?.id === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    aria-pressed={isSelected}
                    aria-label={`Selecionar cartão ${card.name} · ${card.bankName}`}
                    className={`focus-visible:ring-ring focus-visible:ring-offset-background relative w-full max-w-[400px] min-w-0 cursor-pointer rounded-2xl p-1.5 text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'ring-ring ring-offset-background ring-2 ring-offset-2'
                        : 'hover:bg-muted hover:ring-border hover:ring-1'
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
                    <span className="mt-3 flex items-center justify-between gap-2 px-1 pb-1 text-xs">
                      <span className="text-muted-foreground">
                        {card.archived
                          ? 'Arquivado · histórico disponível'
                          : card.isActive
                            ? 'Ativo'
                            : 'Inativo'}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 font-medium">
                          <Check className="size-3.5" aria-hidden="true" />
                          Selecionado
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedCard && (
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium [overflow-wrap:anywhere]">
                      {selectedCard.name}
                    </h3>
                    <span className="text-muted-foreground text-xs">
                      {selectedCard.bankName}
                    </span>
                  </div>
                  <div className="border-border flex flex-wrap justify-between gap-3 border-b pb-4 text-sm">
                    <span className="text-muted-foreground">Fechamento</span>
                    <span>Dia {selectedCard.closingDay}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>
                      {selectedCard.dueDay
                        ? 'Dia ' + selectedCard.dueDay
                        : 'Não definido'}
                    </span>
                  </div>
                  {!selectedCard.archived && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingCard(selectedCard)}
                      >
                        <Pencil className="size-4" />
                        Personalizar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setArchivingId(selectedCard.id)}
                      >
                        <Trash2 className="size-4" />
                        Arquivar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna da direita: Detalhes e Fatura do cartão selecionado */}
          <div className="min-w-0 space-y-4 xl:sticky xl:top-6">
            {selectedCard ? (
              <div className="animate-in fade-in space-y-4 duration-200">
                <CreditCardBillSummary
                  key={selectedCard.id}
                  card={selectedCard}
                  compact
                  onViewInvoice={openInvoice}
                />
                <UpcomingInvoices card={selectedCard} onOpen={openInvoice} />
              </div>
            ) : (
              <div className="border-border text-muted-foreground bg-muted/5 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed text-sm">
                Selecione um cartão para ver os detalhes da fatura.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal - Adicionar Cartão */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px] lg:max-w-[880px]">
          <DialogHeader>
            <DialogTitle>Novo Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Escolha o visual e cadastre os dados para organizar suas faturas.
            </DialogDescription>
          </DialogHeader>
          <CreditCardForm onSuccess={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal - Editar Cartão */}
      <Dialog
        open={editingCard !== null}
        onOpenChange={(open) => !open && setEditingCard(null)}
      >
        <DialogContent className="sm:max-w-[600px] lg:max-w-[880px]">
          <DialogHeader>
            <DialogTitle>Editar Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Personalize a aparência e atualize os dados do seu cartão.
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
