# Auditoria de autenticação e plano de correção

Data: 27/10/2026. Base: `origin/main`, commit `d6a346e44e06cd3827879319b0cbca8fc37c4129`.
Branch: `codex/auditoria-autenticacao-google`.
Ambiente informado: https://new-gestone.vercel.app/login.

## Conclusão

Há dois problemas distintos a investigar: abrir/concluir o OAuth Google e transformar a identidade Firebase em uma sessão aceita pelo servidor. A mensagem de popup bloqueado trata o sintoma, mas não oferece uma alternativa funcional no desktop. Voltar ao redirecionamento indiscriminadamente também não resolve: a configuração publicada usa um domínio de autenticação diferente do aplicativo.

A auditoria encontrou problemas concretos de coordenação de estado, tratamento de indisponibilidade e cadastro. A causa exata do bloqueio no navegador do usuário ainda não foi reproduzida: navegador, versão, modo instalado e extensões não foram informados. Não se deve atribuí-la automaticamente a cookies, credenciais Admin, React ou falta de domínio autorizado.

Esta entrega altera somente documentação. As correções abaixo ainda precisam ser implementadas e validadas.

## Escopo e evidências

Revisados: configuração Firebase cliente/Admin; login Google e senha; cadastro; recuperação de senha; AuthProvider; cookie, renovação e logout; proteção do painel e APIs; reautenticação/exclusão da conta; isolamento Firestore/cache; interação com PWA e entrada no consentimento MCP; testes e documentação operacional. O protocolo MCP completo e todas as regras financeiras não constituem uma nova auditoria independente nesta entrega.

Evidências obtidas em leitura:

- Árvore Git inicialmente limpa. A main remota foi atualizada antes de criar a branch; a main local estava atrasada e não foi usada como base.
- O conector Firebase identifica o projeto `new-gestone`. `firebase.json` versiona Firestore, não a configuração do provedor Google.
- O conector Vercel identifica `new-gestone`, Node 24 e deployment de produção `dpl_DxKcNp8rULFd2jApjghKfTMtNNEn` em estado `READY`. Isso não comprova autenticação funcional nem igualdade entre deployment e HEAD auditado.
- GET de `/login` via conector Vercel: 200. Bundle `/_next/static/chunks/app/layout-c0bcb7e5c0119f4e.js`: `projectId: new-gestone`, `authDomain: new-gestone.firebaseapp.com` e marcador `google:opening-popup` presentes.
- GET de `/__/auth/iframe` no domínio `new-gestone.vercel.app`: 404. Não existe helper de mesma origem nesse caminho publicado.
- Consultas HTTP pelo conector não equivalem a navegação anônima: ele pode usar acesso temporário para Deployment Protection. Não foram coletados tokens, cookies ou contas pessoais.
- Não foram inspecionados os valores das credenciais do servidor, configuração OAuth no Google Cloud, domínios autorizados no Firebase nem logs de uma tentativa real. Nenhum usuário real foi autenticado ou alterado.

## Fluxo atual

1. `GoogleAuthButton` chama o AuthProvider diretamente no clique. O provider define loading e chama o serviço sem uma espera anterior à chamada de `signInWithPopup`.
2. `src/lib/firebase/auth.ts:103` escolhe redirect em modo standalone; no navegador comum usa popup. Somente `operation-not-supported-in-this-environment` aciona fallback para redirect; `popup-blocked` retorna erro.
3. O SDK instalado aguarda o resolver/iframe antes da abertura: `AbstractPopupRedirectOperation.execute` → `_initialize` → `onExecution` → `_openPopup` → `window.open`. Referência local: `node_modules/@firebase/auth/dist/esm/index-DYWDbVEA.js:9531`, `:10773` e `:10635`. Se `window.open` retorna null, ele produz `auth/popup-blocked`.
4. Após identidade Firebase, `completeAuthentication` limpa o QueryClient e espera POST `/api/auth/session`. O servidor verifica o ID token com revogação e cria cookie HttpOnly por cinco dias.
5. O provider publica o usuário e navega de `/login` para `/` com `window.location.replace`. O layout servidor verifica o cookie com revogação; o layout cliente exige usuário Firebase.
6. `onIdTokenChanged` também sincroniza a sessão. Renovação usa fila local e Web Lock entre abas, com intervalo de 24 horas; a inicialização força sincronização.
7. Logout limpa cache, encerra Firebase e tenta apagar o cookie. Offline, o cookie pode continuar válido no servidor.

## Achados priorizados

P1 significa correção prioritária de funcionamento/confiabilidade; P2 significa robustez, segurança complementar ou experiência. Riscos derivados de análise estática não são apresentados como incidentes reproduzidos.

### A1 — P1: redirecionamento usa infraestrutura incompatível com a recuperação confiável em navegadores restritivos

**Confirmado:** origens diferentes no bundle publicado; helper local 404; standalone e fallback continuam usando redirect (`src/lib/firebase/auth.ts:103`). Não há proxy correspondente em `next.config.mjs`.

**Impacto condicionado ao navegador:** ao retornar do Google, o helper em outra origem pode não recuperar seu armazenamento; a aplicação fica anônima. `getRedirectResult` pode retornar null sem lançar erro. A documentação oficial descreve essa limitação e alternativas, incluindo proxy transparente de `/__/auth/*` e ajuste de `authDomain`/redirect URI. Não basta trocar a variável ou criar um redirect HTTP 302. [Firebase: práticas de redirect](https://firebase.google.com/docs/auth/web/redirect-best-practices).

**Correção proposta:** preparar helper na mesma origem do app e validar o round-trip antes de oferecer redirect como alternativa ao popup. Conferir headers, proteção Vercel e worker especificamente para esses caminhos. A regra global `X-Frame-Options: DENY` precisa de exceção apropriada para o iframe helper se ele passar pela aplicação, preservando proteção nas outras páginas.

### A2 — P1: popup bloqueado deixa o usuário sem alternativa; causa específica ainda aberta

**Confirmado:** `src/components/auth/google-auth-button.tsx:24` só pede para permitir pop-ups. O botão ignora o carregamento global do provider (`:12`, `:45`), permitindo iniciar OAuth durante a restauração inicial. Há esperas internas no SDK antes da abertura, mas não uma espera de rede introduzida pelo handler do aplicativo antes de chamar o SDK.

**Hipóteses a medir:** ativação transitória expirada durante inicialização lenta, política explícita de popup, extensão, navegador embutido ou modo de execução. Erro de domínio não autorizado tem código próprio e não deve ser confundido com popup bloqueado.

**Correção proposta:** distinguir prontidão inicial de tentativa em andamento, evitar ações concorrentes e oferecer “Continuar nesta aba” após A1. Instrumentar duração e etapas sem credenciais. Não modificar APIs privadas do SDK, não sobrescrever `window.open` em produção e não abrir uma janela vazia como suposta solução sem suporte público do SDK.

### A3 — P1: estado antigo pode ser publicado como sessão sincronizada

**Confirmado por leitura:** `syncSessionCookie` retorna normalmente quando `auth.currentUser` já mudou (`src/lib/firebase/auth.ts:57`, `:59`). O chamador interpreta esse retorno como sucesso e escreve `synchronizedUserIdRef`/`user` (`src/contexts/auth-context.tsx:77`). O callback do observador também publica seu usuário capturado após operações assíncronas (`:171`). Não há geração da operação nem nova verificação de UID após POST.

**Cenário de regressão:** atrasar a sincronização de A, iniciar saída/troca para B e liberar a resposta de A. A fila de cookies não invalida automaticamente callbacks antigos. O booleano `authActionInFlightRef` também não impede duas ações: apenas marca que alguma está em andamento. Senha e Google têm loading local independente.

**Impacto potencial:** estado UI/cookie divergente, chamadas feitas no momento errado ou retorno ao login. Não foi demonstrado vazamento de dados entre contas; regras e APIs continuam validando suas próprias identidades.

**Correção proposta:** exclusão mútua das ações e geração de autenticação, invalidada em troca/logout; resultado explícito de sincronização concluída/cancelada; validar UID e geração antes/depois das esperas e antes de publicar estado/navegar. Observador e ação explícita precisam compartilhar uma única rotina de conclusão.

### A4 — P1: indisponibilidade pode encerrar login válido e bloquear a fila indefinidamente

**Confirmado:** fetch de POST/DELETE não tem prazo (`src/lib/firebase/auth.ts:61`, `:81`); Web Lock/fila não têm limite de espera. O catch do observador encerra Firebase para qualquer erro, incluindo falha transitória de rede (`src/contexts/auth-context.tsx:172`). No retorno por redirect/restauração, essa falha não recebe a mensagem específica que o botão mostra.

**Correção proposta:** estados separados para autenticando, sincronizando, recuperável e sessão inválida; prazo de rede e espera por lock; retry limitado acionável. Não apresentar painel enquanto a sessão não estiver pronta. Não destruir uma credencial válida por um 503 transitório. Abort do cliente não garante cancelamento no servidor: tratar respostas atrasadas junto com A3.

### A5 — P2: erros Admin e entradas inválidas recebem diagnóstico incorreto

**Confirmado:** `sessionError` devolve 401 para tudo que não reconhece como configuração. Erros de rede, IAM e indisponibilidade podem parecer token inválido. JSON malformado ou body null também caem no tratamento genérico. O JSON da conta de serviço é interpretado no import de `admin.ts:22`, antes do try da rota: configuração malformada pode causar 500 sem resposta estruturada.

**Correção proposta:** validar corpo/tamanho e classificar 400/401/403/503/500; inicialização Admin controlada e validação de configuração sem logar segredos; registrar código e correlação segura. Confirmar no runtime que cliente e Admin pertencem ao mesmo projeto e que a identidade tem permissões adequadas.

### A6 — P2: cadastro tem duas autoridades de navegação e mistura onboarding com autenticação

**Confirmado:** provider navega de `/register` quando autentica; `RegisterForm` também executa `router.replace`/`refresh` após seed (`src/components/auth/register-form.tsx:47`). A conta e a sessão podem existir quando o seed falha, mas a tela informa erro de cadastro. Google depende da inicialização em `useCategories`, já idempotente.

**Correção proposta:** uma autoridade de navegação para senha/Google/cadastro; separar conta criada, sessão pronta e inicialização de categorias; permitir retry do onboarding sem recriar a conta. Preservar inicialização idempotente existente.

### A7 — P2: logout offline tem reconciliação incompleta na página atual

**Confirmado:** falha de DELETE só gera toast; não existe pendência persistida/retry no evento online. Reload inicial anônimo volta a tentar DELETE, mas reconectar sem recarregar não garante isso. `clearSessionCookie` lê UID após `signOut`, quando ele normalmente já é null, deixando o marcador de renovação anterior (`src/contexts/auth-context.tsx:125`; `src/lib/firebase/auth.ts:79`).

**Correção proposta:** capturar UID anterior; registrar intenção de saída e reconciliar cookie antes da próxima autenticação, também ao reconectar; invalidar marcas e operações antigas. Cookie HttpOnly não pode ser removido offline por JavaScript. Até reconciliar, uma API que autentica somente pelo cookie ainda pode aceitá-lo; ocultar a UI não equivale a revogar sessão no servidor.

### A8 — P2: política de emissão/renovação e proteção de origem precisa ser explícita

**Confirmado:** a emissão verifica revogação, mas aceita qualquer ID token válido sem conferir `auth_time`. A checagem de origem aceita ausência de Origin e Fetch Metadata; o MCP já usa checagem mais estrita. Não foi comprovado exploit CSRF: métodos, JSON, cookies e comportamento real do navegador importam.

**Correção proposta:** definir separadamente criação de sessão e renovação com cookie válido do mesmo UID. Exigir autenticação recente onde apropriado, sem aplicar um limite de cinco minutos cegamente à renovação diária. Padronizar origem exata/CSRF e testar headers ausentes, origem irmã e origem externa. [Firebase: cookies de sessão](https://firebase.google.com/docs/auth/admin/manage-cookies).

### A9 — P2: diagnóstico e mensagens não cobrem todos os resultados

**Confirmado:** marcadores são sanitizados, mas vários catches logam a exceção completa no console; erros Firebase podem conter metadados pessoais. Cancelamento do popup, credencial vinculada a outro método e rede caem em mensagem genérica. Marcadores guardam principalmente a última etapa; o observador pode sobrescrevê-la. Recuperação de senha usa toast neutro, mas a tela afirma “Enviamos um link” mesmo para conta inexistente.

**Correção proposta:** códigos/etapas/durações sanitizados com identificador local de tentativa, sem tokens, e-mail, UID ou payload OAuth; mensagens distintas para cancelamento e falhas recuperáveis; política segura de vinculação de provedores, sem associação automática por e-mail; texto neutro também na tela de recuperação.

### A10 — P1 para liberação: testes atuais não validam o ambiente que falha

**Confirmado:** Playwright usa somente Chromium e emuladores. O teste de bloqueio substitui `window.open` por retorno null: valida a mensagem, não a causa. O emulador usa localhost para aplicativo/helper e não reproduz as origens distintas de produção. Não há cobertura integrada do redirect/PWA ou corridas de A3. O unitário do botão simula o provider; o de cache simula sincronização.

**Correção proposta:** regressões determinísticas de concorrência e falhas; testes integrados com emuladores; matriz manual de OAuth real em preview autorizado com conta de teste. Não aceitar apenas o fechamento do popup ou status READY como sucesso.

## Controles existentes a preservar

- Cookie HttpOnly, Secure em produção, SameSite=Lax, path `/`, expiração limitada e no-store na API.
- `verifyIdToken(..., true)` e `verifySessionCookie(..., true)` nas fronteiras revisadas. Layout não é a única proteção: rotas de dados verificam a sessão.
- Isolamento Firestore pelo UID do caminho; Admin usa UID verificado, não UID arbitrário do corpo.
- QueryClient limpo em logout/troca; worker configurado para não cachear documentos privados, RSC, APIs ou Firebase.
- Exclusão de conta exige cookie e ID token do mesmo UID, revogação e `auth_time` recente. Reautenticação Google usa o usuário atual e invalida resultado após cancelamento/troca.
- Consentimento MCP valida sessão/allowlist e mantém aprovação própria; login em outra aba exige voltar e recarregar explicitamente. Não automatizar consentimento como parte da correção.
- Persistência cliente do Firebase continua necessária ao Firestore direto; não remover indiscriminadamente ao adotar cookies de servidor.

## Plano executável

### 1. Fechar o diagnóstico do incidente

No navegador afetado, coletar versão/modo e reproduzir em sessão limpa, primeiro clique após carregamento e rede lenta. Registrar apenas sequência de etapas, duração, código sanitizado, ativação de usuário e status HTTP. Comparar tentativa com popup permitido; verificar se a falha ocorre antes do OAuth, no retorno, no POST ou na navegação. Confirmar Google habilitado, domínio `new-gestone.vercel.app` autorizado, redirect URI exata e configuração Admin no ambiente correto.

**Aceite:** uma tentativa falha classificada com evidência, sem despejo de tokens/HAR bruto. Se não reproduzir, manter causa como pendente e usar os casos determinísticos abaixo para corrigir os defeitos independentes.

### 2. Corrigir transporte Google em preview

Implementar proxy transparente e restrito de `/__/auth/*` para o helper Firebase do projeto, com GET/POST, query e corpo preservados. Não criar proxy aberto. Configurar `authDomain` para a origem escolhida e registrar callback Google exato. Verificar iframe embutido, headers compatíveis, ausência de cache/fallback offline e interferência da proteção Vercel. Configurações externas e publicação de produção exigem autorização específica.

Manter popup como opção de desktop e disponibilizar redirect explícito após bloqueio; standalone utiliza somente o caminho já validado. Tratar retorno pendente, sucesso, cancelamento, erro e null sem loop. O observador pode entregar o usuário mesmo quando `getRedirectResult` é null: não exigir sempre resultado não nulo nem descartá-lo sem contexto.

**Aceite:** round-trip com armazenamento de terceiros bloqueado, redirect no modo instalado e alternativa ao popup terminam em sessão válida; cancelamento retorna a UI utilizável. Se o proxy for inviável no ambiente, avaliar a alternativa oficial de credencial Google direta como decisão separada, sem trocar toda a arquitetura durante a correção inicial.

### 3. Unificar estado, sincronização e navegação

Aplicar A3/A4/A6: estado explícito e prontidão, uma ação ativa, geração/UID verificados, sincronização cancelada diferente de sucesso, fila limitada, retry recuperável e um único ponto de navegação. Inicialização e retorno redirect não devem competir com um login iniciado pelo usuário. Cobrir também Strict Mode e callbacks pendentes após desmontagem.

**Aceite:** atrasar operações e alternar conta/logout não publica usuário antigo, não informa sucesso antes do cookie e não navega duas vezes; 503 permite retentar sem ciclo destrutivo de login.

### 4. Endurecer sessão, saída e observabilidade

Aplicar A5/A7/A8/A9: entrada estruturada, classificação de erros, política emissão versus renovação, origem/CSRF consistente, reconciliação de logout e logs sanitizados. Preservar confirmação recente de ações sensíveis e isolamento de dados.

**Aceite:** payload inválido retorna 400; credencial inválida 401; origem recusada 403; indisponibilidade distinguível; logout pendente é reconciliado antes de novo login; token antigo não contorna a política aprovada.

### 5. Validar e liberar

| Camada | Casos obrigatórios |
| --- | --- |
| Unitária | Clique concorrente Google/senha; UID muda durante token/POST; callback antigo após logout; retry 503; timeout; inicialização anônima concorrente; redirect null com/sem intenção pendente; emissão e renovação; JSON null/inválido; cancelamento e logs sem dados pessoais |
| Emuladores | Google e senha → cookie → painel → reload; cadastro/onboarding; sessão recusada; logout online/offline; troca de conta e abas; reautenticação/exclusão somente de dados fictícios |
| Preview real | Chrome/Edge, Firefox, Safari desktop/iOS e Chrome Android; aba normal e PWA; primeira visita, popup permitido/bloqueado, redirect, restrição de armazenamento, conta Google já existente e cancelamento |
| Servidor/cache | Sem sessão, expirada, revogada, UID divergente, indisponibilidade Admin; helper sem cache privado/interceptação do worker; painel e API sem dados após saída reconciliada |

Executar lint, typecheck, unitários relacionados e `npm run test:e2e` para alterações do fluxo. Alteração de configuração Next exige também suíte unitária completa e build. Executar `npm run test:rules` se regras/schemas/permissões forem alterados; para validação completa, seguir toda a sequência do AGENTS.md. Usar `npm run test:e2e -- --production` para validar worker e build isolados. Não executar Playwright sozinho contra produção.

**Aceite final:** login Google chega ao painel com cookie válido e permanece após reload em toda a matriz acordada; alternativa funciona quando popup é bloqueado; nenhuma conta anterior reaparece; falhas recuperáveis têm saída clara. Documentar evidências e rollback antes de autorizar produção. Sem merge/deploy nesta auditoria.

## Verificações desta entrega e limitações

- Node `v24.15.0`, npm `12.0.2`.
- Seis suítes específicas (`auth-cache`, `google-auth-button`, `auth-diagnostics`, `session-route`, `session-renewal`, `reauth-dialog`): **28/28 testes passaram**.
- Primeira execução informou colisão de nome entre package.json raiz e `.worktrees/mcp-financial-parity/package.json`, mas terminou aprovada. Reexecução com `--roots ./tests/unit` eliminou a descoberta de worktrees.
- `npm test -- --runInBand --roots ./tests/unit`: **50 suítes, 270 testes aprovados**. Dependências já estavam instaladas; não houve alteração de manifesto/lockfile.
- `java -version` não retornou durante a consulta e foi interrompido; versão/prontidão de Java não confirmada. E2E e regras não foram executados nesta auditoria. Não atribuir a paralisação ao aplicativo.
- Lint, typecheck e build não executados: entrega documental, sem alteração do comportamento. A execução de unitários foi evidência adicional da auditoria, não prova do OAuth publicado.
- Revisão do diff, caminhos e links feita antes do commit. Guia local do Next consultado: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- Limites remanescentes: OAuth real no navegador afetado, permissões Admin, configuração do provedor e matriz Safari/Firefox/PWA. O relato do usuário permanece válido apesar dos testes unitários verdes.

## Referências

- [Firebase — login Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase — redirect e armazenamento de terceiros](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Firebase — sessões no servidor](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Operação e verificações do deploy](../../deploy-verification.md)
- [Cache/PWA](../../features/pwa-cache.md)
- [Reautenticação e exclusão](../../account-deletion.md)
- [Isolamento Firestore](../../firestore-security.md)
