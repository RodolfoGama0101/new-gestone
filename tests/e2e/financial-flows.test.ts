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

test('inicialização e migração concorrentes preservam IDs e não duplicam categorias', async ({ page }) => {
  const { uid } = await register(page)
  const collection = db.collection(`users/${uid}/categories`)
  const marker = db.doc(`users/${uid}/internal/category-initialization-v1`)
  await db.recursiveDelete(collection)
  await marker.delete()
  const responses = await Promise.all(Array.from({ length: 4 }, () => page.request.post('/api/categories/initialize')))
  expect(responses.every((response) => response.ok())).toBe(true)
  expect((await collection.get()).size).toBe(19)
  const before = (await collection.get()).docs.map((item) => ({ id: item.id, ...item.data() }))
  await page.request.post('/api/categories/initialize')
  expect((await collection.get()).docs.map((item) => ({ id: item.id, ...item.data() }))).toEqual(before)

  await db.recursiveDelete(collection)
  await marker.delete()
  const legacy = { name: 'Investimentos', type: 'income', icon: 'Wallet', color: '#7c3aed', isDefault: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
  await collection.doc('legacy-linked').set(legacy)
  await collection.doc('custom').set({ ...legacy, name: 'Personalizada', isDefault: false })
  const migrations = await Promise.all(Array.from({ length: 4 }, () => page.request.post('/api/categories/initialize')))
  expect(migrations.every((response) => response.ok())).toBe(true)
  expect((await collection.get()).size).toBe(6)
  expect((await collection.doc('legacy-linked').get()).data()?.type).toBe('investment')
  expect((await collection.doc('custom').get()).data()?.name).toBe('Personalizada')
  await collection.doc('default-v1-14').delete()
  await page.request.post('/api/categories/initialize')
  expect((await collection.doc('default-v1-14').get()).exists).toBe(false)
})

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
  await page.getByRole('button', { name: 'Excluir lançamento', exact: true }).first().click()
  const confirmation = page.getByRole('dialog', { name: 'Excluir compra?' })
  await expect(confirmation).toContainText('Compra')
  await expect(confirmation).toContainText('1,00')
  expect((await db.collection(`users/${uid}/transactions`).where('type', '==', 'expense').get()).size).toBe(105)
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(confirmation).not.toBeVisible()
  await expect(page.getByText(/Total:.*105,00/)).toBeVisible()
  await page.getByRole('button', { name: 'Excluir lançamento', exact: true }).first().click()
  await confirmation.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(confirmation).not.toBeVisible()
  await expect(page.getByText(/Total:.*104,00/)).toBeVisible()
  expect((await db.collection(`users/${uid}/transactions`).where('type', '==', 'expense').get()).size).toBe(104)
  await page.goto('/')
  await expect(page.getByText('Disponível após reservas:').locator('..')).toContainText('896,00')
  await page.goto('/credit-cards')
  await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
  const archival = page.getByRole('dialog', { name: 'Arquivar cartão de crédito?' })
  await archival.getByRole('button', { name: 'Arquivar', exact: true }).click()
  await expect(archival).not.toBeVisible()
  await expect(page.getByText('Arquivado · histórico disponível')).toBeVisible()
  await expect(page.getByText(/Total:.*104,00/)).toBeVisible()
  const preservedCard = (await db.doc(`users/${uid}/creditCards/card`).get()).data()!
  expect(preservedCard.archived).toBe(true)
  expect(preservedCard.closingDay).toBe(31)
  expect((await db.collection(`users/${uid}/transactions`).where('creditCardId', '==', 'card').get()).size).toBe(104)
  await page.goto('/expenses')
  await page.getByRole('button', { name: 'Nova Despesa', exact: true }).click()
  const expenseDialog = page.getByRole('dialog')
  await expenseDialog.getByLabel('Forma de Pagamento (Cartão)').click()
  await expect(page.getByRole('option', { name: 'Não usar cartão (Débito)', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: /Cartão E2E/ })).toHaveCount(0)
  await page.getByRole('option', { name: 'Não usar cartão (Débito)', exact: true }).click()
  await expenseDialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Editar lançamento' }).first().click()
  await expect(page.getByRole('dialog').getByLabel('Forma de Pagamento (Cartão)')).toContainText('arquivado')
  await page.getByRole('dialog').getByLabel('Descrição', { exact: true }).fill('Compra arquivada editada')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar Lançamento' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const historical = await db.collection(`users/${uid}/transactions`).where('description', '==', 'Compra arquivada editada').get()
  expect(historical.size).toBe(1)
  expect(historical.docs[0].data().creditCardId).toBe('card')
  expect(historical.docs[0].data().cardClosingDay).toBe(31)
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

for (const route of ['/transactions', '/expenses']) {
  test(`paginação recupera exclusão, edição de data e criação pelo formulário em ${route}`, async ({ page }) => {
    const { uid } = await register(page)
    const now = new Date()
    const timestamp = Timestamp.fromDate(now)
    const categoryId = 'pagination-recovery'
    const batch = db.batch()
    batch.set(db.doc(`users/${uid}/categories/${categoryId}`), {
      name: 'Paginação', type: 'expense', icon: 'Wallet', color: '#2563eb',
      isDefault: false, createdAt: timestamp, updatedAt: timestamp,
    })
    for (let index = 1; index <= 11; index++) {
      batch.set(db.doc(`users/${uid}/transactions/recovery-${index}`), {
        description: `Registro ${String(index).padStart(2, '0')}`, amount: 100,
        type: 'expense', categoryId, creditCardId: null, cardClosingDay: null,
        date: Timestamp.fromMillis(now.getTime() - index * 86400000),
        tags: [], notes: null, recurring: false, createdAt: timestamp, updatedAt: timestamp,
      })
    }
    await batch.commit()
    await page.goto(route)
    const records = page.getByText(/^Registro \d{2}$/)
    await expect(records).toHaveCount(10)
    await page.getByRole('button', { name: 'Próximo', exact: true }).click()
    await expect(page.getByText('Registro 11', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: route === '/expenses' ? 'Excluir lançamento' : 'Excluir Registro 11', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(records).toHaveCount(10)
    await expect(page.getByText('Registro 11', { exact: true })).not.toBeVisible()
    await expect(page.getByText('Página 2', { exact: true })).not.toBeVisible()

    const add = async (description: string) => {
      await page.getByRole('button', { name: route === '/expenses' ? 'Nova Despesa' : 'Novo Lançamento', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Valor', { exact: true }).fill('100')
      await dialog.getByLabel('Descrição', { exact: true }).fill(description)
      await dialog.getByLabel('Categoria', { exact: true }).click()
      await page.getByRole('option', { name: 'Paginação', exact: true }).click()
      await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).click()
      await expect(page.getByText(description, { exact: true })).toBeVisible()
      await expect(page.getByText('Página 1', { exact: true })).toBeVisible()
    }
    await add('Novo pelo formulário A')
    await page.getByRole('button', { name: 'Próximo', exact: true }).click()
    await expect(page.getByText('Registro 10', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: route === '/expenses' ? 'Editar lançamento' : 'Editar Registro 10', exact: true }).click()
    const edit = page.getByRole('dialog')
    await edit.getByLabel('Descrição', { exact: true }).fill('Movido pela edição de data')
    await edit.getByLabel('Data', { exact: true }).click()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    await page.locator(`button[data-day="${tomorrow.toLocaleDateString('pt-BR')}"]`).click()
    await edit.getByRole('button', { name: 'Salvar Lançamento' }).click()
    await expect(page.getByText('Movido pela edição de data', { exact: true })).toBeVisible()
    await expect(page.getByText('Página 1', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Próximo', exact: true }).click()
    await expect(page.getByText('Registro 09', { exact: true })).toBeVisible()
    await add('Novo pelo formulário B')

    const descriptions = page.getByText(/^(Registro \d{2}|Novo pelo formulário [AB]|Movido pela edição de data)$/)
    await expect(descriptions).toHaveCount(10)
    const first = await descriptions.allTextContents()
    await page.getByRole('button', { name: 'Próximo', exact: true }).click()
    await expect(descriptions).toHaveCount(2)
    expect([...first, ...await descriptions.allTextContents()].sort()).toEqual([
      ...Array.from({ length: 9 }, (_, index) => `Registro ${String(index + 1).padStart(2, '0')}`),
      'Novo pelo formulário A', 'Novo pelo formulário B', 'Movido pela edição de data',
    ].sort())
    await page.getByRole('button', { name: 'Anterior', exact: true }).click()
    await expect(descriptions).toHaveText(first)
  })
}

test('paginação com datas iguais mantém todos os lançamentos ao navegar do dashboard ao extrato', async ({ page }) => {
  const { uid } = await register(page)
  const now = Timestamp.now()
  const categoryId = 'pagination-category'
  const batch = db.batch()
  batch.set(db.doc(`users/${uid}/categories/${categoryId}`), {
    name: 'Paginação E2E', type: 'expense', icon: 'Wallet', color: '#2563eb',
    isDefault: false, createdAt: now, updatedAt: now,
  })
  // IDs em ordem diferente da inserção e timestamp idêntico em todas as páginas.
  const descriptions = Array.from({ length: 23 }, (_, index) => `Empate ${String(index).padStart(2, '0')}`)
  for (let index = descriptions.length - 1; index >= 0; index--) {
    batch.set(db.doc(`users/${uid}/transactions/tie-${String(index).padStart(2, '0')}`), {
      description: descriptions[index], type: 'expense', amount: 100, categoryId,
      date: now, creditCardId: null, cardClosingDay: null, tags: [], notes: null,
      recurring: false, createdAt: now, updatedAt: now,
    })
  }
  await batch.commit()
  await page.reload()
  await expect(page.getByText(/^Empate \d{2}$/)).toHaveCount(5)
  await page.getByRole('link', { name: 'Ver todos', exact: true }).click()
  const rows = page.getByText(/^Empate \d{2}$/)
  const pages: string[][] = []
  for (const count of [10, 10, 3]) {
    await expect(rows).toHaveCount(count)
    pages.push(await rows.allTextContents())
    if (pages.length < 3) {
      await page.getByRole('button', { name: 'Próximo', exact: true }).click()
      await expect(page.getByText(`Página ${pages.length + 1}`, { exact: true })).toBeVisible()
    }
  }
  expect(pages.flat().sort()).toEqual(descriptions)
  await expect(page.getByRole('button', { name: 'Próximo', exact: true })).toBeDisabled()
  for (const index of [1, 0]) {
    await page.getByRole('button', { name: 'Anterior', exact: true }).click()
    await expect(page.getByText(`Página ${index + 1}`, { exact: true })).toBeVisible()
    await expect(rows).toHaveText(pages[index])
  }
  await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled()
})

test('busca global do extrato, reinício da página, CSV e continuação de busca esparsa', async ({ page }) => {
  const { uid } = await register(page)
  const now = Timestamp.now()
  const categoryId = 'search-category'
  await db.doc(`users/${uid}/categories/${categoryId}`).set({
    name: 'Busca E2E', type: 'expense', icon: 'Wallet', color: '#2563eb',
    isDefault: false, createdAt: now, updatedAt: now,
  })
  const transaction = (index: number, description: string) => ({
    description, type: 'expense', amount: 100, categoryId,
    creditCardId: null, cardClosingDay: null,
    date: Timestamp.fromMillis(now.toMillis() - index * 60000),
    tags: [], notes: null, recurring: false, createdAt: now, updatedAt: now,
  })
  const initial = db.batch()
  for (let index = 1; index <= 25; index++) {
    initial.set(db.doc(`users/${uid}/transactions/search-${index}`), transaction(index,
      index === 21 ? 'Compra exclusiva ÁRVORE' : `Registro ${String(index).padStart(2, '0')}`,
    ))
  }
  await initial.commit()
  await page.goto('/transactions')
  await expect(page.getByText('Registro 01', { exact: true })).toBeVisible()
  const search = page.getByPlaceholder('Buscar por descrição...')
  await search.fill('  EXCLUSIVA árvore  ')
  await expect(page.getByText('Compra exclusiva ÁRVORE', { exact: true })).toBeVisible()
  await expect(page.getByText('Registro 01', { exact: true })).not.toBeVisible()
  await expect(search).toBeFocused()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  const csv = await readFile((await (await downloading).path())!, 'utf8')
  expect(csv).toContain('Compra exclusiva ÁRVORE')
  expect(csv).not.toContain('Registro 01')

  await page.getByRole('button', { name: 'Limpar Filtros' }).click()
  await page.getByRole('button', { name: 'Próximo', exact: true }).click()
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible()
  await search.fill('registro 24')
  await expect(page.getByText('Registro 24', { exact: true })).toBeVisible()
  await expect(page.getByText('Registro 11', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Página 2', { exact: true })).not.toBeVisible()
  await search.fill('termo inexistente')
  await expect(page.getByText('Nenhum lançamento encontrado')).toBeVisible()
  await expect(search).toBeVisible()
  await page.getByRole('button', { name: 'Limpar Filtros' }).click()
  await expect(page.getByText('Registro 01', { exact: true })).toBeVisible()

  const sparse = db.batch()
  for (let index = 26; index <= 130; index++) {
    sparse.set(db.doc(`users/${uid}/transactions/search-${index}`), transaction(index,
      index === 130 ? 'Alvo distante' : `Registro ${index}`,
    ))
  }
  await sparse.commit()
  await search.fill('alvo distante')
  await expect(page.getByRole('heading', { name: 'Continue a busca' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar busca', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Continuar busca', exact: true }).click()
  await expect(page.getByText('Alvo distante', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Continue a busca' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar busca', exact: true })).toBeEnabled()
})


test('tema da conta persiste após recarregar e em outro dispositivo, com moeda BRL', async ({ page, browser }) => {
  const { email, uid } = await register(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Preferências', exact: true }).click()
  await page.getByRole('button', { name: 'Escuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect((await db.doc('users/' + uid + '/preferences/display').get()).data()?.theme).toBe('dark')
  await expect(page.getByText('Real Brasileiro (BRL, R$)', { exact: true })).toBeVisible()
  await expect(page.getByText(/Dólar Americano/)).toHaveCount(0)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const device = await browser.newContext({ baseURL: 'http://localhost:3102', colorScheme: 'light' })
  try {
    const second = await device.newPage()
    await second.goto('/login')
    await second.getByLabel('E-mail', { exact: true }).fill(email)
    await second.getByLabel('Senha', { exact: true }).fill(password)
    await second.getByRole('button', { name: 'Entrar na conta', exact: true }).click()
    await expect(second).toHaveURL('http://localhost:3102/')
    await expect(second.locator('html')).toHaveClass(/dark/)
    await second.goto('/settings')
    await second.getByRole('button', { name: 'Preferências', exact: true }).click()
    await second.getByRole('button', { name: 'Claro', exact: true }).click()
    await expect(second.locator('html')).not.toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  } finally { await device.close() }
})


test('cartões inativos somem de novas compras e preservam a edição histórica', async ({ page }) => {
  const { uid } = await register(page)
  const categories = await db.collection('users/' + uid + '/categories').get()
  const categoryId = categories.docs.find((item) => item.data().type === 'expense')!.id
  const now = Timestamp.now()
  const card = { name: 'Cartão ativo E2E', bankName: 'Banco', brand: 'visa', holderName: 'Pessoa Teste', closingDay: 15, color: '#2563eb', isActive: true, createdAt: now, updatedAt: now }
  const inactive = db.doc('users/' + uid + '/creditCards/inactive')
  await inactive.set({ ...card, name: 'Cartão inativo E2E', isActive: false })
  await db.doc('users/' + uid + '/creditCards/active').set(card)
  const purchase = db.doc('users/' + uid + '/transactions/history')
  await purchase.set({ type: 'expense', amount: 12345, description: 'Histórico do inativo', categoryId, creditCardId: 'inactive', cardClosingDay: 15, date: now, tags: [], recurring: false, notes: null, createdAt: now, updatedAt: now })
  await page.goto('/expenses')
  await page.getByRole('button', { name: 'Nova Despesa', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Forma de Pagamento (Cartão)', { exact: true }).click()
  await expect(page.getByRole('option', { name: /Cartão ativo E2E/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /Cartão inativo E2E/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await dialog.locator('[data-slot="dialog-close"]').click()
  await page.getByRole('button', { name: 'Editar lançamento', exact: true }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Forma de Pagamento (Cartão)', { exact: true })).toContainText('inativo')
  await dialog.getByLabel('Descrição', { exact: true }).fill('Histórico do inativo editado')
  await dialog.getByRole('button', { name: 'Salvar Lançamento', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect((await purchase.get()).data()?.creditCardId).toBe('inactive')
  expect((await purchase.get()).data()?.cardClosingDay).toBe(15)
  await page.getByRole('button', { name: 'Editar lançamento', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Forma de Pagamento (Cartão)', { exact: true }).click()
  await page.getByRole('option', { name: /Cartão ativo E2E/ }).click()
  await dialog.getByRole('button', { name: 'Salvar Lançamento', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect((await purchase.get()).data()?.creditCardId).toBe('active')
  await inactive.update({ isActive: true })
  await page.reload()
  await page.getByRole('button', { name: 'Nova Despesa', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Forma de Pagamento (Cartão)', { exact: true }).click()
  await expect(page.getByRole('option', { name: /Cartão inativo E2E/ })).toBeVisible()
})


test('dashboard, formulário e navegação móvel funcionam por teclado', async ({ page }) => {
  await register(page)
  await page.goto('/expenses')
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav.getByRole('link', { name: 'Despesas', exact: true })).toHaveAttribute('aria-current', 'page')
  const trigger = page.getByRole('button', { name: 'Nova Despesa', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirmar Lançamento', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByLabel('Valor', { exact: true })).toBeFocused()
  await expect(dialog.getByLabel('Valor', { exact: true })).toHaveAttribute('aria-describedby', 'amount-error')
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press('Tab')
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  }
  await dialog.getByRole('button', { name: 'Receita', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('button', { name: 'Receita', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByRole('button', { name: 'Despesa', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  const more = page.getByRole('button', { name: 'Mais opções de navegação' })
  await more.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('button', { name: 'Fechar', exact: true })).toBeVisible()
  await expect(sheet.getByRole('link', { name: 'Despesas', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
})

test('período e cartão restauram URL, reiniciam paginação e exportam o mesmo conjunto', async ({ page }) => {
  const { uid } = await register(page)
  const now = Timestamp.now()
  const category = (await db.collection(`users/${uid}/categories`).where('type', '==', 'expense').get()).docs[0]
  await db.doc(`users/${uid}/creditCards/filter-card`).set({ name: 'Cartão histórico', bankName: 'Teste', brand: 'visa', holderName: 'Teste', closingDay: 15, isActive: false, archived: true, color: '#000000', createdAt: now, updatedAt: now })
  const batch = db.batch()
  for (let i = 0; i < 12; i++) batch.set(db.doc(`users/${uid}/transactions/filter-${i}`), { type: 'expense', amount: 1000, description: `Filtro compra ${i}`, categoryId: category.id, date: Timestamp.fromDate(new Date(2026, 9, 15, 12)), tags: [], notes: null, recurring: false, creditCardId: 'filter-card', cardClosingDay: 15, createdAt: now, updatedAt: now })
  batch.set(db.doc(`users/${uid}/transactions/outside`), { type: 'expense', amount: 1000, description: 'Fora do período', categoryId: category.id, date: Timestamp.fromDate(new Date(2026, 10, 1, 0)), tags: [], notes: null, recurring: false, createdAt: now, updatedAt: now })
  await batch.commit()
  await page.goto('/transactions?startDate=2026-10-01&endDate=2026-10-31&creditCardId=filter-card')
  await expect(page.getByLabel('Data inicial da compra')).toHaveValue('2026-10-01')
  await expect(page.getByLabel('Cartão', { exact: true })).toHaveValue('filter-card')
  await expect(page.getByText('Fora do período', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Próximo', exact: true }).click()
  await expect(page.getByText('Página 2')).toBeVisible()
  await page.getByLabel('Data final da compra').fill('2026-10-30')
  await expect(page.getByText('Página 1')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Data final da compra')).toHaveValue('2026-10-30')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  const stream = await (await downloaded).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  const content = Buffer.concat(chunks).toString('utf8')
  expect(content.match(/Filtro compra/g)?.length).toBe(12)
  expect(content).not.toContain('Fora do período')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/period-mobile.png', fullPage: true })
  await page.getByLabel('Data inicial da compra').fill('2026-11-01')
  await expect(page.getByText('A data final deve ser igual ou posterior à inicial.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled()
  await page.getByRole('button', { name: 'Limpar Filtros' }).click()
  await expect(page.getByLabel('Data inicial da compra')).toHaveValue('')
})
