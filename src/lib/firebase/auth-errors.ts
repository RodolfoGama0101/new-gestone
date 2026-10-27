export function authErrorCode(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && /^(auth|app)\/[a-z0-9-]+$/.test(code)
    ? code
    : 'auth/unknown'
}

export function authErrorMessage(error: unknown) {
  switch (authErrorCode(error)) {
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login cancelado. Você pode tentar novamente.'
    case 'auth/unauthorized-domain':
      return 'Este domínio ainda não foi autorizado no Firebase.'
    case 'auth/redirect-not-configured':
      return 'O login nesta aba ainda não está configurado. Permita pop-ups para continuar com o Google.'
    case 'auth/account-exists-with-different-credential':
      return 'Entre usando o método já cadastrado para este e-mail.'
    case 'auth/requires-recent-login':
      return 'Sua sessão expirou. Entre novamente para continuar.'
    case 'auth/session-service-unavailable':
    case 'auth/session-timeout':
    case 'auth/network-request-failed':
      return 'O serviço de sessão está indisponível. Tente novamente em instantes.'
    case 'auth/action-in-progress':
      return 'Aguarde a autenticação em andamento.'
    default:
      return 'Não foi possível concluir a autenticação. Tente novamente.'
  }
}

export class AuthFlowError extends Error {
  constructor(public readonly code: string) {
    super(authErrorMessage({ code }))
    this.name = 'AuthFlowError'
  }
}
