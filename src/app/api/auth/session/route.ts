import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { authErrorCode } from '@/lib/firebase/auth-errors'

export const runtime = 'nodejs'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5
const RECENT_AUTH_SECONDS = 5 * 60
const MAX_BODY_BYTES = 16000

function failure(code: string, error: string, status: number) {
  return NextResponse.json(
    { code, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

function hasTrustedRequestOrigin(request: Request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    (!request.headers.get('sec-fetch-site') ||
      request.headers.get('sec-fetch-site') === 'same-origin')
  )
}

function setSessionCookie(
  response: NextResponse,
  value: string,
  maxAge: number,
) {
  response.cookies.set('session', value, {
    maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    priority: 'high',
  })
}

function sessionError(error: unknown) {
  const code = authErrorCode(error)
  if (
    [
      'auth/id-token-expired',
      'auth/id-token-revoked',
      'auth/invalid-id-token',
      'auth/argument-error',
      'auth/user-disabled',
      'auth/user-not-found',
    ].includes(code)
  ) {
    return failure(
      'auth/invalid-session',
      'Não foi possível validar a sessão.',
      401,
    )
  }
  // Credenciais, IAM, rede e erros inesperados não significam token inválido.
  return failure(
    'auth/session-service-unavailable',
    'O serviço de sessão está indisponível.',
    503,
  )
}

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request))
    return failure(
      'auth/invalid-origin',
      'Origem da solicitação inválida.',
      403,
    )
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/json'
  ) {
    return failure('auth/invalid-body', 'Envie um corpo JSON.', 400)
  }
  let body: unknown
  try {
    const text = await request.text()
    if (Buffer.byteLength(text) > MAX_BODY_BYTES)
      return failure('auth/invalid-body', 'Solicitação muito grande.', 413)
    body = JSON.parse(text) as unknown
  } catch {
    return failure('auth/invalid-body', 'JSON inválido.', 400)
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !('token' in body) ||
    typeof body.token !== 'string' ||
    !body.token
  ) {
    return failure('auth/missing-token', 'Token é obrigatório.', 400)
  }
  try {
    const decoded = await adminAuth.verifyIdToken(body.token, true)
    const now = Math.floor(Date.now() / 1000)
    if (
      !Number.isSafeInteger(decoded.auth_time) ||
      decoded.auth_time > now ||
      decoded.auth_time < 0
    ) {
      return failure(
        'auth/invalid-session',
        'Data de autenticação inválida.',
        401,
      )
    }
    const recent =
      Number.isSafeInteger(decoded.auth_time) &&
      decoded.auth_time <= now &&
      now - decoded.auth_time <= RECENT_AUTH_SECONDS
    if (!recent) {
      const session = new NextRequest(request.url, {
        headers: request.headers,
      }).cookies.get('session')?.value
      if (!session)
        return failure(
          'auth/requires-recent-login',
          'Entre novamente para criar uma sessão.',
          401,
        )
      let sessionUid: string
      try {
        sessionUid = (await adminAuth.verifySessionCookie(session, true)).uid
      } catch (error) {
        const code = authErrorCode(error)
        if (
          [
            'auth/session-cookie-expired',
            'auth/session-cookie-revoked',
            'auth/invalid-session-cookie',
            'auth/argument-error',
            'auth/user-disabled',
            'auth/user-not-found',
          ].includes(code)
        ) {
          return failure(
            'auth/requires-recent-login',
            'Entre novamente para criar uma sessão.',
            401,
          )
        }
        throw error
      }
      if (sessionUid !== decoded.uid)
        return failure(
          'auth/user-mismatch',
          'A sessão pertence a outra conta.',
          403,
        )
    }
    const sessionCookie = await adminAuth.createSessionCookie(body.token, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    })
    const response = NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    setSessionCookie(response, sessionCookie, SESSION_MAX_AGE_SECONDS)
    return response
  } catch (error) {
    console.error('Erro ao criar cookie de sessão:', authErrorCode(error))
    return sessionError(error)
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedRequestOrigin(request))
    return failure(
      'auth/invalid-origin',
      'Origem da solicitação inválida.',
      403,
    )
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  setSessionCookie(response, '', 0)
  return response
}
