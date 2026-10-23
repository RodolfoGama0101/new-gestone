import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { initializeApp as initializeClientApp, deleteApp } from 'firebase/app'
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  Timestamp as ClientTimestamp,
  terminate,
} from 'firebase/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Execute npm run test:e2e com os emuladores fictícios.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })
const db = getFirestore(app)

test('exclui cartões vazios, preserva vínculos e resiste a escritas concorrentes', async ({
  page,
}) => {
  test.setTimeout(180000)
  const email = `delete-card-${crypto.randomUUID()}@example.test`
  const password = 'TesteSeguro@123'
  await page.goto('/register')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar Senha', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 90000 })
  const { uid } = await getAuth(app).getUserByEmail(email)
  const user = db.doc(`users/${uid}`)
  await expect
    .poll(
      async () =>
        (
          await user
            .collection('categories')
            .where('type', '==', 'expense')
            .get()
        ).size,
    )
    .toBeGreaterThan(0)
  const category = (
    await user.collection('categories').where('type', '==', 'expense').get()
  ).docs[0]
  const now = Timestamp.now()
  const purchase = {
    type: 'expense',
    amount: 12345,
    description: 'Compra preservada',
    categoryId: category.id,
    date: now,
    cardClosingDay: 10,
    tags: [],
    notes: null,
    recurring: false,
    createdAt: now,
    updatedAt: now,
  }
  const card = {
    name: 'Cartão vazio',
    bankName: 'Banco teste',
    holderName: 'Pessoa',
    brand: 'visa',
    closingDay: 10,
    color: '#820ad1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await user.collection('creditCards').doc('empty').set(card)
  await user
    .collection('creditCards')
    .doc('archived')
    .set({ ...card, name: 'Cartão arquivado', archived: true, isActive: false })
  for (const id of ['purchase', 'series', 'payment'])
    await user
      .collection('creditCards')
      .doc(id)
      .set({ ...card, name: `Cartão com ${id}` })
  await user
    .collection('transactions')
    .doc('purchase')
    .set({ ...purchase, creditCardId: 'purchase' })
  await user
    .collection('transactionSeries')
    .doc('series')
    .set({
      ...purchase,
      creditCardId: 'series',
      kind: 'recurring',
      count: 1200,
      nextIndex: 1,
      endDate: null,
      cancelledFrom: now,
      timezoneOffset: 180,
    })
  await user
    .collection('creditCards')
    .doc('payment')
    .collection('payments')
    .doc('2026-10')
    .set({ amount: 12345, paidAt: now })
  const foreign = db.doc(`users/other-${uid}/creditCards/foreign`)
  await foreign.set(card)

  await page.goto('/credit-cards')
  await page
    .getByRole('button', {
      name: 'Selecionar cartão Cartão vazio · Banco teste',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Excluir cartão', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Cartão vazio')
  await page.setViewportSize({ width: 320, height: 900 })
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true)
  await page.screenshot({
    path: 'dogfood-output/card-deletion/confirmation-mobile.png',
    fullPage: true,
  })
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 900 })
  expect((await user.collection('creditCards').doc('empty').get()).exists).toBe(
    true,
  )
  await page
    .getByRole('button', { name: 'Excluir cartão', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir permanentemente' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Selecionar cartão Cartão vazio · Banco teste',
      exact: true,
    }),
  ).toHaveCount(0)
  expect((await user.collection('creditCards').doc('empty').get()).exists).toBe(
    false,
  )
  await page
    .getByRole('button', {
      name: 'Selecionar cartão Cartão arquivado · Banco teste',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Excluir cartão', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir permanentemente' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(
    (await user.collection('creditCards').doc('archived').get()).exists,
  ).toBe(false)

  await page
    .getByRole('button', {
      name: 'Selecionar cartão Cartão com payment · Banco teste',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Excluir cartão', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Excluir permanentemente' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Arquive-o')
  await page.screenshot({
    path: 'dogfood-output/card-deletion/blocked-desktop.png',
    fullPage: true,
  })
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  for (const id of ['purchase', 'series', 'payment']) {
    const response = await page.request.delete(`/api/credit-cards/${id}`)
    expect(response.status()).toBe(409)
    expect(
      (await user.collection('creditCards').doc(id).get()).data()?.archived,
    ).toBeUndefined()
  }
  expect(
    (await user.collection('transactions').doc('purchase').get()).data()
      ?.amount,
  ).toBe(12345)
  expect(
    (
      await user
        .collection('creditCards')
        .doc('payment')
        .collection('payments')
        .doc('2026-10')
        .get()
    ).data()?.amount,
  ).toBe(12345)
  expect(
    (await page.request.delete('/api/credit-cards/foreign')).status(),
  ).toBe(404)
  expect((await foreign.get()).exists).toBe(true)
  expect(
    (
      await page.request.delete('/api/credit-cards/payment', {
        headers: { origin: 'https://external.test' },
      })
    ).status(),
  ).toBe(403)

  const clientApp = initializeClientApp(
    { apiKey: 'demo-api-key', projectId: 'demo-gestone-e2e' },
    `race-${uid}`,
  )
  const clientAuth = getClientAuth(clientApp)
  connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', {
    disableWarnings: true,
  })
  const clientDb = getClientFirestore(clientApp)
  connectFirestoreEmulator(clientDb, '127.0.0.1', 8081)
  try {
    await signInWithEmailAndPassword(clientAuth, email, password)
    await expect
      .poll(async () => (await user.collection('categories').get()).size)
      .toBeGreaterThan(0)
    for (let index = 0; index < 4; index++) {
      const id = `race-${index}`
      const cardRef = user.collection('creditCards').doc(id)
      await cardRef.set(card)
      const linkedPath =
        index % 2
          ? `users/${uid}/creditCards/${id}/payments/2026-10`
          : `users/${uid}/transactions/${id}`
      const data =
        index % 2
          ? { amount: 100, paidAt: ClientTimestamp.now() }
          : {
              type: 'expense',
              amount: 100,
              description: 'Compra concorrente',
              categoryId: category.id,
              date: ClientTimestamp.now(),
              creditCardId: id,
              cardClosingDay: 10,
              tags: [],
              notes: null,
              recurring: false,
              createdAt: ClientTimestamp.now(),
              updatedAt: ClientTimestamp.now(),
            }
      const [deletion] = await Promise.all([
        page.request.delete(`/api/credit-cards/${id}`),
        setDoc(doc(clientDb, linkedPath), data).then(
          () => true,
          () => false,
        ),
      ])
      expect([200, 409]).toContain(deletion.status())
      const [remainingCard, linked] = await Promise.all([
        cardRef.get(),
        db.doc(linkedPath).get(),
      ])
      expect(remainingCard.exists || !linked.exists).toBe(true)
      if (deletion.status() === 200) expect(remainingCard.exists).toBe(false)
    }
  } finally {
    await terminate(clientDb)
    await deleteApp(clientApp)
  }
  await page.reload()
  await expect(
    page.getByRole('button', {
      name: 'Selecionar cartão Cartão vazio · Banco teste',
      exact: true,
    }),
  ).toHaveCount(0)
})
