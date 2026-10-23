import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import {
  CreditCardRemovalError,
  removeCreditCard,
} from '@/services/credit-card-removal.service'

export const runtime = 'nodejs'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const json = (data: unknown, status = 200) =>
    NextResponse.json(data, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    })
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if (
    (origin && origin !== new URL(request.url).origin) ||
    (site && !['same-origin', 'same-site'].includes(site))
  ) {
    return json({ error: 'Origem inválida.' }, 403)
  }
  let uid: string
  try {
    const session = (await cookies()).get('session')?.value
    if (!session)
      return json({ error: 'Entre novamente para excluir o cartão.' }, 401)
    uid = (await adminAuth.verifySessionCookie(session, true)).uid
  } catch {
    return json({ error: 'Sessão inválida. Entre novamente.' }, 401)
  }
  const { cardId } = await context.params
  if (
    !cardId ||
    cardId.includes('/') ||
    cardId === '.' ||
    cardId === '..' ||
    new TextEncoder().encode(cardId).length > 1500
  ) {
    return json({ error: 'Cartão inválido.' }, 400)
  }
  try {
    await removeCreditCard(uid, cardId)
    return json({ action: 'deleted' })
  } catch (error) {
    if (error instanceof CreditCardRemovalError) {
      if (error.code === 'card/not-found')
        return json({ error: 'Cartão não encontrado.' }, 404)
      return json(
        {
          error:
            'Este cartão possui compras, séries ou pagamentos vinculados. Arquive-o para preservar o histórico.',
        },
        409,
      )
    }
    return json(
      { error: 'Não foi possível excluir o cartão. Tente novamente.' },
      500,
    )
  }
}
