import { test, expect, type Page } from '@playwright/test'

const origin = 'http://localhost:3102'

test('popup bloqueado informa o motivo sem iniciar redirecionamento', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.open = () => null
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continuar com o Google' }).click()
  await expect(
    page.getByText(
      'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
    ),
  ).toBeVisible()
  await expect(page).toHaveURL(`${origin}/login`)
  await expect(
    page.getByRole('button', { name: 'Continuar com o Google' }),
  ).toBeEnabled()
  await expect(page.locator('html')).toHaveAttribute(
    'data-auth-flow',
    'google:popup-error',
  )
  await expect(
    page.getByRole('button', { name: 'Continuar nesta aba' }),
  ).toBeVisible()
})

async function signInWithGoogle(page: Page) {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => {
    browserErrors.push(error.message)
  })
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
    throw new Error(
      'Execute npm run test:e2e: somente o emulador local é permitido.',
    )
  }

  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continuar com o Google' }).click()
  const popup = await popupPromise
  await popup.waitForFunction(
    () => typeof Reflect.get(window, 'finishWithUser') === 'function',
    undefined,
    { timeout: 60000 },
  )
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
  try {
    await authFrame.waitForFunction(
      () => Boolean(Reflect.get(window, 'parentContainer')),
      undefined,
      { timeout: 30000 },
    )
  } catch (error) {
    const state = await authFrame.evaluate(() => ({
      readyState: document.readyState,
      hasGapi: typeof Reflect.get(window, 'gapi'),
      hasGapiFrames: Boolean(Reflect.get(window, 'gapi')?.iframes),
      hasOnload: typeof Reflect.get(window, 'gapi_onload'),
      scripts: Array.from(document.scripts, (script) => script.src).filter(
        Boolean,
      ),
    }))
    console.info(
      'Auth Emulator iframe:',
      JSON.stringify({ state, browserErrors }),
    )
    throw error
  }
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
  await expect(page).toHaveURL(`${origin}/login`)
  const dashboardDocument = page.waitForRequest(
    (request) =>
      request.isNavigationRequest() && new URL(request.url()).pathname === '/',
    { timeout: 60000 },
  )
  await Promise.all([dashboardDocument, signInWithGoogle(page)])
  await expect(page).toHaveURL(`${origin}/`, { timeout: 30000 })
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === 'session',
  )
  expect(session?.httpOnly).toBe(true)
  await page.reload()
  await expect(page).toHaveURL(`${origin}/`)
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
    page
      .getByRole('alert')
      .getByText(
        'O serviço de sessão está indisponível. Tente novamente em instantes.',
      ),
  ).toBeVisible()
  await expect(page).toHaveURL(`${origin}/login`)
  await expect(
    page.getByRole('button', { name: 'Continuar com o Google' }),
  ).toBeEnabled()
  expect(
    (await context.cookies()).some((cookie) => cookie.name === 'session'),
  ).toBe(false)
  // Reutiliza a credencial válida, sem abrir outro popup ou pedir a conta novamente.
  let newPopups = 0
  page.on('popup', () => {
    newPopups += 1
  })
  await page.unroute('**/api/auth/session')
  await page.getByRole('button', { name: 'Tentar sincronizar sessão' }).click()
  await expect(page).toHaveURL(`${origin}/`, { timeout: 30000 })
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
  expect(newPopups).toBe(0)
})

test('popup bloqueado permite login Google na mesma aba pelo redirect', async ({
  page,
  context,
}) => {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
    throw new Error('Execute npm run test:e2e com os emuladores isolados.')
  }
  await page.addInitScript(() => {
    window.open = () => null
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continuar com o Google' }).click()
  await page.getByRole('button', { name: 'Continuar nesta aba' }).click()
  await page.waitForFunction(
    () => typeof Reflect.get(window, 'finishWithUser') === 'function',
    undefined,
    { timeout: 60000 },
  )
  await page.getByRole('button', { name: 'Add new account' }).click()
  await page
    .locator('#email-input')
    .fill(`redirect-${crypto.randomUUID()}@example.test`)
  await page.locator('#display-name-input').fill('Google por redirecionamento')
  await page
    .getByRole('button', { name: 'Sign in with Google.com', exact: true })
    .click()
  await expect(page).toHaveURL(`${origin}/`, { timeout: 60000 })
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'session')
      ?.httpOnly,
  ).toBe(true)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Abrir menu da conta' }),
  ).toBeVisible()
})
