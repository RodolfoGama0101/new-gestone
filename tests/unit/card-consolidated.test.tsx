/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CardConsolidated } from '@/components/credit-cards/card-consolidated'
import { TransactionService } from '@/services/transaction.service'
import type { CreditCard } from '@/types/credit-card'

const cards = [
  {
    id: 'a',
    name: 'Alpha',
    bankName: 'Banco A',
    closingDay: 15,
    dueDay: 5,
    isActive: true,
  },
  {
    id: 'b',
    name: 'Beta',
    bankName: 'Banco B',
    closingDay: 31,
    archived: true,
    isActive: false,
  },
] as CreditCard[]
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'owner' } }),
}))
jest.mock('@/hooks/use-credit-cards', () => ({
  useCreditCards: () => ({
    creditCards: cards,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/hooks/use-invoice-payment', () => ({
  useInvoicePayment: (id: string) => ({
    isPending: false,
    error: null,
    data: id === 'a' ? { amount: 100 } : null,
  }),
}))
jest.mock('@/services/transaction.service', () => ({
  TransactionService: { getInvoice: jest.fn() },
}))
const getInvoice = jest.mocked(TransactionService.getInvoice)

beforeEach(() => {
  getInvoice.mockReset()
})
function setup(visibleCards = cards) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const open = jest.fn()
  render(
    <QueryClientProvider client={client}>
      <CardConsolidated
        month={new Date(2026, 1, 1)}
        visibleCards={visibleCards}
        onOpen={open}
      />
    </QueryClientProvider>,
  )
  return open
}

test('soma todos os cartões, identifica o filtro e abre uma fatura', async () => {
  getInvoice.mockImplementation(
    async (_uid, card) => [{ amount: card.id === 'a' ? 100 : 250 }] as never,
  )
  const open = setup([cards[0]])
  const region = await screen.findByRole('region', {
    name: 'Consolidado dos cartões',
  })
  expect(await within(region).findByText('R$ 3,50')).toBeVisible()
  expect(region).toHaveTextContent('Cartões filtrados: R$ 1,00')
  expect(region).toHaveTextContent('Quitada')
  expect(region).toHaveTextContent('Vencimento: 05/03/2026')
  expect(within(region).queryByText(/Beta/)).not.toBeInTheDocument()
  fireEvent.click(
    within(region).getByRole('button', {
      name: 'Abrir fatura de Alpha · Banco A',
    }),
  )
  expect(open).toHaveBeenCalledWith(cards[0])
})

test('falha de uma fatura não publica um consolidado parcial e permite repetição', async () => {
  getInvoice.mockImplementation(async (_uid, card) => {
    if (card.id === 'b') throw new Error('offline')
    return [{ amount: 100 }] as never
  })
  setup()
  const error = await screen.findByRole('alert')
  expect(error).toHaveTextContent('Não foi possível calcular o consolidado')
  expect(screen.queryByText('R$ 1,00')).not.toBeInTheDocument()
  getInvoice.mockResolvedValue([{ amount: 100 }] as never)
  fireEvent.click(
    within(error).getByRole('button', { name: 'Tentar novamente' }),
  )
  expect(await screen.findByText('R$ 2,00')).toBeVisible()
  expect(screen.getByText(/Beta.*Arquivado/)).toBeVisible()
  expect(screen.getByText(/Vencimento: Não definido/)).toBeVisible()
})
