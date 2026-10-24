import {
  assertSameOrigin,
  integrationUid,
  mcpFailure,
  mcpJson,
} from '@/lib/mcp/http'
import {
  integrationConnections,
  revokeConnections,
} from '@/services/mcp-auth.service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return mcpJson({
      connections: await integrationConnections(await integrationUid()),
    })
  } catch (error) {
    return mcpFailure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request)
    await revokeConnections(await integrationUid())
    return mcpJson({ revoked: true })
  } catch (error) {
    return mcpFailure(error)
  }
}
