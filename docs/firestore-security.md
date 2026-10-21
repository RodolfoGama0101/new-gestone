# Regras e testes do Firestore — ROD-97

## Política dos dados

Somente o usuário autenticado cujo UID coincide com o caminho `/users/{uid}` pode ler ou escrever seu perfil, categorias, cartões e lançamentos. Acesso anônimo, consultas globais de usuários e subcoleções desconhecidas continuam negados. Clientes não podem acrescentar campos fora do esquema nem alterar `createdAt` em atualizações.

Lançamentos aceitam valores inteiros de 1 a `Number.MAX_SAFE_INTEGER` em centavos (9.007.199.254.740.991). Isso mantém a representação exata no JavaScript. Tags devem ser listas com até 20 strings, cada uma entre 1 e 40 caracteres. O formulário aplica os mesmos limites e mostra o erro de tags antes de tentar gravar.

A categoria deve existir dentro do mesmo usuário e ter o tipo do lançamento ou `both`, conforme o filtro já usado pelo formulário. `creditCardId` pode estar ausente ou ser nulo; quando preenchido, exige despesa e um cartão existente dentro do mesmo usuário. IDs não podem conter barras. Cartão inativo continua válido para não bloquear edição do histórico.

As referências são verificadas com `getAfter`, considerando o resultado do lote: criar categoria/cartão junto com um lançamento é permitido; apagar a referência e criar/atualizar um lançamento que depende dela no mesmo lote é negado. Há até duas consultas adicionais de referência por gravação, sujeitas aos [limites e à cobrança de leitura das regras](https://firebase.google.com/docs/firestore/security/rules-conditions#access_other_documents).

O aplicativo atual guarda nome e credenciais no Firebase Authentication e não grava um perfil no Firestore. Para o documento opcional `/users/{uid}`, o esquema permitido é `createdAt` e `updatedAt` como timestamps, mais `displayName` opcional/nulo ou string de 1 a 50 caracteres. Campos como `admin`, `role` e e-mail arbitrário são negados. Subcoleções não dependem da criação do documento de perfil. Essa regra não adiciona sincronização de nome com Authentication.

## Execução e CI

```bash
npm ci
npm run test:rules
```

Requer Node.js 24 e Java 21 ou superior. Firebase CLI 15.34.0 e `@firebase/rules-unit-testing` 5.0.2 estão fixados no lockfile; a versão 5 é compatível com o Firebase cliente 12. O primeiro uso pode baixar o binário do emulador para o cache local.

O comando inicia Firestore em `127.0.0.1:8080`, usando `firebase.rules-test.json` e o projeto de demonstração `demo-gestone-rules`. O prefixo `demo-` impede uso de serviços reais. A suíte também exige explicitamente o endereço local e não usa `.env.local`, conta de serviço ou login Firebase. Cada teste limpa o banco emulado e cria dados fictícios com regras desabilitadas; as operações verificadas usam contextos autenticados ou anônimos com as regras ativas.

O Jest padrão não carrega a suíte de regras: ela tem configuração própria, para falhar claramente quando executada sem emulador e não exigir Java nos testes de unidade. Os três workflows existentes executam as regras com Java 21 antes do build e das etapas de publicação.

Validação local: **114 testes no emulador**, **61 testes do aplicativo**, lint, TypeScript e build de produção aprovados. No Windows deste ambiente, o processo Java permaneceu aberto após o encerramento reportado pelo CLI; ele foi identificado pelo projeto `demo-gestone-rules` e encerrado ao concluir. Se a porta 8080 estiver ocupada em outra execução, confira seu processo antes de encerrar somente o emulador de teste correspondente.

## Alcance e limitações

As regras reforçam novas gravações e atualizações; não migram nem removem dados antigos. Antes de publicar, referências órfãs, tipos incompatíveis, perfis fora do esquema e tags antigas fora dos limites precisam de inspeção em ambiente autorizado: eles continuarão legíveis pelo dono, mas uma edição exigirá corrigir o payload. A migração automática de categorias preexistente também deve ser considerada nessa inspeção.

A exclusão direta de categorias e cartões é negada. Categorias usam o fluxo autenticado de arquivamento/remoção da ROD-103. Cartões usam [arquivamento permanente](card-archival.md), inclusive quando vazios: as regras fecham novos vínculos e preservam o cadastro para consulta e edição do histórico. Alterar o tipo de uma categoria não arquivada ainda pode afetar lançamentos antigos. As regras não restringem o Admin SDK, que depende das credenciais e da validação das rotas do servidor.

Nenhuma regra foi publicada nem dado de produção acessado nesta implementação. A execução remota dos workflows só poderá ser confirmada após push/PR.

## Dependências das ferramentas

A inclusão do Firebase CLI acrescentou pacotes de desenvolvimento e levou o audit completo de 33 para 38 pacotes sinalizados (0 críticos, 17 altos e 21 moderados). O recorte `--omit=dev` permaneceu em 8 altos e 0 críticos/moderados. Os novos registros incluem propagação das exceções já documentadas na ROD-94 e `@opentelemetry/core` 1.30.1, via Firebase CLI → Pub/Sub. A atualização compatível não encontra patch para essa faixa 1.x; não foi forçada migração de major de uma dependência interna. A ferramenta é executada localmente e no CI, sem servir endpoints de aplicação ou coletar dados de produção nos testes. Essa exceção deve ser revista com atualizações do CLI e não altera as dependências de runtime do aplicativo.
