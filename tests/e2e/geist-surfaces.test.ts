import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Execute npm run test:e2e com os emuladores fictícios.')

const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })
const db = getFirestore(app)

test('superfícies Geist preservam conteúdo e reflow nos dois temas', async ({
  page,
}) => {
  test.setTimeout(300000)
  const email = `geist-${crypto.randomUUID()}@example.test`
  await page.goto('/register')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page
    .getByLabel('Confirmar Senha', { exact: true })
    .fill('TesteSeguro@123')
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 90000 })
  const { uid } = await getAuth(app).getUserByEmail(email)
  const now = Timestamp.now()
  const date = new Date()
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const user = db.doc(`users/${uid}`)
  await user.collection('categories').doc('review').set({
    name: 'Categoria para revisão do design',
    type: 'expense',
    color: '#171717',
    icon: 'Wallet',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  })
  await user.collection('creditCards').doc('review').set({
    name: 'Cartão de revisão',
    bankName: 'Banco de teste',
    holderName: 'Conta de teste',
    brand: 'visa',
    closingDay: 31,
    dueDay: 5,
    color: '#171717',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  await user.collection('transactions').doc('review').set({
    type: 'expense',
    amount: 15000,
    description: 'Compra para revisão do design',
    categoryId: 'review',
    date: now,
    creditCardId: 'review',
    cardClosingDay: 31,
    tags: [],
    notes: null,
    recurring: false,
    createdAt: now,
    updatedAt: now,
  })
  await user
    .collection('budgets')
    .doc(month)
    .set({ amount: 10000, updatedAt: now })
  await user
    .collection('budgets')
    .doc(month)
    .collection('limits')
    .doc('review')
    .set({
      name: 'Categoria para revisão do design',
      amount: 10000,
      updatedAt: now,
    })
  const routes = [
    ['/credit-cards', 'Meus Cartões'],
    ['/budgets', 'Orçamentos e metas'],
    ['/series', 'Séries'],
    ['/analytics', 'Relatórios'],
    ['/categories', 'Categorias'],
    ['/settings', 'Configurações'],
    ['/offline', 'Sem Conexão com a Internet'],
  ]
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [route, title] of routes) {
        await page.goto(route)
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: route === '/offline' ? /sem conexão com a internet/i : title,
            exact: true,
          }),
        ).toBeVisible()
        if (route === '/budgets')
          await expect(page.getByRole('progressbar')).toHaveCount(2)
        if (route === '/credit-cards')
          await expect(
            page.getByText('Compra para revisão do design'),
          ).toBeVisible()
        await page.evaluate(
          (value) => {
            document.documentElement.classList.toggle('dark', value === 'dark')
            document.documentElement.dataset.theme = value
          },
          theme,
        )
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true)
        await page.screenshot({
          path: `dogfood-output/rod127-surfaces/${theme}-${width}-${route.slice(1)}.png`,
          fullPage: true,
          animations: 'disabled',
        })
      }
    }
  }
})
