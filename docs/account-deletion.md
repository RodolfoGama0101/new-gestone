# Exclusão de conta — ROD-95

`DELETE /api/account` exige simultaneamente cookie de sessão válido e `Authorization: Bearer <ID token>` do mesmo UID. Ambos são verificados pelo Firebase Admin com checagem de revogação antes de qualquer exclusão.

O servidor aceita `auth_time` inteiro entre agora e cinco minutos atrás, inclusive. Token ausente, renovado a partir de login antigo, expirado, revogado ou de outro usuário não autoriza a exclusão. A data de emissão (`iat`) não substitui a autenticação recente. Essa política segue o uso de `auth_time` descrito na [documentação do Firebase](https://firebase.google.com/docs/auth/admin/manage-cookies).

O fluxo de configurações mantém a confirmação e a reautenticação existentes. Após confirmar a identidade, solicita `getIdToken(true)` e envia o token junto com o cookie; não precisa recriar a sessão. Se a confirmação expirar, o diálogo é reaberto. Senha e token não são incluídos nos logs da rota ou em mensagens de erro. O suporte ao provedor Google foi acrescentado na ROD-96, descrita abaixo.

As checagens de origem foram preservadas. Respostas usam `Cache-Control: no-store`; o cookie é removido somente após excluir os dados e o usuário com sucesso.

## Verificação

Os testes de unidade da rota usam Firebase Admin simulado e verificam sucesso, ausência de cookie/token, autorização malformada, UID divergente, autenticação antiga/futura/inválida, limite de cinco minutos, token expirado/revogado, sessão expirada/revogada, usuário desabilitado, origem externa e falha no armazenamento. Os testes do cliente verificam renovação/envio do token, interrupção quando a renovação falha e propagação de erros para a interface.

Validação local: lint, TypeScript, 4 suítes/31 testes (25 novos) e build de produção aprovados.

Não foram excluídas contas reais. A exclusão entre Firestore e Authentication mantém a sequência preexistente e não é uma transação atômica: falhas após remover os dados e antes de remover o usuário ainda podem deixar uma exclusão parcial. Testes integrados com emulador/preview continuam sendo trabalho da ROD-105.

## Confirmação com Google — ROD-96

O diálogo usa os métodos de `providerData` do usuário observado pelo AuthProvider:

- Somente Google: oferece **Confirmar com o Google**, sem campo ou exigência de senha.
- Somente email/senha: mantém a confirmação com a senha atual.
- Google e senha vinculados: oferece as duas opções; o usuário escolhe uma delas.
- Sem método suportado ou sem usuário: não oferece confirmação; orienta a entrar novamente.

Google usa `reauthenticateWithPopup` no usuário conectado, com seleção explícita de conta, conforme a [API do Firebase](https://firebase.google.com/docs/reference/js/auth#reauthenticatewithpopup). Não usa login para trocar de identidade. Conta divergente, erro, cancelamento e bloqueio do pop-up não chamam a ação sensível. Se o navegador impedir pop-ups, a mensagem orienta permiti-los ou abrir o aplicativo no navegador; não há redirecionamento que retome uma exclusão automaticamente.

Cancelar ou fechar o diálogo invalida a tentativa pendente, mesmo que o Firebase responda depois. Fechar, reabrir ou trocar de usuário descarta a senha anterior e o resultado pendente. Há bloqueio de tentativas simultâneas. Após sucesso, o mesmo fluxo da ROD-95 solicita o token atualizado e mantém a validação de sessão, UID, revogação e autenticação recente no servidor.

Os testes de interface usam o diálogo real com SDK Firebase e rede simulados. Cobrem os métodos isolados e vinculados, envio do token após confirmação, senha incorreta, cancelamento do Google, conta divergente, pop-up bloqueado, erro de rede, nova tentativa, cancelamento durante confirmação, fechamento/reabertura, troca de conta, cliques repetidos e provedor não suportado. Nenhuma conta real foi excluída; OAuth real em preview ainda requer validação com contas de teste.

Validação local da ROD-96: lint, TypeScript, 5 suítes/46 testes (15 novos) e build de produção aprovados. O ambiente de interface `jest-environment-jsdom` foi adicionado como dependência de desenvolvimento, com o padrão Node preservado para as outras suítes.
