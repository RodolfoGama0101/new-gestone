import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60

function accountError(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

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
    return accountError('auth/invalid-origin', 'Origem da solicitação inválida.', 403)
  }

  try {
    const session = (await cookies()).get('session')?.value
    if (!session) {
      return accountError('auth/invalid-session', 'Sessão não encontrada. Entre novamente.', 401)
    }

    const token = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
    if (!token) {
      return accountError('auth/requires-recent-login', 'Confirme sua identidade novamente para excluir a conta.', 401)
    }

    let decodedSession
    let decodedToken
    try {
      decodedSession = await adminAuth.verifySessionCookie(session, true)
      decodedToken = await adminAuth.verifyIdToken(token, true)
    } catch {
      return accountError('auth/invalid-session', 'Sua autenticação não é válida. Entre novamente.', 401)
    }

    if (decodedSession.uid !== decodedToken.uid) {
      return accountError('auth/user-mismatch', 'A confirmação não corresponde à conta conectada.', 403)
    }

    // Renovar o token não renova auth_time: somente uma autenticação recente autoriza a exclusão.
    const now = Math.floor(Date.now() / 1000)
    const authTime = decodedToken.auth_time
    if (!Number.isSafeInteger(authTime) || authTime > now || now - authTime > RECENT_AUTH_MAX_AGE_SECONDS) {
      return accountError('auth/requires-recent-login', 'Confirme sua identidade novamente para excluir a conta.', 401)
    }

    await adminDb.recursiveDelete(adminDb.doc(`users/${decodedToken.uid}`))
    await adminAuth.deleteUser(decodedToken.uid)

    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
    clearSessionCookie(response)
    return response
  } catch (error) {
    const code = (error as { code?: unknown })?.code
    console.error('Erro ao excluir conta:', typeof code === 'string' ? code : 'account/delete-failed')
    return accountError('account/delete-failed', 'Não foi possível excluir a conta.', 500)
  }
}
