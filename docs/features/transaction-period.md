# Período e cartão no extrato — ROD-121

A busca e os campos de tipo, categoria e cartão ficam em Lançamentos. O
critério de data, as duas datas e os atalhos ficam juntos em Período. Valores
e modalidade ficam em Filtros avançados. O cabeçalho oferece Limpar filtros
quando há critérios ativos, e cada filtro ativo também pode ser removido
individualmente.

O extrato persiste busca, tipo, categoria, `startDate`, `endDate` e `creditCardId` na URL. Datas civis são interpretadas no fuso local, do início do primeiro dia ao último milissegundo do último dia. Se ambos os campos estiverem ausentes, usa-se o mês de trabalho; em um intervalo personalizado, um campo ausente deixa esse lado aberto. Datas inexistentes e intervalos invertidos exibem erro junto aos campos e impedem consulta e exportação.

Os atalhos selecionam este mês ou o mês anterior como intervalo personalizado. Na ausência de intervalo personalizado, o extrato usa o mês de trabalho compartilhado. Limpar filtros retorna a esse mês e remove o cartão. Trocar o mês de trabalho remove o intervalo personalizado. Listagem e CSV recebem o mesmo objeto de filtros; o CSV inclui todas as páginas. Qualquer alteração reinicia os cursores da paginação. Cartões arquivados continuam disponíveis para consultar o histórico.

O extrato usa **competência** por padrão: compras no cartão entram na data de fechamento da fatura, e parcelas usam `installmentMonth` mesmo quando a data do lançamento foi editada. O seletor de critério também permite consultar pela data da compra. Registros antigos usam o fechamento do cartão ou, se indisponível, o padrão histórico de dia 10. Listagem e CSV aplicam os mesmos critérios. Os serviços mantêm a data da compra como padrão para consumidores existentes; a consulta por compra usa `dateBasis: 'purchase'`.

Consultas por competência não restringem candidatos pela data da compra. Percorrem o histórico em lotes de até 100 candidatos mais um documento de verificação, ordenados pela data registrada e ID. Um lote pode não conter resultados e ainda permitir continuação. Exportações e agregações percorrem todos os lotes; falhas, cancelamento e totais fora do limite de inteiro seguro não produzem resultado parcial. Históricos extensos podem exigir muitas leituras do Firestore; não há migração de dados nesta versão. As combinações de tipo, categoria e cartão usam os índices existentes em `firestore.indexes.json`.
