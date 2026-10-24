import { MCP_SCOPES, mcpConfig } from '@/lib/mcp/config'
import { mcpFailure, mcpJson } from '@/lib/mcp/http'

export function GET() {
  try {
    const config = mcpConfig()
    return mcpJson({
      issuer: config.origin,
      authorization_endpoint: `${config.origin}/oauth/authorize`,
      token_endpoint: `${config.origin}/api/mcp/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: MCP_SCOPES,
      token_endpoint_auth_methods_supported: [
        config.clientSecret ? 'client_secret_post' : 'none',
      ],
      authorization_response_iss_parameter_supported: true,
    })
  } catch (error) {
    return mcpFailure(error)
  }
}
