import { test, expect, type Page } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFile } from 'node:fs/promises'

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

test('cadastro, CRUD, busca, CSV, login e exclusão segura de conta', async ({
  page,
  browser,
}) => {
  const { email, uid } = await register(page)
  await page.goto('/expenses')
  await page.getByRole('button', { name: 'Nova Despesa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Valor', { exact: true }).fill('10000')
  await dialog
    .getByLabel('Descrição', { exact: true })
    .fill('Compra original E2E')
  await dialog.getByLabel('Categoria', { exact: true }).click()
  await page
    .getByRole('option', { name: 'Alimentação', exact: true })
    .first()
    .click()
  await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('Compra original E2E', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Editar lançamento' }).first().click()
  await page
    .getByRole('dialog')
    .getByLabel('Descrição')
    .fill('Compra editada E2E')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Salvar Lançamento' })
    .click()
  await expect(
    page.getByText('Compra editada E2E', { exact: true }),
  ).toBeVisible()
  const linked = (
    await db.collection(`users/${uid}/transactions`).get()
  ).docs[0].data().categoryId
  expect((await page.request.delete(`/api/categories/${linked}`)).ok()).toBe(
    true,
  )
  expect(
    (await db.doc(`users/${uid}/categories/${linked}`).get()).data()?.archived,
  ).toBe(true)
  await page.goto('/transactions')
  await page.getByPlaceholder('Buscar por descrição...').fill('não existe')
  await expect(page.getByText('Nenhum lançamento encontrado')).toBeVisible()
  await page.getByPlaceholder('Buscar por descrição...').fill('Compra editada')
  await expect(
    page.getByText('Compra editada E2E', { exact: true }),
  ).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('Compra editada E2E')
  expect(csv).toContain('Alimentação')
  await page.goto('/expenses')
  await page.getByRole('button', { name: 'Excluir lançamento' }).first().click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir', exact: true })
    .click()
  await expect(page.getByText('Sem despesas registradas')).toBeVisible()
  expect((await db.collection(`users/${uid}/transactions`).get()).empty).toBe(
    true,
  )

  const context = await browser.newContext({ baseURL: 'http://localhost:3102' })
  const login = await context.newPage()
  try {
    await login.goto('/login')
    await login.getByLabel('E-mail', { exact: true }).fill(email)
    await login.getByLabel('Senha', { exact: true }).fill(password)
    await login.getByRole('button', { name: 'Entrar na conta' }).click()
    await expect(login).toHaveURL('http://localhost:3102/')
    // Um cookie válido sozinho não autoriza a exclusão.
    expect(
      (
        await context.request.delete('http://localhost:3102/api/account')
      ).status(),
    ).toBe(401)
    await login.goto('/settings')
    await login.getByRole('button', { name: 'Zona de Risco' }).click()
    await login.locator('#confirmDeleteText').fill('EXCLUIR CONTA')
    await login
      .getByRole('button', { name: 'Excluir Conta Permanentemente' })
      .click()
    await login
      .getByRole('button', { name: 'Confirmar Exclusão', exact: true })
      .click()
    await login.getByLabel('Senha Atual').fill(password)
    await login
      .getByRole('button', { name: 'Confirmar Senha', exact: true })
      .click()
    await expect(login).toHaveURL(/\/register$/, { timeout: 30000 })
    await expect(auth.getUser(uid)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    })
    expect((await db.collection(`users/${uid}/categories`).get()).empty).toBe(
      true,
    )
  } finally {
    await context.close()
  }
})

test('fatura com 105 compras e saldo consistente no dashboard', async ({
  page,
}) => {
  const { uid } = await register(page)
  const categories = await db.collection(`users/${uid}/categories`).get()
  const expense = categories.docs.find(
    (item) => item.data().type === 'expense',
  )!
  const income = categories.docs.find((item) => item.data().type === 'income')!
  const now = Timestamp.now()
  const batch = db.batch()
  batch.set(db.doc(`users/${uid}/creditCards/card`), {
    name: 'Cartão E2E',
    bankName: 'Banco E2E',
    holderName: 'Pessoa',
    brand: 'visa',
    closingDay: 31,
    color: '#2563eb',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  const tx = {
    description: 'Compra de teste',
    amount: 100,
    type: 'expense',
    categoryId: expense.id,
    creditCardId: 'card',
    cardClosingDay: 31,
    date: now,
    tags: [],
    notes: null,
    recurring: false,
    createdAt: now,
    updatedAt: now,
  }
  for (let i = 0; i < 105; i++)
    batch.set(db.doc(`users/${uid}/transactions/purchase-${i}`), {
      ...tx,
      description: `Compra ${i}`,
    })
  batch.set(db.doc(`users/${uid}/transactions/income`), {
    ...tx,
    description: 'Receita',
    type: 'income',
    amount: 100000,
    creditCardId: null,
    cardClosingDay: null,
    categoryId: income.id,
  })
  await batch.commit()
  await page.reload()
  await expect(
    page.getByText('Disponível após reservas:').locator('..'),
  ).toContainText('895,00')
  await page.goto('/credit-cards')
  await expect(page.getByText(/Total:.*105,00/)).toBeVisible()
  for (let i = 0; i < 5; i++)
    await page.getByRole('button', { name: 'Mais compras' }).click()
  await expect(page.getByText('Página 6 de 6')).toBeVisible()
})

test('remoção concorrente de categoria preserva vínculos e isolamento', async ({
  page,
}) => {
  const { email, uid } = await register(page)
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const { idToken } = await response.json()
  for (let index = 0; index < 5; index++) {
    const id = `race-${index}`
    await db
      .doc(`users/${uid}/categories/${id}`)
      .set({
        name: 'Categoria concorrente',
        type: 'expense',
        icon: 'Wallet',
        color: '#2563eb',
        isDefault: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    const fields = {
      type: { stringValue: 'expense' },
      amount: { integerValue: '100' },
      description: { stringValue: 'Concorrência' },
      categoryId: { stringValue: id },
      date: { timestampValue: new Date().toISOString() },
      tags: { arrayValue: { values: [] } },
      notes: { nullValue: null },
      recurring: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    }
    const [removal] = await Promise.all([
      page.request.delete(`/api/categories/${id}`),
      fetch(
        `http://127.0.0.1:8081/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/transactions/${id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        },
      ),
    ])
    expect(removal.ok()).toBe(true)
    const purchase = await db.doc(`users/${uid}/transactions/${id}`).get()
    const category = await db.doc(`users/${uid}/categories/${id}`).get()
    if (purchase.exists) {
      expect(category.exists).toBe(true)
      expect(category.data()?.archived).toBe(true)
    }
  }
  // Uma categoria alheia não pode ser removida, mesmo conhecendo seu ID.
  await db.doc('users/other/categories/foreign').set({ name: 'Privada' })
  expect((await page.request.delete('/api/categories/foreign')).status()).toBe(
    404,
  )
  expect((await db.doc('users/other/categories/foreign').get()).exists).toBe(
    true,
  )
  const denied = await fetch(
    `http://127.0.0.1:8081/v1/projects/${projectId}/databases/(default)/documents/users/other/categories/foreign`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  )
  expect(denied.status).toBe(403)
})
