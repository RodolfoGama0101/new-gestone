import { test, expect, type Page } from '@playwright/test'

async function signInWithGoogle(page: Page) {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
    throw new Error(
      'Execute npm run test:e2e: somente o emulador local é permitido.',
    )
  }

  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continuar com o Google' }).click()
  const popup = await popupPromise
  await popup.getByRole('button', { name: 'Add new account' }).click()
  await popup
    .locator('#email-input')
    .fill(`google-${crypto.randomUUID()}@example.test`)
  await popup.locator('#display-name-input').fill('Conta Google de teste')
  // O emulador só consegue entregar o resultado quando o canal do iframe está pronto.
  await expect
    .poll(() =>
      page
        .frames()
        .some((frame) => frame.url().includes('/emulator/auth/iframe')),
    )
    .toBe(true)
  const authFrame = page
    .frames()
    .find((frame) => frame.url().includes('/emulator/auth/iframe'))!
  await authFrame.waitForFunction(
    () => Boolean(Reflect.get(window, 'parentContainer')),
    undefined,
    { timeout: 30000 },
  )
  await Promise.all([
    popup.waitForEvent('close', { timeout: 60000 }),
    popup
      .getByRole('button', { name: 'Sign in with Google.com', exact: true })
      .click(),
  ])
}

test('login Google no desktop abre o painel após fechar o popup e criar a sessão', async ({
  page,
  context,
}) => {
  await page.goto('/login')
  // Confirma que a área protegida recusa uma visita anônima antes do login.
  await page.goto('/')
  await expect(page).toHaveURL('http://localhost:3102/login')
  const dashboardDocument = page.waitForRequest(
    (request) =>
      request.isNavigationRequest() && new URL(request.url()).pathname === '/',
    { timeout: 60000 },
  )
  await Promise.all([dashboardDocument, signInWithGoogle(page)])
  await expect(page).toHaveURL('http://localhost:3102/', { timeout: 30000 })
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === 'session',
  )
  expect(session?.httpOnly).toBe(true)
  await page.reload()
  await expect(page).toHaveURL('http://localhost:3102/')
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
})

test('falha de sessão após o popup Google mostra o motivo e permite tentar novamente', async ({
  page,
  context,
}) => {
  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'auth/session-service-unavailable',
        error: 'O serviço de sessão não está configurado corretamente.',
      }),
    })
  })
  await page.goto('/login')
  await signInWithGoogle(page)
  await expect(
    page.getByText(
      'O serviço de sessão está indisponível. Tente novamente em instantes.',
    ),
  ).toBeVisible()
  await expect(page).toHaveURL('http://localhost:3102/login')
  await expect(
    page.getByRole('button', { name: 'Continuar com o Google' }),
  ).toBeEnabled()
  expect(
    (await context.cookies()).some((cookie) => cookie.name === 'session'),
  ).toBe(false)
})
