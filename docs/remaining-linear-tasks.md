# Tarefas finais do lote

## ROD-99 — Competência

Uma função comum determina a data efetiva: data original para débito/receita/investimento, fechamento da fatura para cartão. Dashboard, série diária, histórico e filtros dos relatórios usam essa função. A construção direta da data de fechamento evita transbordamento de janeiro para março em fevereiro. O último saldo diário coincide com o total mensal.

Novas compras guardam `cardClosingDay`; alterações posteriores no cartão não mudam essa competência. Editar a mesma compra preserva o fechamento; trocar o cartão registra o fechamento do novo cartão. Dados antigos sem esse campo continuam usando o cadastro atual (dia 10 quando ausente). O formulário de edição do cartão avisa explicitamente sobre essa limitação; não há migração silenciosa de dados históricos. As regras impedem mudar um fechamento já registrado mantendo cartão e tipo.

## ROD-100 — Faturas completas

A fatura consulta todas as compras de um intervalo limitado a dois meses de compra e filtra pela competência selecionada. O SDK entrega o resultado completo, sem o limite de 100 itens da lista comum. A paginação visual de 20 itens não altera o total. Navegação usa datas reais (inclusive dezembro/janeiro), com estados de erro e nova tentativa separados do vazio. Consultas usam o índice existente de cartão/data.

## ROD-101 — Períodos e referência temporal

Todas as consultas analíticas têm início e fim. A comparação mensal inclui dois meses anteriores de compras para abranger a fatura do mês comparativo. Reservas têm consulta própria limitada às compras do mês selecionado até a referência. Relatórios incluem margem de um mês anterior e filtram por competência antes de somar KPIs, distribuição e histórico. O relógio de referência atualiza à meia-noite e no retorno à aba; período e dia compõem as chaves, com staleTime de um minuto. A seleção manual do mês do dashboard é preservada, e relatórios acompanham o mês da nova referência.

## ROD-102 — Renovação da sessão

Inicialização e login sincronizam a sessão; renovações de token do mesmo usuário renovam o cookie no máximo uma vez por dia, antes do limite de cinco dias. Web Locks serializa operações entre abas e localStorage guarda somente UID/data, nunca tokens. Sem essas APIs, a fila existente e a marca em memória mantêm funcionamento por aba (pode haver uma chamada extra entre abas). Falha não grava sucesso; revogação é verificada no servidor e o fluxo existente encerra a autenticação em falhas. Logout continua na mesma fila e remove a marca quando o UID ainda está disponível. Novo login força sincronização independentemente da marca.

## ROD-103 — Remoção de categorias

O endpoint autenticado deriva o UID da sessão, nunca do payload. Primeiro uma transação do Admin arquiva a categoria, fechando a entrada de novos vínculos pelas regras; depois outra consulta seus vínculos e exclui somente se vazia. Categoria utilizada permanece arquivada, sem trocar ID/nome. Falha entre as fases deixa um arquivo seguro e permite repetir a operação. Clientes não podem excluir categorias diretamente nem mudar seu estado de arquivamento. Categorias arquivadas não aceitam novos vínculos, mas permitem editar lançamentos que já as utilizam. Relatórios, filtros e CSV continuam recebendo o cadastro completo; apenas a lista de categorias ativas e o formulário de novos lançamentos ocultam as arquivadas.

## ROD-105 — Regressões e E2E no CI

O runner isola Authentication/Firestore em projetos `demo-`, sobrescreve as variáveis públicas e limpa credenciais explícitas herdadas. O cliente recusa ativar emuladores com projeto real; o servidor exige os endereços locais esperados. O SDK Admin usa o suporte padrão ao emulador. Detecção de metadados GCP fica desabilitada no processo de teste.

Playwright testa cadastro, login em contexto novo, criação/edição/exclusão de despesa, filtros, exportação CSV com categoria arquivada, rejeição da exclusão de conta sem prova recente, reautenticação e exclusão real nos emuladores. Também verifica fatura com 105 compras, saldo, cinco corridas entre inserção e remoção de categoria e isolamento entre usuários. O fluxo revelou e corrigiu disputa de navegação após exclusão de conta, descartando o estado autenticado com navegação completa.

CI tem job E2E independente, sem secrets, com Java 21, Chromium e artefatos de relatório/screenshot/trace. Diretórios de evidências são ignorados pelo Git e ESLint. A execução remota do CI continua dependendo de push e execução do GitHub Actions; nenhuma regra foi publicada nem houve leitura de dados reais.

Validação conjunta local: 101 testes de domínio/interface/rotas, 117 testes de regras e 4 E2E aprovados. Lint, TypeScript e build de produção também são verificados antes de encerrar o lote. Permanecem fora deste lote: migração dos fechamentos antigos, migração idempotente de categorias (ROD-104), políticas de cache PWA e itens em Backlog.

No Windows com o launcher Oracle javapath, o Java do Firestore pode permanecer aberto após o encerramento do Firebase CLI. Nesta validação, o processo foi identificado pelo projeto fictício e pelo arquivo de regras deste repositório e encerrado; outras JVMs não foram afetadas. Se uma nova execução indicar porta ocupada, confira o processo desse emulador antes de repeti-la.
