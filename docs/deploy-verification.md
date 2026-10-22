# Verificação de publicação — ROD-107

A infraestrutura de manutenção foi implementada no commit `edd6fac`: Actions por SHA, Node/npm explícitos, Firebase CLI pelo lockfile, Dependabot semanal, verificação compartilhada, contrato JSON/ADC e rollback documentado. O fato de o commit existir localmente não comprova execução no GitHub ou funcionamento do runtime hospedado.

## Verificação do preview

Use uma conta de teste existente de e-mail/senha e um canal Firebase Hosting de preview. Configure no ambiente do processo, sem colocar valores em comandos versionados ou logs:

- `PREVIEW_ORIGIN`: origem HTTPS completa do canal, no formato `https://new-gestone--CANAL.web.app`.
- `PREVIEW_PROJECT_ID`: `new-gestone`.
- `PREVIEW_API_KEY`: chave pública Firebase do projeto.
- `PREVIEW_TEST_EMAIL` e `PREVIEW_TEST_PASSWORD`: credenciais da conta de teste.

Execute `npm run test:preview`. O script não carrega `.env.local`, não cria contas e rejeita o domínio de produção, URLs com credenciais, caminhos e redirecionamentos. Não use conta pessoal ou dados financeiros reais.

A verificação faz login no Firebase cliente, cria cookie de sessão HttpOnly/Secure/SameSite=Lax com resposta não cacheável, lê o perfil da conta com ID token, verifica a recusa de acesso anônimo e valida o cookie no servidor. Para verificar também o transporte/permissões do Admin Firestore, chama a rota de remoção de categoria com um ID de sondagem novo, gerado por UUID aleatório. O resultado esperado é 404 após a leitura transacional de um documento inexistente; nenhum documento é criado ou removido. Falhas de IAM/ADC, autenticação ou transporte não são aceitas como sucesso. O script solicita ainda renovação do cookie e o expira ao terminar, inclusive após falha. Tokens, cookies, senha e respostas não são salvos em arquivos ou impressos.

Um perfil inexistente pode responder 404 ao cliente, pois o aplicativo não exige o documento `/users/{uid}`; 403 não é aceito. O teste não substitui uma verificação visual de login Google, que depende dos domínios autorizados e de interação com a conta de teste.

Confirme separadamente no runtime que `FIREBASE_SERVICE_ACCOUNT_KEY` não está definida e que a identidade de serviço possui as permissões necessárias. O script comprova as operações Admin, mas uma resposta HTTP não distingue ADC de um JSON de conta de serviço. Não copie credenciais de deploy para o bundle, workflow ou documentação.

## Evidências para encerrar

1. Publicar a branch de revisão e abrir PR; registrar SHA, URL e resultados dos jobs de qualidade, E2E e preview.
2. No preview, executar a verificação acima com conta de teste e confirmar a configuração ADC do runtime; registrar apenas origem, SHA, verificações e resultados, sem dados da conta.
3. Após o Dependabot passar a executar na branch padrão, registrar um PR real e seus checks. Um arquivo de configuração ou PR manual não comprova que o bot abriu uma atualização.
4. A promoção para a `main` executa publicação de regras/índices e Hosting. Não confundir o preview com essa promoção. O rollback permanece descrito no README.

## Estado confirmado em 21/10/2026

O remoto ainda aponta para `b96b616`; `edd6fac` e os commits posteriores existem apenas localmente. A consulta de PRs não encontrou PRs no repositório. Há acesso de leitura ao GitHub e uma sessão Firebase local, mas isso não comprova credenciais/permissões do runtime hospedado.

Uma tentativa de publicar `edd6fac` na branch `codex/rod-107-reproducible-deploy` foi recusada pela revisão automática por exigir autorização explícita de envio do código a esse destino. Nenhum push, PR ou deploy foi executado. A ROD-107 deve permanecer em andamento até as comprovações remotas; os testes simulados do verificador não são um teste remoto bem-sucedido.
