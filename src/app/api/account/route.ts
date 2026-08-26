import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

function hasTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (origin && origin !== new URL(request.url).origin) return false
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'same-site'
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set('session', '', {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function DELETE(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Origem da solicitação inválida' }, { status: 403 })
  }

  try {
    const session = (await cookies()).get('session')?.value
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 401 })
    }

    const decodedSession = await adminAuth.verifySessionCookie(session, true)
    await adminDb.recursiveDelete(adminDb.doc(`users/${decodedSession.uid}`))
    await adminAuth.deleteUser(decodedSession.uid)

    const response = NextResponse.json({ success: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error('Erro ao excluir conta:', error)
    return NextResponse.json({ error: 'Não foi possível excluir a conta.' }, { status: 500 })
  }
}
