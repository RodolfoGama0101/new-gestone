import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const env = {
  ...process.env,
  NEXT_PUBLIC_USE_EMULATORS: 'true',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-gestone-e2e',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-gestone-e2e.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app-id',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: '',
  NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: '',
  FIREBASE_PROJECT_ID: 'demo-gestone-e2e',
  GCLOUD_PROJECT: 'demo-gestone-e2e',
  FIREBASE_SERVICE_ACCOUNT_KEY: '',
  GOOGLE_APPLICATION_CREDENTIALS: '',
  METADATA_SERVER_DETECTION: 'none',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
  MCP_ORIGIN: 'http://localhost:3102',
  MCP_ALLOWED_UIDS: 'demo-mcp-owner',
  MCP_CLIENT_ID: 'demo-mcp-client',
  MCP_CLIENT_SECRET: '',
  MCP_REDIRECT_URIS: 'https://example.test/oauth/callback',
  GESTONE_E2E_WEBPACK: process.argv.includes('--webpack') ? 'true' : 'false',
}
const production = process.argv.includes('--production')
const mcpOnly = process.argv.includes('--mcp')
if (production && mcpOnly) throw new Error('Use --mcp sem --production para validar OAuth no localhost de teste.')
if (production) {
  await new Promise((resolve, reject) => {
    const build = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], { env, stdio: 'inherit' })
    build.on('error', reject)
    build.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Build E2E de produção falhou.')))
  })
}
const child = spawn(
  process.execPath,
  [
    require.resolve('firebase-tools/lib/bin/firebase.js'),
    'emulators:exec',
    '--config',
    'firebase.e2e.json',
    '--only',
    'auth,firestore',
    '--project',
    'demo-gestone-e2e',
    process.argv.includes('--review')
      ? 'next dev --turbopack --port 3102'
      : production
        ? 'playwright test --config playwright.production.config.ts'
        : mcpOnly
          ? 'playwright test tests/e2e/mcp.test.ts'
          : 'playwright test',
  ],
  { env, stdio: 'inherit' },
)
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
