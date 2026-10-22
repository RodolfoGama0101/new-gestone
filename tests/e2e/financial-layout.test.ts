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

test('telas financeiras preservam textos longos, valores e ações em telas estreitas', async ({
  page,
}) => {
  test.setTimeout(300000)
  const { uid } = await register(page)
  const categoryId = 'layout-category'
  const name = 'Categoria de despesas com nome extenso para revisão responsiva'
  const description =
    'Descrição longa para conferir a leitura integral do lançamento financeiro em dispositivos pequenos e também com ampliação de duzentos por cento. '
      .repeat(2)
      .slice(0, 200)
  const now = Timestamp.now()
  await db
    .doc('users/' + uid + '/categories/' + categoryId)
    .set({
      name,
      type: 'expense',
      color: '#7c3aed',
      icon: 'Wallet',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc('users/' + uid + '/transactions/layout')
    .set({
      type: 'expense',
      amount: 999999999,
      description,
      categoryId,
      date: now,
      tags: [],
      notes: description,
      recurring: false,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc('users/' + uid + '/creditCards/layout-card')
    .set({
      name: 'Cartão de revisão responsiva',
      bankName: 'Banco de teste',
      holderName: 'Pessoa de teste',
      brand: 'visa',
      closingDay: 31,
      color: '#2563eb',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc('users/' + uid + '/transactions/layout-purchase')
    .set({
      type: 'expense',
      amount: 999999999,
      description,
      categoryId,
      date: now,
      creditCardId: 'layout-card',
      cardClosingDay: 31,
      tags: [],
      notes: null,
      recurring: false,
      createdAt: now,
      updatedAt: now,
    })
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('theme', value), theme)
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of [
        '/transactions',
        '/expenses',
        '/',
        '/analytics',
        '/credit-cards',
      ]) {
        await page.goto(route)
        await expect(page.locator('main')).toBeVisible()
        if (route === '/credit-cards')
          await page
            .getByRole('button', {
              name: 'Selecionar cartão Cartão de revisão responsiva',
            })
            .click()
        await page.evaluate(
          (value) =>
            document.documentElement.classList.toggle('dark', value === 'dark'),
          theme,
        )
        if (route !== '/analytics') {
          await expect(
            page.getByText(description, { exact: true }).first(),
          ).toBeVisible()
          await expect(
            page.getByText(name, { exact: true }).first(),
          ).toBeVisible()
        }
        for (const zoom of [1, 2]) {
          await page.setViewportSize({
            width: Math.floor(width / zoom),
            height: Math.floor(900 / zoom),
          })
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document.documentElement.scrollWidth <=
                  document.documentElement.clientWidth,
              ),
            )
            .toBe(true)
          await page.screenshot({
            path:
              'dogfood-output/rod-118/' +
              theme +
              '-' +
              width +
              '-' +
              zoom +
              '-' +
              (route.slice(1) || 'dashboard') +
              '.png',
            fullPage: true,
          })
        }
      }
    }
  }
})
