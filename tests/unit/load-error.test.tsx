/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { LoadError } from '@/components/shared/load-error'
import { loadErrorMessage } from '@/lib/utils/load-error'

test('erro técnico não aparece na interface e retry é acionável', () => {
  const retry = jest.fn()
  render(<LoadError error={new Error('index secret-token financial-data')} retry={retry} />)
  expect(screen.getByRole('alert').textContent).not.toMatch(/secret|index|financial/)
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retry).toHaveBeenCalledTimes(1)
})

test('permissão e offline têm orientação específica', () => {
  expect(loadErrorMessage({ code: 'permission-denied' })).toContain('Entre novamente')
  jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  expect(loadErrorMessage(new Error('unavailable'))).toContain('sem conexão')
  jest.restoreAllMocks()
})
