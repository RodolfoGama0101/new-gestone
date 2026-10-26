import { authorizationRequest, McpError } from '@/lib/mcp/config'
import {
  assertSameOrigin,
  integrationUid,
  limitedJson,
  mcpFailure,
  mcpJson,
} from '@/lib/mcp/http'
import { issueCode } from '@/services/mcp-auth.service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const uid = await integrationUid()
    const body = await limitedJson(request)
    if (
      !body ||
      typeof body !== 'object' ||
      !('query' in body) ||
      typeof body.query !== 'string'
    )
      throw new McpError('invalid_request', 'Solicitação inválida.')
    const input = authorizationRequest(new URLSearchParams(body.query))
    return mcpJson({ redirect: await issueCode(uid, input) })
  } catch (error) {
    return mcpFailure(error)
  }
}
