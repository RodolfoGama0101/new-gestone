/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthPicker } from '@/components/shared/month-picker'

test('abre no ano selecionado e escolhe somente mês/ano, sem dia ou UTC', () => {
  const onChange = jest.fn()
  render(<MonthPicker value="2026-10" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /Outubro de 2026/ }))
  expect(screen.getByRole('button', { name: 'Outubro' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Novembro' }))
  expect(onChange).toHaveBeenCalledWith('2026-11')
})
test('permite mudar de ano e respeita bloqueio do formulário', () => {
  const onChange = jest.fn()
  const { rerender } = render(
    <MonthPicker value="2026-01" onChange={onChange} />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Janeiro de 2026/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Ano anterior' }))
  fireEvent.click(screen.getByRole('button', { name: 'Dezembro' }))
  expect(onChange).toHaveBeenCalledWith('2025-12')
  rerender(<MonthPicker value="2025-12" onChange={onChange} disabled />)
  expect(
    screen.getByRole('button', { name: /Dezembro de 2025/ }),
  ).toBeDisabled()
})
