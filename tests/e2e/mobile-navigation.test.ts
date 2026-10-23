import { test, expect } from '@playwright/test'

test('painel móvel mantém mês, ação e navegação acessíveis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/register')
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(`mobile-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page
    .getByLabel('Confirmar Senha', { exact: true })
    .fill('TesteSeguro@123')
  await page
    .getByRole('button', { name: 'Criar conta grátis', exact: true })
    .click()
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 90000 })

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 })
    const previous = page.getByRole('button', {
      name: 'Mês anterior',
      exact: true,
    })
    const next = page.getByRole('button', { name: 'Próximo mês', exact: true })
    const add = page.getByRole('button', {
      name: 'Novo lançamento',
      exact: true,
    })
    await expect(previous).toBeVisible()
    await expect(next).toBeVisible()
    await expect(add).toBeVisible()
    const left = (await previous.boundingBox())!
    const right = (await next.boundingBox())!
    const action = (await add.boundingBox())!
    expect(Math.abs(left.y - right.y)).toBeLessThan(2)
    expect(action.y).toBeGreaterThanOrEqual(left.y + left.height)
    expect(left.height).toBeGreaterThanOrEqual(44)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('button', { name: 'Abrir menu da conta' }),
    ).toBeVisible()
    await add.click()
    const dialog = page.getByRole('dialog')
    const close = dialog.getByRole('button', { name: 'Fechar', exact: true })
    await expect(close).toBeVisible()
    const target = (await close.boundingBox())!
    expect(target.width).toBeGreaterThanOrEqual(44)
    expect(target.height).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Escape')
    await expect(add).toBeFocused()
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  const month = page
    .getByRole('button', { name: 'Mês anterior', exact: true })
    .locator('..')
  const action = page.getByRole('button', {
    name: 'Novo lançamento',
    exact: true,
  })
  await expect(action).toBeVisible()
  expect(
    Math.abs(
      (await month.boundingBox())!.height -
        (await action.boundingBox())!.height,
    ),
  ).toBeLessThan(2)

  await page.setViewportSize({ width: 320, height: 740 })
  await page.getByRole('button', { name: 'Mais opções de navegação' }).click()
  await page.getByRole('link', { name: 'Config.', exact: true }).click()
  const sections = page.getByRole('group', { name: 'Seções de configurações' })
  for (const name of ['Perfil', 'Preferências', 'Segurança', 'Excluir conta']) {
    await expect(
      sections.getByRole('button', { name, exact: true }),
    ).toBeInViewport()
  }
  expect(
    await sections.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
})
