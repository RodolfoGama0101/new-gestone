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

Os layouts específicos do painel e das demais telas financeiras continuam
pendentes. A tarefa permanece em andamento até validar todo o escopo.

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

## Critérios de aceite

- Preservar regras financeiras, autenticação, hooks, serviços e cache.
- Usar dados reais do usuário na implementação, sem dados fictícios do protótipo.
- Preservar estados de carregamento, vazio, erro e validação.
- Conferir temas, teclado, contraste, reflow, textos e valores longos.
- Executar lint, tipos, testes unitários, regras, build e E2E conforme AGENTS.md.
- Publicar entregas em branch codex/; produção exige autorização explícita.

Os 18 desenhos representam páginas e estados de fluxos existentes; fatura,
lançamento e importação não precisam se tornar novas rotas.
