import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
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
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
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
