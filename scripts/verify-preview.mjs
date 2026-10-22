import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export function previewConfiguration(env) {
  const required = ['PREVIEW_ORIGIN', 'PREVIEW_ALLOWED_HOST', 'PREVIEW_PROJECT_ID', 'PREVIEW_API_KEY', 'PREVIEW_TEST_EMAIL', 'PREVIEW_TEST_PASSWORD']
  if (required.some((key) => !env[key]?.trim())) throw new Error(`Configure ${required.join(', ')} no ambiente.`)
  const origin = new URL(env.PREVIEW_ORIGIN)
  const project = env.PREVIEW_PROJECT_ID
  if (!/^[a-z][a-z0-9-]+$/.test(project) || origin.protocol !== 'https:' || origin.port
    || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || origin.hostname !== env.PREVIEW_ALLOWED_HOST
    || !/^[a-z0-9-]+-git-[a-z0-9-]+\.vercel\.app$/.test(origin.hostname)
    || /-git-(main|master|production)(-|\.)/.test(origin.hostname)) {
    throw new Error('Use a URL HTTPS de preview de branch Vercel e confirme seu hostname em PREVIEW_ALLOWED_HOST.')
  }
  return { origin: origin.origin, project, apiKey: env.PREVIEW_API_KEY, email: env.PREVIEW_TEST_EMAIL, password: env.PREVIEW_TEST_PASSWORD, bypass: env.VERCEL_AUTOMATION_BYPASS_SECRET }
}

export async function verifyPreview(env, fetchImpl = fetch) {
  const config = previewConfiguration(env)
  const request = async (url, options, label) => {
    try {
      const headers = new Headers(options?.headers)
      // O segredo de automação fica restrito ao preview; nunca vai para o Firebase.
      if (new URL(url).origin === config.origin && config.bypass) headers.set('x-vercel-protection-bypass', config.bypass)
      return await fetchImpl(url, { ...options, headers, redirect: 'error', signal: AbortSignal.timeout(20000) })
    } catch {
      // Não incluir resposta, credenciais ou URLs com chaves no erro/log.
      throw new Error(`${label}: falha de conexão ou redirecionamento inesperado.`)
    }
  }
  const expectStatus = (response, allowed, label) => {
    if (!allowed.includes(response.status)) throw new Error(`${label}: HTTP ${response.status}.`)
  }
  const login = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.email, password: config.password, returnSecureToken: true }),
  }, 'Login cliente')
  expectStatus(login, [200], 'Login cliente')
  const { idToken, localId } = await login.json()
  if (!idToken || !localId) throw new Error('Login cliente: resposta incompleta.')
  const sessionUrl = `${config.origin}/api/auth/session`
  const createSession = () => request(sessionUrl, {
    method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: idToken }),
  }, 'Sessão servidor')
  const session = await createSession()
  expectStatus(session, [200], 'Sessão servidor')
  const cookieHeader = session.headers.get('set-cookie') ?? ''
  const cookie = cookieHeader.match(/(?:^|,\s*)(session=[^;]+)/)?.[1]
  if (!cookie) throw new Error('Sessão servidor: cookie ausente.')
  try {
    if (!/;\s*HttpOnly(?:;|$)/i.test(cookieHeader) || !/;\s*Secure(?:;|$)/i.test(cookieHeader)
      || !/;\s*SameSite=Lax(?:;|$)/i.test(cookieHeader) || !session.headers.get('cache-control')?.includes('no-store')) {
      throw new Error('Sessão servidor: atributos de segurança/cache ausentes.')
    }
    const profile = await request(`https://firestore.googleapis.com/v1/projects/${config.project}/databases/(default)/documents/users/${encodeURIComponent(localId)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    }, 'Firestore cliente')
    // O app não exige documento de perfil: 404 autenticado é válido; 403 não é.
    expectStatus(profile, [200, 404], 'Firestore cliente')
    // ID novo e imprevisível: a rota valida a sessão e faz uma leitura Admin de
    // categoria inexistente. O resultado esperado é 404, sem alterar registros.
    const probe = `${config.origin}/api/categories/__preview_probe_${randomUUID()}`
    const anonymous = await request(probe, { method: 'DELETE', headers: { Origin: config.origin } }, 'Acesso anônimo')
    expectStatus(anonymous, [401], 'Acesso anônimo')
    const authenticated = await request(probe, { method: 'DELETE', headers: { Origin: config.origin, Cookie: cookie } }, 'Firestore servidor')
    expectStatus(authenticated, [404], 'Firestore servidor')
    const renewal = await createSession()
    expectStatus(renewal, [200], 'Renovação da sessão')
    if (!renewal.headers.get('set-cookie')?.match(/(?:^|,\s*)session=[^;]+/)) throw new Error('Renovação da sessão: cookie ausente.')
    return ['Login cliente', 'Cookie seguro no servidor', 'Firestore cliente', 'Sessão e Firestore Admin no servidor', 'Renovação da sessão']
  } finally {
    const logout = await request(sessionUrl, { method: 'DELETE', headers: { Origin: config.origin, Cookie: cookie } }, 'Limpeza da sessão')
    expectStatus(logout, [200], 'Limpeza da sessão')
    if (!/Max-Age=0/i.test(logout.headers.get('set-cookie') ?? '')) throw new Error('Limpeza da sessão: cookie não expirado.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPreview(process.env).then((checks) => {
    for (const check of checks) console.log(`OK: ${check}`)
    console.log('OK: sessão local encerrada; nenhum token ou cookie salvo em arquivo.')
  }).catch(() => {
    console.error('Validação do preview falhou. Confira configuração, conta de teste, sessão e permissões do runtime. Nenhuma credencial foi registrada.')
    process.exitCode = 1
  })
}
