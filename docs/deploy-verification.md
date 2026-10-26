# Deploy Vercel e publicação manual do Firestore

O app Next.js é hospedado na Vercel. Firebase Authentication e Firestore continuam como autenticação e dados. Os workflows de Hosting eram legados e foram removidos; `firebase.json` descreve somente Firestore.

## Responsabilidades

- Vercel Git: única automação de build e deploy do aplicativo, com previews de branches e produção a partir de main. A configuração vercel.json permanece inalterada.
- Verificações: execução local dos comandos do README, sem workflows de GitHub Actions.
- Firestore: publicação manual de regras e índices por pessoa autorizada, após testar as regras. Consulte os comandos no README.
- Dependabot: atualizações semanais de dependências npm, sem auto-merge.

Mudanças incompatíveis exigem liberação coordenada das regras e do app. O rollback Vercel não reverte regras/índices.

## Configuração Vercel

Conecte o repositório, mantenha o preset Next.js e a branch de produção `main`. Configure as variáveis `NEXT_PUBLIC_FIREBASE_*` nos ambientes Preview/Production. Para o servidor, o código aceita `FIREBASE_SERVICE_ACCOUNT_KEY` com JSON de uma conta de runtime com permissões mínimas de Auth/Firestore; nunca use prefixo público. ADC do Google não aparece automaticamente na Vercel: exige federação/identidade explicitamente configurada. A credencial local de publicação de regras não configura o servidor Vercel.

Autorize no Firebase Authentication os domínios usados pelo login Google; a verificação por senha/API não substitui o teste visual desse provedor. Se houver checks obrigatórios nas regras de proteção da branch, remova os requisitos dos jobs de CI excluídos e mantenha o check da Vercel. Essa configuração é externa ao repositório.

## Preview autenticado

Use uma conta de teste e a URL de **branch** informada pelo bot Vercel no PR (`https://PROJETO-git-BRANCH-ESCOPO.vercel.app`). Configure somente no ambiente do processo:

- `PREVIEW_ORIGIN`: origem HTTPS do preview.
- `PREVIEW_ALLOWED_HOST`: hostname exato dessa origem, copiado do deployment do PR, confirmando o destino.
- `PREVIEW_PROJECT_ID` e `PREVIEW_API_KEY`: projeto e chave pública Firebase da conta de teste.
- `PREVIEW_TEST_EMAIL` e `PREVIEW_TEST_PASSWORD`: conta de teste, sem dados reais.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: se houver Deployment Protection, segredo de automação autorizado para o projeto, sem prefixo público.

Execute `npm run test:preview`. O script rejeita hosts não confirmados, aliases de produção comuns, domínios fora da Vercel, URLs com credenciais/caminhos e redirecionamentos. Confirme também na Vercel que o deployment é Preview: a URL sozinha não comprova o ambiente. O script não carrega `.env.local`, não cria contas e não salva tokens/cookies. O segredo de automação é enviado em header exclusivamente à origem Vercel confirmada, nunca ao Google/Firebase.

A verificação cobre login por senha, cookie HttpOnly/Secure/SameSite=Lax sem cache, leitura do perfil com ID token, recusa de acesso anônimo, sessão e Firestore Admin, renovação e limpeza do cookie. O teste Admin usa a rota de categoria com um ID de sondagem novo e aleatório, esperando 404 após ler um documento inexistente; não cria nem remove documentos. Perfil inexistente também pode responder 404, pois o app não exige `/users/{uid}`; 403 não é sucesso. Falhas de IAM, configuração e transporte são falhas do teste. A limpeza do cookie é tentada inclusive após falhas.

`npm run test:preview-check` verifica essas garantias com respostas simuladas, sem rede/credenciais. Isso não é uma validação autenticada do ambiente hospedado.

## Evidências e limites

### Login Google no desktop

O Firebase autentica no popup e o cliente aguarda o `POST /api/auth/session`
antes de sair de `/login`. O `AuthProvider` faz uma única navegação de documento
com `window.location.replace('/')`, enviando o cookie HttpOnly recém-criado ao
layout protegido. Os botões de login não iniciam outra navegação nem um
`router.refresh()` concorrente. As demais navegações internas continuam usando
o roteador do Next.js. O `Toaster` global exibe o resultado e as falhas de sessão.

`tests/e2e/google-login.test.ts` cobre o popup Google no emulador, a entrada no
painel após uma visita anônima, a persistência após recarregar e a mensagem de
erro quando a sessão responde 503. Ele faz parte de `npm run test:e2e` e de
`npm run test:e2e -- --production`. A execução com emuladores não substitui o
teste visual com uma conta de teste no domínio autorizado do preview Vercel.

Validação local em 26/10/2026: `npm run typecheck` e os 228 testes de
`npm test -- --runInBand --roots ./tests` passaram. O lint passou com
`npm run lint -- --ignore-pattern '.worktrees/**' --ignore-pattern 'dogfood-output/**'`,
excluindo cópias de outras worktrees e artefatos locais de revisão. O build
executado por `npm run test:e2e -- --production` compilou e os quatro testes
passaram: login Google com navegação de documento e persistência da sessão,
mensagem de erro após resposta 503, logout offline/troca de conta e limpeza de
cache/fallback. O seletor do menu da conta usa seu nome acessível atual.

As falhas iniciais estavam no ambiente local: o iframe não inicializava com a
aplicação em `localhost` e o Auth Emulator em `127.0.0.1`. A conexão **cliente**
do emulador agora usa `localhost:9099`, o mesmo hostname da aplicação E2E;
o Admin SDK continua usando `127.0.0.1:9099` pelo ambiente isolado. O teste
aguarda a inicialização do formulário do emulador e do canal do iframe antes
de confirmar a conta. Não há simulação do login bem-sucedido nem alteração da
validação de origem da API para fazer os testes passarem.

O preview da branch ainda precisa de `FIREBASE_SERVICE_ACCOUNT_KEY` e de uma
conta de teste configuradas para a verificação hospedada. Não houve validação
autenticada nem alteração de produção nesta etapa.

Em 21/10/2026, o PR #1 publicou até `da91f69`. O [CI remoto](https://github.com/RodolfoGama0101/new-gestone/actions/runs/39697338400) passou: qualidade/build, 122 testes do aplicativo, 122 de regras e oito E2E. A árvore local tinha 125 testes porque incluía três testes de sessão ainda não commitados e preservados fora do PR. O bot Vercel informou [deployment Ready](https://vercel.com/rodolfo-gamas-projects/new-gestone/HLvTwNjcaMDGpYG1LABoUxD1oYbr). O job legado de Firebase Hosting falhou por variáveis públicas vazias; não é o deploy vigente do app.

Uma requisição anônima ao preview redirecionou ao SSO Vercel. Sem acesso de automação, não foi possível verificar Firebase Admin/sessão no runtime. Nenhuma conta de teste foi criada e nenhuma proteção foi desabilitada. Não houve promoção à `main` ou publicação de regras. A comprovação de PR real do Dependabot depende da configuração na branch padrão.

Referências: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [gerenciadores de pacotes](https://vercel.com/docs/package-managers), [previews Git](https://vercel.com/docs/git), [proteção para automação](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection).
