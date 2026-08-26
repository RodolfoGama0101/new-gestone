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
```
