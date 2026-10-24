# MCP privado — lançamentos e comprovantes

## Estado

Servidor MCP com OAuth, consulta paginada e gravação individual ou em lotes com prévia e confirmação. Ferramentas: `get_context`, `list_transactions`, `create_transaction`, `prepare_transactions` e `commit_transactions`. Em 24/10/2026, o usuário confirmou lançamentos feitos pelo ChatGPT; a conta de teste contém despesas e receita. Idempotência e revogação foram verificadas em uma conexão de teste separada, preservando a conexão do usuário. O pacote privado está em `plugins/gestone-private`; o plugin foi salvo como privado na conta do usuário. Ativação e validação do fluxo de fotos no ChatGPT são etapas separadas do teste do servidor. Não houve merge, publicação de regras ou deploy de produção.

Não há API de IA, modelo local, Redis, cron ou armazenamento de imagens. A interpretação acontece no ChatGPT, dentro dos recursos e limites da conta.

## Configuração

Use Node 24, npm 12.0.2 e `npm ci`. O endpoint `/api/mcp` usa Node.js e Streamable HTTP, com `mcp-handler` 2.3.0 e `@modelcontextprotocol/server` 2.4.0. Foram consultados os guias locais do Next.js para Route Handlers e autenticação.

Variáveis somente no servidor, além do Firebase Admin existente:

| Variável | Valor |
| --- | --- |
| `MCP_ORIGIN` | Origem HTTPS exata, sem barra final |
| `MCP_ALLOWED_UIDS` | Seu UID Firebase; até cinco separados por vírgula para permitir teste isolado |
| `MCP_CLIENT_ID` | Cliente OAuth previamente cadastrado |
| `MCP_CLIENT_SECRET` | Segredo para `client_secret_post`; vazio apenas para cliente público PKCE (`none`) |
| `MCP_REDIRECT_URIS` | Callbacks HTTPS exatos fornecidos pelo ChatGPT, separados por vírgula, sem curingas |

Configuração ausente/inválida retorna 503. Somente fora de produção é aceito `http://localhost:3102`. O script E2E substitui todas as variáveis MCP e Firebase por valores fictícios, inclusive qualquer segredo herdado. Nunca colocar segredos no chat, plugin ou variáveis `NEXT_PUBLIC_`.

## Autorização

Metadados em `/.well-known/oauth-protected-resource` e `/.well-known/oauth-authorization-server`; consentimento em `/oauth/authorize`; autorização POST em `/api/mcp/oauth/authorize`; troca/renovação em `/api/mcp/oauth/token` por formulário URL-encoded.

Authorization Code + PKCE S256 obrigatório, callback e recurso exatos, `state` preservado e emissor devolvido. Não há registro público de clientes. Escopos: `transactions:read` e `transactions:write`. Sessão Firebase autentica o consentimento; chamadas MCP exigem Bearer token próprio. O UID nunca vem dos argumentos das ferramentas.

Códigos: 5 minutos e uso único. Access tokens: até uma hora. Conexão e refresh: até 30 dias desde o consentimento, sem extensão pela renovação. Refresh rotaciona; reutilização revoga a conexão inteira. Só hashes dos segredos ficam no Firestore. Configurações → Integrações permite consultar e revogar conexões. Logout não equivale a revogar uma integração.

Documentos ficam sob `/users/{uid}` em `mcpSecrets`, `mcpConnections`, `mcpUsage` e `mcpOperations`, negados ao cliente pelas regras atuais. O Admin valida permissões e dados explicitamente. Exclusão recursiva da conta também remove esses documentos. Esta etapa não altera regras nem índices.

Limites persistidos por conta: 20 códigos por hora, 100 chamadas de ferramentas por hora, 500 novos lançamentos por dia em São Paulo e até 100 documentos de conexão. Requisições MCP aceitam até 256 KB. Uma limpeza oportunista por chamada bem-sucedida remove até dez documentos expirados de cada coleção de segredos, quotas e conexões, sem TTL pago. Expiração é conferida mesmo sem limpeza. Idempotência permanece até exclusão da conta.

## Ferramentas

`get_context`: hoje em São Paulo, moeda BRL, unidade centavos, categorias ativas e cartões aptos a novas compras. Não cria categorias.

`create_transaction`: recebe `idempotencyKey` (16–128 caracteres) e `transaction` com `type` (`expense`, `income`, `investment`), `amount` em centavos inteiros, `description`, `categoryId`, `date` civil opcional `YYYY-MM-DD`, `creditCardId` opcional, `tags` e `notes`. Campos extras, UID, séries e parcelas são rejeitados. Data ausente usa hoje; cartão ausente resulta em nulo. Datas são armazenadas ao meio-dia civil com o deslocamento histórico de São Paulo.

A criação valida categoria ativa compatível e cartão ativo no próprio UID, preserva o fechamento da compra e grava lançamento, resultado de idempotência e quota em uma transação. R$ 40 são `4000`; salário de R$ 4.000 são `400000`.

Após timeout, repita **a mesma chave e entrada**. A repetição retorna o mesmo ID, inclusive após edição/exclusão manual posterior. Entrada diferente com a mesma chave gera `idempotency_conflict`. Pedidos legítimos iguais precisam de chaves diferentes. Não há deduplicação semântica nesta etapa.

### Consulta e lotes

`list_transactions`: `startDate`/`endDate` civis opcionais e inclusivos, `limit` de 1 a 50 (padrão 20), `cursor` opcional. Ordena por data decrescente e ID, retorna `transactions` e `nextCursor`. O cursor é vinculado à conta e ao intervalo; não representa um snapshot imutável se o histórico for editado durante a consulta. Os índices automáticos de data/ID são suficientes; não houve alteração de índices.

`prepare_transactions`: recebe `idempotencyKey`, `source` (`text` ou `receipts`) e 1–20 `transactions` com o mesmo contrato individual. Valida todas as referências e congela a data padrão. Retorna itens, totais por tipo como strings decimais de centavos (sem overflow na soma), `previewId`, `previewHash`, expiração em 30 minutos e possíveis duplicatas. Não cria lançamentos. Mesma chave/entrada retorna a mesma prévia; entrada diferente conflita. Há limite de 20 novas prévias por hora.

Duplicatas são igualdade de dia civil, tipo, valor e descrição sem distinção de acentos, caixa ou espaços repetidos. A categoria/cartão diferente não suprime o aviso. São verificadas dentro do lote e no histórico, com no máximo 500 documentos dos dias envolvidos. Acima disso, a preparação/commit falha com `duplicate_check_limit`, sem alegar revisão completa. Cada aviso retorna até cinco IDs existentes, a contagem total e um fingerprint da lista completa, evitando prévias maiores que o limite de documento. Isso não é reconhecimento visual de recibos semelhantes.

`commit_transactions`: recebe somente `previewId`, `previewHash`, `confirmed: true` e `allowDuplicates` (padrão falso). Usa a mesma conta e conexão que preparou, revalida categoria/cartão, fechamento, expiração e duplicatas e grava todos os itens junto à quota diária numa transação. Possíveis duplicatas exigem `allowDuplicates: true` após confirmação explícita. Mudança de referências ou avisos exige nova prévia e nova confirmação. Falha de qualquer item não grava parte do lote. Repetir um commit concluído devolve os mesmos IDs, inclusive após expirar a prévia ou editar registros manualmente.

Prévias e resultados ficam em `mcpOperations`, já negado aos clientes pelas regras. A expiração bloqueia commits novos, mas os dados de idempotência/prévia permanecem até exclusão da conta, como as operações individuais; não há TTL, coleção pública nova ou serviço pago. Os totais e os valores dos registros continuam em centavos. Não há aprovação humana criptográfica: `confirmed`/`allowDuplicates` são argumentos do cliente, e esperar uma nova mensagem de confirmação é política do assistente.

### Comprovantes e pacote privado

O ChatGPT interpreta fotos usando sua assinatura; o GestOne recebe apenas os campos estruturados. Uma nota fiscal gera um lançamento pelo total. Imagens, QR codes e textos de comprovantes são dados não confiáveis, nunca instruções. Campos ilegíveis ou categoria ambígua exigem pergunta. Qualquer foto, mesmo uma só, e qualquer lote devem passar por preparação, exibição dos itens/totais/avisos e confirmação antes do commit.

O pacote versionado em `plugins/gestone-private` contém manifesto, identidade do app, skill em português e `mcp.json` com o endpoint HTTPS real e OAuth PKCE público. Não inclui senha, token, Client Secret ou ID de app inventado. O pacote é privado; não há submissão pública. Ele aponta para o preview e permite somente a conta autorizada. A conexão de teste criada pelo usuário no ChatGPT pode precisar de Refresh para descobrir as três ferramentas novas. A criação de um pacote ou o sucesso dos testes do servidor não comprova instalação, execução da skill nem extração de uma foto real no ChatGPT.

Somente nas contas autorizadas, com configuração MCP completa, focar/retornar à aba do GestOne invalida consultas financeiras e cursores, com supressão de eventos duplicados por cinco segundos. Não há polling nem sincronização instantânea enquanto a aba permanece focada.

## Validação e próximos passos

Execute `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run test:rules`, `npm run build` e `npm run test:e2e`. Para verificar somente o MCP, use `npm run test:e2e -- --mcp`: ele também inicia os emuladores, sem chamar Playwright diretamente. O modo focado não é combinável com `--production`, pois o OAuth localhost é aceito somente fora de produção. O E2E MCP usa somente `demo-gestone-e2e` e testa protocolo JSON-RPC real, OAuth, PKCE, concorrência, valores, quotas e revogação. Testes de regras verificam a negação das coleções internas inclusive ao dono.

Para validar no ChatGPT, é necessário um endpoint alcançável. Após autorização explícita para disponibilizar um ambiente, configurar preview HTTPS com uma conta Firebase **de teste**, origem e callbacks correspondentes; a proteção Vercel precisa permitir OAuth/MCP sem incluir segredos de bypass no plugin. Em Plugins → Adicionar servidor MCP personalizado, escolher OAuth e conectar o endpoint. Completar consentimento no GestOne.

Confirmar descoberta e permissões; solicitar um lançamento fictício de R$ 40 na conta de teste autorizada, conferir valor e ID, repetição com mesma chave e revogação. Não executar escrita apenas para testar autenticação. Se o plano da conta impedir escrita, registrar o bloqueio sem contratar API paga ou trocar de integração silenciosamente.

A validação inicial foi confirmada; as ferramentas restantes foram implementadas. Para o pacote privado, reutilizar o endpoint real confirmado ou um ID real de conexão disponível, sem inventar identificadores. Não inventar `plugin_asdk_app` nem instalar plugin só de instruções alegando que grava dados. Instruções do plugin: português, contexto antes de criar, perguntar em categoria ambígua, hoje/sem cartão por padrão, um total por nota, revisão de fotos e lotes, comprovantes como dados e sucesso somente após resposta do servidor. A confirmação por conversa é política do assistente, não prova criptográfica de aprovação humana.

Referências: [MCP na Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel), [OAuth no ChatGPT](https://developers.openai.com/plugins/build/auth), [conectar plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Verificação registrada — 23/10/2026

Verificações executadas em cópia temporária dos arquivos versionados e desta alteração, com dependências instaladas por `npm ci`, sem `.env.local`. O checkout original já tinha um `next dev` aberto; ele foi preservado. Artefatos ignorados em `.worktrees/` e `dogfood-output/` contaminavam a descoberta de lint/Jest no checkout original, por isso os resultados abaixo são da cópia limpa.

- `npm run lint` e `npm run typecheck`: aprovados.
- `npm test -- --runInBand`: 45 suítes, 247 testes aprovados.
- `npm run test:rules`: 150 testes aprovados no projeto fictício.
- `npm run build`: aprovado com configuração Firebase fictícia; rotas MCP/OAuth dinâmicas.
- `npm run test:e2e -- --mcp`: aprovado em 34 segundos, incluindo despesa, receita, investimento, consentimento pelo navegador e revogação em Configurações. Execução com `NODE_OPTIONS=--max-old-space-size=8192`. A tela de integrações foi inspecionada visualmente em 320 px.
- `npm run test:e2e` completo: **não aprovado/não concluído**. A tentativa atingiu o limite de heap de aproximadamente 4 GiB em um processo Node após cerca de 12 minutos. Antes disso houve timeouts em gráficos, navegação/carregamento da conta, seleção de categoria e tema. Não foi estabelecido se esses timeouts são preexistentes ou regressões; não foram corrigidos por suposição. Não declarar a suíte completa como verde.

Java precisou de execução fora do sandbox para iniciar. Somente processos dos testes desta tarefa foram encerrados ao recuperar as tentativas interrompidas. Nenhum processo alheio foi encerrado. A validação no ChatGPT real continua pendente, assim como a implementação das demais ferramentas condicionadas a ela.

## Preparação do preview — 24/10/2026

O usuário autorizou usar o projeto Firebase existente `new-gestone`, que ainda não está em produção, com uma conta separada e somente dados fictícios. Não foi criado outro projeto nem habilitada cobrança.

- Conta fictícia criada e confirmada no Firebase Authentication. A senha gerada está apenas em `.env.mcp-preview.local` no checkout original; o arquivo é ignorado pelo Git e não deve ser copiado para documentação, chat ou plugin. Nenhum lançamento financeiro foi criado nesta preparação.
- Variáveis `MCP_ORIGIN`, `MCP_ALLOWED_UIDS`, `MCP_CLIENT_ID` e `MCP_REDIRECT_URIS` criadas somente em Preview, para a branch `codex/gestone-mcp`. A allowlist contém apenas a conta fictícia. Cliente público com PKCE S256, sem `MCP_CLIENT_SECRET`.
- Origem de teste: `https://new-gestone-git-codex-gestone-mcp-rodolfo-gamas-projects.vercel.app`. Cliente OAuth: `gestone-chatgpt-preview`. Callback configurado: `https://chatgpt.com/connector_platform_oauth_redirect`; conferir o callback exato exibido pelo ChatGPT antes do consentimento.
- O usuário adicionou uma Deployment Protection Exception somente para esse domínio de branch. Requisições anônimas aos dois endpoints de descoberta e a `/api/mcp` chegaram ao aplicativo, sem redirecionamento ao SSO, retornando `503 mcp/not-configured` no deployment anterior às novas variáveis. As demais proteções do projeto permanecem configuradas.
- A credencial `FIREBASE_SERVICE_ACCOUNT_KEY` foi habilitada pelo usuário no painel. A inspeção posterior dos metadados mostrou Production + Preview sem filtro de branch; foi solicitado manter a entrada original somente em Production e criar outra somente em Preview para `codex/gestone-mcp`. A inspeção seguinte confirmou a entrada de Production e uma entrada para a branch, mas também uma entrada de Preview sem branch; a remoção somente dessa entrada genérica foi solicitada ao usuário, pois o conector não oferece exclusão de variáveis. O valor secreto não foi exposto. As variáveis públicas Firebase já têm destino Preview.

O commit `2c8e497` gerou pela integração Git o preview `dpl_BEF1WzTYfhYK2RKDrhrGuEpgdwS8`, confirmado como READY e sem destino de produção. As verificações abaixo foram executadas pela origem de branch, sem bypass de proteção e com a conta fictícia:

- Descoberta de recurso protegido e servidor OAuth: HTTP 200, recurso e emissor exatos, escopos de leitura/escrita, PKCE S256 e autenticação de cliente `none`.
- `/api/mcp` sem token: HTTP 401 com `WWW-Authenticate` apontando para os metadados corretos.
- Login por senha da conta fictícia: aprovado.
- `verifyPreview` de `scripts/verify-preview.mjs`, carregando as variáveis somente no processo: aprovados login cliente, cookie seguro no servidor, leitura Firestore cliente, recusa de acesso anônimo, sessão/Firestore Admin, renovação e limpeza da sessão. Nenhum lançamento criado e nenhum token/cookie salvo.

Nessa etapa, a descoberta foi verificada no preview, mas consentimento OAuth no ChatGPT, escrita real, idempotência e revogação ainda estavam pendentes; a validação posterior está registrada na expansão abaixo. O usuário recebeu o endpoint e o Client ID para conectar no ChatGPT web, com Client Secret vazio. Confirmar o callback exibido pela conexão antes de autorizar. Lotes, fotos e instalação do plugin continuam condicionados ao teste real. Nenhuma alteração de código foi realizada nesta preparação; os resultados de testes anteriores continuam sendo os registrados acima.

### Diagnóstico de login após alterar o escopo

O preview `dpl_2V6phCrnTJjG3XjJEXFQcPpHp5YH`, do commit `58e58f4`, foi criado antes das novas entradas de Preview da credencial Admin. Tentativas de login nesse deployment chegaram a `/api/auth/session`, que respondeu HTTP 503; os logs do servidor registraram `app/invalid-credential`. Isso identifica a falha na criação da sessão pelo Admin SDK, após a autenticação cliente. O commit `afc5364` gerou pela integração Git o preview `dpl_hGYTAraSSnFucdzJ7ab7zGV1HxN7`, posterior à configuração de branch e confirmado como READY. Nesse preview, `verifyPreview` passou novamente: login, cookie seguro, Firestore cliente/Admin, renovação e limpeza da sessão. O login também foi realizado pelo formulário em navegador isolado, chegando à raiz do painel com a identificação da conta fictícia, saldos zerados e nenhuma movimentação. O navegador de teste foi encerrado. A correção operacional foi incorporar as variáveis atuais em um novo deployment; o código de autenticação não foi alterado. Retomar agora o consentimento OAuth no ChatGPT. A inspeção final confirmou somente a entrada de Production e a entrada Preview para `codex/gestone-mcp`; a entrada genérica de Preview foi removida pelo usuário.

## Verificação da expansão — 24/10/2026

- Usuário confirmou conexão OAuth e lançamentos feitos no ChatGPT. Inspeção restrita à conta fictícia confirmou os registros, em centavos.
- Uma conexão OAuth isolada registrou R$ 40 fictícios, manteve o mesmo ID no retry, recusou mudança de valor com a mesma chave e foi revogada por reutilização do refresh (HTTP 400); o access token passou a HTTP 401. A conexão original do ChatGPT foi preservada.
- Checkout isolado, Node 24.15.0/npm 12.0.2, dependências por `npm ci`, sem `.env.local`. Lint e tipos aprovados.
- `npm test -- --runInBand`: 46 suítes, 256 testes aprovados.
- `npm run test:rules`: 150 testes aprovados em `demo-gestone-rules`.
- `npm run build`: aprovado com configuração Firebase fictícia.
- `npm run test:e2e -- --mcp`: dois fluxos aprovados em 32 segundos em `demo-gestone-e2e`, com `NODE_OPTIONS=--max-old-space-size=8192`. Incluem OAuth, consentimento/revogação pela interface, criação individual, consulta e paginação, lotes de campos extraídos de comprovantes, confirmação, duplicatas, idempotência/concorrência, expiração, atualização de referências, quota e escopos.
- A suíte E2E completa não foi repetida; o impedimento histórico descrito acima permanece sem classificação. Fotos reais e comportamento da skill instalada no ChatGPT ainda exigem validação pelo usuário.
- Nenhuma regra/índice foi publicado, nenhum lançamento existente foi alterado e nenhum serviço pago foi adicionado.

### Preview publicado e plugin salvo

A implementação `73e2452` foi publicada em `codex/gestone-mcp`; o deployment Git `dpl_Ck4bhkAYQUGHcgsYcFt3Urzen73D` ficou READY, sem destino de produção. Uma conexão OAuth isolada confirmou as cinco ferramentas, duas páginas de consulta e a preparação de um comprovante fictício. Essa prévia não foi commitada; a conexão isolada foi revogada ao final. Nenhum lançamento existente foi alterado.

Pacote validado e salvo na conta pessoal como PRIVATE, versão `0.2.0`: [GestOne](https://chatgpt.com/plugins/plugins_6adcd265ef0c8191b79ac1f1414cc7c3). ID real do plugin: `plugins_6adcd265ef0c8191b79ac1f1414cc7c3`; release: `pluginrel_6adcd26797fc819183ccd26e02a46026`. A leitura posterior dos arquivos salvos confirmou manifesto, skill e configuração OAuth para o endpoint real. Não foi inventado ID de app nem incluída credencial.

Criar/salvar o plugin não comprova instalação ou autenticação no ChatGPT. Abrir o link, ativar o plugin, conectar com OAuth e testar um comprovante fictício. Conferir a prévia e as possíveis duplicatas antes de confirmar. Se continuar usando a conexão de teste já criada, usar Refresh para descobrir as novas ferramentas. A interpretação real da foto e o comportamento da skill no ChatGPT ainda precisam dessa validação; o commit atômico foi verificado nos emuladores.

A repetição final do E2E inicialmente encontrou a porta 8081 ocupada por um Java remanescente dos testes deste próprio checkout. Após conferir caminho, projeto fictício e PID, somente esses emuladores foram encerrados e a execução final passou. Nenhum processo alheio foi encerrado. A inspeção do pacote identificou que o ícone existente era JPEG com extensão PNG; no pacote foi preservada a imagem, com extensão `.jpg` correta.
