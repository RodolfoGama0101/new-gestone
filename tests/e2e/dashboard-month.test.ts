import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { mkdir } from 'node:fs/promises'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Execute npm run test:e2e com os emuladores fictícios.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })
const db = getFirestore(app)

test('dashboard usa competência, preserva reservas, metas e navegação no mês histórico, atual e futuro', async ({
  page,
}) => {
  test.setTimeout(240000)
  const email = `dashboard-${crypto.randomUUID()}@example.test`
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
  batch.set(user.collection('categories').doc('expense-dashboard'), {
    name: 'Despesas do painel com nome extenso para leitura em celular',
    type: 'expense',
    color: '#005ff2',
    icon: 'Wallet',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(user.collection('creditCards').doc('card-dashboard'), {
    name: 'Cartão do painel',
    bankName: 'Banco de teste',
    holderName: 'Pessoa',
    brand: 'visa',
    closingDay: 20,
    color: '#2563eb',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  const add = (
    id: string,
    type: string,
    amount: number,
    date: Date,
    card = false,
  ) =>
    batch.set(user.collection('transactions').doc(id), {
      type,
      amount,
      date: Timestamp.fromDate(date),
      description: id,
      categoryId:
        type === 'expense' ? 'expense-dashboard' : 'categoria-ausente',
      ...(card ? { creditCardId: 'card-dashboard', cardClosingDay: 20 } : {}),
      tags: [],
      notes: null,
      recurring: false,
      createdAt: now,
      updatedAt: now,
    })
  add('Receita principal', 'income', 100000, new Date(2024, 1, 2, 12))
  add('Receita complementar A', 'income', 100, new Date(2024, 1, 3, 12))
  add('Receita complementar B', 'income', 100, new Date(2024, 1, 4, 12))
  add('Despesa do mês', 'expense', 10000, new Date(2024, 1, 5, 12))
  add('Aporte do mês', 'investment', 5000, new Date(2024, 1, 6, 12))
  add(
    'Compra de janeiro na fatura de fevereiro',
    'expense',
    20000,
    new Date(2024, 0, 25, 12),
    true,
  )
  add(
    'Compra reservada para março',
    'expense',
    10000,
    new Date(2024, 1, 25, 12),
    true,
  )
  add('Movimento fora do mês', 'income', 99999, new Date(2024, 3, 1, 12))
  batch.set(user.collection('budgets').doc('2024-02'), {
    amount: 80000,
    updatedAt: now,
  })
  const today = new Date()
  const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const futureDate = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12)
  const future = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`
  add('Receita atual', 'income', 12345, today)
  add('Despesa futura registrada', 'expense', 23456, futureDate)
  await batch.commit()
  await page.goto('/?month=2024-02')
  const result = page
    .getByRole('link', { name: 'Resultado projetado do mês', exact: true })
    .locator('../../..')
  await expect(result).toContainText('652,00')
  await expect(
    page.getByText('Reserva para faturas futuras').locator('..'),
  ).toContainText('100,00')
  await expect(
    page.getByText('Saldo disponível após reserva').locator('..'),
  ).toContainText('552,00')
  await expect(
    page.getByRole('progressbar', { name: 'Progresso da meta de economia' }),
  ).toHaveAttribute('aria-valuetext', /702,00.*800,00/)
  const recent = page
    .getByRole('heading', { name: 'Lançamentos recentes' })
    .locator('../../..')
  await expect(recent.locator('tbody tr')).toHaveCount(5)
  await expect(recent).not.toContainText('Compra reservada para março')
  await expect(recent).not.toContainText('Movimento fora do mês')
  await expect(recent).toContainText('Aporte do mês')
  await expect(
    page.getByRole('region', { name: 'Consolidado dos cartões' }),
  ).toContainText('200,00')
  await page.getByRole('link', { name: 'Ver extrato', exact: true }).click()
  await expect(page).toHaveURL(/\/transactions\?month=2024-02/)
  await expect(
    page.getByText('Compra de janeiro na fatura de fevereiro', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Compra reservada para março', { exact: true }),
  ).toHaveCount(0)
  await page.goBack()
  const category = page
    .getByRole('list', { name: 'Despesas por categoria' })
    .getByRole('link')
  await category.click()
  await expect(page).toHaveURL(/categoryId=expense-dashboard.*month=2024-02/)
  await expect(
    page.getByText('Compra de janeiro na fatura de fevereiro', { exact: true }),
  ).toBeVisible()
  await page.goBack()
  await page.getByRole('link', { name: 'Aportes', exact: true }).click()
  await expect(page).toHaveURL(/\/investments\?month=2024-02/)
  await page.goBack()
  await page
    .getByRole('link', { name: 'Ver orçamentos e metas', exact: true })
    .click()
  await expect(page).toHaveURL(/\/budgets\?month=2024-02/)
  await page.goBack()
  await mkdir('dogfood-output/issue-40', { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    for (const width of [320, 390, 768, 1280, 640]) {
      await page.setViewportSize({ width, height: 900 })
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
      await expect(result).toContainText('652,00')
      await page.screenshot({
        path: `dogfood-output/issue-40/${theme}-${width}.png`,
        fullPage: true,
      })
    }
  }
  await page
    .getByText('Ver resultado acumulado por dia', { exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByText('Ver resultado acumulado por dia').locator('..'),
  ).toHaveAttribute('open', '')
  await page.goto(`/?month=${current}`)
  await expect(result).toContainText('123,45')
  await expect(
    page.getByText('Meta não cadastrada para este mês.'),
  ).toBeVisible()
  await expect(
    page.getByText('Sem base de comparação', { exact: false }).first(),
  ).toBeVisible()
  await page.goto(`/?month=${future}`)
  await expect(result).toContainText('-R$')
  await expect(result).toContainText('234,56')
  await expect(
    page
      .getByRole('heading', { name: 'Lançamentos recentes' })
      .locator('../../..'),
  ).toContainText('Despesa futura registrada')
  await page.goto('/?month=2024-05')
  await expect(
    page.getByText('Nenhum lançamento na competência selecionada.'),
  ).toBeVisible()
  await expect(result).toContainText('0,00')
})
