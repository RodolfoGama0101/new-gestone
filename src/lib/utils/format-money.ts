const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = new Intl.NumberFormat('pt-BR')

// As funções só formatam centavos; não convertem nem alteram o valor armazenado.
export const formatMoney = (cents: number) => money.format(cents / 100)
export const formatCsvAmount = (cents: number) => `${cents < 0 ? '-' : ''}${integer.format(BigInt(Math.abs(cents)) / BigInt(100))},${String(BigInt(Math.abs(cents)) % BigInt(100)).padStart(2, '0')}`
