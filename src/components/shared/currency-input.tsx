'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

interface CurrencyInputProps {
  value: number // valor em centavos (ex: 1550 = R$ 15,50)
  onChange: (cents: number) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
}

export function CurrencyInput({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'R$ 0,00',
  id,
}: CurrencyInputProps) {
  // Formata o número (centavos) para Real Brasileiro
  const formatValue = (cents: number) => {
    if (isNaN(cents) || cents === 0) return ''
    const val = cents / 100
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const [prevValue, setPrevValue] = React.useState(value)
  const [displayValue, setDisplayValue] = React.useState(formatValue(value))

  if (value !== prevValue) {
    setPrevValue(value)
    setDisplayValue(formatValue(value))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    // Remove tudo exceto dígitos numéricos
    const digits = rawValue.replace(/\D/g, '')
    
    if (!digits) {
      onChange(0)
      setDisplayValue('')
      return
    }

    const cents = parseInt(digits, 10)
    onChange(cents)
    setDisplayValue(formatValue(cents))
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleInputChange}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
    />
  )
}
