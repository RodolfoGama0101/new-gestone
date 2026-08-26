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
  })
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json({ error: 'Origem da solicitação inválida' }, { status: 403 })
    }

    const body = (await request.json()) as { token?: unknown }
    if (typeof body.token !== 'string' || !body.token) {
      return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
    }

    await adminAuth.verifyIdToken(body.token)

    const sessionCookie = await adminAuth.createSessionCookie(body.token, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    })
    const response = NextResponse.json({ success: true })
    setSessionCookie(response, sessionCookie, SESSION_MAX_AGE_SECONDS)
    return response
  } catch (error) {
    console.error('Erro ao criar cookie de sessão:', error)
    return NextResponse.json({ error: 'Não foi possível validar a sessão.' }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Origem da solicitação inválida' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  setSessionCookie(response, '', 0)
  return response
}
