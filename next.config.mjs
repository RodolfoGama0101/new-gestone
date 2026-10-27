import withPWAInit from '@ducanh2912/next-pwa'
import { pwaOptions } from './src/lib/pwa-options.mjs'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  ...pwaOptions,
})

const authProxyEnabled = process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROXY === 'true'
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''
if (
  authProxyEnabled &&
  !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(firebaseProjectId)
) {
  throw new Error('O proxy de autenticação exige um projectId Firebase válido.')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ativa o React Strict Mode para melhor detecção de problemas e profiling
  reactStrictMode: true,
  poweredByHeader: false,
  // Evita que o indicador de desenvolvimento cubra a navegação móvel.
  devIndicators: false,

  async rewrites() {
    return authProxyEnabled
      ? [
          {
            source: '/__/auth/:path*',
            destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
          },
        ]
      : []
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
      {
        source: '/__/auth/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/oauth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ]
  },

  // Otimiza tree-shaking de pacotes com muitos exports — reduz bundle size
  // lucide-react e recharts têm centenas de ícones/componentes não utilizados
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

export default withPWA(nextConfig)
