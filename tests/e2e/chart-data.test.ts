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
  await expect(page).toHaveURL(/^http:\/\/localhost:3102\/(?:\?month=\d{4}-\d{2})?$/, { timeout: 90000 })
  return { email, uid: (await auth.getUserByEmail(email)).uid }
}

test('gráficos expõem 20 categorias e séries sem hover em 320px nos dois temas', async ({
  page,
}) => {
  const { uid } = await register(page)
  const now = Timestamp.now()
  for (let i = 0; i < 20; i++) {
    const categoryId = 'chart-category-' + i
    await db
      .doc('users/' + uid + '/categories/' + categoryId)
      .set({
        name: 'Categoria extensa para revisão de legendas ' + i,
        type: 'expense',
        color: '#7c3aed',
        icon: 'Wallet',
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      })
    await db
      .doc('users/' + uid + '/transactions/chart-' + i)
      .set({
        type: 'expense',
        amount: 101,
        description: 'Revisão ' + i,
        categoryId,
        date: now,
        tags: [],
        notes: null,
        recurring: false,
        createdAt: now,
        updatedAt: now,
      })
  }
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/analytics')
  const list = page.getByRole('list', { name: 'Despesas por categoria' })
  await expect(list.getByRole('listitem')).toHaveCount(20)
  for (let i = 0; i < 20; i++)
    await expect(
      list.getByText('Categoria extensa para revisão de legendas ' + i, {
        exact: true,
      }),
    ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resultado acumulado do período', exact: true })).toBeVisible()
  const summaries = page.getByText('Ver dados por período', { exact: true })
  for (const summary of await summaries.all()) {
    await summary.focus()
    await page.keyboard.press('Enter')
  }
  await expect(
    page.getByText('Resultado acumulado do período', { exact: true }).last(),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    await page.screenshot({
      path: 'dogfood-output/rod-120/' + theme + '-320.png',
      fullPage: true,
    })
  }

  await page.goto('/expenses')
  await expect(list.getByRole('listitem')).toHaveCount(20)
  const filters = page.getByRole('region', { name: 'Filtros de busca' })
  const toggle = filters.getByRole('button', { name: /^Filtros de busca/ })
  const search = filters.getByRole('textbox', { name: 'Buscar por descrição' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(search).toBeHidden()
  await toggle.press('Enter')
  await search.fill('Revisão 19')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list).toContainText('Categoria extensa para revisão de legendas 19')
  await expect(page.getByRole('table', { name: 'Lista cronológica de despesas cadastradas' })).toContainText('Revisão 19')
  await toggle.click()
  await expect(search).toBeHidden()
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await toggle.click()
  await expect(search).toHaveValue('Revisão 19')
  await filters.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(search).toHaveValue('')
  await expect(list.getByRole('listitem')).toHaveCount(20)
})
