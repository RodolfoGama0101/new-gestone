# Recuperação de paginação — issue #35

Após criação, edição ou exclusão confirmada, a lista mantém a página desejada quando ela ainda existe. Se o fim do conjunto recuar, a navegação retorna à última página válida; uma lista vazia permanece na página 1. Falhas de gravação não mudam a posição. Mês, filtros e tamanho da página reiniciam a navegação.

`invalidateTransactionData` incrementa uma revisão por UID e invalida as consultas derivadas. A revisão separa as respostas antigas das novas. `useTransactions` reconstrói sequencialmente a consulta desde o início, usando snapshots completos para alcançar a página desejada, sem reutilizar cursores anteriores à gravação. Uma página vazia com continuação permanece navegável. A reconstrução pode exigir leituras proporcionais à página solicitada; uma falha é exibida e pode ser repetida.

A posição é mantida no cache do QueryClient por usuário, lista e identidade dos filtros, permitindo restaurá-la ao remontar a mesma lista enquanto o cache existir. Não é sincronizada entre abas ou dispositivos. Os filtros mantêm seu contexto na URL. A invalidação compartilhada continua atendendo ao formulário, às séries, às faturas e aos demais caminhos de gravação.
