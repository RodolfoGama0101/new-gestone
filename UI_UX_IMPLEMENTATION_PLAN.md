# Plano de Melhorias UI/UX — GestOne

Este documento descreve as melhorias de UI/UX planejadas para a aplicação GestOne, focando em consistência visual, espaçamento (paddings), logo de marca e refinamento estético.

---

## Diagnóstico Atual — Problemas Identificados

### 🔴 Problemas Críticos

| Área | Problema | Impacto |
|------|----------|---------|
| **Padding/Espaçamento** | Falta de padding em quase todos os elementos. Cards, headers, e áreas de conteúdo estão "colados" | Sensação de interface apertada e amadora |
| **Logo** | Não existe logo — usa apenas um ícone `PiggyBank` do Lucide com texto gradiente | Sem identidade visual própria |
| **Cards do Dashboard** | `CardHeader` com `pb-2` e `CardContent` com `pb-4` criam espaçamentos internos inconsistentes | Visual desbalanceado |
| **Header** | Altura fixa de `h-14` (56px) muito compacta, padding lateral mínimo `px-4` | Respiro insuficiente |
| **Bottom Nav** | Padding `py-1.5` e `px-2` muito apertado, ícones text-[10px] | Alvo de toque pequeno demais (< 44px recomendado) |
| **Sidebar** | Sem visual premium, itens com `py-2.5` insuficiente | Navegação visualmente monótona |

### 🟡 Problemas Moderados

| Área | Problema |
|------|----------|
| **Tipografia** | Uso excessivo de `font-extrabold` em quase tudo, perde hierarquia |
| **Cores fixas no sparkline** | `#16a34a` e `#dc2626` hardcoded em vez de usar tokens do tema |
| **Input height** | `h-8` (32px) no componente base é baixo — login usa `h-11` override |
| **Empty States** | Sem animação ou personalidade — estáticos e frios |
| **Gráficos (Recharts)** | Tooltips usando `hsl(var(--...))` que pode não funcionar (oklch no CSS) |
| **Página de Categorias** | Cor duplicada no array `PRESET_COLORS` (#db2777 aparece 2x) |
| **Loading states** | Skeleton genérico sem corresponder ao layout real |
| **Transações (Expenses/Income)** | DialogTrigger com classes inline extensas em vez de usar componente Button |

### 🟢 Pontos Positivos (manter)

- Paleta oklch moderna e bem balanceada (light + dark)
- Uso de `backdrop-blur-md` no header e bottom nav (efeito glass)
- Estrutura de componentes limpa e organizada
- Suporte a PWA com service worker
- Temas light/dark com transição suave
- Ícones Lucide consistentes

---

## Proposta de Logo

A logo gerada representa um cofrinho de porco integrado com uma linha de gráfico ascendente, simbolizando o crescimento financeiro de forma moderna e minimalista. A imagem da logo foi gerada em `public/logo.png` e uma versão em vetor SVG será integrada nos componentes React da aplicação.

---

## Mudanças Propostas

### Componente 1 — Design System & Tokens Globais
*   **Arquivo:** `src/app/globals.css`
*   **Descrição:** Adicionar variáveis de espaçamento para consistência visual (`--space-page`, `--space-section`, `--space-card`), adicionar transição global para troca de temas, e aumentar `--radius` de `0.75rem` para `0.875rem` para dar um aspecto mais moderno e amigável aos cards e botões.

### Componente 2 — Logo & Branding
*   **Arquivo:** `src/components/shared/logo.tsx` (Novo) e `public/manifest.json`
*   **Descrição:** Criar componente `<Logo />` em React com suporte a variantes (`icon-only`, `full`) e tamanhos (`sm`, `md`, `lg`). Atualizar `manifest.json` e as referências de branding.

### Componente 3 — Layout: Header
*   **Arquivo:** `src/components/layout/header.tsx`
*   **Descrição:** Mudar a altura do header de `h-14` para `h-16`. Mudar o padding lateral para `px-5 sm:px-8`. Integrar o novo componente `<Logo variant="full" size="sm" />` no mobile e ajustar o título das páginas de `text-sm` para `text-base` no mobile.

### Componente 4 — Layout: Sidebar
*   **Arquivo:** `src/components/layout/sidebar.tsx`
*   **Descrição:** Ajustar altura do header interno para `h-16`, substituir logo antigo por `<Logo variant="full" size="md" />`. Aumentar o padding dos links de navegação para `py-3 px-4` e adicionar um indicador visual lateral sutil para o item ativo.

### Componente 5 — Layout: Bottom Nav (Mobile)
*   **Arquivo:** `src/components/layout/bottom-nav.tsx`
*   **Descrição:** Mudar padding vertical de `py-1.5` para `py-2.5` e a fonte para `text-[11px]` para aumentar a área de toque e legibilidade. Adicionar efeito hover/active de escala e fundo sutil `bg-primary/10` para o item ativo.

### Componente 6 — Dashboard Layout
*   **Arquivo:** `src/app/(dashboard)/layout.tsx`
*   **Descrição:** Mudar padding do `<main>` para `p-5 sm:p-8`. Aumentar `pb-16` para `pb-20` no mobile para acomodar melhor a barra de navegação inferior sem sobrepor conteúdo.

### Componente 7 — Dashboard Page
*   **Arquivo:** `src/app/(dashboard)/page.tsx`
*   **Descrição:** Aumentar espaçamento geral (`space-y-6` -> `space-y-8`), gap do grid (`gap-6` -> `gap-8`), e adicionar espaçamento no seletor de mês.

### Componente 8 — Cards do Dashboard
*   **Arquivos:** `src/components/dashboard/balance-card.tsx`, `summary-cards.tsx`, `recent-transactions.tsx`
*   **Descrição:** Ajustar paddings internos dos cards. Aumentar a área do sparkline de `h-10` para `h-14`. Substituir cores hardcoded por variáveis dinâmicas do Tailwind baseadas no tema.

### Componente 9 — Card Base UI
*   **Arquivo:** `src/components/ui/card.tsx`
*   **Descrição:** Mudar o espaçamento base dos cards de `spacing(4)` para `spacing(5)` (20px) para melhorar o respiro das informações.

### Componente 10 — Input Base UI
*   **Arquivo:** `src/components/ui/input.tsx`
*   **Descrição:** Aumentar a altura padrão dos inputs de `h-8` (32px) para `h-10` (40px) com padding horizontal `px-3.5` para maior conforto de preenchimento.

### Componente 11 — Páginas de Autenticação
*   **Arquivos:** `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`
*   **Descrição:** Atualizar para usar o componente `<Logo />`, aumentar padding geral e adicionar animações sutis de fade-in.

### Componente 12 — Páginas de Transações (Expenses/Income)
*   **Arquivos:** `src/app/(dashboard)/expenses/page.tsx`, `src/app/(dashboard)/income/page.tsx`
*   **Descrição:** Corrigir os botões de ação e modais, espaçamento entre itens da lista cronológica, e trocar `DialogTrigger` inline por componentes de botão reutilizáveis do projeto.

### Componente 13 — Página de Analytics
*   **Arquivo:** `src/app/(dashboard)/analytics/page.tsx`
*   **Descrição:** Melhorar espaçamento do grid de gráficos e o seletor de meses histórico.

### Componente 14 — Gráficos (Charts)
*   **Arquivos:** `src/components/charts/category-donut-chart.tsx`, `cash-flow-bar-chart.tsx`, `balance-trend-area-chart.tsx`
*   **Descrição:** Corrigir estilização dos tooltips e das legendas para funcionarem com cores OKLCH de forma consistente em dark e light mode.

### Componente 15 — Categorias e Configurações
*   **Arquivos:** `src/app/(dashboard)/categories/page.tsx`, `src/app/(dashboard)/settings/page.tsx`
*   **Descrição:** Corrigir cor duplicada no seletor de paleta de categorias, aumentar padding de formulários e botões de ação e ajustar os grids.

### Componente 16 — Estados Vazios e Loading
*   **Arquivos:** `src/components/shared/empty-state.tsx`, `src/app/(dashboard)/loading.tsx`
*   **Descrição:** Adicionar animação fade-in sutil, e alinhar os skeletons de carregamento com a nova estrutura e dimensões do dashboard.

### Componente 17 — Formulário de Transações
*   **Arquivo:** `src/components/transactions/transaction-form.tsx`
*   **Descrição:** Aumentar o espaçamento interno do formulário, inputs de valor monetário e textarea de notas para um design mais limpo.

---

## Tabela de Comparação de Espaçamentos

| Elemento | Antes | Depois | Justificativa |
|----------|-------|--------|---------------|
| Altura do Header | `h-14` (56px) | `h-16` (64px) | Respiro visual e consistência |
| Padding do Header | `px-4 sm:px-6` | `px-5 sm:px-8` | Margens mais generosas |
| Padding de Conteúdo | `p-4 sm:p-6` | `p-5 sm:p-8` | Foco e fluidez visual |
| Espaçamento do Card | `16px` | `20px` | Melhor distribuição de informações |
| Altura de Inputs | `h-8` (32px) | `h-10` (40px) | Conforto de uso (móvel/desktop) |
| Padding do Bottom Nav | `py-1.5` | `py-2.5` | Área de clique ergonômica (≥ 44px) |
| Espaçamento entre Seções | `space-y-6` | `space-y-8` | Hierarquia visual mais forte |
| Gaps de Grid | `gap-6` | `gap-8` | Menor densidade de informação |
| Itens de Navegação | `py-2.5 px-3` | `py-3 px-4` | Área tátil maior e mais limpa |
