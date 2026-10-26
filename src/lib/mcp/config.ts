import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export class McpError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

export const MCP_DEFAULT_SCOPES = [
  'transactions:read',
  'transactions:write',
] as const
export const MCP_SCOPES = [
  ...MCP_DEFAULT_SCOPES,
  'categories:read',
  'categories:write',
  'cards:read',
  'cards:write',
  'invoices:read',
  'invoices:write',
  'series:read',
  'series:write',
  'budgets:read',
  'budgets:write',
] as const
export const MCP_SCOPE_LABELS: Record<(typeof MCP_SCOPES)[number], string> = {
  'transactions:read': 'Consultar lançamentos, contexto e resumos financeiros',
  'transactions:write': 'Registrar, editar e excluir lançamentos',
  'categories:read': 'Consultar categorias, inclusive histórico',
  'categories:write': 'Criar, editar e remover categorias',
  'cards:read': 'Consultar cartões, inclusive inativos e arquivados',
  'cards:write': 'Criar, editar, arquivar e excluir cartões',
  'invoices:read': 'Consultar faturas e quitações',
  'invoices:write': 'Registrar e estornar quitações integrais',
  'series:read': 'Consultar recorrências e parcelamentos',
  'series:write': 'Criar séries, gerar pendências, editar e cancelar futuras',
  'budgets:read': 'Consultar orçamentos e metas',
  'budgets:write': 'Definir e remover limites e metas',
}
export const hashSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export const newSecret = () => randomBytes(32).toString('base64url')
export function equalSecret(left: string, right: string) {
  return timingSafeEqual(
    Buffer.from(hashSecret(left)),
    Buffer.from(hashSecret(right)),
  )
}

export function mcpConfig() {
  const origin = process.env.MCP_ORIGIN ?? ''
  const clientId = process.env.MCP_CLIENT_ID ?? ''
  const uids = (process.env.MCP_ALLOWED_UIDS ?? '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean)
  const redirects = (process.env.MCP_REDIRECT_URIS ?? '')
    .split(',')
    .map((uri) => uri.trim())
    .filter(Boolean)
  const validUrl = (value: string) => {
    try {
      const url = new URL(value)
      return (
        !url.hash &&
        !url.username &&
        !url.password &&
        (url.protocol === 'https:' ||
          (process.env.NODE_ENV !== 'production' &&
            url.origin === 'http://localhost:3102'))
      )
    } catch {
      return false
    }
  }
  if (
    !validUrl(origin) ||
    new URL(origin).origin !== origin ||
    !clientId ||
    !uids.length ||
    uids.length > 5 ||
    uids.some((uid) => !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) ||
    !redirects.length ||
    redirects.some((uri) => !validUrl(uri))
  ) {
    throw new McpError(
      'mcp/not-configured',
      'A integração não está configurada.',
      503,
    )
  }
  return {
    origin,
    resource: `${origin}/api/mcp`,
    clientId,
    clientSecret: process.env.MCP_CLIENT_SECRET ?? '',
    uids,
    redirects,
  }
}

export function assertAllowedUid(uid: string) {
  if (!mcpConfig().uids.includes(uid))
    throw new McpError('mcp/forbidden', 'Esta conta não está autorizada.', 403)
}

export function authorizationRequest(params: URLSearchParams) {
  const config = mcpConfig()
  const read = (key: string) => {
    if (params.getAll(key).length > 1)
      throw new McpError('invalid_request', 'Parâmetro OAuth repetido.')
    return params.get(key) ?? ''
  }
  const clientId = read('client_id'),
    redirectUri = read('redirect_uri')
  const challenge = read('code_challenge'),
    state = read('state')
  const resource = read('resource'),
    scope = read('scope') || MCP_DEFAULT_SCOPES.join(' ')
  if (
    read('response_type') !== 'code' ||
    clientId !== config.clientId ||
    !config.redirects.includes(redirectUri) ||
    resource !== config.resource ||
    read('code_challenge_method') !== 'S256' ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    !state ||
    state.length > 1024 ||
    scope
      .split(' ')
      .some((item) => !MCP_SCOPES.includes(item as (typeof MCP_SCOPES)[number]))
  ) {
    throw new McpError('invalid_request', 'Solicitação OAuth inválida.')
  }
  return {
    clientId,
    redirectUri,
    challenge,
    state,
    resource,
    scopes: [...new Set(scope.split(' ') as (typeof MCP_SCOPES)[number][])],
  }
}

export type AuthorizationRequest = ReturnType<typeof authorizationRequest>
