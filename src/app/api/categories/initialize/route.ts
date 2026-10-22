import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { initializeCategories } from '@/services/category-initialization.service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const json = (data: unknown, status = 200) => NextResponse.json(data, {
    status, headers: { 'Cache-Control': 'no-store' },
  })
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if ((origin && origin !== new URL(request.url).origin) ||
    (site && !['same-origin', 'same-site'].includes(site))) return json({ error: 'Origem inválida.' }, 403)
  const session = (await cookies()).get('session')?.value
  let uid: string
  try {
    if (!session) return json({ error: 'Entre novamente.' }, 401)
    uid = (await adminAuth.verifySessionCookie(session, true)).uid
  } catch { return json({ error: 'Sessão inválida.' }, 401) }
  try {
    await initializeCategories(uid)
    return json({ initialized: true })
  } catch {
    return json({ error: 'Não foi possível preparar as categorias. Tente novamente.' }, 500)
  }
}
