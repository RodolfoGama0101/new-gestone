# Paridade financeira do MCP — versão 0.3.0

Implementação no código-fonte; publicação do servidor e atualização do plugin
instalado são etapas separadas, sujeitas à autorização de produção. As cinco
ferramentas anteriores mantêm seus contratos. Não há migração de dados,
serviço pago, cron ou alteração de regras/índices nesta evolução.

## Consultas

| Ferramenta | Entrada principal | Permissão |
| --- | --- | --- |
| `list_transactions` | Datas inclusivas, `type`, `categoryId`, `creditCardId`, `search`, `limit`, `cursor` | `transactions:read` |
| `get_transaction` | `id` | `transactions:read` |
| `get_financial_summary` | `month` (`YYYY-MM`), `referenceDate` opcional | `transactions:read` |
| `list_categories` | `includeArchived` opcional | `categories:read` |
| `list_cards` | `includeArchived`, `includeInactive` opcionais | `cards:read` |
| `get_invoice` | `cardId`, `month`, `limit`, `cursor` | `invoices:read` |
| `list_series` | `limit`, `cursor` | `series:read` |
| `get_series` | `id` | `series:read` |
| `get_budget` | `month` | `budgets:read` |

A listagem preserva datas de compra. O resumo, a fatura e o orçamento usam
competência, fechamento histórico e mês explícito da parcela. Os cálculos
compartilham as funções puras do aplicativo; datas de São Paulo são convertidas
em calendário para que o fuso do runtime não altere o mês ou dia.

`get_transaction` expõe versão, competência e metadados existentes de série e
parcela. Valores monetários são números inteiros em centavos; `currency`,
`amountUnit` e `timeZone` identificam o contexto das consultas financeiras.
Overflow gera `amount_overflow`, nunca um total arredondado.

Com filtros, cada página de lançamentos consome até 100 candidatos e um
documento para detectar continuação. A descrição usa a mesma comparação por
trecho do extrato: espaços externos removidos, caixa ignorada e acentos
significativos. `creditCardId: null` seleciona registros sem cartão; omitir o
campo inclui todos. Uma página vazia com `nextCursor` não encerra a busca.
O cursor incorpora todos os filtros e não pode ser reaproveitado após alterá-los.
Sem filtros novos, permanecem as páginas de até 50 resultados.

Agregações leem páginas de até 250 registros, com limite de 5.000 candidatos por
coleção consultada. O resumo e orçamento consultam o mês selecionado e os dois
anteriores, como os serviços atuais do aplicativo. Não somam apenas a página
visível. Acima do limite, retornam `query_limit` sem totais parciais. Catálogos
também falham explicitamente acima de 5.000 documentos. Faturas e séries
oferecem paginação de até 50 itens; seus cursores não são snapshots imutáveis.

## Preparação e execução de operações

`prepare_operations` recebe `idempotencyKey` de 16–128 caracteres e `operations`.
Até 20 operações de edição/exclusão de lançamentos podem compartilhar a prévia;
demais ações exigem um único alvo. IDs repetidos no lote são rejeitados.

| Ações | Campos adicionais | Permissão |
| --- | --- | --- |
| `update_transaction`, `delete_transaction` | `id`; edição usa `changes` | `transactions:write` |
| `create_category` | `data`: nome, tipo, ícone e cor | `categories:write` |
| `update_category`, `remove_category` | `id`; edição usa `changes` | `categories:write` |
| `create_card` | `data` validado pelo schema de cartões | `cards:write` |
| `update_card`, `archive_card`, `delete_card` | `id`; edição usa `changes` | `cards:write` |
| `pay_invoice`, `reverse_invoice_payment` | `cardId`, `month` | `invoices:write` |
| `create_series` | `transaction`, `kind`, `count` obrigatório para parcelas; apenas recorrências aceitam `endDate` opcional | `series:write` |
| `edit_series_future` | `id`, `amount`, `description` | `series:write` |
| `cancel_series` | `id`, `from` (hoje ou futuro) | `series:write` |
| `generate_series` | `id` | `series:write` |
| `set_budget_goal`, `remove_budget_goal` | `month`; definição usa `amount` | `budgets:write` |
| `set_budget_limit`, `remove_budget_limit` | `month`, `categoryId`; definição usa `amount` | `budgets:write` |

A prévia retorna `previewId`, `previewHash`, validade de 30 minutos, escopos e
operações com alvo, antes/depois, impactos e bloqueios. Preparar não altera
registros financeiros. Prévia bloqueada pode ser apresentada, mas seu commit
retorna `operation_blocked`.

`commit_operations` aceita somente `previewId`, `previewHash`, `confirmed: true`.
A prévia pertence à mesma conta e conexão que a preparou. O servidor revalida
token, conexão, escopos, registros, referências e consultas de vínculos.
Mudanças geram `preview_stale`; é necessário preparar e confirmar novamente.
Campos desconhecidos, caminhos arbitrários, UID e metadados protegidos de série
não são aceitos. Patches não aplicam valores padrão de criação em campos omitidos.

A mesma chave e entrada retornam a mesma prévia; dados diferentes conflitam.
Repetir um commit concluído devolve o resultado persistido, inclusive após
expiração ou edição manual posterior. Não reaplica alterações e não recria
registros removidos.

Edições/exclusões de até 20 lançamentos são atômicas. Geração de até 120
ocorrências e avanço do cursor da série também são atômicos. Cancelamentos
grandes bloqueiam a geração no primeiro passo e removem até 119 ocorrências
nesse passo; passos seguintes executam até 120 gravações/remoções. `done: false`
expõe `completed` e `remaining`; o cliente continua com a mesma prévia. Conflito,
revogação ou expiração interrompem o restante sem desfazer passos concluídos.
Uma nova prévia deve considerar somente os dados que restaram.

## Regras de domínio preservadas

- Editar uma ocorrência não altera as demais nem a série. Posição e competência
  da parcela são imutáveis. Cartão/categoria arquivados continuam válidos quando
  o vínculo histórico não muda. Fechamento já registrado é preservado.
- Remover categoria com lançamentos, séries ou limites mensais arquiva o
  cadastro. Meses com documento pai removido também são verificados. Categoria
  sem vínculos pode ser excluída. Alterar tipo não pode invalidar vínculos.
- Cartão com compras, séries (mesmo canceladas) ou quitações não pode ser
  excluído. Arquivamento é permanente; alteração de fechamento não reescreve
  compras que já registraram o fechamento.
- Quitação é integral e informativa, sem transferência nem nova despesa.
  Seu total é calculado pelo servidor. Mudança nas compras após a prévia exige
  nova revisão; quitação com total diferente exige estorno prévio.
- Recorrências têm âncora original, deslocamento fixo e até 1.200 meses.
  Novas séries usam o deslocamento de São Paulo na data inicial. Parcelamentos
  exigem cartão ativo e 2–120 parcelas; centavos restantes vão para as primeiras.
  Não há cron. Cada prévia gera até 120 ocorrências; mais pendências exigem outra
  prévia. Exclusão de ocorrência não retrocede o cursor nem a recria.
- Meta e limites são independentes. Arquivados preservam consulta e remoção de
  limites, mas não aceitam nova definição. Economia é receita menos despesas;
  investimentos não são descontados novamente.

## Permissões, armazenamento e entrega

Os dois escopos antigos permanecem como padrão quando OAuth não informa `scope`.
O servidor anuncia os 12 escopos disponíveis e a tela de consentimento mostra
cada permissão solicitada. Renovação não amplia escopos. O pacote 0.3.0 solicita
os novos módulos como escopos padrão; uma conexão antiga exige novo consentimento.
Descobrir uma ferramenta não concede permissão de executá-la.

Prévias, resultados e progresso usam `mcpOperations`, já negada aos clientes.
Segredos continuam nas coleções privadas existentes. A quota de 20 prévias/hora
é compartilhada pelos dois fluxos. Permanecem 100 chamadas/hora e 500 novos
lançamentos/dia; cada ocorrência de série consome a quota diária. Resultados de
idempotência permanecem até exclusão da conta. Não há mudança nas regras ou nos
índices versionados; as novas consultas usam índices automáticos simples.

Ao retornar à aba, o aplicativo invalida também categorias e quitações, além
dos demais dados e cursores financeiros. Não há polling ou atualização contínua.

A confirmação na conversa é política do assistente. `confirmed: true` não é
prova criptográfica de aprovação humana. O pacote instrui a exibir a prévia,
aguardar nova mensagem e não contornar bloqueios ou falta de escopos.

### Verificação

Execute os comandos do README. O modo `npm run test:e2e -- --mcp --webpack`
inicia os emuladores e usa webpack no servidor de desenvolvimento; é um fallback
opcional para falhas nativas do Turbopack no Windows. Sem `--webpack`, o comando
mantém o comportamento anterior. A regressão geral usa `npm run test:e2e -- --webpack`.

As validações usam somente `demo-gestone-rules` e `demo-gestone-e2e`. O pacote
versionado não comprova atualização do plugin instalado. Publicação Git em
branch de trabalho não autoriza merge, promoção ou testes com dados reais.

### Resultados em 26/10/2026

Base: `0691f18`, checkout isolado em `.worktrees/mcp-financial-parity`, Node
24.15.0 e npm 12.0.2, sem `.env.local`. As alterações locais de login no checkout
principal foram preservadas. Dependências instaladas por `npm ci --no-audit
--no-fund`, sem alteração de manifesto ou lockfile. A tentativa inicial no
sandbox falhou com `ENOTFOUND`; a instalação autorizada fora dele passou,
mantendo os avisos de peers/depreciação das dependências já fixadas.

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado |
| `npm run typecheck` | Aprovado |
| `npm test -- --runInBand` | 47 suítes e 263 testes aprovados |
| Teste unitário `mcp-finance.test.ts` com `TZ=UTC` e `TZ=Pacific/Honolulu` | 7 testes aprovados em cada fuso |
| `npm run test:rules` | 150 testes aprovados em `demo-gestone-rules` |
| `npm run build` com Firebase fictício | Aprovado; rotas MCP/OAuth dinâmicas |
| `npm run test:e2e -- --mcp --webpack` | 8 fluxos MCP aprovados |
| `npm run test:e2e -- --webpack` completo | 41 aprovados e 2 falhas, em 9,2 minutos |
| Rodada final com filtro temporário `/MCP\|cadastro, CRUD/` | 9 aprovados em 1,9 minuto; configuração restaurada automaticamente |
| Manifests e skill do pacote | JSON/YAML válidos, arquivos MCP equivalentes, 12 escopos, identidade/endpoint preservados |
| `git diff --check` | Sem erros |

Os E2E verificam OAuth real nos emuladores, permissões por módulo sem ampliação
de conexões antigas, compatibilidade dos cursores antigos, páginas vazias com
continuação, valores e competência, lotes atômicos, conflitos, idempotência,
histórico arquivado, cadastros, faturas, orçamentos, parcelas/recorrências,
retomada de cancelamento com 240 ocorrências, quota diária e recusa de agregação
com 5.001 candidatos. Não usam dados nem credenciais de produção.

A suíte geral **não está integralmente verde**:

- `card-deletion.test.ts`: a asserção final esperava zero cartões com o nome
  “Cartão vazio”, mas quatro cartões da própria corrida permaneciam com vínculos.
  A mesma falha, com quatro resultados, foi reproduzida na cópia limpa da base
  `0691f18`, sem esta implementação. Falha preexistente, fora deste escopo.
- `financial-flows.test.ts`, fluxo de exclusão de conta: o servidor de
  desenvolvimento registrou `Manifest file is empty` para `/api/account`, e a
  navegação esperada não ocorreu. O mesmo teste passou isolado tanto na base
  anterior quanto na implementação final. Falha intermitente não reproduzida
  nas rodadas isoladas; não foi atribuída conclusivamente ao código anterior
  nem a esta alteração. Não houve mudança no código de exclusão ou autenticação.

O modo Turbopack inicialmente encerrou o servidor com código nativo Windows
`3221225477`, antes dos testes. O fallback webpack permitiu as execuções acima.
Java e portas locais exigiram execução autorizada fora do sandbox. O runner
encerrou seus emuladores; nenhum processo alheio foi encerrado. A cópia da base
usou as mesmas dependências e configuração fictícia, com webpack e filtro apenas
para os dois testes investigados.

Preview remoto e funcionamento das novas ferramentas no plugin instalado não
foram validados nesta entrega. Isso exige um ambiente HTTPS com configuração
MCP e uma conta de teste autorizada, além de novo consentimento para os módulos.
Não houve merge em `main`, promoção de produção, publicação do pacote na conta,
migração ou publicação de regras/índices.
