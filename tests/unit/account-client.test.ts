import type { User } from 'firebase/auth'
import { AccountDeletionError, deleteAccount } from '@/lib/firebase/account'

describe('envio da confirmação de identidade para exclusão', () => {
  const getIdToken = jest.fn()
  const user = { getIdToken } as unknown as User

  beforeEach(() => {
    getIdToken.mockReset().mockResolvedValue('updated-token')
    jest.spyOn(global, 'fetch').mockResolvedValue(Response.json({ success: true }))
  })

  afterEach(() => jest.restoreAllMocks())

  test('renova o ID token antes de enviá-lo junto com a sessão', async () => {
    await deleteAccount(user)
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(fetch).toHaveBeenCalledWith('/api/account', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { Authorization: 'Bearer updated-token' },
    })
  })

  test('não solicita exclusão quando não consegue obter o token atualizado', async () => {
    getIdToken.mockRejectedValue(new Error('reauth-failed'))
    await expect(deleteAccount(user)).rejects.toThrow('reauth-failed')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('preserva o código de confirmação expirada para reabrir a reautenticação', async () => {
    jest.mocked(fetch).mockResolvedValue(Response.json({
      code: 'auth/requires-recent-login', error: 'Confirme sua identidade novamente.',
    }, { status: 401 }))
    await expect(deleteAccount(user)).rejects.toMatchObject({
      code: 'auth/requires-recent-login', message: 'Confirme sua identidade novamente.',
    })
  })

  test('trata falha sem JSON sem expor a resposta técnica', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response('internal details', { status: 500 }))
    await expect(deleteAccount(user)).rejects.toEqual(new AccountDeletionError(
      'account/delete-failed', 'Não foi possível excluir a conta.',
    ))
  })
})
