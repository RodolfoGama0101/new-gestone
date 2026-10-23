import { test, expect } from '@playwright/test'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
) {
  throw new Error('Execute npm run test:e2e com os emuladores fictícios.')
}
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })

test('atalho global preserva formulário ao redimensionar, valida detalhes e salva uma vez', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const email = `redesign-${crypto.randomUUID()}@example.test`
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
  await page.goto('/budgets')
  const trigger = page
    .locator('header')
    .getByRole('button', { name: 'Novo lançamento', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).click()
  await expect(dialog.getByLabel('Valor', { exact: true })).toBeFocused()
  await dialog.getByLabel('Valor', { exact: true }).fill('12345')
  await dialog
    .getByLabel('Descrição', { exact: true })
    .fill('Compra de revisão do redesign')
  await dialog.getByLabel('Categoria', { exact: true }).click()
  await page
    .getByRole('option', { name: 'Alimentação', exact: true })
    .first()
    .click()
  await page.setViewportSize({ width: 320, height: 844 })
  await dialog.getByRole('button', { name: 'Data', exact: true }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true)
  await page.keyboard.press('Escape')
  await expect(
    dialog.getByRole('button', { name: 'Data', exact: true }),
  ).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await dialog.getByRole('button', { name: 'Mais detalhes' }).click()
  await dialog
    .getByLabel('Anotações / Notas')
    .fill('Detalhes preservados ao trocar a largura')
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(dialog.getByLabel('Descrição', { exact: true })).toHaveValue(
    'Compra de revisão do redesign',
  )
  await expect(dialog.getByLabel('Anotações / Notas')).toHaveValue(
    'Detalhes preservados ao trocar a largura',
  )
  await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).dblclick()
  await expect(dialog).not.toBeVisible()
  const uid = (await getAuth(app).getUserByEmail(email)).uid
  const transactions = await getFirestore(app)
    .collection(`users/${uid}/transactions`)
    .get()
  expect(transactions.size).toBe(1)
  expect(transactions.docs[0].data()).toMatchObject({
    amount: 12345,
    notes: 'Detalhes preservados ao trocar a largura',
  })
  await expect(trigger).toBeFocused()
  await page.goto('/transactions')
  await expect(
    page.getByText('Compra de revisão do redesign', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Filtrar por tipo')).not.toBeVisible()
  await page.getByRole('button', { name: /Filtros adicionais/ }).click()
  await page.getByLabel('Filtrar por tipo').click()
  await page.getByRole('option', { name: 'Despesas (Saídas)' }).click()
  await expect(page).toHaveURL(/type=expense/)
  await page.getByRole('button', { name: /Filtros adicionais/ }).click()
  await expect(
    page.getByRole('list', { name: 'Filtros ativos' }),
  ).toContainText('Despesas (Saídas)')
  await page.getByRole('button', { name: 'Limpar Filtros' }).click()
  await expect(page).not.toHaveURL(/type=expense/)
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Perfil', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Aparência', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('tabpanel', { name: 'Aparência', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 320, height: 360 })
  await page.getByRole('button', { name: 'Mais opções de navegação' }).click()
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Recorrências e parcelas' })
    .click()
  await expect(page).toHaveURL(/\/series$/)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
