import { McpError } from '@/lib/mcp/config'
import { mcpFailure, mcpJson } from '@/lib/mcp/http'
import { exchangeToken } from '@/services/mcp-auth.service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    if (
      !request.headers
        .get('content-type')
        ?.startsWith('application/x-www-form-urlencoded')
    )
      throw new McpError('invalid_request', 'Use formulário OAuth.')
    const body = await request.text()
    if (Buffer.byteLength(body) > 8192)
      throw new McpError('invalid_request', 'Solicitação muito grande.', 413)
    return mcpJson(await exchangeToken(new URLSearchParams(body)))
  } catch (error) {
    return mcpFailure(error)
  }
}
