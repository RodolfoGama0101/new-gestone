# Recuperação de paginação — ROD-113

Após uma criação, edição ou exclusão bem-sucedida, todas as listas paginadas do usuário no mesmo QueryClient voltam à página 1, preservando seus filtros e limites. Essa política também vale para as mutações próprias do TransactionForm e para exclusões pela fatura. Uma falha de gravação não reinicia a navegação.

`invalidateTransactionData` concentra a invalidação de lançamentos, análises, histórico analítico e cartões. Antes dela, incrementa uma revisão de paginação por usuário no cache. `useTransactions` observa essa revisão como estado local do TanStack Query, sem consulta de rede, e a inclui na identidade dos filtros/consultas. A revisão reinicia página e cursores e impede recuperar páginas da revisão anterior, mesmo quando um cursor mantém o mesmo ID mas seu snapshot/data mudou. Invalidar somente os resultados não garantia isso: a página ativa podia refazer uma consulta com o snapshot antigo e voltar ao cache como fresca.

O formulário não precisa montar um hook de listagem para avisar as listas. Novos caminhos que alterem lançamentos devem chamar o mesmo helper após confirmar a gravação. Consultas de fatura mantêm suas chaves existentes e recebem a invalidação normal. As revisões são isoladas por usuário e ficam no cache da sessão; não são gravadas no Firestore nem sincronizadas entre abas/dispositivos.

No componente compartilhado de receitas/despesas/investimentos, os controles de paginação ficam fora da condição de lista não vazia, como já ocorria no extrato após a ROD-111. Uma página vazia com cursor anterior continua oferecendo retorno. Não há retorno automático em lotes vazios de busca textual: eles podem ter mais candidatos, conforme a política de busca existente.

Regressões do hook cobrem criação/edição/exclusão com dois consumidores simultâneos, troca da revisão com o mesmo ID de cursor, nova navegação sem cache antigo, invalidação externa ao hook, isolamento por usuário e falha sem perda da página. Os E2E do extrato e de despesas começam com 11 lançamentos: excluem o único da página 2, criam pelo formulário, movem um lançamento por edição da data, criam novamente a partir da página 2 e verificam o conjunto completo sem perdas ou repetições ao avançar e retornar.

Validação em 21/10/2026: 18 suítes/125 testes e oito E2E aprovados; lint, TypeScript e build de produção aprovados. O build regenerou o service worker versionado. Os E2E usaram somente os emuladores do projeto `demo-gestone-e2e`; sem commit, deploy ou alteração de dados reais.
