import { test, expect, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

async function register(page: Page) {
  const email = `pwa-${crypto.randomUUID()}@example.test`
  await page.goto('/register')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page.getByLabel('Confirmar Senha', { exact: true }).fill('TesteSeguro@123')
  await page.getByRole('button', { name: 'Criar conta grátis', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:3102/')
  return email.split('@')[0]
}

test('logout offline e segunda conta não recuperam o histórico anterior', async ({ page, context }) => {
  const first = await register(page)
  await page.goto('/expenses')
  await page.getByRole('button', { name: 'Nova Despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Valor', { exact: true }).fill('12345')
  await dialog.getByLabel('Descrição', { exact: true }).fill('Histórico privado da primeira conta')
  await dialog.getByLabel('Categoria', { exact: true }).click()
  await page.getByRole('option', { name: 'Alimentação', exact: true }).first().click()
  await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Histórico privado da primeira conta', { exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.locator('header').getByRole('button', { name: first }).click()
  await page.getByRole('menuitem', { name: 'Sair da conta' }).click()
  await expect(page.getByText('Histórico privado da primeira conta', { exact: true })).toHaveCount(0)
  await expect(page).toHaveURL('http://localhost:3102/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await context.setOffline(false)
  await register(page)
  await page.goto('/expenses')
  await expect(page.getByText('Sem despesas registradas', { exact: true })).toBeVisible()
  await page.goBack()
  await page.goForward()
  await expect(page.getByText('Histórico privado da primeira conta', { exact: true })).toHaveCount(0)
})

test('worker limpa cache antigo, não cacheia APIs e mostra fallback offline após atualizar', async ({ page, context }) => {
  await page.goto('/login')
  await page.evaluate(async () => {
    const legacy = await caches.open('apis')
    await legacy.put('/api/auth/session', new Response('dados-antigos'))
    await navigator.serviceWorker.ready
  })
  // O cache é inserido depois da primeira ativação; uma nova versão deve removê-lo.
  const original = await readFile('public/sw.js', 'utf8')
  expect(original).not.toContain('start-url')
  try {
    await writeFile('public/sw.js', `${original}\n// update-test-${Date.now()}\n`)
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      await new Promise<void>((resolve, reject) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        registration.update().catch(reject)
      })
    })
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes('apis'))).toBe(false)
    await page.evaluate(() => fetch('/'))
    await page.request.get('/api/auth/session')
    await page.evaluate(() => fetch('/api/auth/session').catch(() => undefined))
    const cached = await page.evaluate(async () => {
      const result: string[] = []
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys()) result.push(new URL(request.url).pathname)
      }
      return result
    })
    expect(cached.some((path) => path.startsWith('/api/') || path === '/' || path === '/transactions')).toBe(false)
    await context.setOffline(true)
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Sem conexão com a internet' })).toBeVisible()
    expect(await page.evaluate(() => fetch('/api/auth/session').then(() => true, () => false))).toBe(false)
    await context.setOffline(false)
    await page.goto('/login')
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
    await writeFile('public/sw.js', original)
  }
})
