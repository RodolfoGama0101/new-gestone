/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { CsvExportButton } from '@/components/transactions/csv-export-button'
import { useCategories } from '@/hooks/use-categories'
import { TransactionService } from '@/services/transaction.service'

jest.mock('@/hooks/use-categories', () => ({ useCategories: jest.fn() }))
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'csv-owner' } }),
}))
jest.mock('@/services/transaction.service', () => ({
  TransactionService: { getAll: jest.fn() },
}))

function categoriesState(isLoading: boolean, error: Error | null = null) {
  return { categories: [], isLoading, error } as unknown as ReturnType<
    typeof useCategories
  >
}

beforeEach(() => jest.clearAllMocks())

test('aguarda categorias antes de permitir exportar, inclusive após falha e recuperação', () => {
  jest.mocked(useCategories).mockReturnValue(categoriesState(true))
  const { rerender } = render(<CsvExportButton />)
  const button = screen.getByRole('button', { name: 'Exportar CSV' })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(TransactionService.getAll).not.toHaveBeenCalled()

  jest
    .mocked(useCategories)
    .mockReturnValue(
      categoriesState(false, new Error('Falha ao carregar categorias')),
    )
  rerender(<CsvExportButton />)
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(TransactionService.getAll).not.toHaveBeenCalled()

  // Uma consulta concluída sem cadastros também é válida: categorias realmente
  // ausentes continuam usando o fallback do CSV, sem bloquear a exportação.
  jest.mocked(useCategories).mockReturnValue(categoriesState(false))
  rerender(<CsvExportButton />)
  expect(button).toBeEnabled()
})
