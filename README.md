# GestOne

GestOne é uma aplicação de controle financeiro pessoal com lançamentos, categorias, cartões de crédito e relatórios de fluxo de caixa.

## Requisitos

- Node.js 24.x e npm 12.0.2
- Um projeto Firebase com **Authentication (e-mail/senha)** e **Firestore** habilitados

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha as variáveis `NEXT_PUBLIC_FIREBASE_*` do seu projeto Firebase.
2. Para as rotas seguras de sessão e exclusão de conta, informe `FIREBASE_SERVICE_ACCOUNT_KEY` com o JSON da conta de serviço em uma única linha ou use Application Default Credentials (ADC). Para ADC local, defina `GOOGLE_APPLICATION_CREDENTIALS` com o caminho de um arquivo de credenciais fora do repositório e `FIREBASE_PROJECT_ID` com o ID do projeto. No ambiente hospedado, use a identidade de serviço do runtime com as permissões necessárias para Authentication e Firestore. Variáveis de credenciais nunca devem usar o prefixo `NEXT_PUBLIC_`; `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` não são consumidas pelo código.
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

A publicação de regras e índices é manual: execute `npm run test:rules` antes do comando acima em um ambiente autorizado. A Vercel não publica regras nem índices. O aplicativo é publicado somente pela integração Git da Vercel; não há workflows de GitHub Actions no projeto.

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

Os testes E2E usam o cache Next em `.next/e2e`, separado do servidor de desenvolvimento local. Execute build e E2E em sequência, pois o build pode limpar a árvore `.next`. Os testes Jest carregam somente `tests/unit/` ou `tests/rules/`, sem incluir cópias de outras worktrees.

Os testes de regras requerem Java 21 ou superior e iniciam somente o emulador Firestore em `127.0.0.1:8080`, com o projeto fictício `demo-gestone-rules`. Não exigem login Firebase nem credenciais. A configuração de teste é separada da hospedagem e a suíte falha se o emulador não estiver configurado. Execute as verificações de regras localmente antes de publicá-las. Consulte [a política e os limites dos dados](docs/firestore-security.md).

Para os E2E, instale o navegador com `npx playwright install chromium`. `npm run test:e2e` inicia Authentication em 9099, Firestore em 8081 e o aplicativo em 3102, usando somente `demo-gestone-e2e`. O script substitui a configuração Firebase por valores fictícios e não usa credenciais de produção. Os relatórios ficam em `playwright-report/`; falhas retêm screenshots e traces. Instale Java e Chromium no ambiente local para executar os E2E.

## Manutenção e rollback

O Dependabot verifica dependências npm semanalmente. Atualizações minor/patch são agrupadas; Next/React/configuração ESLint/tipos React ficam juntos. O SDK `firebase` e `@firebase/rules-unit-testing` formam o grupo `firebase-sdk`, incluindo majors, para preservar a compatibilidade exigida entre ambos. As demais majors abrem PRs separados para revisão de migração, sem merge automático. TypeScript 7 ou superior fica temporariamente ignorado porque o `typescript-eslint` instalado não oferece suporte; retire a exceção em `.github/dependabot.yml` ao preparar e validar essa migração com lint, tipos, testes e build. Execute localmente as verificações pertinentes antes de promover mudanças, incluindo regras e E2E quando afetados. Alertas e exceções de segurança estão em [docs/dependencies/2026-10-19/README.md](docs/dependencies/2026-10-19/README.md).

As verificações são manuais, pelos comandos acima. O GitHub não executa pipelines de CI/CD deste repositório; a integração Git da Vercel mantém os builds e deploys do aplicativo.

Na Vercel, conecte o repositório e configure `main` como branch de produção. Os demais branches geram previews. `vercel.json` fixa a instalação com npm 12.0.2 + `npm ci` e o build `npm run build` (webpack para o PWA); `engines` exige Node 24.x. As variáveis públicas `NEXT_PUBLIC_FIREBASE_*` ficam nos ambientes Preview/Production da Vercel. Para o Admin SDK, configure uma conta de serviço própria de runtime em `FIREBASE_SERVICE_ACCOUNT_KEY`, somente no servidor, com permissões mínimas para Auth/Firestore. Vercel não fornece ADC do Google automaticamente; ADC exige configuração explícita de identidade/federação. A credencial local para publicar regras não configura o runtime Vercel.

Antes de promover uma atualização, valide login por senha/Google, renovação da sessão e acesso autenticado ao Firestore em um preview Vercel, com uma conta de teste. `npm run test:preview` verifica os fluxos por senha e API; `npm run test:preview-check` testa o verificador localmente sem credenciais. Instruções, proteção de previews e limites estão em [docs/deploy-verification.md](docs/deploy-verification.md).

Para rollback de dependências, reverta o commit de atualização (manifesto e lockfile juntos), execute `npm ci` e os checks e gere um novo deployment. Para falha publicada, use o rollback/promote do deployment anterior na Vercel. Isso não reverte Firestore: publique regras anteriores somente após revisar compatibilidade e impacto. Deploys Vercel e publicações manuais do Firestore são independentes; mudanças de regras incompatíveis exigem liberação coordenada antes da promoção do app. Previews Vercel não publicam regras globais. Antes de excluir índices, confira as consultas em uso; não remova índices automaticamente como rollback.

## Documentação de funcionalidades

Consulte o [índice de documentação](docs/README.md) para os contratos e decisões das funcionalidades.
