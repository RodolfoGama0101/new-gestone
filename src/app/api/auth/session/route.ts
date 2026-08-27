import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5

function hasTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (origin && origin !== new URL(request.url).origin) return false
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site'
}

function setSessionCookie(response: NextResponse, value: string, maxAge: number) {
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
  const authError = error as { code?: unknown; message?: unknown }
  const code = typeof authError.code === 'string' ? authError.code : ''
  const message = typeof authError.message === 'string' ? authError.message : ''
  const normalizedMessage = message.toLowerCase()
  const isConfigurationError =
    code.startsWith('app/') ||
    normalizedMessage.includes('could not load the default credentials') ||
    normalizedMessage.includes('credential implementation')

  if (isConfigurationError) {
    return NextResponse.json(
      {
        code: 'auth/session-service-unavailable',
        error: 'O serviço de sessão não está configurado corretamente.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { code: 'auth/invalid-session', error: 'Não foi possível validar a sessão.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json(
        { code: 'auth/invalid-origin', error: 'Origem da solicitação inválida' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const body = (await request.json()) as { token?: unknown }
    if (typeof body.token !== 'string' || !body.token) {
      return NextResponse.json(
        { code: 'auth/missing-token', error: 'Token é obrigatório' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    await adminAuth.verifyIdToken(body.token)

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
    console.error('Erro ao criar cookie de sessão:', error)
    return sessionError(error)
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { code: 'auth/invalid-origin', error: 'Origem da solicitação inválida' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  setSessionCookie(response, '', 0)
  return response
}
