/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { QueryProvider } from '@/providers/query-provider'
import { LoadError } from '@/components/shared/load-error'
import { reportQueryError } from '@/lib/query-diagnostics'

afterEach(() => jest.restoreAllMocks())

test('consulta rejeitada mantém erro e retry sem gerar console.error no Next', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const query = jest
    .fn()
    .mockRejectedValueOnce({
      code: 'permission-denied',
      message: 'private-token',
    })
    .mockResolvedValue('Dados recuperados')
  function Screen() {
    const result = useQuery({
      queryKey: ['private-uid'],
      queryFn: query,
      retry: false,
    })
    if (result.error)
      return <LoadError error={result.error} retry={result.refetch} />
    return <p>{result.data ?? 'Carregando'}</p>
  }
  render(
    <QueryProvider>
      <Screen />
    </QueryProvider>,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Entre novamente')
  expect(warning).toHaveBeenCalledWith('Falha ao carregar consulta', {
    code: 'permission-denied',
  })
  expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private/)
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() =>
    expect(screen.getByText('Dados recuperados')).toBeVisible(),
  )
  expect(errorLog).not.toHaveBeenCalled()
})

test('diagnóstico desconhecido não registra mensagens ou códigos arbitrários', () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {})
  reportQueryError({ code: 'private-uid', message: 'private-token' })
  reportQueryError({ code: 'firestore/failed-precondition' })
  expect(warning.mock.calls).toEqual([
    ['Falha ao carregar consulta', { code: 'unknown' }],
    ['Falha ao carregar consulta', { code: 'failed-precondition' }],
  ])
})
