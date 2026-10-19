/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { GoogleAuthProvider, User, UserCredential } from 'firebase/auth'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth'
import { ReauthDialog } from '@/components/auth/reauth-dialog'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/auth-context'
import { deleteAccount } from '@/lib/firebase/account'
import { toast } from 'sonner'

jest.mock('@/lib/firebase/config', () => ({ auth: { currentUser: null } }))
jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: {
    credential: jest.fn(() => ({ providerId: 'password' })),
  },
  GoogleAuthProvider: class {
    setCustomParameters = jest.fn()
  },
  reauthenticateWithCredential: jest.fn(),
  reauthenticateWithPopup: jest.fn(),
}))

const mockAuth = auth as unknown as { currentUser: User | null }
const mockPopup = jest.mocked(reauthenticateWithPopup)
const mockCredential = jest.mocked(reauthenticateWithCredential)
const originalFetch = global.fetch

function makeUser(providers: string[], uid = 'user-1') {
  return {
    uid,
    email: 'test@example.com',
    providerData: providers.map((providerId) => ({ providerId })),
    getIdToken: jest.fn().mockResolvedValue('fresh-token'),
  } as unknown as User
}

function selectUser(user: User | null) {
  mockAuth.currentUser = user
  jest.mocked(useAuth).mockReturnValue({ user } as ReturnType<typeof useAuth>)
}

function setup(providers: string[]) {
  const user = makeUser(providers)
  selectUser(user)
  const onClose = jest.fn()
  const onSuccess = jest.fn(() => deleteAccount(user))
  const props = { isOpen: true, onClose, onSuccess }
  const view = render(<ReauthDialog {...props} />)
  return { user, onClose, onSuccess, props, ...view }
}

describe('confirmação de identidade por provedor', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest
      .mocked(EmailAuthProvider.credential)
      .mockReturnValue({ providerId: 'password' } as ReturnType<
        typeof EmailAuthProvider.credential
      >)
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    mockPopup.mockResolvedValue({} as UserCredential)
    mockCredential.mockResolvedValue({} as UserCredential)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('conta somente Google confirma sem senha e segue para a exclusão segura', async () => {
    const { user, onSuccess } = setup(['google.com'])
    expect(screen.queryByLabelText('Senha Atual')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Confirmar Senha' }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar com o Google' }),
    )

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/account', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer fresh-token' },
      }),
    )
    expect(mockPopup).toHaveBeenCalledWith(user, expect.anything())
    expect(
      (mockPopup.mock.calls[0][1] as GoogleAuthProvider).setCustomParameters,
    ).toHaveBeenCalledWith({ prompt: 'select_account' })
    expect(user.getIdToken).toHaveBeenCalledWith(true)
    expect(mockCredential).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  test('conta email/senha conserva a confirmação de senha e o envio do token recente', async () => {
    const { user } = setup(['password'])
    expect(
      screen.queryByRole('button', { name: 'Confirmar com o Google' }),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Senha Atual'), {
      target: { value: 'test-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Senha' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      'test@example.com',
      'test-password',
    )
    expect(mockCredential).toHaveBeenCalledWith(user, {
      providerId: 'password',
    })
    expect(mockPopup).not.toHaveBeenCalled()
  })

  test.each(['google', 'password'])(
    'conta vinculada permite escolher %s',
    async (method) => {
      setup(['password', 'google.com'])
      expect(screen.getByLabelText('Senha Atual')).toBeVisible()
      if (method === 'password') {
        fireEvent.change(screen.getByLabelText('Senha Atual'), {
          target: { value: 'test-password' },
        })
      }
      fireEvent.click(
        screen.getByRole('button', {
          name:
            method === 'google' ? 'Confirmar com o Google' : 'Confirmar Senha',
        }),
      )
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      expect(
        method === 'google' ? mockPopup : mockCredential,
      ).toHaveBeenCalledTimes(1)
      expect(
        method === 'google' ? mockCredential : mockPopup,
      ).not.toHaveBeenCalled()
    },
  )

  test.each([
    [
      'auth/popup-closed-by-user',
      'Confirmação cancelada. Nenhuma ação foi executada.',
    ],
    [
      'auth/cancelled-popup-request',
      'Confirmação cancelada. Nenhuma ação foi executada.',
    ],
    [
      'auth/popup-blocked',
      'Permita pop-ups ou abra o GestOne no navegador para confirmar com o Google.',
    ],
    [
      'auth/user-mismatch',
      'Selecione a mesma conta Google conectada ao GestOne.',
    ],
    [
      'auth/network-request-failed',
      'Não foi possível confirmar sua identidade. Tente novamente.',
    ],
  ])(
    'falha Google %s não executa exclusão e permite tentar novamente',
    async (code, message) => {
      const { onSuccess } = setup(['google.com'])
      mockPopup.mockRejectedValueOnce({ code })
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar com o Google' }),
      )
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message))
      expect(onSuccess).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Confirmar com o Google' }),
      ).toBeEnabled()
      fireEvent.click(
        screen.getByRole('button', { name: 'Confirmar com o Google' }),
      )
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    },
  )

  test('senha incorreta não executa exclusão', async () => {
    const { onSuccess } = setup(['password'])
    mockCredential.mockRejectedValueOnce({ code: 'auth/invalid-credential' })
    fireEvent.change(screen.getByLabelText('Senha Atual'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Senha' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Senha incorreta. Tente novamente.',
      ),
    )
    expect(onSuccess).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('cancelar durante o pop-up impede exclusão mesmo que a confirmação termine depois', async () => {
    let resolvePopup!: (value: UserCredential) => void
    mockPopup.mockReturnValue(
      new Promise((resolve) => {
        resolvePopup = resolve
      }),
    )
    const { onClose, onSuccess } = setup(['google.com'])
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar com o Google' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolvePopup({} as UserCredential)
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('fechar e reabrir descarta senha e resultado pendente da tentativa anterior', async () => {
    let resolveCredential!: (value: UserCredential) => void
    mockCredential.mockReturnValue(
      new Promise((resolve) => {
        resolveCredential = resolve
      }),
    )
    const { props, rerender, onSuccess } = setup(['password'])
    fireEvent.change(screen.getByLabelText('Senha Atual'), {
      target: { value: 'old-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Senha' }))
    rerender(<ReauthDialog {...props} isOpen={false} />)
    rerender(<ReauthDialog {...props} />)
    expect(screen.getByLabelText('Senha Atual')).toHaveValue('')
    await act(async () => {
      resolveCredential({} as UserCredential)
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('troca de usuário durante confirmação impede a ação', async () => {
    let resolvePopup!: (value: UserCredential) => void
    mockPopup.mockReturnValue(
      new Promise((resolve) => {
        resolvePopup = resolve
      }),
    )
    const { onSuccess } = setup(['google.com'])
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar com o Google' }),
    )
    mockAuth.currentUser = makeUser(['google.com'], 'other-user')
    await act(async () => {
      resolvePopup({} as UserCredential)
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('cliques repetidos não abrem confirmações simultâneas', () => {
    mockPopup.mockReturnValue(new Promise(() => {}))
    setup(['google.com', 'password'])
    const button = screen.getByRole('button', {
      name: 'Confirmar com o Google',
    })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mockPopup).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'Confirmar Senha' }),
    ).toBeDisabled()
  })

  test('conta sem provedor suportado não oferece confirmação nem executa ação', () => {
    setup(['github.com'])
    expect(
      screen.getByText(/Não há um método de confirmação disponível/),
    ).toBeVisible()
    expect(screen.queryByLabelText('Senha Atual')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Confirmar/ }),
    ).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
