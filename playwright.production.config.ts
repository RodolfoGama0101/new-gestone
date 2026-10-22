import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig(config, {
  testIgnore: [],
  testMatch: '**/pwa.production.test.ts',
  webServer: {
    command: 'npm run start -- --port 3102',
    url: 'http://localhost:3102',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
