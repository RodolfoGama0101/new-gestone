/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  WorkMonthProvider,
  useWorkMonth,
} from '@/providers/work-month-provider'

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

function Consumer() {
  const { month, setMonth } = useWorkMonth()
  return (
    <>
      <span>{month}</span>
      <button onClick={() => setMonth('2024-03')}>Avançar</button>
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

test('usa preferência de cada usuário e remove exceção ao escolher mês', () => {
  localStorage.setItem('gestone:work-month:a', '2024-02')
  localStorage.setItem('gestone:work-month:b', '2025-01')
  window.history.replaceState(null, '', '/?month=inválido&startDate=2024-02-03')
  const { rerender } = render(
    <WorkMonthProvider uid="a">
      <Consumer />
    </WorkMonthProvider>,
  )
  expect(screen.getByText('2024-02')).toBeInTheDocument()
  expect(new URLSearchParams(window.location.search).get('month')).toBe(
    '2024-02',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }))
  expect(
    new URLSearchParams(window.location.search).get('startDate'),
  ).toBeNull()
  expect(new URLSearchParams(window.location.search).get('month')).toBe(
    '2024-03',
  )
  expect(localStorage.getItem('gestone:work-month:a')).toBe('2024-02')
  // O mock lê a URL no render, sem a assinatura de navegação do Next.js.
  rerender(
    <WorkMonthProvider uid="a">
      <Consumer />
    </WorkMonthProvider>,
  )
  expect(screen.getByText('2024-03')).toBeInTheDocument()
  expect(localStorage.getItem('gestone:work-month:a')).toBe('2024-03')
  window.history.replaceState(null, '', '/')
  rerender(
    <WorkMonthProvider key="b" uid="b">
      <Consumer />
    </WorkMonthProvider>,
  )
  expect(screen.getByText('2025-01')).toBeInTheDocument()
  expect(localStorage.getItem('gestone:work-month:a')).toBe('2024-03')
})
