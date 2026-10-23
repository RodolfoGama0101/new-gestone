/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreditCardsPage from '@/app/(dashboard)/credit-cards/page'
import { CreditCardService } from '@/services/credit-card.service'
import type { CreditCard } from '@/types/credit-card'

jest.mock('@/services/credit-card.service', () => ({
  CreditCardService: { getAll: jest.fn(), delete: jest.fn() },
}))
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'owner' } }),
}))
jest.mock('@/components/credit-cards/credit-card-bill-summary', () => ({
  CreditCardBillSummary: () => null,
}))
jest.mock('@/components/credit-cards/upcoming-invoices', () => ({
  UpcomingInvoices: () => null,
}))
jest.mock('@/components/credit-cards/credit-card-form', () => ({
  CreditCardForm: () => null,
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }))
const card: CreditCard = {
  id: 'card',
  name: 'Cartão teste',
  bankName: 'Banco',
  brand: 'visa',
  holderName: 'Pessoa',
  closingDay: 10,
  color: '#820ad1',
  isActive: true,
  createdAt: null,
  updatedAt: null,
}
const remove = jest.mocked(CreditCardService.delete)
beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(CreditCardService.getAll).mockResolvedValue([card])
})
async function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <CreditCardsPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir cartão' }))
  return { dialog: await screen.findByRole('dialog'), invalidate }
}
test('abrir e cancelar a confirmação não excluem o cartão', async () => {
  const { dialog } = await setup()
  expect(within(dialog).getByText(/O cartão “Cartão teste”/)).toBeVisible()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
  expect(remove).not.toHaveBeenCalled()
})
test('confirma uma só vez, bloqueia fechamento e atualiza a carteira', async () => {
  let finish!: () => void
  remove.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = () => {
          jest.mocked(CreditCardService.getAll).mockResolvedValue([])
          resolve()
        }
      }),
  )
  const { dialog, invalidate } = await setup()
  const confirm = within(dialog).getByRole('button', {
    name: 'Excluir permanentemente',
  })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  expect(
    within(dialog).getByRole('button', { name: 'Cancelar' }),
  ).toBeDisabled()
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
  expect(screen.getByRole('dialog')).toBeVisible()
  await act(async () => finish())
  expect(await screen.findByText('Nenhum cartão cadastrado')).toBeVisible()
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['creditCards', 'owner'],
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['invoicePayments', 'owner'],
  })
})
test('bloqueio preserva confirmação e cartão e permite nova tentativa', async () => {
  remove.mockRejectedValueOnce(
    new Error('Este cartão possui compras vinculadas. Arquive-o.'),
  )
  const { dialog, invalidate } = await setup()
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Excluir permanentemente' }),
  )
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Arquive-o',
  )
  expect(invalidate).not.toHaveBeenCalled()
  expect(
    within(dialog).getByRole('button', { name: 'Excluir permanentemente' }),
  ).toBeEnabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(
    screen.getByRole('button', { name: /Selecionar cartão Cartão teste/ }),
  ).toBeInTheDocument()
})
test('cartão arquivado vazio também oferece exclusão', async () => {
  jest
    .mocked(CreditCardService.getAll)
    .mockResolvedValue([{ ...card, archived: true, isActive: false }])
  const { dialog } = await setup()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(
    screen.queryByRole('button', { name: 'Personalizar' }),
  ).not.toBeInTheDocument()
})
