# Arquivamento de cartões — ROD-115

Remover um cartão agora significa arquivá-lo permanentemente, com ou sem compras. Uma única atualização marca `archived: true` e `isActive: false`; não há consulta prévia nem exclusão do documento. Cartões antigos sem `archived` continuam funcionando como antes. A exclusão integral da conta mantém seu fluxo Admin existente.

O cartão permanece na lista, identificado como arquivado, com faturas acessíveis. O cadastro arquivado não oferece edição nem outro arquivamento na interface. Novos lançamentos ocultam o cartão; a edição de uma despesa que já o utiliza mantém essa opção, identificada como arquivada. Os serviços de leitura continuam devolvendo todos os cartões para preservar nomes, relatórios e o fechamento de compras antigas sem `cardClosingDay`.

As regras Firestore negam exclusão direta de cartões, inclusive vazios, e impedem reativar, substituir ou editar o cadastro após arquivar (somente `updatedAt` pode mudar, permitindo repetição segura). Arquivar exige também `isActive: false`. A existência e o estado da referência são verificados por `getAfter`: cartão arquivado não aceita criação ou troca de vínculo, nem mesmo em lote com o arquivamento. Uma despesa já vinculada continua editável e pode ser desvinculada; depois disso, não pode voltar ao cartão arquivado. O fechamento registrado na compra continua protegido pelas regras existentes.

Sob concorrência, se a compra for autorizada primeiro, o cartão é preservado com seu vínculo; se o arquivamento vencer, a nova compra é rejeitada. Em ambos os casos, a referência nunca é removida. Formulários antigos abertos em outra aba podem apresentar a opção até recarregarem o cadastro, mas as regras impedem a gravação de novos vínculos.

O arquivamento não altera o nome, fechamento ou compras, não migra registros antigos e não elimina referências órfãs preexistentes. A política de cartões apenas inativos (sem arquivamento) continua no escopo separado da ROD-116. As regras devem ser publicadas junto à versão do aplicativo, pelo fluxo normal de deploy, antes de disponibilizar a ação.

Regressões: a suíte Firestore cobre arquivamento vazio/utilizado, repetição, exclusão direta negada, reativação/substituição/alteração negadas, edição histórica com fechamento preservado, novas referências negadas, lote com arquivamento e cinco corridas concorrentes. Os cenários sequenciais cobrem deterministicamente os dois resultados possíveis da corrida. O E2E arquiva um cartão com 104 compras e verifica fatura acessível, ausência no novo lançamento e edição histórica preservando cartão e fechamento.

Validação em 21/10/2026: 122 testes de regras aprovados, incluindo corridas com dois clientes independentes; 18 suítes/120 testes do aplicativo e seis E2E aprovados. Lint, TypeScript e build de produção aprovados; o build regenerou o service worker versionado. Os emuladores usaram somente projetos `demo-`; nenhuma regra foi publicada ou dado real acessado.
