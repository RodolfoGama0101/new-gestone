# Busca no extrato — ROD-111

A busca consulta todo o conjunto definido por tipo, categoria, cartão e intervalo, com continuação por cursor. Não se limita aos dez lançamentos que já estavam na tela e não carrega todo o histórico para pesquisar.

O Firestore não oferece busca nativa por trecho de uma descrição. Por isso, cada página de busca lê no máximo 100 candidatos e um documento adicional para detectar continuação, respeitando os filtros e a ordem por data decrescente. O serviço retorna até o tamanho solicitado de correspondências e guarda o cursor do último candidato consumido. Quando encontra uma página cheia, os documentos lidos além desse cursor continuam disponíveis na próxima consulta; quando não encontra nada no lote, a tela oferece **Continuar busca**, sem afirmar que todo o histórico está vazio. Consultas sem texto preservam o limite comum da lista.

Isso limita documentos por requisição e memória, mas uma busca rara em um histórico grande pode exigir várias continuações e leituras proporcionais ao histórico percorrido. Não existe limite silencioso de resultados ou truncamento global. Uma pausa de 300 ms na digitação evita consultar cada alteração rápida do campo. A interface mantém filtros e foco disponíveis durante a busca, permitindo ajustar ou limpar o termo.

Extrato e CSV usam a mesma função de comparação por trecho da descrição, removendo espaços apenas nas extremidades da busca e comparando em minúsculas com locale pt-BR. Acentos continuam significativos. O CSV mantém o comportamento de exportar todos os resultados filtrados, não apenas a página exibida; sua consulta completa preexistente não ganhou um limite implícito.

## Cache e navegação relacionados — ROD-112

A chave serializável representa UID, tipo, categoria, cartão, início/fim em milissegundos, tamanho efetivo da página e termo normalizado. A consulta acrescenta página e ID do cursor; os snapshots completos ficam somente no estado usado para consultar o Firestore. Alterar esses parâmetros reinicia página e cursores. Os prefixos `['transactions', uid]` usados pelas mutações continuam invalidando todas as variações do usuário. Consultas com cinco e dez itens ou com intervalos diferentes não reutilizam páginas incompatíveis.

A ROD-113 acrescenta uma revisão de paginação por usuário a essa identidade. Criações, edições e exclusões confirmadas reiniciam todas as listas do usuário e impedem reutilizar snapshots/páginas da revisão anterior. Veja [a política de recuperação de paginação](transaction-pagination.md).

## Verificação

- Serviço: item 21 entre 25, normalização compartilhada com exportação, lote vazio com continuação, alvo após 100 candidatos, preservação de resultados além da décima correspondência, fim vazio, busca em branco e propagação de erro.
- Hook: reinício ao pesquisar em outra página; separação de resultados e cursores de cinco/dez itens com cache fresco; troca de limite no mesmo consumidor, inclusive retorno ao cache anterior; alteração isolada de cada extremidade do intervalo; datas equivalentes sem reinício; digitação rápida consultando somente o termo final.
- E2E: 25 lançamentos, busca do item 21 desde a primeira página, CSV correspondente, busca a partir da segunda página, limpeza do estado vazio e continuação até o item 130, incluindo retorno para lote sem correspondências.

Lint, TypeScript e 17 suítes/114 testes unitários aprovados. Os cinco E2E completos passaram em Authentication/Firestore locais com projeto `demo-gestone-e2e`. Nenhum dado de produção foi alterado. Build de produção verificado antes de encerrar a tarefa.

As alterações locais anteriores em configuração Next, sessão, layout, botão Google e teste de sessão foram preservadas. O commit anterior de dependências é `edd6fac`; esta correção é uma etapa separada.

## Complemento de regressão — ROD-112

A implementação de cache entregue junto à ROD-111 foi preservada. Os testes adicionais do hook usam TanStack Query real, serviço simulado e cache sempre fresco, para detectar reaproveitamento indevido de página e cursor ao trocar limites ou somente uma das datas. O teste com datas equivalentes confirma que recriar objetos `Date` com os mesmos milissegundos não perde a página atual.

A regressão E2E grava 23 documentos com timestamp idêntico e IDs distintos, em ordem inversa à inserção. Primeiro carrega cinco itens no dashboard e navega pelo link para o extrato, verificando páginas de 10/10/3 itens, cobertura exata sem duplicatas, término e retorno às páginas anteriores. O cursor permanece como snapshot completo: o Firestore usa também o ID para desempatar datas iguais. Substituí-lo por apenas um timestamp pode omitir documentos.

Validação em 21/10/2026: 17 suítes/117 testes aprovados, sete deles na integração do hook; seis E2E aprovados nos emuladores, incluindo datas iguais. Lint e TypeScript aprovados. Esta etapa acrescentou regressões e documentação sobre a implementação existente; não exigiu novo build de produção. No Windows, o launcher Oracle `javapath` travou antes de iniciar os emuladores: usar diretamente `C:\Program Files\Java\jdk-25.0.2\bin` no PATH do processo resolveu. A abertura das portas dos emuladores exigiu execução fora do sandbox.
