// Apenas nomes de etapas e códigos de erro: nunca tokens, e-mails ou UIDs.
export function recordAuthStage(stage: string, error?: unknown) {
  if (typeof document === 'undefined') return

  if (stage === 'authentication:initializing') {
    try {
      const flow = sessionStorage.getItem('gestone:auth-debug-flow')
      const code = sessionStorage.getItem('gestone:auth-debug-error')
      if (flow && /^google:[a-z-]+$/.test(flow)) {
        document.documentElement.dataset.authFlow = flow
      }
      if (code && /^(auth|app)\/[a-z0-9-]+$/.test(code)) {
        document.documentElement.dataset.authError = code
      }
    } catch {
      /* Diagnóstico não depende da disponibilidade do armazenamento. */
    }
  }
  if (stage === 'google:opening-popup') {
    delete document.documentElement.dataset.authError
    try {
      sessionStorage.removeItem('gestone:auth-debug-error')
    } catch {
      /* opcional */
    }
  }
  document.documentElement.dataset.authStage = stage
  if (stage.startsWith('google:')) {
    document.documentElement.dataset.authFlow = stage
    try {
      sessionStorage.setItem('gestone:auth-debug-flow', stage)
    } catch {
      /* opcional */
    }
  }
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && /^(auth|app)\/[a-z0-9-]+$/.test(code)) {
    document.documentElement.dataset.authError = code
    try {
      sessionStorage.setItem('gestone:auth-debug-error', code)
    } catch {
      /* opcional */
    }
  }
}
