import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFile } from 'node:fs/promises'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Execute npm run test:e2e nos emuladores fictícios.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })
const db = getFirestore(app)

test('relatórios integram períodos, filtros, comparação, metas por mês, detalhamento e CSV completo', async ({
  page,
}) => {
  test.setTimeout(240000)
  const email = `report-integrated-${crypto.randomUUID()}@example.test`
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
  const user = db.doc(`users/${uid}`),
    now = Timestamp.now()
  const batch = db.batch()
  const longCategory =
    'Categoria de consumo com descrição extensa para conferir a leitura dos relatórios em celular'
  for (const [id, name, type] of [
    ['report-expense', longCategory, 'expense'],
    ['report-income', 'Receita do relatório', 'income'],
    ['report-investment', 'Aporte do relatório', 'investment'],
  ])
    batch.set(user.collection('categories').doc(id), {
      name,
      type,
      color: '#005ff2',
      icon: 'Wallet',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
  batch.set(user.collection('creditCards').doc('report-card'), {
    name: 'Cartão do relatório',
    bankName: 'Banco fictício',
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
    extra = {},
  ) =>
    batch.set(user.collection('transactions').doc(id), {
      type,
      amount,
      date: Timestamp.fromDate(date),
      description: `Relatório ${id}`,
      categoryId: `report-${type}`,
      tags: [],
      notes: null,
      recurring: false,
      createdAt: now,
      updatedAt: now,
      ...extra,
    })
  add('income', 'income', 100000, new Date(2024, 1, 10), { recurring: true })
  add('previous-income', 'income', 50000, new Date(2024, 0, 10))
  add('investment', 'investment', 80000, new Date(2024, 1, 12))
  add('card', 'expense', 20000, new Date(2024, 0, 25), {
    creditCardId: 'report-card',
    cardClosingDay: 20,
  })
  add('installment', 'expense', 10000, new Date(2023, 11, 1), {
    creditCardId: 'report-card',
    cardClosingDay: 20,
    installmentTotal: 3,
    installmentMonth: '2024-02',
    seriesId: 'series-test',
    occurrenceIndex: 2,
  })
  // Mais de um lote e mais de uma página: CSV e totais não podem truncar.
  for (let i = 0; i < 105; i++)
    add(`small-${i}`, 'expense', 100, new Date(2024, 1, 15))
  add('march', 'income', 999999, new Date(2024, 2, 1))
  batch.set(
    user
      .collection('creditCards')
      .doc('report-card')
      .collection('payments')
      .doc('2024-02'),
    { amount: 30000, paidAt: now, createdAt: now },
  )
  batch.set(user.collection('budgets').doc('2024-01'), {
    amount: 40000,
    updatedAt: now,
  })
  batch.set(user.collection('budgets').doc('2024-02'), {
    amount: 70000,
    updatedAt: now,
  })
  batch.set(
    user
      .collection('budgets')
      .doc('2024-02')
      .collection('limits')
      .doc('report-expense'),
    { name: longCategory, amount: 35000, updatedAt: now },
  )
  await batch.commit()
  const metric = (name: string) =>
    page.getByRole('link', { name, exact: true }).locator('../..')
  await page.goto('/analytics?month=2024-02&reportWindow=1')
  await expect(metric('Receitas no período')).toContainText('1.000,00')
  await expect(metric('Receitas no período')).toContainText('100% em relação')
  await expect(metric('Despesas no período')).toContainText('405,00')
  await expect(metric('Resultado do período')).toContainText('-R$')
  await expect(metric('Resultado do período')).toContainText('205,00')
  const goals = page.getByRole('region', { name: 'Metas e limites por mês' })
  await expect(goals).toContainText('Meta não atingida')
  await expect(goals).toContainText('Excesso: R$ 55,00')
  await expect(
    page.getByRole('region', { name: 'Gastos por cartão' }),
  ).toContainText('300,00')
  const downloads = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
  const download = await downloads
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv.split('\n')).toHaveLength(110)
  expect(csv).toContain('Relatório installment')
  expect(csv).not.toContain('previous-income')
  await page
    .getByRole('list', { name: 'Despesas por categoria' })
    .getByRole('link')
    .click()
  await expect(page).toHaveURL(/\/transactions\?.*categoryId=report-expense/)
  await expect(page).toHaveURL(/startDate=2024-02-01&endDate=2024-02-29/)
  await page.goBack()
  await expect(metric('Despesas no período')).toContainText('405,00')
  await page
    .getByRole('region', { name: 'Gastos por cartão' })
    .getByRole('link')
    .click()
  await expect(
    page.getByText('Relatório installment', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Relatório card', { exact: true })).toBeVisible()
  await page.goBack()
  for (const count of [3, 6, 12]) {
    await page
      .getByRole('group', { name: 'Período do relatório' })
      .getByRole('button', { name: `${count} meses`, exact: true })
      .click()
    await expect(metric('Receitas no período')).toContainText('1.500,00')
    await expect(goals).toContainText('Meta atingida')
    await expect(goals).toContainText('Meta não cadastrada para este mês.')
  }
  await page.getByRole('button', { name: '1 mês', exact: true }).click()
  await expect(metric('Receitas no período')).toContainText('1.000,00')
  await page
    .getByRole('combobox', { name: 'Critério de data', exact: true })
    .click()
  await page
    .getByRole('option', { name: 'Data da compra', exact: true })
    .click()
  await expect(metric('Despesas no período')).toContainText('105,00')
  await page
    .getByRole('combobox', { name: 'Critério de data', exact: true })
    .click()
  await page.getByRole('option', { name: 'Competência', exact: true }).click()
  await page.getByLabel('Buscar por descrição').fill('Relatório small-')
  await expect(metric('Despesas no período')).toContainText('105,00')
  await page.getByLabel('Buscar por descrição').fill('')
  await expect(metric('Despesas no período')).toContainText('405,00')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) =>
        document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    )
    for (const width of [320, 640, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
      await page.screenshot({
        path: `dogfood-output/issue-42/${theme}-${width}.png`,
        fullPage: true,
      })
    }
  }
  await page.getByText('Ver dados por período', { exact: true }).first().focus()
  await page.keyboard.press('Enter')
  await expect(
    page
      .getByText('Ver dados por período', { exact: true })
      .first()
      .locator('..'),
  ).toHaveAttribute('open', '')
  await page.goto(
    '/analytics?month=2024-02&startDate=2024-02-10&endDate=2024-02-15',
  )
  await expect(
    page.getByText('Comparação: 04/02/2024 a 09/02/2024', { exact: true }),
  ).toBeVisible()
  await expect(metric('Despesas no período')).toContainText('105,00')
  await expect(goals).toContainText('mês parcial')
  await page.goto(
    '/analytics?month=2024-02&reportWindow=1&modality=installment&minAmount=100,00&maxAmount=100,00',
  )
  await expect(metric('Despesas no período')).toContainText('100,00')
  await expect(
    page.getByText('Receitas no período', { exact: true }).locator('..'),
  ).toContainText('Sem base de comparação')
  await expect(
    page.getByRole('link', { name: 'Receitas no período', exact: true }),
  ).toHaveCount(0)
  await page.goto('/analytics?month=2025-02&reportWindow=1')
  await expect(
    page.getByText('Nenhum lançamento no período e filtros selecionados.'),
  ).toBeVisible()
  await expect(metric('Resultado do período')).toContainText('0,00')
})
