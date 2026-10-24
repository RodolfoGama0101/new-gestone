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
  test.each(['mcpSecrets', 'mcpConnections', 'mcpOperations', 'mcpUsage', 'mcpDrafts'])(
    'coleção interna %s é inacessível inclusive ao dono', async (name) => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/owner/${name}/secret`), { private: true })
      })
      for (const db of [owner, other, anonymous]) {
        await assertFails(getDoc(doc(db, `users/owner/${name}/secret`)))
        await assertFails(getDocs(collection(db, `users/owner/${name}`)))
        await assertFails(setDoc(doc(db, `users/owner/${name}/new`), { private: true }))
        await assertFails(deleteDoc(doc(db, `users/owner/${name}/secret`)))
      }
    },
  )
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
  test('cartão arquivado conserva histórico, fechamento e permite repetir arquivamento', async () => {
    const ref = doc(owner, 'users/owner/creditCards/card')
    const purchase = doc(owner, 'users/owner/transactions/card-history')
    await assertSucceeds(setDoc(purchase, { ...transaction(), creditCardId: 'card', cardClosingDay: 15 }))
    await assertSucceeds(updateDoc(ref, { archived: true, isActive: false, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(ref, { archived: true, isActive: false, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(purchase, { description: 'Histórico preservado', amount: 12345 }))
    expect((await getDoc(purchase)).data().cardClosingDay).toBe(15)
    expect((await getDoc(ref)).data().closingDay).toBe(15)
    await assertFails(updateDoc(purchase, { cardClosingDay: 20 }))
    await assertFails(updateDoc(ref, { archived: false }))
    await assertFails(updateDoc(ref, { isActive: true }))
    await assertFails(updateDoc(ref, { closingDay: 20 }))
    await assertFails(setDoc(ref, card()))
    await assertFails(deleteDoc(ref))
  })

  test('cartão arquivado nega novas compras e troca de vínculo, mas permite desvincular histórico', async () => {
    const purchase = doc(owner, 'users/owner/transactions/card-history')
    await assertSucceeds(setDoc(purchase, { ...transaction(), creditCardId: 'card', cardClosingDay: 15 }))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { archived: true, isActive: false }))
    await assertFails(setDoc(doc(owner, 'users/owner/transactions/new'), { ...transaction(), creditCardId: 'card' }))
    await assertFails(updateDoc(doc(owner, 'users/owner/transactions/existing'), { creditCardId: 'card' }))
    await assertSucceeds(updateDoc(purchase, { creditCardId: null, cardClosingDay: null }))
    await assertFails(updateDoc(purchase, { creditCardId: 'card', cardClosingDay: 15 }))
  })

  test('cartão vazio também é arquivado e não pode ser excluído diretamente', async () => {
    const ref = doc(owner, 'users/owner/creditCards/card')
    await assertFails(deleteDoc(ref))
    await assertFails(updateDoc(ref, { archived: true }))
    await assertSucceeds(updateDoc(ref, { archived: true, isActive: false }))
    expect((await getDoc(ref)).data().archived).toBe(true)
    await assertFails(setDoc(doc(owner, 'users/owner/creditCards/new'), { ...card(), archived: true, isActive: false }))
  })

  test('lote não pode arquivar cartão e adicionar novo vínculo ao mesmo tempo', async () => {
    const batch = writeBatch(owner)
    batch.update(doc(owner, 'users/owner/creditCards/card'), { archived: true, isActive: false })
    batch.set(doc(owner, 'users/owner/transactions/new'), { ...transaction(), creditCardId: 'card' })
    await assertFails(batch.commit())
  })

  test('arquivamento concorrente à criação nunca remove a referência', async () => {
    // Instâncias distintas evitam que a fila de gravações do SDK serialize a corrida.
    const archiver = environment.authenticatedContext('owner').firestore()
    for (let index = 0; index < 5; index++) {
      const id = `race-${index}`
      const ref = doc(owner, `users/owner/creditCards/${id}`)
      const purchase = doc(owner, `users/owner/transactions/${id}`)
      await assertSucceeds(setDoc(ref, card()))
      const [archival, creation] = await Promise.allSettled([
        updateDoc(doc(archiver, `users/owner/creditCards/${id}`), { archived: true, isActive: false }),
        setDoc(purchase, { ...transaction(), creditCardId: id, cardClosingDay: 15 }),
      ])
      expect(archival.status).toBe('fulfilled')
      const preserved = await getDoc(ref)
      expect(preserved.exists()).toBe(true)
      expect(preserved.data().archived).toBe(true)
      if (creation.status === 'fulfilled') {
        expect((await getDoc(purchase)).data().creditCardId).toBe(id)
        expect((await getDoc(purchase)).data().cardClosingDay).toBe(15)
      } else {
        expect(creation.reason.code).toBe('permission-denied')
        expect((await getDoc(purchase)).exists()).toBe(false)
      }
    }
  })

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


describe('preferências de exibição por usuário', () => {
  test('dono grava e lê tema, outras contas e anônimos não acessam', async () => {
    const ref = doc(owner, 'users/owner/preferences/display')
    await assertSucceeds(setDoc(ref, { theme: 'dark', updatedAt: serverTimestamp() }))
    expect((await getDoc(ref)).data().theme).toBe('dark')
    for (const db of [other, anonymous]) {
      await assertFails(getDoc(doc(db, 'users/owner/preferences/display')))
      await assertFails(setDoc(doc(db, 'users/owner/preferences/display'), { theme: 'light', updatedAt: serverTimestamp() }))
    }
    await assertSucceeds(updateDoc(ref, { theme: 'system', updatedAt: serverTimestamp() }))
  })
  test.each([
    { theme: 'USD', updatedAt: timestamp },
    { theme: 'dark' },
    { theme: 'dark', updatedAt: timestamp, currency: 'USD' },
    { theme: 'dark', updatedAt: timestamp, admin: true },
  ])('nega preferência fora do contrato: %j', async (data) => {
    await assertFails(setDoc(doc(owner, 'users/owner/preferences/display'), data))
  })
  test('não permite outra configuração nem exclusão do documento', async () => {
    await assertFails(setDoc(doc(owner, 'users/owner/preferences/other'), { theme: 'dark', updatedAt: timestamp }))
    await assertSucceeds(setDoc(doc(owner, 'users/owner/preferences/display'), { theme: 'light', updatedAt: timestamp }))
    await assertFails(deleteDoc(doc(owner, 'users/owner/preferences/display')))
  })
})


describe('cartões inativos e novos vínculos', () => {
  test('inativar bloqueia criação e novo vínculo, mas preserva edição de compra antiga', async () => {
    const ref = doc(owner, 'users/owner/creditCards/card')
    const purchase = doc(owner, 'users/owner/transactions/card-history')
    await assertSucceeds(setDoc(purchase, { ...transaction(), creditCardId: 'card', cardClosingDay: 15 }))
    await assertSucceeds(updateDoc(ref, { isActive: false }))
    await assertFails(setDoc(doc(owner, 'users/owner/transactions/new'), { ...transaction(), creditCardId: 'card' }))
    await assertFails(updateDoc(doc(owner, 'users/owner/transactions/existing'), { creditCardId: 'card' }))
    await assertSucceeds(updateDoc(purchase, { description: 'Compra histórica editada', amount: 23456 }))
    expect((await getDoc(purchase)).data().creditCardId).toBe('card')
    expect((await getDoc(purchase)).data().cardClosingDay).toBe(15)
  })
  test('trocar para ativo, desvincular e reativar são permitidos', async () => {
    const purchase = doc(owner, 'users/owner/transactions/card-history')
    await assertSucceeds(setDoc(purchase, { ...transaction(), creditCardId: 'card', cardClosingDay: 15 }))
    await assertSucceeds(setDoc(doc(owner, 'users/owner/creditCards/active'), card()))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { isActive: false }))
    await assertSucceeds(updateDoc(purchase, { creditCardId: 'active', cardClosingDay: 15 }))
    await assertFails(updateDoc(purchase, { creditCardId: 'card' }))
    await assertSucceeds(updateDoc(purchase, { creditCardId: null, cardClosingDay: null }))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { isActive: true }))
    await assertSucceeds(setDoc(doc(owner, 'users/owner/transactions/new'), { ...transaction(), creditCardId: 'card' }))
  })
  test('getAfter impede inativar e criar compra no mesmo lote', async () => {
    const batch = writeBatch(owner)
    batch.update(doc(owner, 'users/owner/creditCards/card'), { isActive: false })
    batch.set(doc(owner, 'users/owner/transactions/new'), { ...transaction(), creditCardId: 'card' })
    await assertFails(batch.commit())
  })
  test('mudar tipo não preserva direito ao vínculo inativo', async () => {
    await assertSucceeds(setDoc(doc(owner, 'users/owner/transactions/income'), transaction('income')))
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { isActive: false }))
    await assertFails(updateDoc(doc(owner, 'users/owner/transactions/income'), { type: 'expense', categoryId: 'expense', creditCardId: 'card' }))
  })
})

describe('orçamentos e metas mensais', () => {
  const goal = () => ({ amount: 10000, updatedAt: timestamp })
  const limit = () => ({ ...goal(), name: 'Alimentação' })
  it('permite CRUD do dono e nega outros usuários e anônimo', async () => {
    const path = 'users/owner/budgets/2026-10'
    await assertSucceeds(setDoc(doc(owner, path), goal()))
    await assertSucceeds(getDoc(doc(owner, path)))
    await assertFails(getDoc(doc(other, path)))
    await assertFails(setDoc(doc(other, path), goal()))
    await assertFails(getDoc(doc(anonymous, path)))
    await assertSucceeds(setDoc(doc(owner, path + '/limits/expense'), limit()))
    await assertFails(setDoc(doc(other, path + '/limits/expense'), limit()))
    await assertSucceeds(deleteDoc(doc(owner, path + '/limits/expense')))
    await assertSucceeds(deleteDoc(doc(owner, path)))
  })
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('nega valor inválido %s', async amount => {
    await assertFails(setDoc(doc(owner, 'users/owner/budgets/2026-10'), { ...goal(), amount }))
  })
  it('nega mês, campos e categorias inválidas ou de outro usuário', async () => {
    await assertFails(setDoc(doc(owner, 'users/owner/budgets/2026-13'), goal()))
    await assertFails(setDoc(doc(owner, 'users/owner/budgets/2026-10'), { ...goal(), admin: true }))
    for (const categoryId of ['income', 'investment', 'missing']) {
      await assertFails(setDoc(doc(owner, `users/owner/budgets/2026-10/limits/${categoryId}`), limit()))
    }
    await environment.withSecurityRulesDisabled(async context => {
      await updateDoc(doc(context.firestore(), 'users/owner/categories/expense'), { archived: true })
    })
    await assertFails(setDoc(doc(owner, 'users/owner/budgets/2026-10/limits/expense'), limit()))
  })
})

describe('IDs determinísticos da importação CSV', () => {
  it('preserva isolamento por UID inclusive para leitura transacional e criação', async () => {
    const path = 'users/owner/transactions/csv-fingerprint-0'
    await assertSucceeds(setDoc(doc(owner, path), transaction()))
    await assertFails(getDoc(doc(other, path)))
    await assertFails(setDoc(doc(other, path), transaction()))
    await assertFails(setDoc(doc(anonymous, path), transaction()))
  })
})

describe('séries e quitação de faturas', () => {
  const series = () => ({ ...transaction(), kind: 'recurring', count: 1200, nextIndex: 0, timezoneOffset: 180, endDate: null, cancelledFrom: null })
  it('isola séries por UID, preserva âncora e cursor e permite cancelar sem apagar histórico', async () => {
    const path = 'users/owner/transactionSeries/monthly'
    await assertSucceeds(setDoc(doc(owner, path), series()))
    await assertFails(getDoc(doc(other, path)))
    await assertFails(setDoc(doc(other, path), series()))
    await assertFails(getDoc(doc(anonymous, path)))
    await assertFails(updateDoc(doc(owner, path), { nextIndex: 2 }))
    await assertFails(updateDoc(doc(owner, path), { date: new Date() }))
    await assertSucceeds(updateDoc(doc(owner, path), { nextIndex: 1, updatedAt: timestamp }))
    await assertFails(updateDoc(doc(owner, path), { nextIndex: 0 }))
    await assertSucceeds(updateDoc(doc(owner, path), { cancelledFrom: timestamp }))
    await assertFails(updateDoc(doc(owner, path), { cancelledFrom: null }))
    await assertFails(deleteDoc(doc(owner, path)))
  })
  it('valida parcela, limites e referências', async () => {
    const path = 'users/owner/transactionSeries/installments'
    await assertFails(setDoc(doc(owner, path), { ...series(), kind: 'installment', count: 3 }))
    await assertSucceeds(setDoc(doc(owner, path), { ...series(), kind: 'installment', count: 3, creditCardId: 'card' }))
    await assertFails(updateDoc(doc(owner, path), { amount: 1 }))
    await assertFails(setDoc(doc(owner, 'users/owner/transactionSeries/bad'), { ...series(), timezoneOffset: 9999 }))
  })
  it('permite quitação imutável e estorno do dono, sem criação de despesa adicional', async () => {
    const path = 'users/owner/creditCards/card/payments/2026-10'
    const payment = { amount: 12345, paidAt: timestamp }
    await assertSucceeds(setDoc(doc(owner, path), payment))
    await assertFails(setDoc(doc(other, path), payment))
    await assertFails(getDoc(doc(other, path)))
    await assertFails(getDoc(doc(anonymous, path)))
    await assertFails(updateDoc(doc(owner, path), { amount: 1 }))
    await assertFails(setDoc(doc(owner, 'users/owner/creditCards/card/payments/2026-13'), payment))
    await assertFails(setDoc(doc(owner, 'users/owner/creditCards/missing/payments/2026-10'), payment))
    await assertFails(setDoc(doc(owner, 'users/owner/creditCards/card/payments/2026-11'), { ...payment, amount: 1.5 }))
    await assertSucceeds(deleteDoc(doc(owner, path)))
  })
  it('aceita cartões antigos sem vencimento e valida novo campo', async () => {
    await assertSucceeds(updateDoc(doc(owner, 'users/owner/creditCards/card'), { dueDay: 31 }))
    await assertFails(updateDoc(doc(owner, 'users/owner/creditCards/card'), { dueDay: 32 }))
  })
})

describe('metadados das ocorrências', () => {
  it('exige série do próprio usuário e preserva vínculo, posição e competência', async () => {
    const path = 'users/owner/transactions/installment-row'
    const row = { ...transaction(), creditCardId: 'card', cardClosingDay: 15, seriesId: 'plan', occurrenceIndex: 0, installmentTotal: 3, installmentMonth: '2026-10' }
    await assertFails(setDoc(doc(owner, path), row))
    await environment.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/owner/transactionSeries/plan'), { ...transaction(), kind: 'installment', creditCardId: 'card', count: 3, nextIndex: 1, endDate: null, cancelledFrom: null, timezoneOffset: 180 })
    })
    await assertSucceeds(setDoc(doc(owner, path), row))
    await assertFails(updateDoc(doc(owner, path), { occurrenceIndex: 1 }))
    await assertFails(updateDoc(doc(owner, path), { installmentMonth: '2026-11' }))
    await assertFails(updateDoc(doc(owner, path), { seriesId: 'foreign-only' }))
    await assertSucceeds(updateDoc(doc(owner, path), { description: 'Descrição editada' }))
  })
})

test('cancelamento continua disponível se a categoria da série mudou de tipo', async () => {
  const ref = doc(owner, 'users/owner/transactionSeries/blocked')
  await setDoc(ref, { ...transaction(), kind: 'recurring', count: 1200, nextIndex: 0, timezoneOffset: 180, endDate: null, cancelledFrom: null })
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'users/owner/categories/expense'), { type: 'income' })
  })
  await assertSucceeds(updateDoc(ref, { cancelledFrom: timestamp, updatedAt: timestamp }))
})
