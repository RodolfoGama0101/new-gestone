import { createSessionRenewal, SESSION_RENEW_INTERVAL_MS } from '@/lib/firebase/session-renewal'
test('mais de cinco dias de refresh mantém renovações antecipadas sem chamadas por token', async () => {
  let now = 100000
  const storage = new Map<string, string>()
  const coordinator = createSessionRenewal({ now: () => now, storage: () => ({ getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value) }, removeItem: (key) => { storage.delete(key) } }), lock: (op) => op() })
  const operation = jest.fn().mockResolvedValue(undefined)
  for (let hour = 0; hour < 6 * 24; hour++) {
    await coordinator.renew('user', operation)
    now += 3600000
  }
  expect(operation).toHaveBeenCalledTimes(6)
  expect([...storage.values()][0]).not.toContain('token')
})
test('abas compartilham limite, falhas não marcam sucesso e logout remove a marca', async () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  let queue = Promise.resolve()
  const lock = <T,>(op: () => Promise<T>): Promise<T> => { const next = queue.then(op, op); queue = next.then(() => {}, () => {}); return next }
  const options = { now: () => SESSION_RENEW_INTERVAL_MS * 2, storage: () => storage, lock }
  const a = createSessionRenewal(options), b = createSessionRenewal(options)
  const operation = jest.fn().mockResolvedValue(undefined)
  await Promise.all([a.renew('user', operation), b.renew('user', operation)])
  expect(operation).toHaveBeenCalledTimes(1)
  await a.clear('user', async () => {})
  const failure = jest.fn().mockRejectedValue(new Error('revoked'))
  await expect(b.renew('user', failure, true)).rejects.toThrow('revoked')
  expect(values.size).toBe(0)
  await a.renew('user', operation, true)
  expect(operation).toHaveBeenCalledTimes(2)
})
