import { test } from 'node:test'
import assert from 'node:assert/strict'
import { previewConfiguration, verifyPreview } from '../verify-preview.mjs'

const env = { PREVIEW_ORIGIN: 'https://new-gestone-git-pr-1-team.vercel.app', PREVIEW_ALLOWED_HOST: 'new-gestone-git-pr-1-team.vercel.app', PREVIEW_PROJECT_ID: 'new-gestone', PREVIEW_API_KEY: 'test-key', PREVIEW_TEST_EMAIL: 'test@example.test', PREVIEW_TEST_PASSWORD: 'test-password' }
const session = () => new Response('{}', { headers: { 'set-cookie': 'session=test-cookie; HttpOnly; Secure; SameSite=Lax', 'cache-control': 'no-store' } })
const logout = () => new Response('{}', { headers: { 'set-cookie': 'session=; Max-Age=0' } })
function responses(overrides = {}) {
  const replies = [
    () => Response.json({ idToken: 'test-token', localId: 'test-user' }), session,
    () => new Response('{}', { status: 404 }),
    () => new Response('{}', { status: 401 }),
    () => new Response('{}', { status: 404 }), session, logout,
  ]
  const calls = []
  return { calls, fetch: async (url, options) => {
    calls.push({ url, options })
    return (overrides[calls.length - 1] ?? replies[calls.length - 1])()
  } }
}

test('recusa produção, HTTP, credenciais na URL, caminhos e host impostor antes de acessar a rede', async () => {
  for (const origin of ['https://new-gestone.vercel.app', 'https://new-gestone.web.app', 'https://new-gestone-git-main-team.vercel.app', 'http://new-gestone-git-pr-1-team.vercel.app', 'https://new-gestone-git-pr-1-team.vercel.app.attacker.test', 'https://new-gestone-git-pr-1-team.vercel.app/path', 'https://user:password@new-gestone-git-pr-1-team.vercel.app', 'https://new-gestone-git-pr-1-team.vercel.app?token=secret']) {
    let called = false
    await assert.rejects(verifyPreview({ ...env, PREVIEW_ORIGIN: origin }, async () => { called = true }))
    assert.equal(called, false)
  }
  assert.throws(() => previewConfiguration({ ...env, PREVIEW_TEST_PASSWORD: '' }))
  assert.throws(() => previewConfiguration({ ...env, PREVIEW_ALLOWED_HOST: 'other-git-pr-1-team.vercel.app' }))
  assert.throws(() => previewConfiguration({ ...env, PREVIEW_ORIGIN: 'https://new-gestone-git-main-team.vercel.app', PREVIEW_ALLOWED_HOST: 'new-gestone-git-main-team.vercel.app' }))
})

test('valida cliente, cookie e leitura Admin usando ID aleatório inexistente; limpa a sessão', async () => {
  const mock = responses()
  assert.equal((await verifyPreview(env, mock.fetch)).length, 5)
  assert.equal(mock.calls.length, 7)
  assert.match(mock.calls[3].url, /\/api\/categories\/__preview_probe_[a-f0-9-]{36}$/)
  assert.equal(mock.calls[3].url, mock.calls[4].url)
  assert.equal(mock.calls[3].options.headers.get('cookie'), null)
  assert.equal(mock.calls[4].options.headers.get('cookie'), 'session=test-cookie')
  assert.equal(mock.calls[2].options.headers.get('authorization'), 'Bearer test-token')
  assert.ok(mock.calls.every(({ options }) => options.redirect === 'error'))
})

test('segredo de automação é enviado somente à origem Vercel autorizada', async () => {
  const mock = responses()
  await verifyPreview({ ...env, VERCEL_AUTOMATION_BYPASS_SECRET: 'test-bypass' }, mock.fetch)
  for (const call of mock.calls) {
    assert.equal(call.options.headers.get('x-vercel-protection-bypass'), new URL(call.url).origin === env.PREVIEW_ORIGIN ? 'test-bypass' : null)
  }
})

test('nega falsa aprovação de Firestore sem permissão e limpa a sessão mesmo após falha', async () => {
  const mock = responses({ 2: () => new Response('{}', { status: 403 }), 3: logout })
  await assert.rejects(verifyPreview(env, mock.fetch), /Firestore cliente: HTTP 403/)
  assert.equal(mock.calls.at(-1).options.method, 'DELETE')
  assert.match(mock.calls.at(-1).url, /\/api\/auth\/session$/)
})

test('falha do Admin não é tratada como categoria inexistente', async () => {
  const mock = responses({ 4: () => new Response('{}', { status: 500 }), 5: logout })
  await assert.rejects(verifyPreview(env, mock.fetch), /Firestore servidor: HTTP 500/)
  assert.match(mock.calls.at(-1).url, /\/api\/auth\/session$/)
})

test('erro de transporte não revela corpo, senha, cookie ou token', async () => {
  await assert.rejects(verifyPreview(env, async () => { throw new Error('test-password test-token test-cookie') }), (error) => {
    assert.doesNotMatch(error.message, /test-password|test-token|test-cookie/)
    return true
  })
})
