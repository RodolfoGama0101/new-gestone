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

test('distribuição acompanha mês e filtros sem depender da paginação e aparece nos relatórios', async ({
  page,
}) => {
  test.setTimeout(180000)
  const email = `distribution-${crypto.randomUUID()}@example.test`
  await page.goto('/register')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page
    .getByLabel('Confirmar Senha', { exact: true })
    .fill('TesteSeguro@123')
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL(
    /^http:\/\/localhost:3102\/(?:\?month=\d{4}-\d{2})?$/,
    { timeout: 90000 },
  )
  const { uid } = await getAuth(app).getUserByEmail(email)
  const user = db.doc(`users/${uid}`)
  const now = Timestamp.now()
  const batch = db.batch()
  batch.set(user.collection('categories').doc('aportes-e2e'), {
    name: 'Categoria de aportes muito longa para testar a apresentação',
    type: 'investment',
    color: '#005ff2',
    icon: 'Wallet',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  })
  for (let i = 0; i < 12; i++)
    batch.set(user.collection('transactions').doc(`aporte-${i}`), {
      type: 'investment',
      amount: 101,
      categoryId: 'aportes-e2e',
      description: i === 0 ? 'Aporte especial' : 'Aporte comum',
      date: Timestamp.fromDate(new Date(2024, 1, 5, 12)),
      tags: [],
      notes: null,
      recurring: false,
      createdAt: now,
      updatedAt: now,
    })
  await batch.commit()
  await page.goto('/investments?month=2024-02')
  const chart = page
    .getByRole('heading', { name: 'Distribuição dos aportes' })
    .locator('../..')
  await expect(chart).toContainText('12,12')
  await expect(chart).toContainText('Categoria de aportes muito longa')
  await page.getByRole('button', { name: 'Próximo', exact: true }).click()
  await expect(page.getByText('Página 2')).toBeVisible()
  await expect(chart).toContainText('12,12')
  await page.goto('/investments?month=2024-02&search=especial')
  await expect(chart).toContainText('1,01')
  await page.goto('/investments?month=2024-03')
  await expect(
    page.getByText('Sem aportes no período selecionado.'),
  ).toBeVisible()
  await page.goto('/analytics?month=2024-02')
  await expect(
    page.getByRole('heading', { name: 'Distribuição dos aportes' }),
  ).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Aportes por categoria' }),
  ).toContainText('12,12')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    await page.setViewportSize({ width: 320, height: 900 })
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true)
  }
})
