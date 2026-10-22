/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { onIdTokenChanged, signOut, type User } from 'firebase/auth'
import { clearSessionCookie } from '@/lib/firebase/auth'

jest.mock('@/lib/firebase/config', () => ({ auth: {} }))
jest.mock('firebase/auth', () => ({ onIdTokenChanged: jest.fn(), signOut: jest.fn(), getRedirectResult: () => Promise.resolve(null) }))
jest.mock('@/lib/firebase/auth', () => ({ clearSessionCookie: jest.fn(), syncSessionCookie: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({}), usePathname: () => '/' }))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

function Consumer() {
  const { user, isLoading, signOutUser } = useAuth()
  return <><p>{isLoading ? 'loading' : user?.uid ?? 'signed-out'}</p><button onClick={() => { void signOutUser() }}>sair</button></>
}

test('trocar UID e sair offline removem dados privados do QueryClient', async () => {
  jest.mocked(onIdTokenChanged).mockReturnValue(() => {})
  jest.mocked(signOut).mockResolvedValue(undefined)
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><AuthProvider><Consumer /></AuthProvider></QueryClientProvider>)
  const listener = jest.mocked(onIdTokenChanged).mock.calls[0][1] as (user: User | null) => Promise<void>
  await act(() => listener({ uid: 'first' } as User))
  client.setQueryData(['transactions', 'first'], ['private-first'])
  await act(() => listener({ uid: 'second' } as User))
  expect(client.getQueryData(['transactions', 'first'])).toBeUndefined()
  client.setQueryData(['transactions', 'second'], ['private-second'])
  jest.mocked(clearSessionCookie).mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(screen.getByText('sair'))
  await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy())
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(signOut).toHaveBeenCalledTimes(1)
})
