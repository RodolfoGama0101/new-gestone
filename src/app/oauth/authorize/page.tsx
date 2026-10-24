import { authorizationRequest, McpError } from '@/lib/mcp/config'
import { integrationUid } from '@/lib/mcp/http'
import { McpConsent } from '@/components/integrations/mcp-consent'

export const dynamic = 'force-dynamic'

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else if (value !== undefined) params.append(key, value)
  }
  let input: ReturnType<typeof authorizationRequest> | undefined
  let signedIn = false
  let message = ''
  try {
    input = authorizationRequest(params)
    try {
      await integrationUid()
      signedIn = true
    } catch (error) {
      if (!(error instanceof McpError) || error.status !== 401) throw error
    }
  } catch (error) {
    message =
      error instanceof McpError
        ? error.message
        : 'Não foi possível validar esta solicitação.'
  }
  if (message || !input)
    return (
      <main className="mx-auto max-w-xl space-y-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">Conexão indisponível</h1>
        <p role="alert">{message}</p>
      </main>
    )
  return (
    <main className="bg-background mx-auto max-w-xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Conectar ChatGPT ao GestOne</h1>
      <p>
        O ChatGPT poderá{' '}
        {input.scopes.includes('transactions:read')
          ? 'consultar suas categorias, cartões e contexto financeiro'
          : ''}
        {input.scopes.includes('transactions:read') &&
        input.scopes.includes('transactions:write')
          ? ' e '
          : ''}
        {input.scopes.includes('transactions:write')
          ? 'registrar lançamentos avulsos na sua conta'
          : ''}
        .
      </p>
      <p className="text-muted-foreground text-sm">
        A conexão vale por até 30 dias. Você pode revogar o acesso em
        Configurações → Integrações. Textos e fotos enviados ao ChatGPT são
        processados por ele.
      </p>
      <McpConsent query={params.toString()} signedIn={signedIn} />
    </main>
  )
}
