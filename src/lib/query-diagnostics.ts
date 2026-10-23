const queryErrorCodes = new Set([
  'cancelled',
  'unknown',
  'invalid-argument',
  'deadline-exceeded',
  'not-found',
  'already-exists',
  'permission-denied',
  'resource-exhausted',
  'failed-precondition',
  'aborted',
  'out-of-range',
  'unimplemented',
  'internal',
  'unavailable',
  'data-loss',
  'unauthenticated',
])

/** Não registra mensagens, chaves de consulta ou payloads que podem conter dados pessoais. */
export function reportQueryError(error: unknown) {
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined
  const code =
    typeof rawCode === 'string' ? rawCode.replace(/^firestore\//, '') : ''
  // Uma consulta rejeitada permanece no estado de erro do TanStack Query.
  // console.error a transforma também em overlay do Next durante desenvolvimento.
  console.warn('Falha ao carregar consulta', {
    code: queryErrorCodes.has(code) ? code : 'unknown',
  })
}
