// Apenas nomes de etapas e códigos de erro: nunca tokens, e-mails ou UIDs.
export function recordAuthStage(stage: string, error?: unknown) {
  if (typeof document === 'undefined') return

  if (stage === 'authentication:initializing' || stage === 'google:opening-popup') {
    delete document.documentElement.dataset.authError
  }
  document.documentElement.dataset.authStage = stage
  if (stage.startsWith('google:')) {
    document.documentElement.dataset.authFlow = stage
  }
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && /^(auth|app)\/[a-z0-9-]+$/.test(code)) {
    document.documentElement.dataset.authError = code
  }
}
