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
