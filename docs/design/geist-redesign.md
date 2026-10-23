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

- Cartões e faturas com ações, totais e metadados organizados em superfícies
  neutras; as cores escolhidas pelo usuário e a camada de contraste dos cartões
  são preservadas.
- Séries e orçamentos com cabeçalhos, formulários responsivos e indicadores
  de progresso acessíveis. Barras saturam visualmente no limite, enquanto o
  texto preserva o valor real, inclusive excessos e economia negativa.
- Relatórios com resumos neutros, gráficos em largura completa e alternativas
  textuais preservadas; categorias e configurações usam controles legíveis.
- Estado offline React reutiliza a logo original. O HTML estático de fallback
  mantém sua estrutura sem uma nova marca e acompanha o tema local/sistema.

As 18 propostas foram adaptadas às rotas e aos fluxos existentes. Não foram
introduzidos dados fictícios nas telas do produto nem alterações nos serviços,
regras financeiras, autenticação ou contratos do Firestore.

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

Após a validação, a aplicação temporária foi arquivada fora do repositório,
para não interferir na descoberta de testes e no lint. As capturas foram
preservadas no diretório `dogfood-output/rod127-final-captures/`.

Nesta cópia, build de produção, lint, tipos, 171 testes unitários e 28 E2E
passaram para a etapa de painel, listas, lançamento e CSV. O teste de reflow
encontrou e permitiu corrigir o seletor de mês na largura equivalente a 160 px.
As capturas da matriz estão em
`dogfood-output/rod127-final-captures/rod-118/`.

## Verificação final

- Lint com exclusão dos artefatos em `dogfood-output/` e cópias em `.worktrees/`.
- `npm run typecheck` e 34 suítes/173 testes unitários aprovados.
- Build de produção com configuração fictícia aprovado na cópia isolada.
- 28 fluxos E2E existentes, a nova matriz visual e 2 testes PWA aprovados.
- 145 testes de regras aprovados na mesma cópia, com a porta 18080 e projeto
  `demo-gestone-rules`. Portas e guardas foram adaptadas somente na cópia;
  `firestore.rules`, índices e testes de regras do produto permanecem intactos.
- Capturas de sete superfícies nos dois temas e em 320/1280 px em
  `dogfood-output/rod127-final-captures/rod127-surfaces/`; a matriz financeira
  também cobre reflow equivalente a 200%.
- A logo em `src/components/shared/logo.tsx` permanece sem alterações desde o
  início do redesign.

As execuções padrão de desenvolvimento foram impedidas por servidores/portas
já ocupados e apresentaram falhas de inicialização durante a compilação sob
demanda da cópia. A validação aprovada foi feita sobre o build de produção
isolado. Isso não comprova integração com contas reais nem substitui revisão
em aparelhos físicos. Não houve deploy de produção.

## Critérios de aceite

- Preservar regras financeiras, autenticação, hooks, serviços e cache.
- Usar dados reais do usuário na implementação, sem dados fictícios do protótipo.
- Preservar estados de carregamento, vazio, erro e validação.
- Conferir temas, teclado, contraste, reflow, textos e valores longos.
- Executar lint, tipos, testes unitários, regras, build e E2E conforme AGENTS.md.
- Publicar entregas em branch codex/; produção exige autorização explícita.

Os 18 desenhos representam páginas e estados de fluxos existentes; fatura,
lançamento e importação não precisam se tornar novas rotas.
