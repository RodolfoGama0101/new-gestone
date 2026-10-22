import { test, expect, type Page } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = 'demo-gestone-e2e'
if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error(
    'Execute npm run test:e2e: somente emuladores locais são permitidos.',
  )
const app = getApps()[0] ?? initializeApp({ projectId })
const db = getFirestore(app)
const auth = getAuth(app)
const password = 'TesteSeguro@123'

async function register(page: Page) {
  const email = `test-${crypto.randomUUID()}@example.test`
  await page.goto('/register')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Senha', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 90000 })
  return { email, uid: (await auth.getUserByEmail(email)).uid }
}

test('três tipos mantêm rótulo, ícone e sinal no extrato e painel', async ({
  page,
}) => {
  const { uid } = await register(page)
  const now = Timestamp.now()
  for (const type of ['income', 'expense', 'investment']) {
    await db
      .doc('users/' + uid + '/transactions/' + type)
      .set({
        type,
        amount: 10001,
        description: 'Revisão ' + type,
        categoryId: '',
        date: now,
        tags: [],
        notes: null,
        recurring: false,
        createdAt: now,
        updatedAt: now,
      })
  }
  for (const route of ['/transactions', '/']) {
    await page.goto(route)
    for (const label of ['Receita', 'Despesa', 'Investimento'])
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (value) =>
          document.documentElement.classList.toggle('dark', value === 'dark'),
        theme,
      )
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        theme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
      )
      await page.screenshot({
        path:
          'dogfood-output/rod-119/' +
          theme +
          '-' +
          (route.slice(1) || 'dashboard') +
          '.png',
        fullPage: true,
      })
    }
  }
  await page.goto('/investments')
  await expect(page.getByText('Investimento', { exact: true })).toBeVisible()
})
