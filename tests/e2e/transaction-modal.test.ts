import { test, expect } from '@playwright/test'

test('modal compacto mantém campos e confirmação acessíveis em todas as seções', async ({
  page,
}) => {
  test.setTimeout(180000)
  const sessionReady = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/session') &&
      response.request().method() === 'DELETE',
    { timeout: 90000 },
  )
  await page.goto('/register')
  await sessionReady
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(`modal-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page
    .getByLabel('Confirmar Senha', { exact: true })
    .fill('TesteSeguro@123')
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 90000 })
  await page
    .getByRole('button', { name: 'Novo lançamento', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Descrição', { exact: true })
    .fill('Compra preservada entre seções')

  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) =>
        document.documentElement.classList.toggle('dark', value === 'dark'),
      theme,
    )
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
      { width: 320, height: 740 },
    ]) {
      await page.setViewportSize(viewport)
      for (const section of ['Lançamento', 'Repetição', 'Detalhes']) {
        await dialog.getByRole('button', { name: section, exact: true }).click()
        await expect(
          dialog.getByRole('button', { name: 'Confirmar Lançamento' }),
        ).toBeInViewport()
        expect(
          await dialog.evaluate((element) => ({
            vertical: element.scrollHeight <= element.clientHeight,
            horizontal: element.scrollWidth <= element.clientWidth,
          })),
        ).toEqual({ vertical: true, horizontal: true })
        if (section === 'Lançamento') {
          expect(
            await dialog
              .getByLabel('Data', { exact: true })
              .locator('span')
              .evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
              ),
          ).toBe(true)
        }
        await page.screenshot({
          path: `dogfood-output/modal-${theme}-${viewport.width}-${viewport.height}-${section}.png`,
        })
      }
    }
  }

  await dialog
    .getByLabel('Tags (separadas por vírgula)')
    .fill('essencial, casa')
  await dialog
    .getByLabel('Anotações / Notas')
    .fill('Nota preservada entre seções')
  await dialog.getByRole('button', { name: 'Lançamento', exact: true }).click()
  await expect(dialog.getByLabel('Descrição', { exact: true })).toHaveValue(
    'Compra preservada entre seções',
  )
  await dialog.getByRole('button', { name: 'Detalhes', exact: true }).click()
  await expect(dialog.getByLabel('Anotações / Notas')).toHaveValue(
    'Nota preservada entre seções',
  )
  await dialog.getByRole('button', { name: 'Confirmar Lançamento' }).click()
  await expect(dialog.getByLabel('Valor', { exact: true })).toBeFocused()

  // Alturas extremas e zoom preservam acesso aos campos, em vez de cortá-los.
  await page.setViewportSize({ width: 320, height: 450 })
  await dialog
    .getByRole('button', { name: 'Confirmar Lançamento' })
    .scrollIntoViewIfNeeded()
  await expect(
    dialog.getByRole('button', { name: 'Confirmar Lançamento' }),
  ).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
