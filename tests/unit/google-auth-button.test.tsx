/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { useAuth } from '@/contexts/auth-context'

jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }))
jest.mock('@/lib/firebase/auth', () => ({ canUseGoogleRedirect: () => true }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const signInWithGoogle = jest.fn<Promise<User | null>, []>()
const replace = jest.fn()
const refresh = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  signInWithGoogle.mockReset()
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    sessionError: null,
    retrySession: jest.fn(),
    signInWithGoogle,
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOutUser: jest.fn(),
  })
  jest.mocked(useRouter).mockReturnValue({
    replace,
    refresh,
    back: jest.fn(),
    forward: jest.fn(),
    push: jest.fn(),
    prefetch: jest.fn(),
    bfcacheId: 'login-test',
  })
})

test('aguarda a sessão e deixa a navegação a cargo do provedor de autenticação', async () => {
  let finishSession!: (user: User) => void
  signInWithGoogle.mockReturnValue(
    new Promise((resolve) => {
      finishSession = resolve
    }),
  )
  render(<GoogleAuthButton />)
  const button = screen.getByRole('button', { name: 'Continuar com o Google' })

  fireEvent.click(button)
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(toast.success).not.toHaveBeenCalled()

  await act(async () => {
    finishSession({ uid: 'google-user' } as User)
  })

  expect(toast.success).toHaveBeenCalledWith(
    'Login efetuado com sucesso via Google!',
  )
  expect(replace).not.toHaveBeenCalled()
  expect(refresh).not.toHaveBeenCalled()
  expect(button).toBeEnabled()
})

test('falha ao criar a sessão exibe o erro e permite uma nova tentativa', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    signInWithGoogle.mockRejectedValueOnce({
      code: 'auth/session-service-unavailable',
    })
    signInWithGoogle.mockResolvedValueOnce({ uid: 'google-user' } as User)
    render(<GoogleAuthButton />)
    const button = screen.getByRole('button', {
      name: 'Continuar com o Google',
    })

    fireEvent.click(button)
    await waitFor(() => expect(button).toBeEnabled())
    expect(toast.error).toHaveBeenCalledWith(
      'O serviço de sessão está indisponível. Tente novamente em instantes.',
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()

    fireEvent.click(button)
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
    expect(signInWithGoogle).toHaveBeenCalledTimes(2)
  } finally {
    jest.restoreAllMocks()
  }
})

test('restauração inicial impede clique prematuro no Google', () => {
  jest.mocked(useAuth).mockReturnValue({ ...useAuth(), isLoading: true })
  render(<GoogleAuthButton />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar com o Google' }),
  )
  expect(signInWithGoogle).not.toHaveBeenCalled()
})

test('popup bloqueado oferece redirect somente por novo clique explícito', async () => {
  signInWithGoogle.mockRejectedValueOnce({ code: 'auth/popup-blocked' })
  signInWithGoogle.mockResolvedValueOnce(null)
  render(<GoogleAuthButton />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar com o Google' }),
  )
  const fallback = await screen.findByRole('button', {
    name: 'Continuar nesta aba',
  })
  expect(signInWithGoogle).toHaveBeenCalledTimes(1)
  fireEvent.click(fallback)
  await waitFor(() =>
    expect(signInWithGoogle).toHaveBeenLastCalledWith('redirect'),
  )
  expect(toast.success).not.toHaveBeenCalled()
})
