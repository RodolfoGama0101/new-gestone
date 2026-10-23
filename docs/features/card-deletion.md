# Exclusão de cartões

A ação **Excluir cartão** em `/credit-cards` é separada de **Arquivar** e exige
uma confirmação que identifica o cartão. Cartões vazios podem ser excluídos
permanentemente, inclusive quando já estão inativos ou arquivados.

Compras, séries (inclusive canceladas) e registros de quitação impedem a
exclusão. A resposta explica o bloqueio e orienta usar Arquivar. Nenhum vínculo
é apagado, desvinculado ou alterado, e uma tentativa bloqueada não arquiva o
cartão automaticamente. As faturas e os valores permanecem disponíveis.

O cliente envia `DELETE /api/credit-cards/{cardId}` com a sessão. A rota verifica
origem, sessão revogada, UID e ID do cartão; o UID vem somente da sessão, nunca
do corpo da requisição. Respostas usam `Cache-Control: no-store`. O servidor
consulta o cartão e até um vínculo de cada coleção dentro da mesma transação
Admin antes de excluí-lo. O desenho usa o [isolamento serializável do Firestore](https://firebase.google.com/docs/firestore/transaction-data-contention).
As consultas são de igualdade simples, usando os índices existentes. Acesso a
cartão de outro UID retorna não encontrado e não altera seu cadastro.

Exclusão direta pelo SDK cliente continua negada pelas regras. Não há mudança
de schema, regras ou índices a publicar. A rota precisa das mesmas credenciais
Admin e configuração de sessão usadas pelas outras rotas autenticadas.

A confirmação bloqueia novas solicitações e fechamento durante o envio.
Erros aparecem no próprio diálogo e permitem tentar novamente ou cancelar.
Após a exclusão, as consultas do UID são invalidadas, a seleção se ajusta ao
próximo cartão disponível e a carteira vazia oferece o primeiro cadastro.

## Verificação em 23/10/2026

- `npm run lint -- --ignore-pattern '.worktrees/**' --ignore-pattern 'dogfood-output/**'`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test -- --runInBand --testPathIgnorePatterns '/node_modules/' '/.worktrees/' '/dogfood-output/'`: 40 suítes e 217 testes aprovados.
- `npm run test:rules`: 145 testes aprovados na cópia isolada, porta 28082.
- Build de produção aprovado na cópia isolada, com as variáveis fictícias do script E2E.

A validação usa `dogfood-output/cards-validation/`, sem `.env.local`, projetos
`demo-gestone-e2e` e `demo-gestone-rules`, aplicação em 3212 e emuladores E2E
em 29099/28081. Portas e guardas foram adaptadas somente nessa cópia porque
as portas padrão estão ocupadas. O Firebase CLI deixou processos Java da
validação anterior abertos; eles foram identificados pelo caminho da cópia e
encerrados, preservando os processos externos. A repetição dos E2E reutiliza o
build aprovado com um modo `--built` existente somente no runner da cópia.
Lint/Jest excluem as cópias anteriores em `.worktrees` e os artefatos de QA,
sem mudar configurações versionadas. A primeira rodada apontou uma asserção
que tentava acessar o conteúdo por trás do modal; a verificação foi corrigida
para cancelar o modal antes de conferir o cartão preservado.

A execução final aprovou **34 E2E/PWA**, incluindo exclusão de cartão ativo e
arquivado vazios, cancelamento, bloqueio por compras/séries canceladas/quitação,
isolamento por UID, rejeição de origem externa e quatro corridas com compras
ou pagamentos feitos por um cliente Firebase autenticado independente. As
corridas verificam que nenhum vínculo permaneça sem cartão. Capturas da
confirmação móvel e do bloqueio no desktop foram revisadas em
`dogfood-output/cards-validation/dogfood-output/card-deletion/`.
Nenhuma regra, índice ou dado de produção foi publicado ou alterado.
