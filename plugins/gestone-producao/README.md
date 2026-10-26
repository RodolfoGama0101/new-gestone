# GestOne Produção

Fonte do plugin privado instalado, preservando a identidade
`plugins_6add2fde1d888191bfc1e933c630186b`, o nome `gestone-producao`, o endpoint
`https://new-gestone.vercel.app/api/mcp` e o cliente OAuth `gestone-chatgpt`.
Não substitui o plugin App-backed “GestOne” nem o pacote “GestOne Teste”.

A versão 0.3.0 acrescenta instruções para as 15 ferramentas do servidor MCP e
operações financeiras com prévia e confirmação. Manifesto, overlay de
compatibilidade e skill foram derivados da versão privada 0.1.0 existente.
Os três prompts, sua ordem, a apresentação, o autor e a audiência privada são
preservados; descrição e versão refletem a funcionalidade atual.

`baseScopes` preserva leitura/escrita de lançamentos. `defaultScopes` também
solicita leitura/escrita de categorias, cartões, faturas, séries e orçamentos.
Publicar o pacote não amplia tokens já emitidos. Para usar esses módulos, o
usuário deve atualizar o plugin instalado e reconectar/autorizá-lo com os novos
escopos. A tela de consentimento do GestOne lista as permissões solicitadas.
As funções antigas continuam com os escopos anteriores.

Na conexão MCP personalizada App-backed, use “Atualizar ferramentas” após o
deploy e confira o catálogo com 15 ferramentas. Se ela continuar solicitando
somente `transactions:read transactions:write`, reconfigure o consentimento
para incluir os escopos dos módulos desejados. Não amplie a allowlist de contas
do servidor nem transfira a conexão de teste para produção.

Atualizações pela ferramenta Plugin Creator devem usar o ID e o release atual
confirmados, preservar a audiência e ler os arquivos publicados de volta.
O arquivo de atualização inclui somente `plugin.json`, `.codex-plugin/plugin.json`,
`mcp.json`, `.mcp.json` e `skills/gestone-producao/SKILL.md`. Este README é documentação
do repositório, não um novo componente do plugin. Nenhuma credencial é empacotada.
