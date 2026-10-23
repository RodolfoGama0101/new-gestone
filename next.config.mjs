import withPWAInit from '@ducanh2912/next-pwa'
import { pwaOptions } from './src/lib/pwa-options.mjs'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  ...pwaOptions,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep emulator verification independent from an existing local dev server.
  distDir:
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' ? '.next/e2e' : '.next',
  // Ativa o React Strict Mode para melhor detecção de problemas e profiling
  reactStrictMode: true,
  poweredByHeader: false,

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
    ]
  },

  // Otimiza tree-shaking de pacotes com muitos exports — reduz bundle size
  // lucide-react e recharts têm centenas de ícones/componentes não utilizados
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

export default withPWA(nextConfig)
