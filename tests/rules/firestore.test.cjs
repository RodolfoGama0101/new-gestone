/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing')
const {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  setLogLevel,
} = require('firebase/firestore')

const projectId = 'demo-gestone-rules'
const timestamp = new Date('2026-10-19T12:00:00Z')
const profile = () => ({
  displayName: 'Pessoa de teste',
  createdAt: timestamp,
  updatedAt: timestamp,
})
const category = (type = 'expense') => ({
  name: 'Categoria',
  type,
  icon: 'Wallet',
  color: '#2563eb',
  isDefault: false,
  createdAt: timestamp,
  updatedAt: timestamp,
})
const card = () => ({
  name: 'Cartão',
  bankName: 'Banco',
  brand: 'visa',
  holderName: 'Titular',
  closingDay: 15,
  color: '#2563eb',
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp,
})
const transaction = (type = 'expense') => ({
  type,
  amount: 15000,
  description: 'Lançamento de teste',
  categoryId: type,
  date: timestamp,
  tags: [],
  notes: null,
  recurring: false,
  creditCardId: null,
  createdAt: timestamp,
  updatedAt: timestamp,
})
let environment
let owner
let other
let anonymous

beforeAll(async () => {
  // Falhar sem emulador evita qualquer possibilidade de acesso à produção.
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
    throw new Error(
      'Execute npm run test:rules com o emulador local em 127.0.0.1:8080.',
    )
  }
  setLogLevel('silent') // Negativas de permissão são esperadas e verificadas por assertFails.
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(join(__dirname, '../../firestore.rules'), 'utf8'),
    },
  })
  owner = environment.authenticatedContext('owner').firestore()
  other = environment.authenticatedContext('other').firestore()
  anonymous = environment.unauthenticatedContext().firestore()
})

beforeEach(async () => {
  await environment.clearFirestore()
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    for (const uid of ['owner', 'other']) {
      batch.set(doc(db, `users/${uid}`), profile())
      for (const type of ['expense', 'income', 'investment', 'both']) {
        batch.set(doc(db, `users/${uid}/categories/${type}`), category(type))
      }
      batch.set(doc(db, `users/${uid}/creditCards/card`), card())
      batch.set(doc(db, `users/${uid}/transactions/existing`), transaction())
    }
    batch.set(doc(db, 'users/other/categories/foreign-only'), category())
    batch.set(doc(db, 'users/other/creditCards/foreign-only'), card())
    await batch.commit()
  })
})

afterAll(async () => {
  if (environment) await environment.cleanup()
})

describe('isolamento por usuário', () => {
  test.each([
    'users/owner',
    'users/owner/categories/expense',
    'users/owner/creditCards/card',
    'users/owner/transactions/existing',
  ])('somente o dono lê, atualiza ou exclui %s', async (path) => {
    await assertSucceeds(getDoc(doc(owner, path)))
    for (const db of [other, anonymous]) {
      await assertFails(getDoc(doc(db, path)))
      await assertFails(
        updateDoc(doc(db, path), { updatedAt: serverTimestamp() }),
      )
      await assertFails(deleteDoc(doc(db, path)))
    }
  })

  test.each(['categories', 'creditCards', 'transactions'])(
    'lista %s somente no próprio usuário',
    async (name) => {
      await assertSucceeds(getDocs(collection(owner, `users/owner/${name}`)))
      await assertFails(getDocs(collection(other, `users/owner/${name}`)))
      await assertFails(getDocs(collection(anonymous, `users/owner/${name}`)))
    },
  )

  test.each([
    ['users/owner', profile()],
    ['users/owner/categories/new', category()],
    ['users/owner/creditCards/new', card()],
    ['users/owner/transactions/new', transaction()],
  ])('não permite criar dados de outro usuário: %s', async (path, data) => {
    for (const db of [other, anonymous])
      await assertFails(setDoc(doc(db, path), data))
  })

  test('coleções desconhecidas e consultas globais são negadas', async () => {
    await assertFails(
      setDoc(doc(owner, 'users/owner/unknown/item'), { admin: true }),
    )
    await assertFails(getDocs(collection(owner, 'users')))
  })
})

describe('referências e lançamentos legítimos', () => {
  test.each(['expense', 'income', 'investment'])(
    'permite criar, editar e excluir %s com categoria compatível',
    async (type) => {
      const ref = doc(owner, 'users/owner/transactions/new')
      await assertSucceeds(
        setDoc(ref, {
          ...transaction(type),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )
      await assertSucceeds(
        updateDoc(ref, { amount: 12345, updatedAt: serverTimestamp() }),
      )
      await assertSucceeds(deleteDoc(ref))
    },
  )

  test.each(['expense', 'income', 'investment'])(
    'categoria both aceita %s',
    async (type) => {
      await assertSucceeds(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(type),
          categoryId: 'both',
        }),
      )
    },
  )

  test('aceita despesa com cartão existente, inclusive inativo no histórico', async () => {
    await assertSucceeds(
      setDoc(doc(owner, 'users/owner/transactions/new'), {
        ...transaction(),
        creditCardId: 'card',
      }),
    )
    await assertSucceeds(
      updateDoc(doc(owner, 'users/owner/creditCards/card'), {
        isActive: false,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(doc(owner, 'users/owner/transactions/new'), {
        amount: 20000,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  test('aceita lançamento legado sem creditCardId opcional', async () => {
    const data = transaction()
    delete data.creditCardId
    await assertSucceeds(
      setDoc(doc(owner, 'users/owner/transactions/new'), data),
    )
  })

  test.each(['missing', 'foreign-only', 'income', 'other/categories/expense'])(
    'nega categoria ausente, alheia, incompatível ou caminho: %s',
    async (categoryId) => {
      await assertFails(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(),
          categoryId,
        }),
      )
    },
  )

  test.each(['missing', 'foreign-only', '', 'other/creditCards/card', 42])(
    'nega cartão inválido: %s',
    async (creditCardId) => {
      await assertFails(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(),
          creditCardId,
        }),
      )
    },
  )

  test.each(['income', 'investment'])(
    'nega cartão em lançamento %s',
    async (type) => {
      await assertFails(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(type),
          creditCardId: 'card',
        }),
      )
    },
  )

  test('atualização não pode substituir referências por dados alheios', async () => {
    await assertFails(
      updateDoc(doc(owner, 'users/owner/transactions/existing'), {
        categoryId: 'foreign-only',
      }),
    )
    await assertFails(
      updateDoc(doc(owner, 'users/owner/transactions/existing'), {
        creditCardId: 'foreign-only',
      }),
    )
  })

  test('lote pode criar categoria, cartão e lançamento compatíveis juntos', async () => {
    const batch = writeBatch(owner)
    batch.set(doc(owner, 'users/owner/categories/new'), category())
    batch.set(doc(owner, 'users/owner/creditCards/new'), card())
    batch.set(doc(owner, 'users/owner/transactions/new'), {
      ...transaction(),
      categoryId: 'new',
      creditCardId: 'new',
    })
    await assertSucceeds(batch.commit())
  })

  test('lote que remove categoria e cria lançamento referenciando-a é negado', async () => {
    const batch = writeBatch(owner)
    batch.delete(doc(owner, 'users/owner/categories/expense'))
    batch.set(doc(owner, 'users/owner/transactions/new'), transaction())
    await assertFails(batch.commit())
  })

  test('lote não pode tornar a categoria incompatível com um lançamento que cria', async () => {
    const batch = writeBatch(owner)
    batch.update(doc(owner, 'users/owner/categories/expense'), {
      type: 'income',
    })
    batch.set(doc(owner, 'users/owner/transactions/new'), transaction())
    await assertFails(batch.commit())
  })
})

describe('valores, tags e campos de lançamentos', () => {
  test.each([
    'type',
    'amount',
    'description',
    'categoryId',
    'date',
    'tags',
    'notes',
    'recurring',
    'createdAt',
    'updatedAt',
  ])('nega ausência de campo obrigatório: %s', async (field) => {
    const data = transaction()
    delete data[field]
    await assertFails(setDoc(doc(owner, 'users/owner/transactions/new'), data))
  })

  test.each([0, -1, 1.5, '100', Number.MAX_SAFE_INTEGER + 1])(
    'nega valor fora do domínio de centavos: %s',
    async (amount) => {
      await assertFails(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(),
          amount,
        }),
      )
    },
  )

  test.each([1, Number.MAX_SAFE_INTEGER])(
    'aceita limite válido em centavos: %s',
    async (amount) => {
      await assertSucceeds(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(),
          amount,
        }),
      )
    },
  )

  test('aceita vinte tags com quarenta caracteres cada', async () => {
    await assertSucceeds(
      setDoc(doc(owner, 'users/owner/transactions/new'), {
        ...transaction(),
        tags: Array(20).fill('a'.repeat(40)),
      }),
    )
  })

  test.each(Array.from({ length: 20 }, (_, index) => [index]))(
    'valida o tipo de cada tag, inclusive índice %i',
    async (index) => {
      const tags = Array(20).fill('válida')
      tags[index] = { invalid: true }
      await assertFails(
        setDoc(doc(owner, 'users/owner/transactions/new'), {
          ...transaction(),
          tags,
        }),
      )
    },
  )

  test.each(
    [[''], ['a'.repeat(41)], Array(21).fill('tag'), 'tag', [null], [123]].map(
      (tags) => [tags],
    ),
  )('nega tags inválidas: %j', async (tags) => {
    await assertFails(
      setDoc(doc(owner, 'users/owner/transactions/new'), {
        ...transaction(),
        tags,
      }),
    )
  })

  test.each([
    { admin: true },
    { amount: null },
    { type: 'unknown' },
    { date: '2026-10-19' },
    { description: 'ab' },
    { description: 'a'.repeat(201) },
    { notes: 'a'.repeat(501) },
    { recurring: 'true' },
    { updatedAt: 'today' },
  ])('nega payload indevido: %j', async (patch) => {
    await assertFails(
      setDoc(doc(owner, 'users/owner/transactions/new'), {
        ...transaction(),
        ...patch,
      }),
    )
  })
})

describe('perfis, categorias e cartões', () => {
  test('categoria arquivada preserva edições do histórico e nega novos vínculos', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'users/owner/categories/expense'), { archived: true })
    })
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/transactions/existing'), { description: 'Histórico preservado' }))
    await assertFails(setDoc(doc(owner, 'users/owner/transactions/new'), transaction()))
    await assertFails(deleteDoc(doc(owner, 'users/owner/categories/expense')))
    await assertFails(updateDoc(doc(owner, 'users/owner/categories/expense'), { archived: false }))
  })

  test('cliente não exclui categoria vazia nem forja arquivamento', async () => {
    await assertFails(deleteDoc(doc(owner, 'users/owner/categories/income')))
    await assertFails(updateDoc(doc(owner, 'users/owner/categories/income'), { archived: true }))
  })

  test('fechamento registrado é preservado ao alterar o cadastro do cartão', async () => {
    await assertSucceeds(setDoc(doc(owner, 'users/owner/transactions/snapshot'), { ...transaction(), creditCardId: 'card', cardClosingDay: 15 }))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { closingDay: 20 }))
    await assertFails(updateDoc(doc(owner, 'users/owner/transactions/snapshot'), { cardClosingDay: 20 }))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/transactions/snapshot'), { description: 'Preserva competência' }))
  })
  test('aceita criação de perfil mínimo do próprio usuário', async () => {
    const db = environment.authenticatedContext('new-user').firestore()
    await assertSucceeds(
      setDoc(doc(db, 'users/new-user'), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(doc(db, 'users/new-user'), {
        displayName: 'Nome',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  test.each(['createdAt', 'updatedAt'])(
    'nega perfil sem timestamp obrigatório: %s',
    async (field) => {
      const data = profile()
      delete data[field]
      await assertFails(setDoc(doc(owner, 'users/owner'), data))
    },
  )

  test('subcoleções funcionam sem documento de perfil, como no aplicativo atual', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), 'users/owner'))
    })
    await assertSucceeds(
      setDoc(doc(owner, 'users/owner/transactions/new'), transaction()),
    )
  })

  test.each([
    ['users/owner', profile()],
    ['users/owner/categories/new', category()],
    ['users/owner/creditCards/new', card()],
  ])('permite dados válidos e atualização do dono: %s', async (path, data) => {
    await assertSucceeds(setDoc(doc(owner, path), data))
    await assertSucceeds(
      updateDoc(doc(owner, path), { updatedAt: serverTimestamp() }),
    )
  })

  test.each([
    'users/owner',
    'users/owner/categories/expense',
    'users/owner/creditCards/card',
    'users/owner/transactions/existing',
  ])('createdAt é imutável: %s', async (path) => {
    await assertFails(
      updateDoc(doc(owner, path), { createdAt: new Date('2026-10-20') }),
    )
  })

  test.each([
    { admin: true },
    { role: 'admin' },
    { email: 'forged@example.com' },
    { displayName: 123 },
    { displayName: '' },
    { displayName: 'a'.repeat(51) },
  ])('nega perfil arbitrário: %j', async (patch) => {
    await assertFails(
      setDoc(doc(owner, 'users/owner'), { ...profile(), ...patch }),
    )
  })

  test.each([
    ['categories', { ...category(), type: 'unknown' }],
    ['categories', { ...category(), isDefault: 'true' }],
    ['categories', { ...category(), extra: true }],
    ['creditCards', { ...card(), closingDay: 0 }],
    ['creditCards', { ...card(), closingDay: 32 }],
    ['creditCards', { ...card(), closingDay: 1.5 }],
    ['creditCards', { ...card(), brand: 'unknown' }],
    ['creditCards', { ...card(), isActive: 'true' }],
    ['creditCards', { ...card(), extra: true }],
  ])('nega payload indevido em %s: %j', async (name, data) => {
    await assertFails(setDoc(doc(owner, `users/owner/${name}/new`), data))
  })
})
