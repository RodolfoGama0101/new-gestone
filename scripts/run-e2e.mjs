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
    process.argv.includes('--review') ? 'next dev --turbopack --port 3102' : 'playwright test',
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
