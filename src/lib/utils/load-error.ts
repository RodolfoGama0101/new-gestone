export function loadErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return 'Você está sem conexão. Verifique a rede e tente novamente.'
  if (code.endsWith('permission-denied') || code.endsWith('unauthenticated'))
    return 'Sua sessão não permite carregar estes dados. Entre novamente e tente de novo.'
  return 'Não foi possível carregar os dados. Tente novamente em instantes.'
}
