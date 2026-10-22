// Remove caches de versões antigas que podiam guardar HTML autenticado.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names
    .filter((name) => !name.startsWith('gestone-public-v1-') && name !== 'gestone-static-v1')
    .map((name) => caches.delete(name)))))
})
