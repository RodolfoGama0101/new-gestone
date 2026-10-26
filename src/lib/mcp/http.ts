import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { assertAllowedUid, McpError, mcpConfig } from './config'

export function mcpJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  })
}

export function mcpFailure(error: unknown) {
  if (error instanceof McpError)
    return mcpJson(
      { error: error.code, error_description: error.message },
      error.status,
    )
  return mcpJson(
    {
      error: 'server_error',
      error_description: 'Não foi possível concluir. Tente novamente.',
    },
    500,
  )
}

export function assertSameOrigin(request: Request) {
  const site = request.headers.get('sec-fetch-site')
  if (
    request.headers.get('origin') !== mcpConfig().origin ||
    (site && site !== 'same-origin')
  )
    throw new McpError('invalid_request', 'Origem inválida.', 403)
}

export async function integrationUid() {
  const session = (await cookies()).get('session')?.value
  if (!session)
    throw new McpError(
      'login_required',
      'Entre no GestOne para continuar.',
      401,
    )
  let uid: string
  try {
    uid = (await adminAuth.verifySessionCookie(session, true)).uid
  } catch {
    throw new McpError('login_required', 'Entre novamente no GestOne.', 401)
  }
  assertAllowedUid(uid)
  return uid
}

export async function limitedJson(request: Request) {
  const text = await request.text()
  if (Buffer.byteLength(text) > 256_000)
    throw new McpError('invalid_request', 'Solicitação muito grande.', 413)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new McpError('invalid_request', 'JSON inválido.')
  }
}
