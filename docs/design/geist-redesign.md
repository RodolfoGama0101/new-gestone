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

A primeira entrega inicia a adequação dos tokens do tema claro: superfícies
neutras, texto, ações primárias, bordas e foco. As demais etapas permanecem
pendentes, incluindo a revisão dos componentes e do tema escuro.

## Critérios de aceite

- Preservar regras financeiras, autenticação, hooks, serviços e cache.
- Usar dados reais do usuário na implementação, sem dados fictícios do protótipo.
- Preservar estados de carregamento, vazio, erro e validação.
- Conferir temas, teclado, contraste, reflow, textos e valores longos.
- Executar lint, tipos, testes unitários, regras, build e E2E conforme AGENTS.md.
- Publicar entregas em branch codex/; produção exige autorização explícita.

Os 18 desenhos representam páginas e estados de fluxos existentes; fatura,
lançamento e importação não precisam se tornar novas rotas.
