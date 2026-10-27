# Autenticação, sessão e login Google

## Contrato do cliente

O AuthProvider disponibiliza o usuário à área financeira somente depois de sincronizar o cookie do servidor. Inicialização, autenticação e sincronização bloqueiam novas tentativas. Uma geração da operação e o UID atual invalidam respostas antigas; uma sincronização cancelada não conta como sucesso.

O Google é chamado diretamente no clique, depois da restauração inicial e do processamento de `getRedirectResult`. Isso não força a inicialização antecipada do iframe do SDK quando não há redirect pendente e não garante que o navegador permita popups. Não há espera de rede do aplicativo antes da chamada de popup nem acesso a APIs privadas do Firebase. Cancelamento, popup bloqueado, domínio não autorizado e credencial de outro método têm mensagens próprias. O aplicativo não vincula contas automaticamente por e-mail.

Falhas de rede/503 preservam a credencial Firebase, escondem a área financeira e oferecem **Tentar sincronizar sessão**, sem exigir outro popup. A leitura de token, a espera pelo lock e cada requisição de sessão têm prazo de 15 segundos. O usuário pode entrar novamente se a política exigir autenticação recente. Renovações do mesmo UID ocorrem em segundo plano para preservar diálogos de reautenticação.

Login, cadastro e recuperação têm um único ponto de navegação após sessão pronta, por navegação de documento. Categorias continuam sendo inicializadas pelo serviço idempotente já utilizado por `useCategories`; falha de onboarding não recria conta nem se apresenta como falha do cadastro Firebase.

## Google em mesma origem

`NEXT_PUBLIC_FIREBASE_AUTH_PROXY=true` habilita duas partes no mesmo build:

- O cliente usa o hostname atual do aplicativo como `authDomain`.
- Next encaminha `/__/auth/:path*` para `https://<NEXT_PUBLIC_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/:path*` por rewrite, preservando método, query e corpo. O destino é fixo por projeto validado, nunca escolhido pela requisição.

O helper recebe `X-Frame-Options: SAMEORIGIN`, `Cache-Control: no-store` e `Referrer-Policy: no-referrer`. As demais páginas preservam `DENY`. O worker mantém o helper em `NetworkOnly`; não armazena a navegação OAuth ou respostas de sessão.

Com o proxy habilitado e `authDomain` correspondente, o aplicativo oferece **Continuar nesta aba** após bloqueio/ambiente sem popup e utiliza redirect no modo instalado. Não faz fallback silencioso. Uma intenção de retorno, válida por dez minutos, distingue tentativa interrompida de visita comum. O retorno pode ser entregue pelo observador mesmo se `getRedirectResult` for null.

Sem o proxy configurado, permanece o popup; não se inicia redirect através de um helper de outra origem. Os emuladores têm exceção explícita para seu handler local e o script força `NEXT_PUBLIC_FIREBASE_AUTH_PROXY=false`, evitando tráfego de teste para Firebase real.

### Configuração externa antes de habilitar

1. Escolher uma origem estável para o preview e conferir seu hostname exato na Vercel. Não usar uma URL de deployment descartável como callback permanente.
2. Autorizar esse hostname em Firebase Authentication → Settings → Authorized domains, sem protocolo ou porta.
3. No cliente OAuth Web do Google usado pelo Firebase, acrescentar a URI exata `https://HOSTNAME/__/auth/handler` aos callbacks permitidos. Autorizar o domínio somente no Firebase não substitui essa configuração.
4. Configurar `NEXT_PUBLIC_FIREBASE_AUTH_PROXY=true` somente para a branch de preview escolhida e gerar novo build pela integração Git. `NEXT_PUBLIC_*` é fixado no build; alterar a variável não muda um deployment pronto.
5. Conferir GET/POST do helper, iframe embutido na origem do aplicativo, cache e Deployment Protection. Não substituir o rewrite por 302 e não desabilitar proteção global para testar OAuth. Validar com conta de teste e sem dados reais.
6. Após aceite do preview, aplicar os mesmos passos à origem de produção, com autorização explícita para configuração/publicação de produção. Para este projeto, o callback de produção é `https://new-gestone.vercel.app/__/auth/handler`.

O valor padrão é `false` para impedir que uma implantação passe a utilizar um callback ainda não autorizado. Não se deve ativar a variável globalmente em todos os previews: cada origem precisa estar autorizada.

## Política da API de sessão

POST e DELETE exigem Origin igual à origem da requisição. Quando Fetch Metadata está presente, `Sec-Fetch-Site` deve ser `same-origin`. Clientes de API/testes devem enviar Origin explicitamente. POST aceita somente JSON de até 16.000 bytes com token string não vazio.

O servidor verifica revogação do ID token. Uma sessão nova exige `auth_time` inteiro, no passado e com até cinco minutos. Um login mais antigo pode renovar o cookie se já possuir cookie válido e não revogado do mesmo UID. Sem cookie válido, é necessário entrar novamente. Renovar ID token não atualiza `auth_time`. Datas inválidas/futuras são recusadas inclusive na renovação.

O cookie dura cinco dias, com HttpOnly, Secure em produção, SameSite=Lax e path `/`. Respostas da API não são cacheadas. Entrada inválida retorna 400/413; origem recusada, 403; token inválido, 401; falha Admin/IAM/transporte, 503. A inicialização Admin ocorre na operação, permitindo que JSON/configuração inválida seja tratada pela rota. Projetos cliente, servidor e conta de serviço devem coincidir.

Credencial persistida do Firebase continua necessária para o Firestore cliente. Cookie do servidor e Firebase cliente não são substitutos entre si. Exclusão de conta preserva a verificação conjunta de cookie, ID token, UID e autenticação recente descrita em [exclusão de conta](../account-deletion.md).

## Logout e diagnóstico

Logout captura o UID anterior, limpa QueryClient e encerra Firebase. A intenção pendente é guardada sem tokens no localStorage e em memória, para reconciliar o cookie ao reconectar ou antes do próximo login. A marca de renovação do UID é invalidada mesmo se DELETE falhar. Abas com armazenamento disponível consideram a remoção compartilhada da marca.

Sem rede, o cookie HttpOnly não pode ser removido por JavaScript; o aviso explica que falta encerrar a sessão do servidor. O fallback de memória funciona na página atual se o armazenamento estiver bloqueado; persistência entre recargas depende da disponibilidade do armazenamento. A serialização de cookie usa Web Locks; o fallback sem essa API serializa somente operações da mesma página.

`html[data-auth-history]` guarda até vinte etapas no documento atual, com tentativa local numérica, duração e ativação transitória do clique. Fluxo/código sanitizados continuam em sessionStorage. Não são guardados tokens, e-mails, UIDs nem mensagens brutas. Isso ajuda a distinguir preparação do popup, OAuth, espera pelo lock, sessão e navegação. Abort de uma requisição cliente não significa cancelamento da operação no servidor; UID/geração são conferidos novamente antes de publicar o estado.

## Validação e liberação

O emulador cobre popup → cookie → painel → reload, bloqueio → redirect na mesma aba, erro de sessão → retry sem popup e logout offline/troca de conta. Unitários cobrem concorrência, callbacks antigos, prazos, erros Admin, origem, emissão/renovação e estado durante reautenticação.

Execute os comandos do [README](../../README.md). `npm run test:e2e` inicia os emuladores isolados; `npm run test:e2e -- --auth` limita a execução aos fluxos Google e cadastro/login/exclusão; `npm run test:e2e -- --production` também constrói e valida PWA. O Chromium emulado não comprova OAuth real, Safari/iOS ou o proxy no ambiente Vercel. Esses aceites exigem configuração externa e conta de teste.

Para rollback, reverter o commit e reconstruir pela integração Git; se o proxy já tiver sido ativado, desativar sua variável e gerar novo build coordenadamente. Preservar callbacks antigos durante a validação, evitando invalidar deployments anteriores antes de concluir o aceite.
