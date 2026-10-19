/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { useCurrentDate } from '@/hooks/use-current-date'
test('virada do mês e retorno à aba atualizam referência sem interação nos filtros', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 0, 31, 23, 59, 59))
  const { result, unmount } = renderHook(useCurrentDate)
  act(() => { jest.advanceTimersByTime(2000) })
  expect(result.current.getMonth()).toBe(1)
  act(() => { jest.setSystemTime(new Date(2026, 2, 5)); window.dispatchEvent(new Event('focus')) })
  expect(result.current.getMonth()).toBe(2)
  unmount()
  expect(jest.getTimerCount()).toBe(0)
  jest.useRealTimers()
})
