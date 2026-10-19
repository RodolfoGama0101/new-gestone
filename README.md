# GestOne

GestOne é uma aplicação de controle financeiro pessoal com lançamentos, categorias, cartões de crédito e relatórios de fluxo de caixa.

## Requisitos

- Node.js 24 ou superior
- Um projeto Firebase com **Authentication (e-mail/senha)** e **Firestore** habilitados

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha as variáveis `NEXT_PUBLIC_FIREBASE_*` do seu projeto Firebase.
2. Para as rotas seguras de sessão e exclusão de conta, informe `FIREBASE_SERVICE_ACCOUNT_KEY` com o JSON da conta de serviço em uma única linha. Essa variável nunca deve ser exposta com o prefixo `NEXT_PUBLIC_`.
3. Instale as dependências e inicie o projeto:

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`.

## Segurança e deploy do Firestore

As regras e índices do Firestore são versionados em `firestore.rules` e `firestore.indexes.json`. Publique-os antes de liberar o aplicativo:

```bash
npx firebase-tools deploy --only firestore --project SEU_PROJECT_ID
```

O workflow de deploy na `main` também executa lint, checagem de tipos, testes, build e a publicação dessas regras. Configure as variáveis públicas do Firebase como **GitHub Variables** e mantenha a conta de serviço somente em `FIREBASE_SERVICE_ACCOUNT_NEW_GESTONE`.

Opcionalmente, configure o Firebase App Check e preencha `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` para reforçar a proteção contra clientes não confiáveis.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:rules
npm run test:e2e
```

Os testes de regras requerem Java 21 ou superior e iniciam somente o emulador Firestore em `127.0.0.1:8080`, com o projeto fictício `demo-gestone-rules`. Não exigem login Firebase nem credenciais. A configuração de teste é separada da hospedagem e a suíte falha se o emulador não estiver configurado. As regras também são verificadas no CI e antes dos deploys. Consulte [a política e os limites dos dados](docs/firestore-security.md).

Para os E2E, instale o navegador com `npx playwright install chromium`. `npm run test:e2e` inicia Authentication em 9099, Firestore em 8081 e o aplicativo em 3102, usando somente `demo-gestone-e2e`. O script substitui a configuração Firebase por valores fictícios e não usa credenciais de produção. Os relatórios ficam em `playwright-report/`; falhas retêm screenshots e traces. O CI instala Java/Chromium e publica as evidências por sete dias.
