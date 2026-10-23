jest.mock('@/lib/firebase/admin', () => ({
  adminDb: { doc: jest.fn(), collection: jest.fn(), runTransaction: jest.fn() },
}))
import { adminDb } from '@/lib/firebase/admin'
import {
  CreditCardRemovalError,
  removeCreditCard,
} from '@/services/credit-card-removal.service'

const paymentQuery = { limit: jest.fn().mockReturnValue('payments') }
const card = {
  path: 'users/owner/creditCards/card',
  collection: jest.fn(() => paymentQuery),
}
const transaction = { get: jest.fn(), delete: jest.fn() }
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(adminDb.doc).mockReturnValue(card as never)
  jest.mocked(adminDb.collection).mockImplementation(
    (path) =>
      ({
        where: (field: string, operator: string, id: string) => {
          expect(field).toBe('creditCardId')
          expect(operator).toBe('==')
          expect(id).toBe('card')
          return { limit: () => path }
        },
      }) as never,
  )
  jest
    .mocked(adminDb.runTransaction)
    .mockImplementation(async (operation) => operation(transaction as never))
  transaction.get.mockImplementation(async (reference) =>
    reference === card ? { exists: true } : { empty: true },
  )
})

test('exclui somente o cadastro vazio do UID correto, após verificar todos os vínculos', async () => {
  await removeCreditCard('owner', 'card')
  expect(adminDb.doc).toHaveBeenCalledWith('users/owner/creditCards/card')
  expect(transaction.get).toHaveBeenCalledWith('users/owner/transactions')
  expect(transaction.get).toHaveBeenCalledWith('users/owner/transactionSeries')
  expect(card.collection).toHaveBeenCalledWith('payments')
  expect(paymentQuery.limit).toHaveBeenCalledWith(1)
  expect(transaction.delete).toHaveBeenCalledTimes(1)
  expect(transaction.delete).toHaveBeenCalledWith(card)
})

test.each([
  'users/owner/transactions',
  'users/owner/transactionSeries',
  'payments',
])('vínculo em %s impede exclusão e não altera o cartão', async (linked) => {
  transaction.get.mockImplementation(async (reference) =>
    reference === card ? { exists: true } : { empty: reference !== linked },
  )
  await expect(removeCreditCard('owner', 'card')).rejects.toEqual(
    new CreditCardRemovalError('card/has-links'),
  )
  expect(transaction.delete).not.toHaveBeenCalled()
})

test('cartão ausente não consulta referências nem grava', async () => {
  transaction.get.mockResolvedValue({ exists: false })
  await expect(removeCreditCard('owner', 'card')).rejects.toEqual(
    new CreditCardRemovalError('card/not-found'),
  )
  expect(transaction.get).toHaveBeenCalledTimes(1)
  expect(transaction.delete).not.toHaveBeenCalled()
})

test('falha ao consultar vínculos impede qualquer exclusão', async () => {
  transaction.get.mockImplementation(async (reference) => {
    if (reference === card) return { exists: true }
    throw new Error('unavailable')
  })
  await expect(removeCreditCard('owner', 'card')).rejects.toThrow('unavailable')
  expect(transaction.delete).not.toHaveBeenCalled()
})
