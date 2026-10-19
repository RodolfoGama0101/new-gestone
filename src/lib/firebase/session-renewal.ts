export const SESSION_RENEW_INTERVAL_MS = 24 * 60 * 60 * 1000

// Sem tokens no armazenamento compartilhado: somente UID e instante da última sincronização.
export function createSessionRenewal(options: {
  now?: () => number
  storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined
  lock: <T>(operation: () => Promise<T>) => Promise<T>
}) {
  const memory = new Map<string, number>()
  const now = options.now ?? Date.now
  return {
    renew(uid: string, operation: () => Promise<void>, force = false) {
      return options.lock(async () => {
        const key = `gestone-session:${uid}`
        let last = memory.get(uid) ?? 0
        try { last = Number(options.storage()?.getItem(key)) || last } catch { /* armazenamento indisponível */ }
        const age = now() - last
        if (!force && last > 0 && age >= 0 && age < SESSION_RENEW_INTERVAL_MS) return
        await operation()
        const timestamp = now()
        memory.set(uid, timestamp)
        try { options.storage()?.setItem(key, String(timestamp)) } catch { /* usa memória */ }
      })
    },
    clear(uid: string | undefined, operation: () => Promise<void>) {
      return options.lock(async () => {
        await operation()
        if (uid) {
          memory.delete(uid)
          try { options.storage()?.removeItem(`gestone-session:${uid}`) } catch { /* usa memória */ }
        }
      })
    },
  }
}
