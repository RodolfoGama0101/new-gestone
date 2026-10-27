let startedAt = 0
let attempt = 0

// Apenas nomes de etapas e códigos de erro: nunca tokens, e-mails ou UIDs.
export function recordAuthStage(stage: string, error?: unknown) {
  if (typeof document === 'undefined') return
  if (!/^[a-z]+:[a-z-]+$/.test(stage)) return

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
  if (
    stage === 'google:opening-popup' ||
    stage === 'google:standalone-redirect'
  ) {
    startedAt = Date.now()
    ++attempt
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
  const status = (error as { status?: unknown } | null)?.status
  if (typeof code === 'string' && /^(auth|app)\/[a-z0-9-]+$/.test(code)) {
    document.documentElement.dataset.authError = code
    try {
      sessionStorage.setItem('gestone:auth-debug-error', code)
    } catch {
      /* opcional */
    }
  }
  // Histórico limitado no documento atual, sem payloads ou identificadores da conta.
  try {
    const previous: unknown = JSON.parse(
      document.documentElement.dataset.authHistory ?? '[]',
    )
    const history = Array.isArray(previous) ? previous.slice(-19) : []
    history.push({
      stage,
      attempt,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
      activeClick: navigator.userActivation?.isActive === true,
      status:
        typeof status === 'number' &&
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
          ? status
          : undefined,
      code:
        typeof code === 'string' && /^(auth|app)\/[a-z0-9-]+$/.test(code)
          ? code
          : undefined,
    })
    document.documentElement.dataset.authHistory = JSON.stringify(history)
  } catch {
    /* diagnóstico opcional */
  }
}
