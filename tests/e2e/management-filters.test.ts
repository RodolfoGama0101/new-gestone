import { test, expect, type Page } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Use npm run test:e2e com os emuladores fictícios.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })

async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test('filtros de gestão preservam histórico, URL e contexto mensal', async ({
  page,
}) => {
  test.setTimeout(180000)
  const email = `management-${crypto.randomUUID()}@example.test`
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
  const db = getFirestore(app)
  const now = Timestamp.now()
  await db
    .doc(`users/${uid}/categories/archived-test`)
    .set({
      name: 'Saúde arquivada',
      type: 'expense',
      archived: true,
      icon: 'Heart',
      color: '#dc2626',
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc(`users/${uid}/creditCards/archived-test`)
    .set({
      name: 'Viagem antiga',
      bankName: 'Banco Azul',
      brand: 'visa',
      holderName: 'Teste',
      closingDay: 10,
      color: '#155e75',
      isActive: false,
      archived: true,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc(`users/${uid}/transactionSeries/test`)
    .set({
      kind: 'recurring',
      count: 1200,
      nextIndex: 0,
      timezoneOffset: 0,
      endDate: null,
      cancelledFrom: null,
      type: 'expense',
      amount: 1000,
      description: 'Série futura',
      categoryId: 'archived-test',
      creditCardId: null,
      cardClosingDay: null,
      date: Timestamp.fromDate(new Date('2030-01-15T00:00:00Z')),
      tags: [],
      notes: null,
      recurring: true,
      createdAt: now,
      updatedAt: now,
    })
  await db
    .doc(`users/${uid}/budgets/2030-01/limits/archived-test`)
    .set({ name: 'Saúde arquivada', amount: 5000, updatedAt: now })

  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/categories?month=2030-01')
  await page.getByLabel('Buscar por nome').fill('saude')
  await choose(page, 'Arquivamento', 'Arquivadas')
  await expect(page.getByText('Saúde arquivada')).toBeVisible()
  await expect(page).toHaveURL(/status=archived/)
  await page.reload()
  await expect(page.getByLabel('Buscar por nome')).toHaveValue('saude')
  await page.getByRole('button', { name: 'Próximo mês', exact: true }).click()
  await expect(page.getByText('Saúde arquivada')).toBeVisible()
  await page.getByLabel('Buscar por nome').fill('não existe')
  await expect(page.getByText('Nenhuma categoria encontrada')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()

  await page.goto('/credit-cards?month=2030-01')
  await page.getByLabel('Buscar por nome ou banco').fill('azul')
  await choose(page, 'Situação', 'Arquivado')
  await expect(page.getByText('Arquivado · histórico disponível')).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Selecionar cartão Viagem antiga/ }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Buscar por nome ou banco')).toHaveValue('azul')
  const openInvoice = page.getByRole('button', {
    name: 'Ver fatura',
    exact: true,
  })
  await openInvoice.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Voltar aos cartões' }).click()
  await expect(page.getByLabel('Buscar por nome ou banco')).toHaveValue('azul')
  await expect(openInvoice).toBeFocused()

  await page.goto('/series?month=2030-01')
  await choose(page, 'Programação', 'Mês de trabalho')
  await page.getByLabel('Buscar por descrição').fill('futura')
  await expect(page.getByText('Série futura', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Próximo mês', exact: true }).click()
  await expect(page.getByText('Série futura', { exact: true })).toBeVisible()

  await page.goto('/budgets?month=2030-01')
  await choose(page, 'Situação do limite', 'Dentro do limite')
  await expect(page.getByText('Saúde arquivada (arquivada)')).toBeVisible()
  await choose(page, 'Situação do limite', 'Excedido')
  await expect(
    page.getByText(/Nenhuma categoria corresponde aos filtros/),
  ).toBeVisible()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    await expect
      .poll(() =>
        page
          .locator('body')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true)
  }
})
