const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// As funções só formatam centavos; não convertem nem alteram o valor armazenado.
export const formatMoney = (cents: number) => money.format(cents / 100)
export const formatCsvAmount = (cents: number) => decimal.format(cents / 100)
