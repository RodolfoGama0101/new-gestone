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

  // Otimiza tree-shaking de pacotes com muitos exports — reduz bundle size
  // lucide-react e recharts têm centenas de ícones/componentes não utilizados
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

export default withPWA(nextConfig)
