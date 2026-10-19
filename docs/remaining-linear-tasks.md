# Tarefas finais do lote

## ROD-99 — Competência

Uma função comum determina a data efetiva: data original para débito/receita/investimento, fechamento da fatura para cartão. Dashboard, série diária, histórico e filtros dos relatórios usam essa função. A construção direta da data de fechamento evita transbordamento de janeiro para março em fevereiro. O último saldo diário coincide com o total mensal.

Novas compras guardam `cardClosingDay`; alterações posteriores no cartão não mudam essa competência. Editar a mesma compra preserva o fechamento; trocar o cartão registra o fechamento do novo cartão. Dados antigos sem esse campo continuam usando o cadastro atual (dia 10 quando ausente). O formulário de edição do cartão avisa explicitamente sobre essa limitação; não há migração silenciosa de dados históricos. As regras impedem mudar um fechamento já registrado mantendo cartão e tipo.
