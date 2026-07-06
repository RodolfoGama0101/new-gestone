import { test, expect } from '@playwright/test'

test('deve carregar a tela de login e exibir o titulo da aplicacao', async ({ page }) => {
  await page.goto('/login')
  
  // Verifica se o título principal "GestOne" está presente no painel de branding
  const branding = page.locator('h1')
  await expect(branding).toContainText('GestOne')
})
