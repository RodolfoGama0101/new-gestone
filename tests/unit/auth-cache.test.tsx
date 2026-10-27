/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import {
  getRedirectResult,
  onIdTokenChanged,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import {
  clearSessionCookie,
  syncSessionCookie,
  signInWithGoogle,
  signInWithEmail,
  hasPendingLogout,
  consumeGoogleRedirect,
} from '@/lib/firebase/auth'

jest.mock('@/lib/firebase/config', () => ({ auth: { currentUser: null } }))
jest.mock('firebase/auth', () => ({
  onIdTokenChanged: jest.fn(),
  signOut: jest.fn(),
  getRedirectResult: jest.fn(),
}))
jest.mock('@/lib/firebase/auth', () => ({
  clearSessionCookie: jest.fn(),
  syncSessionCookie: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithEmail: jest.fn(),
  consumeGoogleRedirect: jest.fn(() => false),
  hasPendingLogout: jest.fn(() => false),
  markLogoutPending: jest.fn(),
  withAuthTimeout: (promise: Promise<unknown>) => promise,
}))
jest.mock('next/navigation', () => ({ usePathname: () => '/' }))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

const fakeAuth = auth as { currentUser: User | null }
let context: ReturnType<typeof useAuth>
function Consumer() {
  const value = useAuth()
  useLayoutEffect(() => {
    context = value
  }, [value])
  return (
    <p>
      {value.isLoading ? 'loading' : (value.user?.uid ?? 'signed-out')}
      {value.sessionError && ':error'}
    </p>
  )
}
function mount(strict = false) {
  const client = new QueryClient()
  const tree = (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    </QueryClientProvider>
  )
  render(strict ? <StrictMode>{tree}</StrictMode> : tree)
  return client
}
import { StrictMode, useLayoutEffect } from 'react'
function listener() {
  return jest.mocked(onIdTokenChanged).mock.calls.at(-1)![1] as (
    user: User | null,
  ) => Promise<void>
}
async function emit(user: User | null) {
  fakeAuth.currentUser = user
  await act(() => listener()(user))
}
const first = { uid: 'first' } as User
const second = { uid: 'second' } as User
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(() => {
  jest.resetAllMocks()
  fakeAuth.currentUser = null
  jest.mocked(onIdTokenChanged).mockReturnValue(() => {})
  jest.mocked(getRedirectResult).mockResolvedValue(null)
  jest.mocked(signOut).mockImplementation(async () => {
    fakeAuth.currentUser = null
  })
  jest.mocked(clearSessionCookie).mockResolvedValue(undefined)
  jest.mocked(syncSessionCookie).mockResolvedValue(undefined)
})

test('trocar UID e sair offline removem cache privado e capturam UID anterior', async () => {
  const client = mount()
  await emit(first)
  client.setQueryData(['private', 'first'], ['first-data'])
  await emit(second)
  expect(client.getQueryData(['private', 'first'])).toBeUndefined()
  client.setQueryData(['private', 'second'], ['second-data'])
  jest.mocked(clearSessionCookie).mockRejectedValueOnce(new Error('offline'))
  await act(() => context.signOutUser())
  expect(screen.getByText('signed-out')).toBeTruthy()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(clearSessionCookie).toHaveBeenLastCalledWith('second')
})
test('callback antigo não publica A após sincronizar B', async () => {
  mount()
  await emit(null)
  const delayed = deferred()
  jest.mocked(syncSessionCookie).mockReturnValueOnce(delayed.promise)
  fakeAuth.currentUser = first
  let old!: Promise<void>
  await act(async () => {
    old = listener()(first)
    await Promise.resolve()
  })
  await emit(second)
  await act(async () => {
    delayed.resolve()
    await old
  })
  expect(context.user?.uid).toBe('second')
  expect(context.sessionError).toBeNull()
})
test('503 preserva identidade e retry conclui sessão', async () => {
  mount()
  jest
    .mocked(syncSessionCookie)
    .mockRejectedValueOnce({ code: 'auth/session-service-unavailable' })
  await emit(first)
  expect(context.user).toBeNull()
  expect(context.sessionError).toContain('indisponível')
  expect(auth.currentUser).toBe(first)
  expect(signOut).not.toHaveBeenCalled()
  await act(() => context.retrySession())
  expect(context.user).toBe(first)
  expect(context.sessionError).toBeNull()
})
test('login Google invoca SDK no clique, bloqueia senha concorrente e aguarda cookie', async () => {
  mount()
  await emit(null)
  const delayed = deferred()
  jest.mocked(signInWithGoogle).mockImplementation(async () => {
    fakeAuth.currentUser = first
    return first
  })
  jest.mocked(syncSessionCookie).mockReturnValueOnce(delayed.promise)
  let pending!: Promise<User | null>
  await act(async () => {
    pending = context.signInWithGoogle()
    expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    await expect(context.signInWithEmail('x', 'y')).rejects.toMatchObject({
      code: 'auth/action-in-progress',
    })
  })
  expect(context.user).toBeNull()
  expect(signInWithEmail).not.toHaveBeenCalled()
  await act(async () => {
    delayed.resolve()
    await pending
  })
  expect(context.user).toBe(first)
})
test('troca externa durante POST não produz sucesso do login antigo', async () => {
  mount()
  await emit(null)
  const delayed = deferred()
  jest.mocked(signInWithGoogle).mockImplementation(async () => {
    fakeAuth.currentUser = first
    return first
  })
  jest.mocked(syncSessionCookie).mockReturnValueOnce(delayed.promise)
  let pending!: Promise<User | null>
  await act(async () => {
    pending = context.signInWithGoogle()
    await Promise.resolve()
  })
  fakeAuth.currentUser = second
  await act(async () => {
    delayed.resolve()
    await expect(pending).rejects.toMatchObject({
      code: 'auth/operation-cancelled',
    })
  })
  expect(context.user).toBeNull()
  await act(() => context.retrySession())
  expect(context.user).toBe(second)
})
test('retorno antigo após logout não restaura o usuário', async () => {
  mount()
  await emit(first)
  const delayed = deferred()
  jest.mocked(syncSessionCookie).mockReturnValueOnce(delayed.promise)
  let old!: Promise<void>
  await act(async () => {
    old = listener()(first)
    await Promise.resolve()
  })
  await act(() => context.signOutUser())
  await act(async () => {
    delayed.resolve()
    await old
  })
  expect(context.user).toBeNull()
  expect(context.sessionError).toBeNull()
})
test('Strict Mode ignora callback desmontado e inicializa com a inscrição atual', async () => {
  mount(true)
  const old = jest.mocked(onIdTokenChanged).mock.calls[0][1] as (
    user: User | null,
  ) => Promise<void>
  fakeAuth.currentUser = first
  await act(() => old(first))
  expect(syncSessionCookie).not.toHaveBeenCalled()
  await emit(null)
  expect(context.isLoading).toBe(false)
})
test('reconexão reconcilia logout sem recarregar a página', async () => {
  mount()
  await emit(null)
  jest.mocked(clearSessionCookie).mockClear()
  jest.mocked(hasPendingLogout).mockReturnValue(true)
  await act(async () => {
    window.dispatchEvent(new Event('online'))
  })
  expect(clearSessionCookie).toHaveBeenCalledTimes(1)
})

test('renovação do mesmo usuário mantém interface disponível durante reautenticação', async () => {
  mount()
  await emit(first)
  const delayed = deferred()
  jest.mocked(syncSessionCookie).mockReturnValueOnce(delayed.promise)
  let renewal!: Promise<void>
  await act(async () => {
    renewal = listener()(first)
    await Promise.resolve()
  })
  expect(context.isLoading).toBe(false)
  expect(context.user).toBe(first)
  await act(async () => {
    delayed.resolve()
    await renewal
  })
  expect(context.sessionError).toBeNull()
})

test('redirect null sem usuário informa tentativa interrompida e libera login', async () => {
  jest.mocked(consumeGoogleRedirect).mockReturnValueOnce(true)
  mount()
  await emit(null)
  expect(context.isLoading).toBe(false)
  expect(context.user).toBeNull()
  expect(toast.error).toHaveBeenCalledWith(
    'O login com o Google não foi concluído. Tente novamente.',
  )
})

test('redirect null com usuário restaurado pelo observador conclui autenticação', async () => {
  jest.mocked(consumeGoogleRedirect).mockReturnValueOnce(true)
  fakeAuth.currentUser = first
  mount()
  await emit(first)
  expect(context.user).toBe(first)
  expect(toast.error).not.toHaveBeenCalled()
})

test('troca de UID bloqueia navegação antes de aguardar limpeza do cache', async () => {
  const client = mount()
  await emit(first)
  const delayed = deferred()
  jest.spyOn(client, 'cancelQueries').mockReturnValueOnce(delayed.promise)
  fakeAuth.currentUser = second
  let switching!: Promise<void>
  await act(async () => {
    switching = listener()(second)
    await Promise.resolve()
  })
  expect(context.isLoading).toBe(true)
  expect(context.user).toBeNull()
  await act(async () => {
    delayed.resolve()
    await switching
  })
  expect(context.user).toBe(second)
})
