// Somente recursos públicos entram no cache. Documentos, RSC, APIs e Firebase usam rede.
export const pwaOptions = {
  customWorkerSrc: 'src/worker',
  cacheStartUrl: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  fallbacks: { document: '/offline.html' },
  workboxOptions: {
    cacheId: 'gestone-public-v1',
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
        handler: 'CacheFirst',
        options: { cacheName: 'gestone-static-v1', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } },
      },
      { urlPattern: /.*/, handler: 'NetworkOnly' },
    ],
  },
}
