# Redesign Geist — ROD-127

Referência: `DESIGN.md` e https://vercel.com/design.md.

## Identidade preservada

Reutilizar `src/components/shared/logo.tsx` sem substituir símbolo, lettering,
proporções ou variantes. O ícone ilustrativo do protótipo não substitui a logo.

## Etapas

1. Base visual: tokens dos temas e componentes compartilhados.
2. Navegação: sidebar, cabeçalho e navegação móvel.
3. Autenticação: entrar, criar conta e recuperar senha.
4. Painel e listas: extrato, receitas, despesas e investimentos.
5. Formulários: lançamento e importação CSV.
6. Cartões e planejamento: faturas, séries e orçamentos.
7. Relatórios, categorias, configurações e estado offline.

## Implementação iniciada

- Tokens neutros do tema claro e contraste de foco/links nos dois temas.
- Mapeamento dos tokens de sidebar e superfícies para utilitários Tailwind.
- Controles padrão de 40 px, variante grande de 48 px, cartões com espaçamento
  de 24 px e diálogos com superfície e elevação compartilhadas.
- Sidebar de 224 px, cabeçalho de 64 px e conteúdo limitado a 1.200 px.
- Navegação móvel com menu expansível e rolagem em telas baixas.
- Estrutura centralizada compartilhada entre login, cadastro e recuperação,
  reutilizando a logo original e preservando formulários, erros e foco.

- Painel com resumos neutros antes do saldo projetado, curva ampliada e histórico
  em uma seção de largura completa. Os valores, reservas e explicações mantêm
  os mesmos dados e cálculos.
- Extrato e listas por tipo com espaçamento de 24 px, textos secundários de
  pelo menos 12 px e linhas com ações visíveis. Cabeçalhos de datas respeitam
  a altura atual do cabeçalho da aplicação.
- Formulário com seleção neutra de tipo e botões empilhados em telas estreitas;
  prévia CSV com tabela, cabeçalhos e arquivo visualmente delimitados.

Os layouts específicos de cartões, faturas, séries, orçamentos, relatórios,
categorias, configurações e offline continuam pendentes. A tarefa permanece em
andamento até validar todo o escopo.

## Verificação local

O E2E em desenvolvimento pode ser impedido por outro `next dev` aberto no
mesmo diretório, mesmo usando portas distintas. Não encerrar esse processo.
Para a revisão desta etapa, foi preparada uma configuração temporária em
`dogfood-output/` para executar a suíte existente sobre o build de produção,
com os mesmos emuladores e variáveis fictícias de `scripts/run-e2e.mjs`.
Essa configuração não altera os scripts versionados de teste.

Na revisão desta etapa, o build com variáveis fictícias passou, mas a execução
E2E de produção também encontrou a porta 8081 ocupada. Nenhum processo alheio
foi encerrado. Portanto, os fluxos integrados ainda precisam de validação.
Lint, tipos, 171 testes unitários e 808 testes de regras passaram.
As telas de autenticação foram inspecionadas no build local na porta 3104,
com capturas desktop e móvel em `dogfood-output/rod127-*.png`.

Para conferir as telas financeiras sem disputar esses processos, a revisão
seguinte usa uma cópia descartável em
`dogfood-output/rod127-financial-review/`, sem `.env.local`, com os módulos já
instalados. Somente na cópia, os endpoints dos emuladores e as respectivas
guardas dos testes passam para Authentication 19099 e Firestore 18081; o
projeto permanece `demo-gestone-e2e`. Os arquivos do produto mantêm as portas
originais. Os resultados dessa execução devem ser distinguidos do comando
E2E padrão.

Nesta cópia, build de produção, lint, tipos, 171 testes unitários e 28 E2E
passaram para a etapa de painel, listas, lançamento e CSV. O teste de reflow
encontrou e permitiu corrigir o seletor de mês na largura equivalente a 160 px.
As capturas da matriz estão em
`dogfood-output/rod127-financial-review/dogfood-output/rod-118/`.

## Critérios de aceite

- Preservar regras financeiras, autenticação, hooks, serviços e cache.
- Usar dados reais do usuário na implementação, sem dados fictícios do protótipo.
- Preservar estados de carregamento, vazio, erro e validação.
- Conferir temas, teclado, contraste, reflow, textos e valores longos.
- Executar lint, tipos, testes unitários, regras, build e E2E conforme AGENTS.md.
- Publicar entregas em branch codex/; produção exige autorização explícita.

Os 18 desenhos representam páginas e estados de fluxos existentes; fatura,
lançamento e importação não precisam se tornar novas rotas.
