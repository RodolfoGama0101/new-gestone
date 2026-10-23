import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Execute npm run test:e2e com os emuladores fictícios.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })

test('personaliza, salva e reabre cartões em ambos os temas e tamanhos', async ({
  page,
}) => {
  test.setTimeout(180000)
  const email = `cards-${crypto.randomUUID()}@example.test`
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
  await page.goto('/credit-cards')
  await page
    .getByRole('button', { name: 'Adicionar Cartão', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Apelido do Cartão').fill('Meu cartão de viagens')
  await dialog.getByLabel('Nome do Banco').fill('Banco de teste')
  await dialog.getByLabel('Nome do Titular').fill('Pessoa de teste')
  await dialog.getByRole('button', { name: 'Cor Platina', exact: true }).click()
  const preview = dialog.locator('[data-slot="credit-card-visual"]')
  await expect(preview).toHaveCSS('background-color', 'rgb(226, 232, 240)')
  await expect(preview).toHaveCSS('color', 'rgb(0, 0, 0)')
  const hex = dialog.getByLabel('Código hexadecimal da cor')
  await hex.fill('#zzzzzz')
  await dialog
    .getByRole('button', { name: 'Cadastrar Cartão', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('hexadecimal válida')
  await hex.fill('#155e75')
  await expect(preview).toHaveCSS('background-color', 'rgb(21, 94, 117)')
  await dialog
    .getByRole('button', { name: 'Cadastrar Cartão', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.locator('[data-slot="credit-card-visual"]')).toHaveCSS(
    'background-color',
    'rgb(21, 94, 117)',
  )
  const cards = await getFirestore(app)
    .collection(`users/${uid}/creditCards`)
    .get()
  expect(cards.docs[0].data().color).toBe('#155e75')
  await page.getByRole('button', { name: 'Personalizar', exact: true }).click()
  await expect(hex).toHaveValue('#155e75')
  await dialog
    .getByRole('button', { name: 'Cor Champanhe', exact: true })
    .click()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        )
        .toBe(true)
      await page.screenshot({
        path: `dogfood-output/card-personalization/${theme}-${width}-editor.png`,
        fullPage: true,
      })
    }
  }
  await dialog
    .getByRole('button', { name: 'Salvar Alterações', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.locator('[data-slot="credit-card-visual"]')).toHaveCSS(
    'background-color',
    'rgb(212, 184, 119)',
  )
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true)
    await page.screenshot({
      path: `dogfood-output/card-personalization/wallet-${width}.png`,
      fullPage: true,
    })
  }
})
