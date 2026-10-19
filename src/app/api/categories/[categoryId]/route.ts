import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { removeCategory } from '@/services/category-removal.service'

export const runtime = 'nodejs'
export async function DELETE(request: Request, context: { params: Promise<{ categoryId: string }> }) {
  const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if ((origin && origin !== new URL(request.url).origin) || (site && !['same-origin', 'same-site'].includes(site))) return json({ error: 'Origem inválida.' }, 403)
  const session = (await cookies()).get('session')?.value
  let uid: string
  try {
    if (!session) return json({ error: 'Entre novamente.' }, 401)
    uid = (await adminAuth.verifySessionCookie(session, true)).uid
  } catch { return json({ error: 'Sessão inválida.' }, 401) }
  const { categoryId } = await context.params
  if (!categoryId || categoryId.includes('/') || categoryId.length > 1500) return json({ error: 'Categoria inválida.' }, 400)
  try { return json({ action: await removeCategory(uid, categoryId) }) }
  catch (error) { return json({ error: 'Não foi possível remover a categoria.' }, error instanceof Error && error.message === 'category/not-found' ? 404 : 500) }
}
