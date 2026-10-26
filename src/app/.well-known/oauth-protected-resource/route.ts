import { MCP_SCOPES, mcpConfig } from '@/lib/mcp/config'
import { mcpFailure, mcpJson } from '@/lib/mcp/http'

export function GET() {
  try {
    const config = mcpConfig()
    return mcpJson({
      resource: config.resource,
      authorization_servers: [config.origin],
      scopes_supported: MCP_SCOPES,
      bearer_methods_supported: ['header'],
    })
  } catch (error) {
    return mcpFailure(error)
  }
}
