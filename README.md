# GestOne

GestOne é uma aplicação de controle financeiro pessoal com lançamentos, categorias, cartões de crédito e relatórios de fluxo de caixa.

## Requisitos

- Node.js 24.x (CI validado com 24.15.0 e npm 12.0.2)
- Um projeto Firebase com **Authentication (e-mail/senha)** e **Firestore** habilitados

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha as variáveis `NEXT_PUBLIC_FIREBASE_*` do seu projeto Firebase.
2. Para as rotas seguras de sessão e exclusão de conta, informe `FIREBASE_SERVICE_ACCOUNT_KEY` com o JSON da conta de serviço em uma única linha ou use Application Default Credentials (ADC). Para ADC local, defina `GOOGLE_APPLICATION_CREDENTIALS` com o caminho de um arquivo de credenciais fora do repositório e `FIREBASE_PROJECT_ID` com o ID do projeto. No ambiente hospedado, use a identidade de serviço do runtime com as permissões necessárias para Authentication e Firestore. Credenciais usadas pelo GitHub Actions para publicar não são automaticamente credenciais do runtime. Variáveis de credenciais nunca devem usar o prefixo `NEXT_PUBLIC_`; `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` não são consumidas pelo código.
3. Instale as dependências e inicie o projeto:

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`.

## Segurança e deploy do Firestore

As regras e índices do Firestore são versionados em `firestore.rules` e `firestore.indexes.json`. Publique-os antes de liberar o aplicativo:

```bash
npm exec --no -- firebase deploy --only firestore --project SEU_PROJECT_ID
```

O workflow de deploy na `main` também executa lint, checagem de tipos, testes, build e a publicação dessas regras. Configure as variáveis públicas do Firebase como **GitHub Variables** e mantenha a conta de serviço somente em `FIREBASE_SERVICE_ACCOUNT_NEW_GESTONE`.

Opcionalmente, configure o Firebase App Check e preencha `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` para reforçar a proteção contra clientes não confiáveis.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:rules
npm run test:e2e
```

Os testes de regras requerem Java 21 ou superior e iniciam somente o emulador Firestore em `127.0.0.1:8080`, com o projeto fictício `demo-gestone-rules`. Não exigem login Firebase nem credenciais. A configuração de teste é separada da hospedagem e a suíte falha se o emulador não estiver configurado. As regras também são verificadas no CI e antes dos deploys. Consulte [a política e os limites dos dados](docs/firestore-security.md).

Para os E2E, instale o navegador com `npx playwright install chromium`. `npm run test:e2e` inicia Authentication em 9099, Firestore em 8081 e o aplicativo em 3102, usando somente `demo-gestone-e2e`. O script substitui a configuração Firebase por valores fictícios e não usa credenciais de produção. Os relatórios ficam em `playwright-report/`; falhas retêm screenshots e traces. O CI instala Java/Chromium e publica as evidências por sete dias.

## Manutenção e rollback

O Dependabot verifica npm e GitHub Actions semanalmente. Atualizações minor/patch são agrupadas; Next/React/configuração ESLint/tipos React ficam juntos. Majors abrem PRs separados para revisão de migração, sem merge automático. Cada PR deve passar os jobs de qualidade e E2E, incluindo regras nos emuladores. Alertas e exceções de segurança estão em [docs/dependencies/2026-10-19/README.md](docs/dependencies/2026-10-19/README.md).

CI e deploy compartilham `.github/actions/verify`. Actions são fixados por SHA e Firebase CLI por versão; o deploy de regras usa a instalação do lockfile e o Hosting lê a versão instalada para preencher `firebaseToolsVersion`, evitando divergência entre as ferramentas. Ao atualizar `firebase-tools`, valide regras, E2E e preview.

Antes de promover uma atualização, teste no preview login por senha/Google, renovação da sessão no servidor e uma operação autenticada no Firestore com ADC do runtime. Esse teste exige ambiente e conta de teste; emuladores não comprovam a configuração IAM do ambiente hospedado.

O comando `npm run test:preview` verifica login por senha, cookie seguro, sessão autenticada e acesso cliente/servidor ao Firestore em um canal de preview. Configure as variáveis somente no ambiente do processo, usando uma conta de teste. Instruções, limites e evidências necessárias estão em [docs/deploy-verification.md](docs/deploy-verification.md). Os testes locais do verificador (`npm run test:preview-check`) rodam no CI sem credenciais.

Para rollback de dependências, reverta o commit de atualização (manifesto e lockfile juntos), execute `npm ci` e os checks e publique pelo workflow normal. Para uma falha na versão publicada, restaure a versão anterior no histórico do Firebase Hosting e confira também o backend SSR, que pode ter ciclo de publicação próprio. Preview não publica regras/índices globais: o workflow da `main` os publica antes do Hosting. Reverter Hosting não reverte Firestore; publique explicitamente as regras anteriores após revisar a compatibilidade e o impacto. Antes de excluir índices, confira as consultas em uso. Não remova índices ou altere regras de produção automaticamente para desfazer uma atualização de pacotes.
