import { cardAppearance } from '@/lib/utils/card-appearance'
import { creditCardSchema } from '@/lib/validations/credit-card.schema'

test.each([
  ['#ffffff', '#000000'],
  ['#e2e8f0', '#000000'],
  ['#000000', '#ffffff'],
  ['#820ad1', '#ffffff'],
  ['#777777', '#000000'],
])('seleciona texto legível para %s', (color, foreground) => {
  expect(cardAppearance(color).foreground).toBe(foreground)
})

test('normaliza cores antigas e rejeita valores impróprios na apresentação', () => {
  expect(cardAppearance('#ABC').color).toBe('#aabbcc')
  expect(cardAppearance('hsl(270, 100%, 50%)').color).toBe('#8000ff')
  expect(cardAppearance('url(https://example.test)').color).toBe('#18181b')
})

const card = {
  name: 'Meu cartão',
  bankName: 'Banco',
  holderName: 'Pessoa',
  brand: 'visa',
  closingDay: 10,
  isActive: true,
}
test.each(['#123', '#820ad1', '#FFFFFF', 'hsl(270, 100%, 50%)'])(
  'aceita a cor %s',
  (color) => {
    expect(creditCardSchema.safeParse({ ...card, color }).success).toBe(true)
  },
)
test.each([
  '',
  '#12',
  '#12345678',
  'blue',
  '#gggggg',
  'url(test)',
  'hsl(0, 200%, 0%)',
])('recusa a cor inválida %s', (color) => {
  expect(creditCardSchema.safeParse({ ...card, color }).success).toBe(false)
})
