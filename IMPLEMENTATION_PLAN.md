# GestOne — Plano de Implementação
> Aplicação de Controle Financeiro Pessoal
> Stack: Next.js 14 (App Router) · ShadCN UI · Firebase Spark (gratuito) · TypeScript

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura da Aplicação](#3-arquitetura-da-aplicação)
4. [Sistema de Tema (Dark/Light)](#4-sistema-de-tema-darklight)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Modelagem de Dados (Firestore)](#6-modelagem-de-dados-firestore)
7. [Funcionalidades](#7-funcionalidades)
8. [Segurança](#8-segurança)
9. [Plano de Etapas](#9-plano-de-etapas)
10. [Testes e Validações](#10-testes-e-validações)
11. [Boas Práticas](#11-boas-práticas)
12. [CI/CD e Deploy](#12-cicd-e-deploy)
13. [Checklist Final](#13-checklist-final)

---

## 1. Visão Geral

**GestOne** é uma aplicação Mobile-First de controle financeiro pessoal que permite ao usuário:

- Registrar **receitas** e **despesas** com categorias e tags
- Visualizar **gráficos analíticos** (saldo, evolução mensal, por categoria)
- Consultar **extrato** com filtros avançados
- Acessar via **mobile** (PWA) e **Web Desktop** com layout responsivo
- Autenticar via **e-mail/senha** ou **Google OAuth**
- Ter dados **isolados por usuário** via Firebase Firestore
- Alternar entre **tema escuro e claro** com persistência de preferência

> **Plano Firebase utilizado**: Spark (gratuito). Nenhum serviço pago é utilizado.
> Limites do Spark relevantes para este projeto:
> - Firestore: 1 GiB armazenamento, 50.000 leituras/dia, 20.000 gravações/dia
> - Authentication: usuários ilimitados
> - Hosting: 10 GB/mês de banda (se utilizado)

---

## 2. Stack Tecnológica

### Core
| Tecnologia | Versão | Função |
|---|---|---|
| Next.js | 14+ | Framework React com App Router, SSR, RSC |
| TypeScript | 5+ | Tipagem estática |
| React | 18+ | UI Library |
| ShadCN UI | latest | Componentes acessíveis e estilizáveis |
| Tailwind CSS | 3+ | Utilitários de estilo (base do ShadCN) |

### Backend / Infra (Firebase Spark — 100% Gratuito)
| Tecnologia | Plano | Função |
|---|---|---|
| Firebase Auth | Spark (grátis) | Autenticação (e-mail/senha + Google) |
| Firebase Firestore | Spark (grátis) | Banco de dados NoSQL em tempo real |
| Firebase App Check | Spark (grátis) | Proteção contra abuso de API |
| Firebase Security Rules | Spark (grátis) | Controle de acesso por usuário |
| Vercel | Hobby (grátis) | Hospedagem e deploy automático |

> **Firebase Storage foi removido do projeto** — é um serviço pago (requer plano Blaze).
> Comprovantes e anexos não serão suportados. Transações terão campo de **notas** (texto livre)
> para registrar observações e referências externas.

### Utilitários
| Biblioteca | Função |
|---|---|
| Zod | Validação de schemas e formulários |
| React Hook Form | Gerenciamento de formulários |
| Recharts | Gráficos analíticos |
| date-fns | Manipulação de datas |
| next-pwa | Progressive Web App (mobile install) |
| nuqs | Query string state management |
| React Query (TanStack) | Cache, sincronização e estado servidor |
| next-themes | Suporte a dark/light mode |
| Sonner | Toast notifications |
| Lucide React | Ícones |

---

## 3. Arquitetura da Aplicação

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                      │
│  Next.js App Router │ React 18 │ ShadCN │ Tailwind CSS   │
│  ┌────────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │   RSC (Server) │  │  Client Comp  │  │   PWA Layer │  │
│  │  - Layout      │  │  - Forms      │  │  - Manifest │  │
│  │  - Metadata    │  │  - Charts     │  │  - SW Cache │  │
│  │  - Auth Guard  │  │  - Theme Sys  │  │             │  │
│  └────────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────┬────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼────────────────────────────┐
│              FIREBASE (Plano Spark — Gratuito)            │
│  ┌──────────────────────┐  ┌────────────────────────────┐ │
│  │    Firebase Auth     │  │        Firestore           │ │
│  │  - Email/Senha       │  │  - Banco de dados NoSQL    │ │
│  │  - Google OAuth      │  │  - Tempo real              │ │
│  │  - JWT Token         │  │  - Suporte offline         │ │
│  └──────────────────────┘  └────────────────────────────┘ │
│  ┌──────────────────────┐                                  │
│  │    App Check         │  Protecao contra bots e abuso   │
│  └──────────────────────┘                                  │
└──────────────────────────────────────────────────────────┘
```

### Estratégia de Renderização
- **Server Components (RSC)**: Layout, páginas estáticas, metadados SEO
- **Client Components**: Formulários, gráficos, interações em tempo real, ThemeProvider
- **Server Actions**: Operações protegidas que precisam de validação server-side
- **Middleware**: Proteção de rotas autenticadas com verificação de sessão

---

## 4. Sistema de Tema (Dark/Light)

O sistema de tema é implementado **desde a Etapa 1**, como parte da fundação do design system.
Toda a aplicação respeita o tema selecionado sem flash de conteúdo (FOUC).

### Estratégia
- **next-themes**: Provider de tema com suporte a SSR, sem FOUC
- **CSS Variables**: Tokens de design definidos em `:root` e `.dark` no `globals.css`
- **ShadCN**: Já utiliza CSS variables nativamente — dark mode funciona automaticamente
- **Recharts**: Configurado para consumir as CSS variables e alternar cores com o tema
- **Ícones de alternância**: `Sun` e `Moon` do Lucide React
- **Persistência**: Preferência salva em `localStorage` e sincronizada com o sistema (`system`)

### Tokens de Design (CSS Variables)
```css
/* globals.css */
:root {
  /* Cores base (tema claro) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;     /* Azul principal */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;     /* Vermelho para despesas */
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.75rem;

  /* Tokens financeiros customizados */
  --income: 142.1 76.2% 36.3%;     /* Verde para receitas */
  --income-foreground: 355.7 100% 97.3%;
  --expense: 0 84.2% 60.2%;        /* Vermelho para despesas */
  --expense-foreground: 210 40% 98%;
  --chart-1: 221.2 83.2% 53.3%;
  --chart-2: 142.1 76.2% 36.3%;
  --chart-3: 0 84.2% 60.2%;
  --chart-4: 38.3 92% 50%;
  --chart-5: 262.1 83.3% 57.8%;
}

.dark {
  /* Cores base (tema escuro) */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;

  /* Tokens financeiros (dark) */
  --income: 142.1 70.6% 45.3%;
  --expense: 0 72.2% 50.6%;
}
```

### Componente ThemeToggle
```tsx
// components/shared/theme-toggle.tsx
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

// Alterna entre: system → light → dark
// Exibe o ícone correspondente ao tema atual
// Acessível via teclado e com aria-label
```

### Integração no Root Layout
```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}  // animacao suave
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Boas Práticas de UX para Tema
- Transicao suave de 200ms em `color` e `background-color` (via CSS `transition`)
- Opção "Sistema" (sincroniza com preferência do SO) além de claro/escuro
- Icone `Monitor` para modo sistema, `Sun` para claro, `Moon` para escuro
- O tema é aplicado antes do hydration do React (sem flash)
- Gráficos Recharts utilizam as mesmas CSS variables para consistência visual

---

## 5. Estrutura de Pastas

```
new-gestone/
├── public/
│   ├── icons/                   # Ícones PWA (192x192, 512x512)
│   ├── manifest.json            # Web App Manifest
│   └── sw.js                    # Service Worker (gerado pelo next-pwa)
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Grupo de rotas públicas
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/         # Grupo de rotas protegidas
│   │   │   ├── layout.tsx       # Layout com sidebar/navbar
│   │   │   ├── page.tsx         # Dashboard principal
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx     # Extrato completo
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Detalhe da transação
│   │   │   ├── income/
│   │   │   │   └── page.tsx     # Gestão de receitas
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx     # Gestão de despesas
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx     # Gráficos e relatórios
│   │   │   ├── categories/
│   │   │   │   └── page.tsx     # Gerenciamento de categorias
│   │   │   └── settings/
│   │   │       └── page.tsx     # Perfil e configurações
│   │   │
│   │   ├── api/                 # API Routes
│   │   │   └── auth/
│   │   │       └── session/
│   │   │           └── route.ts # Gerenciamento de sessão cookie
│   │   │
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Estilos globais + variáveis ShadCN
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                  # Componentes ShadCN (auto-gerados)
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── google-auth-button.tsx
│   │   ├── dashboard/
│   │   │   ├── balance-card.tsx
│   │   │   ├── summary-cards.tsx
│   │   │   └── recent-transactions.tsx
│   │   ├── transactions/
│   │   │   ├── transaction-form.tsx
│   │   │   ├── transaction-list.tsx
│   │   │   ├── transaction-filters.tsx
│   │   │   └── transaction-item.tsx
│   │   ├── charts/
│   │   │   ├── balance-overview-chart.tsx
│   │   │   ├── category-pie-chart.tsx
│   │   │   ├── monthly-bar-chart.tsx
│   │   │   └── cash-flow-chart.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── header.tsx
│   │   │   └── bottom-nav.tsx
│   │   └── shared/
│   │       ├── currency-input.tsx
│   │       ├── date-picker.tsx
│   │       ├── category-badge.tsx
│   │       ├── theme-toggle.tsx        # Icone Sun/Moon/Monitor + useTheme
│   │       └── confirm-dialog.tsx
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   └── firestore.ts
│   │   ├── validations/
│   │   │   ├── auth.schema.ts
│   │   │   └── transaction.schema.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-transactions.ts
│   │   ├── use-categories.ts
│   │   ├── use-analytics.ts
│   │   └── use-currency-format.ts
│   │
│   ├── contexts/
│   │   └── auth-context.tsx
│   │
│   ├── services/
│   │   ├── transaction.service.ts
│   │   ├── category.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── types/
│   │   ├── transaction.ts
│   │   ├── category.ts
│   │   └── user.ts
│   │
│   └── middleware.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── components.json
├── tsconfig.json
├── jest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 6. Modelagem de Dados (Firestore)

### Coleções e Documentos

```
users/{userId}
  ├── displayName: string
  ├── email: string
  ├── photoURL: string | null
  ├── currency: string           # "BRL", "USD", etc.
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

users/{userId}/transactions/{transactionId}
  ├── type: "income" | "expense"
  ├── amount: number              # Valor em centavos (evitar float)
  ├── description: string
  ├── categoryId: string
  ├── date: Timestamp
  ├── tags: string[]
  ├── notes: string | null        # Observacoes textuais (sem anexos)
  ├── recurring: boolean
  ├── recurringConfig: { frequency, endDate } | null
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

  # NOTA: Campo attachmentUrl removido — Firebase Storage requer plano Blaze (pago).
  # Comprovantes devem ser registrados como texto no campo notes.

users/{userId}/categories/{categoryId}
  ├── name: string
  ├── type: "income" | "expense" | "both"
  ├── icon: string               # Nome do icone Lucide (ex: "ShoppingCart")
  ├── color: string              # HSL color (compativel com CSS variables)
  ├── isDefault: boolean
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### Índices Compostos (Firestore Indexes)
```
transactions:
  - (userId, date DESC)
  - (userId, type, date DESC)
  - (userId, categoryId, date DESC)
  - (userId, date >= X, date <= Y)
```

> **Nota sobre valores monetários**: Sempre armazenar valores em **centavos** (inteiros) para evitar problemas de ponto flutuante. Ex: R$15,50 → 1550

---

## 7. Funcionalidades

### 7.1 Autenticação
- [ ] Registro com e-mail e senha (com validação de força de senha)
- [ ] Login com e-mail e senha
- [ ] Login com Google OAuth (popup)
- [ ] Logout
- [ ] Recuperação de senha por e-mail
- [ ] Persistência de sessão com cookies HTTPOnly
- [ ] Middleware de proteção de rotas autenticadas

### 7.2 Tema (Dark / Light / System)
- [ ] ThemeProvider configurado no root layout
- [ ] CSS variables completas para dark e light mode
- [ ] Componente ThemeToggle com ícones Sun, Moon e Monitor (Lucide)
- [ ] Transição suave de tema (200ms)
- [ ] Persistência da preferência em localStorage
- [ ] Sincronização com preferência do sistema operacional
- [ ] Gráficos Recharts respeitando o tema ativo

### 7.3 Dashboard
- [ ] Saldo total atual (receitas − despesas)
- [ ] Cards de resumo: total receitas, total despesas, saldo do mês
- [ ] Ícones TrendingUp e TrendingDown (Lucide) nos cards de tendência
- [ ] Últimas 5 transações com ícone de categoria
- [ ] Gráfico de evolução do saldo (últimos 6 meses)
- [ ] Seletor de período (mês/ano)

### 7.4 Transações
- [ ] Adicionar receita ou despesa
- [ ] Editar transação existente
- [ ] Excluir transação (com confirmação via Dialog)
- [ ] Campos: tipo, valor, descrição, categoria, data, tags, notas
- [ ] Transações recorrentes (diária, semanal, mensal, anual)
- [ ] Pesquisa por descrição (ícone Search do Lucide)
- [ ] Paginação cursor-based com scroll infinito

### 7.5 Extrato
- [ ] Lista cronológica de todas as transações
- [ ] Filtros: período, tipo, categoria, valor mínimo/máximo
- [ ] Exportação para CSV (client-side — ícone Download do Lucide)
- [ ] Agrupamento por data com separadores visuais
- [ ] Indicadores visuais de tipo via cor (CSS variables --income / --expense) e ícone

### 7.6 Analytics (Gráficos)
- [ ] Visão Geral: gráfico de linha — evolução do saldo mês a mês
- [ ] Por Categoria: gráfico de donut — distribuição de gastos
- [ ] Fluxo de Caixa: gráfico de barras — receitas vs despesas por mês
- [ ] Tendência: comparativo mês atual vs mês anterior
- [ ] Top Categorias: ranking das maiores despesas
- [ ] Seletor de período: últimos 3, 6, 12 meses ou personalizado
- [ ] Todos os gráficos respeitam o tema dark/light

### 7.7 Categorias
- [ ] Categorias padrão pré-definidas (Alimentação, Transporte, Lazer, etc.)
- [ ] Criar categorias personalizadas
- [ ] Editar e excluir categorias (com verificação de uso)
- [ ] Seletor de ícone Lucide e cor HSL

### 7.8 Configurações
- [ ] Editar nome de perfil
- [ ] Alterar senha (com re-autenticação)
- [ ] Configurar moeda padrão
- [ ] Seletor de tema: claro, escuro ou sistema (ícones Sun, Moon, Monitor)
- [ ] Excluir conta (com confirmação + re-autenticação)

---

## 8. Segurança

### 8.1 Firebase Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
      
      match /transactions/{transactionId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        
        allow create, update: if request.auth != null 
          && request.auth.uid == userId
          && validateTransaction(request.resource.data);
        
        allow delete: if request.auth != null && request.auth.uid == userId;
      }
      
      match /categories/{categoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    function validateTransaction(data) {
      return data.amount is int
        && data.amount > 0
        && data.amount <= 999999999
        && data.type in ['income', 'expense']
        && data.description is string
        && data.description.size() <= 200
        && data.date is timestamp;
    }
  }
}
```

### 8.2 Medidas de Segurança da Aplicação
| Medida | Implementação |
|---|---|
| Sanitizacao de inputs | Zod validation em todos os formularios |
| Autenticacao server-side | Firebase Admin SDK + cookies HTTPOnly |
| CSRF Protection | Next.js built-in + SameSite cookies |
| Rate limiting | Firebase App Check + Vercel Edge Middleware |
| Variaveis de ambiente | Apenas NEXT_PUBLIC_ expostas no cliente |
| Validacao server-side | Server Actions com Zod |
| Token refresh | Firebase SDK gerencia automaticamente |
| HTTPS | Obrigatorio em producao (Vercel) |
| Dados em centavos | Previne corrupcao de valores monetarios |
| Log de auditoria | Timestamps em todas as operacoes Firestore |
| Sem Firebase Storage | Elimina superfície de ataque de upload de arquivos |

---

## 9. Plano de Etapas

---

### Etapa 1 — Setup, Fundação e Sistema de Tema (1–2 dias)

**Objetivo**: Estrutura base com design system completo, tema dark/light funcional desde o primeiro dia.

1. Inicializar projeto Next.js 14 com TypeScript
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
   ```
2. Instalar e configurar ShadCN UI
   ```bash
   npx shadcn@latest init
   ```
3. Instalar dependências:
   - firebase, firebase-admin
   - @tanstack/react-query, @tanstack/react-query-devtools
   - react-hook-form, @hookform/resolvers, zod
   - recharts, date-fns
   - next-themes, sonner, lucide-react, nuqs, next-pwa
   - @tanstack/react-virtual (virtualizacao de listas)
4. Instalar dependências de desenvolvimento:
   - jest, @testing-library/react, @testing-library/jest-dom, ts-jest
   - @playwright/test
5. Configurar Firebase (Auth + Firestore + App Check — plano Spark)
   - **Nao habilitar Firebase Storage**
6. Criar `.env.local` e `.env.example`
7. Configurar `next.config.ts` (headers de segurança HTTP)
8. **Implementar sistema de tema dark/light:**
   a. Definir CSS variables completas em `globals.css` (`:root` e `.dark`)
   b. Incluir tokens financeiros: `--income`, `--expense`, `--chart-1..5`
   c. Configurar `ThemeProvider` (next-themes) no `app/layout.tsx`
   d. Criar `components/shared/theme-toggle.tsx` com ícones Lucide (Sun/Moon/Monitor)
   e. Adicionar transicao suave de 200ms para mudanca de tema
   f. Configurar `suppressHydrationWarning` no elemento `<html>`
9. Adicionar componentes ShadCN base via CLI:
   ```bash
   npx shadcn@latest add button card input label badge dialog sheet
   npx shadcn@latest add select dropdown-menu avatar separator skeleton
   npx shadcn@latest add toast sonner form popover calendar
   ```
10. Configurar ESLint + Prettier + Husky (pre-commit hooks)
11. Configurar Jest e Playwright
12. Criar página de demonstracao do design system (apenas em dev)

**Entregável**: Projeto com design system completo, tema dark/light funcional com transicao suave, todos os componentes ShadCN disponiveis e ShadCN configurado.

---

### Etapa 2 — Autenticação (2–3 dias)

**Objetivo**: Sistema de autenticação completo e seguro.

1. `lib/firebase/config.ts` — inicialização do SDK
2. `lib/firebase/auth.ts` — funções de auth
3. `contexts/auth-context.tsx` — Provider global
4. `middleware.ts` — proteção de rotas
5. `app/api/auth/session/route.ts` — cookie HTTPOnly
6. Schemas Zod para auth
7. Páginas: `/login`, `/register`, recuperação de senha
8. Componentes: login-form, register-form, google-auth-button
9. Testes unitários e E2E do fluxo de autenticação

**Entregável**: Usuário consegue criar conta, logar e ser redirecionado ao dashboard protegido.

---

### Etapa 3 — Layout e Navegação (1–2 dias)

**Objetivo**: Shell responsiva (mobile-first + desktop) com tema integrado.

1. `(dashboard)/layout.tsx` com protecao de rota
2. `sidebar.tsx` — navegacao lateral (desktop)
   - Icones Lucide para cada item de menu (LayoutDashboard, ArrowUpCircle, ArrowDownCircle, BarChart3, Tag, Settings)
   - ThemeToggle integrado na sidebar
3. `bottom-nav.tsx` — navegacao inferior (mobile, 5 tabs)
   - Icones Lucide: LayoutDashboard, ArrowUpCircle, ArrowDownCircle, BarChart3, Settings
4. `header.tsx` — topbar com avatar, nome do usuario e ThemeToggle
5. Responsividade:
   - Mobile: bottom navigation tabs (fixed bottom)
   - Desktop (md+): sidebar fixa com largura de 240px
6. Loading skeletons para transicoes de pagina
7. Empty states com icones Lucide (Inbox, PlusCircle)

**Entregável**: App com navegacao funcional em mobile e desktop, tema integrado em todos os elementos de layout.

---

### Etapa 4 — CRUD de Categorias (1 dia)

**Objetivo**: Gerenciamento de categorias.

1. `types/category.ts`
2. `services/category.service.ts` (Firestore CRUD)
3. `hooks/use-categories.ts` (React Query)
4. Seed de categorias padrão ao criar conta
5. Página `/categories` com formulário e lista

**Entregável**: Usuário consegue gerenciar categorias personalizadas.

---

### Etapa 5 — CRUD de Transações (3–4 dias)

**Objetivo**: Registro e gestao de todas as transacoes financeiras.

1. `types/transaction.ts` — sem campo `attachmentUrl`
2. `lib/validations/transaction.schema.ts` (Zod)
   - Campo `notes`: string opcional, max 500 chars
   - Sem validacao de arquivo (Storage removido)
3. `services/transaction.service.ts` (Firestore CRUD + paginacao cursor-based)
4. `hooks/use-transactions.ts` (React Query infinite query)
5. `components/shared/currency-input.tsx` (mascara monetaria brasileira)
6. `components/shared/date-picker.tsx` com icone CalendarDays (Lucide)
7. `transaction-form.tsx` — campos: tipo, valor, descricao, categoria, data, tags, notas
   - Icone TrendingUp (receita) e TrendingDown (despesa) no seletor de tipo
   - Campo `notas` como textarea para observacoes textuais
   - Sem campo de upload de arquivo
8. Paginas `/income` e `/expenses` com listas filtradas
9. `transaction-list.tsx` com virtualizacao para listas longas
10. `transaction-filters.tsx` com icone Filter (Lucide)
11. Testes unitarios, schemas e integracao com Emulator

**Entregável**: CRUD completo de receitas e despesas (sem upload de arquivos).

---

### Etapa 6 — Extrato (2 dias)

**Objetivo**: Visualização completa e filtrável do histórico.

1. Página `/transactions` com todas as transações
2. Filtros via query string (nuqs):
   - Período, tipo, categoria, valor mín/máx, busca por descrição
3. Agrupamento de transações por data
4. Paginação com scroll infinito
5. Exportação para CSV (client-side)

**Entregável**: Extrato com filtros avançados e exportação CSV.

---

### Etapa 7 — Dashboard (2 dias)

**Objetivo**: Visão geral financeira rápida.

1. `services/analytics.service.ts`
2. `hooks/use-analytics.ts`
3. `balance-card.tsx` — saldo total
4. `summary-cards.tsx` — resumo do mês
5. `recent-transactions.tsx` — últimas 5
6. Mini gráfico de evolução de saldo
7. Seletor de mês/ano

**Entregável**: Dashboard informativo com dados em tempo real.

---

### Etapa 8 — Analytics (Gráficos) (2–3 dias)

**Objetivo**: Relatórios visuais para análise financeira.

1. Recharts configurado com tema dark/light
2. `balance-overview-chart.tsx` — linha (evolução)
3. `category-pie-chart.tsx` — donut (por categoria)
4. `monthly-bar-chart.tsx` — barras (receitas vs despesas)
5. `cash-flow-chart.tsx` — área (fluxo de caixa)
6. Página `/analytics` com seletor de período
7. Responsividade dos gráficos

**Entregável**: Página de analytics com múltiplos gráficos interativos.

---

### Etapa 9 — Configurações e Perfil (1–2 dias)

**Objetivo**: Personalizacao e gestao da conta.

1. Pagina `/settings` com secoes separadas por Card:
   - **Perfil**: Edicao de nome de exibicao
   - **Seguranca**: Alterar senha (com re-autenticacao via modal)
   - **Preferencias**: Moeda padrao, seletor de tema (Radio com icones Sun/Moon/Monitor)
   - **Conta**: Exclusao de conta com fluxo de confirmacao em 2 etapas
2. Seletor de tema com 3 opcoes visuais (icone + label): Claro, Escuro, Sistema
3. Fluxo de exclusao de conta: confirmacao textual + re-autenticacao + delete Firestore + delete Auth

**Entregável**: Usuario consegue personalizar conta e alternar tema via configuracoes.

---

### Etapa 10 — PWA e Otimizações (1–2 dias)

**Objetivo**: App instalável com boa performance.

1. Configurar `next-pwa`
2. `public/manifest.json` (display: standalone)
3. Ícones PWA em múltiplos tamanhos
4. Estratégias de cache do Service Worker
5. Offline fallback page
6. Otimizações: next/image, dynamic imports, skeleton states, Suspense
7. Lighthouse audit (meta: Performance > 85, Accessibility > 95)
8. Testar instalação em Android e iOS

**Entregável**: App instalável com nota Lighthouse > 85.

---

### Etapa 11 — Testes Abrangentes (2–3 dias)

**Objetivo**: Cobertura ≥ 80% e sem regressões.

1. Completar testes unitários (Jest)
2. Testes de integração com Firebase Emulator Suite
3. Testes E2E Playwright:
   - Fluxo completo de autenticação
   - CRUD de transações
   - Filtros do extrato
   - Analytics carregando corretamente
4. Relatório de cobertura

**Entregável**: Suite de testes passando com ≥ 80% de cobertura.

---

### Etapa 12 — CI/CD e Deploy (1 dia)

**Objetivo**: Pipeline automatizado e app em produção.

1. Repositório GitHub
2. `.github/workflows/ci.yml`:
   - Lint + TypeScript check
   - Testes unitários e integração
   - Build de produção
3. Configurar Vercel (variáveis de ambiente, deploy automático)
4. Firebase App Check para produção
5. Deploy das Security Rules e Indexes via Firebase CLI
6. Smoke test em produção

**Entregável**: App em produção com CI/CD configurado.

---

## 10. Testes e Validações

### Estratégia de Testes (Pirâmide)
```
     /\
    /E2E\          ← Playwright (fluxos críticos)
   /------\
  / Integr.\       ← Jest + Firebase Emulator
 /----------\
/   Unit     \     ← Jest + Testing Library
/--------------\
```

### Testes Unitários (Jest)
- Funções de formatação e utilitários
- Schemas Zod (casos válidos e inválidos)
- Lógica de cálculo dos services
- Hooks com renderHook e mock do Firebase

### Testes de Integração
- CRUD completo com Firebase Emulator Suite
- Verificação das Security Rules
- Paginação de transações
- Cálculos de analytics

### Testes E2E (Playwright)
1. Registro → Login → Dashboard
2. Adicionar receita → verificar no extrato
3. Adicionar despesa → verificar nos gráficos
4. Filtrar extrato por período e categoria
5. Editar e excluir transação
6. Logout e tentativa de acesso a rota protegida

### Validações de Formulário
| Campo | Regras |
|---|---|
| E-mail | Formato válido, obrigatório |
| Senha | Mínimo 8 chars, 1 maiúscula, 1 número, 1 especial |
| Valor | Positivo, máximo 9.999.999,99, obrigatório |
| Descrição | 3–200 caracteres, obrigatório |
| Data | Não futura para lançamentos, obrigatório |
| Categoria | Seleção obrigatória |

---

## 11. Boas Práticas

### Código
- TypeScript strict mode habilitado
- Sem `any` — usar tipos explícitos sempre
- Server Components por padrão, `"use client"` apenas quando necessário
- Valores monetários em centavos — nunca float para dinheiro
- Error boundaries em componentes críticos
- Loading states em toda operação assíncrona
- Optimistic updates nas mutations de transações

### Performance
- Lazy loading de gráficos (dynamic import)
- Virtualização de listas longas
- Paginação cursor-based no Firestore (nunca offset)
- React Query para cache e deduplificação
- Imagens otimizadas com next/image

### Acessibilidade
- Componentes ShadCN acessíveis (base Radix UI)
- Labels em todos os inputs
- Navegacao por teclado funcional
- Contraste WCAG AA em ambos os temas (dark e light verificados separadamente)
- `aria-label` em todos os botoes icone (ThemeToggle, filtros, exclusao)
- `aria-live` em toasts e notificacoes

### UX/UI — Diretrizes sem uso de emojis
- Usar exclusivamente **icones Lucide React** como indicadores visuais
- Icones de status: `CheckCircle2` (sucesso), `XCircle` (erro), `AlertTriangle` (aviso), `Info` (informacao)
- Icones financeiros: `TrendingUp` (receita), `TrendingDown` (despesa), `Wallet` (saldo)
- Icones de acao: `Plus` (adicionar), `Pencil` (editar), `Trash2` (excluir), `Download` (exportar)
- Icones de navegacao: `LayoutDashboard`, `ArrowUpCircle`, `ArrowDownCircle`, `BarChart3`, `Tag`, `Settings`
- Estados vazios (empty states): ilustracao com icone grande + texto descritivo (sem emojis)
- Feedback de acoes via `Sonner` toast com icone Lucide (nao emojis)

### Git e Versionamento
- Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- Branch strategy: `main` → `develop` → `feature/*`
- PR reviews antes de merge em `main`

---

## 12. CI/CD e Deploy

### Pipeline GitHub Actions
```yaml
on: [push, pull_request]
jobs:
  quality:
    - Checkout + Setup Node 20
    - npm ci
    - ESLint + TypeScript check
    - Jest tests com coverage
    - Firebase Emulator + integration tests
    - Build de produção
  
  e2e: (apenas em main/develop)
    - Playwright tests
    - Upload report como artefato
  
  deploy: (apenas em main)
    - Vercel deploy
    - Firebase deploy (rules + indexes)
```

### Ambientes
| Ambiente | Branch | URL |
|---|---|---|
| Development | local | localhost:3000 |
| Preview | feature/* | pr-*.vercel.app |
| Staging | develop | staging.gestione.app |
| Production | main | gestione.app |

---

## 13. Checklist Final

### Funcional
- [ ] Autenticacao email/senha funcionando
- [ ] Autenticacao Google funcionando
- [ ] Recuperacao de senha funcionando
- [ ] CRUD de categorias
- [ ] CRUD de transacoes (receitas e despesas)
- [ ] Extrato com filtros completos
- [ ] Exportacao CSV
- [ ] Dashboard com resumo
- [ ] Todos os graficos renderizando
- [ ] Configuracoes de perfil
- [ ] Tema dark/light/system funcionando em toda a aplicacao

### Tecnico
- [ ] Apenas Firebase Spark (plano gratuito) em uso
- [ ] Firebase Storage NAO utilizado
- [ ] Security Rules deployadas e testadas
- [ ] Indexes do Firestore configurados
- [ ] Variaveis de ambiente configuradas em producao
- [ ] App Check configurado
- [ ] PWA instalavel (manifest + service worker)
- [ ] Lighthouse Performance > 85
- [ ] Lighthouse Accessibility > 95 (dark e light testados separadamente)
- [ ] Cobertura de testes >= 80%
- [ ] CI/CD funcionando
- [ ] HTTPS em producao
- [ ] Erros monitorados (Sentry — plano gratuito)

### UX/UI
- [ ] Zero emojis na interface — apenas icones Lucide React
- [ ] Tema dark verificado em todas as paginas
- [ ] Tema light verificado em todas as paginas
- [ ] Transicao suave de tema (sem flash)
- [ ] Layout mobile-first validado em dispositivos reais
- [ ] Todos os loading states implementados (Skeleton components)
- [ ] Feedback visual em todas as acoes (Sonner toasts com icones Lucide)
- [ ] Formularios com mensagens de erro claras
- [ ] Confirmacao antes de acoes destrutivas (Dialog com icone AlertTriangle)
- [ ] Empty states informativos com icone Lucide + texto (sem emojis)

---

## Estimativa Total

| Etapa | Estimativa |
|---|---|
| 1. Setup, Fundacao e Sistema de Tema | 1–2 dias |
| 2. Autenticacao | 2–3 dias |
| 3. Layout e Navegacao | 1–2 dias |
| 4. Categorias | 1 dia |
| 5. Transacoes | 3–4 dias |
| 6. Extrato | 2 dias |
| 7. Dashboard | 2 dias |
| 8. Analytics | 2–3 dias |
| 9. Configuracoes | 1–2 dias |
| 10. PWA e Otimizacoes | 1–2 dias |
| 11. Testes | 2–3 dias |
| 12. CI/CD e Deploy | 1 dia |
| **Total** | **19–27 dias** |

> Estimativas baseadas em desenvolvimento individual com foco em qualidade.
> Equipe de 2+ devs pode paralelizar etapas e reduzir o prazo.

---

*Plano criado em: 2026-07-06*
*Versao: 1.1.0 — Firebase Storage removido, sistema de tema adicionado desde a Etapa 1, emojis removidos*
