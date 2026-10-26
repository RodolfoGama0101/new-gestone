import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: '**/*.production.test.ts',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  expect: { timeout: 15000 },
  use: {
    actionTimeout: 15000,
    baseURL: 'http://localhost:3102',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      process.env.GESTONE_E2E_WEBPACK === 'true'
        ? 'node node_modules/next/dist/bin/next dev --webpack --port 3102'
        : 'npm run dev -- --port 3102',
    url: 'http://localhost:3102',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
