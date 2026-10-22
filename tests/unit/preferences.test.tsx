/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { PreferencesProvider, usePreferences } from '@/providers/preferences-provider'
import { PreferencesService } from '@/services/preferences.service'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from 'next-themes'

jest.mock('@/services/preferences.service', () => ({ PreferencesService: { get: jest.fn(), save: jest.fn() } }))
jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }))
jest.mock('next-themes', () => ({ useTheme: jest.fn() }))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))
const setTheme = jest.fn()
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, createElement(PreferencesProvider, null, children))
  }
}
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useAuth).mockReturnValue({ user: { uid: 'owner' } } as never)
  jest.mocked(useTheme).mockReturnValue({ theme: 'system', setTheme } as never)
  jest.mocked(PreferencesService.get).mockResolvedValue({ theme: 'dark' })
  jest.mocked(PreferencesService.save).mockResolvedValue(undefined)
})
test('tema salvo é recuperado em uma nova sessão sem cache anterior', async () => {
  const first = renderHook(() => usePreferences(), { wrapper: wrapper() })
  await waitFor(() => expect(first.result.current.theme).toBe('dark'))
  expect(setTheme).toHaveBeenCalledWith('dark')
  first.unmount()
  const second = renderHook(() => usePreferences(), { wrapper: wrapper() })
  await waitFor(() => expect(second.result.current.theme).toBe('dark'))
  expect(PreferencesService.get).toHaveBeenCalledTimes(2)
})
test('salvar tema usa o UID atual e falha mantém a preferência anterior', async () => {
  const { result } = renderHook(() => usePreferences(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.theme).toBe('dark'))
  await act(async () => { await result.current.changeTheme('light') })
  await waitFor(() => expect(result.current.theme).toBe('light'))
  expect(PreferencesService.save).toHaveBeenCalledWith('owner', { theme: 'light' })
  jest.mocked(PreferencesService.save).mockRejectedValueOnce(new Error('unavailable'))
  await act(async () => { await expect(result.current.changeTheme('system')).rejects.toThrow('unavailable') })
  expect(result.current.theme).toBe('light')
})
test('troca de usuário carrega a preferência da outra conta', async () => {
  const { result, rerender } = renderHook(() => usePreferences(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.theme).toBe('dark'))
  jest.mocked(useAuth).mockReturnValue({ user: { uid: 'other' } } as never)
  jest.mocked(PreferencesService.get).mockResolvedValue({ theme: 'light' })
  rerender()
  await waitFor(() => expect(result.current.theme).toBe('light'))
  expect(PreferencesService.get).toHaveBeenLastCalledWith('other')
})


test('resposta atrasada de uma gravação não muda o tema de outra conta', async () => {
  let finish!: () => void
  jest.mocked(PreferencesService.save).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
  const { result, rerender } = renderHook(() => usePreferences(), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.theme).toBe('dark'))
  let saving!: Promise<void>
  act(() => { saving = result.current.changeTheme('light') })
  jest.mocked(useAuth).mockReturnValue({ user: { uid: 'other' } } as never)
  jest.mocked(PreferencesService.get).mockResolvedValue({ theme: 'system' })
  rerender()
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  await act(async () => { finish(); await saving })
  expect(result.current.theme).toBe('system')
})
