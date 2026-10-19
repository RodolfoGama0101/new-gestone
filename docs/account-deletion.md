# Exclusão de conta — ROD-95

`DELETE /api/account` exige simultaneamente cookie de sessão válido e `Authorization: Bearer <ID token>` do mesmo UID. Ambos são verificados pelo Firebase Admin com checagem de revogação antes de qualquer exclusão.

O servidor aceita `auth_time` inteiro entre agora e cinco minutos atrás, inclusive. Token ausente, renovado a partir de login antigo, expirado, revogado ou de outro usuário não autoriza a exclusão. A data de emissão (`iat`) não substitui a autenticação recente. Essa política segue o uso de `auth_time` descrito na [documentação do Firebase](https://firebase.google.com/docs/auth/admin/manage-cookies).

O fluxo de configurações mantém a confirmação e a reautenticação existentes. Após confirmar a identidade, solicita `getIdToken(true)` e envia o token junto com o cookie; não precisa recriar a sessão. Se a confirmação expirar, o diálogo é reaberto. Senha e token não são incluídos nos logs da rota ou em mensagens de erro. O suporte ao provedor Google no diálogo pertence à ROD-96.

As checagens de origem foram preservadas. Respostas usam `Cache-Control: no-store`; o cookie é removido somente após excluir os dados e o usuário com sucesso.

## Verificação

Os testes de unidade da rota usam Firebase Admin simulado e verificam sucesso, ausência de cookie/token, autorização malformada, UID divergente, autenticação antiga/futura/inválida, limite de cinco minutos, token expirado/revogado, sessão expirada/revogada, usuário desabilitado, origem externa e falha no armazenamento. Os testes do cliente verificam renovação/envio do token, interrupção quando a renovação falha e propagação de erros para a interface.

Validação local: lint, TypeScript, 4 suítes/31 testes (25 novos) e build de produção aprovados.

Não foram excluídas contas reais. A exclusão entre Firestore e Authentication mantém a sequência preexistente e não é uma transação atômica: falhas após remover os dados e antes de remover o usuário ainda podem deixar uma exclusão parcial. Testes integrados com emulador/preview continuam sendo trabalho da ROD-105.
