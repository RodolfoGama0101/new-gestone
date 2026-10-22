# Período e cartão no extrato — ROD-121

O extrato persiste busca, tipo, categoria, `startDate`, `endDate` e `creditCardId` na URL. Datas civis são interpretadas no fuso local, do início do primeiro dia ao último milissegundo do último dia. Campos ausentes deixam esse lado do intervalo aberto. Datas inexistentes e intervalos invertidos exibem erro junto aos campos e impedem consulta e exportação.

Os atalhos selecionam este mês ou o mês anterior. Limpar filtros remove também período e cartão. Listagem e CSV recebem o mesmo objeto de filtros; o CSV inclui todas as páginas. Qualquer alteração reinicia os cursores da paginação. Cartões arquivados continuam disponíveis para consultar o histórico.

O período usa **data da compra**, e não competência da fatura. A interface explicita essa diferença. As combinações de tipo, categoria e cartão têm índices compostos em `firestore.indexes.json`; sua publicação exige uma operação autorizada separada da entrega de código.
