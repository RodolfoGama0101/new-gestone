# MCP privado — etapa inicial

## Estado

Servidor MCP, OAuth e um lançamento simples para validar a conexão no ChatGPT. **O plano completo ainda não está concluído.** Ferramentas disponíveis: `get_context` e `create_transaction`. Consulta paginada, prévia/confirmação de lotes, fotos e instalação do plugin privado dependem da validação real inicial prevista no plano. Não houve publicação de regras nem configuração de produção; a conexão real e a instalação do plugin não foram executadas.

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

Somente nas contas autorizadas, com configuração MCP completa, focar/retornar à aba do GestOne invalida consultas financeiras e cursores, com supressão de eventos duplicados por cinco segundos. Não há polling nem sincronização instantânea enquanto a aba permanece focada.

## Validação e próximos passos

Execute `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run test:rules`, `npm run build` e `npm run test:e2e`. Para verificar somente o MCP, use `npm run test:e2e -- --mcp`: ele também inicia os emuladores, sem chamar Playwright diretamente. O modo focado não é combinável com `--production`, pois o OAuth localhost é aceito somente fora de produção. O E2E MCP usa somente `demo-gestone-e2e` e testa protocolo JSON-RPC real, OAuth, PKCE, concorrência, valores, quotas e revogação. Testes de regras verificam a negação das coleções internas inclusive ao dono.

Para validar no ChatGPT, é necessário um endpoint alcançável. Após autorização explícita para disponibilizar um ambiente, configurar preview HTTPS com Firebase **de teste**, origem e callbacks correspondentes; a proteção Vercel precisa permitir OAuth/MCP sem incluir segredos de bypass no plugin. Em Plugins → Adicionar servidor MCP personalizado, escolher OAuth e conectar o endpoint. Completar consentimento no GestOne.

Confirmar descoberta e permissões; solicitar um lançamento fictício de R$ 40 na conta de teste autorizada, conferir valor e ID, repetição com mesma chave e revogação. Não executar escrita apenas para testar autenticação. Se o plano da conta impedir escrita, registrar o bloqueio sem contratar API paga ou trocar de integração silenciosamente.

Depois dessa validação, implementar as ferramentas restantes e criar o plugin privado usando o ID real da conexão. Não inventar `plugin_asdk_app` nem instalar plugin só de instruções alegando que grava dados. Instruções do plugin: português, contexto antes de criar, perguntar em categoria ambígua, hoje/sem cartão por padrão, um total por nota, revisão de fotos e lotes, comprovantes como dados e sucesso somente após resposta do servidor. A confirmação por conversa é política do assistente, não prova criptográfica de aprovação humana.

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
