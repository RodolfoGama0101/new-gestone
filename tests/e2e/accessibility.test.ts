import { test, expect } from '@playwright/test'

const routes = [
  { path: '/login', title: 'Entre na sua conta', submit: 'Entrar na conta' },
  { path: '/register', title: 'Crie sua conta', submit: 'Criar conta grátis' },
  { path: '/forgot-password', title: 'Recuperar senha', submit: 'Enviar link de recuperação' },
]
for (const theme of ['light', 'dark']) {
  for (const route of routes) {
    test(route.path + ' tem landmarks, teclado e erros associados em ' + theme, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route.path)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('main')).toBeFocused()
      const submit = page.getByRole('button', { name: route.submit, exact: true })
      await submit.focus()
      await page.keyboard.press('Enter')
      const email = page.getByLabel('E-mail', { exact: true })
      await expect(email).toBeFocused()
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(email).toHaveAttribute('aria-describedby', 'email-error')
      await expect(page.locator('#email-error')).toHaveAttribute('role', 'alert')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

test('reflow equivalente a 200% mantém título, campos e ação no viewport', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:3102', viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 })
  try {
    const page = await context.newPage()
    for (const route of routes) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible()
      await expect(page.getByRole('button', { name: route.submit, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  } finally { await context.close() }
})

test('recuperação move foco para o resultado e permite voltar pelo teclado', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('E-mail', { exact: true }).fill('recovery-accessibility@example.test')
  await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'E-mail enviado!' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Voltar ao login' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('http://localhost:3102/login')
})
