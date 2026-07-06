import { test, expect } from '@playwright/test'

test('deve carregar a tela de login e exibir o titulo da aplicacao', async ({ page }) => {
  await page.goto('/login')
  
  // Verifica se o título principal "GestOne" está presente no painel de branding
  const branding = page.locator('span', { hasText: 'GestOne' }).first()
  await expect(branding).toBeVisible()
})
