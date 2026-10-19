import type { User } from 'firebase/auth'

export class AccountDeletionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'AccountDeletionError'
  }
}

export async function deleteAccount(user: User): Promise<void> {
  // Busca a prova atualizada após a reautenticação, sem trocar o cookie da sessão.
  const token = await user.getIdToken(true)
  const response = await fetch('/api/account', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: unknown; error?: unknown } | null
    throw new AccountDeletionError(
      typeof body?.code === 'string' ? body.code : 'account/delete-failed',
      typeof body?.error === 'string' ? body.error : 'Não foi possível excluir a conta.',
    )
  }
}
