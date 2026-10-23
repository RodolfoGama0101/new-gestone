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

test('relatórios comparam séries e períodos com gráficos legíveis em ambos os temas', async ({
  page,
}) => {
  test.setTimeout(180000)
  const email = `reports-${crypto.randomUUID()}@example.test`
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
  const user = db.doc(`users/${uid}`)
  const batch = db.batch()
  for (const [id, name] of [
    ['food', 'Alimentação'],
    ['home', 'Moradia'],
    ['travel', 'Transporte'],
  ]) {
    batch.set(user.collection('categories').doc(id), {
      name,
      type: 'both',
      color: '#005ff2',
      icon: 'Wallet',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
  }
  let expectedIncome = 0
  for (let offset = 0; offset < 6; offset++) {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - offset)
    date.setHours(12, 0, 0, 0)
    const income = 550000 + offset * 25000
    const expense = offset === 5 ? 960000 : 260000 + offset * 30000
    expectedIncome += income
    for (const [index, [type, amount, categoryId]] of [
      ['income', income, 'home'],
      ['expense', expense, 'home'],
      ['expense', 60000, 'food'],
      ['expense', 15000, 'travel'],
      ['investment', 50000, 'home'],
    ].entries())
      batch.set(
        user.collection('transactions').doc(`report-${offset}-${index}`),
        {
          type,
          amount,
          categoryId,
          description: 'Lançamento para conferir relatórios',
          date: Timestamp.fromDate(date),
          tags: [],
          notes: null,
          recurring: false,
          createdAt: now,
          updatedAt: now,
        },
      )
  }
  await batch.commit()
  await page.goto('/analytics')
  await expect(
    page.getByRole('heading', { name: 'Fluxo de Caixa', exact: true }),
  ).toBeVisible()
  const incomeMetric = page
    .getByText('Receitas no período', { exact: true })
    .locator('..')
  await expect(incomeMetric).toContainText(
    (expectedIncome / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
  )
  const plot = page.locator('[data-slot="cash-flow-plot"]')
  await expect(plot.locator('.recharts-bar')).toHaveCount(3)
  const legend = page.getByRole('group', { name: 'Séries do fluxo de caixa' })
  await legend.getByRole('button', { name: 'Receitas', exact: true }).click()
  await expect(plot.locator('.recharts-bar')).toHaveCount(2)
  await legend.getByRole('button', { name: 'Despesas', exact: true }).click()
  await expect(
    legend.getByRole('button', { name: 'Investimentos', exact: true }),
  ).toBeDisabled()
  await legend.getByRole('button', { name: 'Receitas', exact: true }).click()
  await legend.getByRole('button', { name: 'Despesas', exact: true }).click()
  await expect(plot.locator('.recharts-bar')).toHaveCount(3)
  await expect(
    page.locator('[data-slot="balance-trend-plot"] .recharts-area-curve'),
  ).toHaveCount(1)
  await expect(
    page.locator('[data-slot="category-donut-plot"] .recharts-pie-sector'),
  ).toHaveCount(3)
  const period = page.getByRole('group', { name: 'Período do relatório' })
  await period.getByRole('button', { name: '3 meses', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '3 meses', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(incomeMetric).toContainText('17.250,00')
  await expect(
    page.getByRole('button', { name: '3 meses', exact: true }),
  ).toBeFocused()
  await page.getByRole('button', { name: '12 meses', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '12 meses', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(incomeMetric).toContainText(
    (expectedIncome / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
  )
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      if (width === 320) {
        await expect
          .poll(() =>
            incomeMetric
              .locator('dd')
              .evaluate((element) => element.getBoundingClientRect().height),
          )
          .toBeLessThan(30)
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
      await page.screenshot({
        path: `dogfood-output/report-charts/${theme}-${width}.png`,
        fullPage: true,
      })
    }
  }
})
