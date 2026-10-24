/** @jest-environment jsdom */
import { render, act } from '@testing-library/react'
import { McpFocusSync } from '@/components/integrations/mcp-focus-sync'

const invalidate = jest.fn()
const client = {}
jest.mock('@/lib/transaction-cache', () => ({
  invalidateTransactionData: (...args: unknown[]) => invalidate(...args),
}))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => client }))
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'owner' } }),
}))

test('foco invalida dados e cursores; eventos duplicados são suprimidos e listeners removidos', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-23T12:00:00Z'))
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  const view = render(<McpFocusSync />)
  act(() => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(invalidate).toHaveBeenCalledTimes(1)
  expect(invalidate).toHaveBeenCalledWith(client, 'owner')
  act(() => {
    jest.advanceTimersByTime(5000)
    window.dispatchEvent(new Event('focus'))
  })
  expect(invalidate).toHaveBeenCalledTimes(2)
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'hidden',
  })
  act(() => {
    jest.advanceTimersByTime(5000)
    window.dispatchEvent(new Event('focus'))
  })
  expect(invalidate).toHaveBeenCalledTimes(2)
  view.unmount()
  act(() => {
    window.dispatchEvent(new Event('focus'))
  })
  expect(invalidate).toHaveBeenCalledTimes(2)
  jest.useRealTimers()
})
