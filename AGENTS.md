# Instruções para agentes — GestOne

Estas instruções se aplicam a todo o repositório. Consulte também instruções mais específicas no diretório da alteração, quando existirem.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contexto e início do trabalho

GestOne é uma aplicação de finanças pessoais em Next.js App Router, React e TypeScript, com Firebase Authentication e Firestore. A interface e a documentação usam português brasileiro.

- Leia `README.md`, `package.json` e a documentação em `docs/` relacionada à tarefa antes de alterar o comportamento.
- Confira `git status --short` e o diff dos arquivos envolvidos antes de editar. Preserve mudanças anteriores, inclusive em arquivos que a tarefa também precise alterar.
- Use Node.js 24.x e npm conforme `engines` e `packageManager` do `package.json`. Instale dependências com `npm ci`; mantenha manifesto e lockfile sincronizados quando alterar dependências.
- Consulte os guias locais do Next.js indicados acima para as APIs afetadas. Se estiverem indisponíveis, registre a limitação e consulte a documentação oficial da versão instalada.
- Faça mudanças focadas no pedido. Evite refatorações, atualizações de dependências e formatação em massa sem relação com a tarefa.

## Mapa do código

| Caminho | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas, layouts e páginas do App Router; APIs em `api/` |
| `src/app/(auth)/` e `src/app/(dashboard)/` | Autenticação e área financeira |
| `src/components/` | Componentes de domínio; primitivas em `ui/` e reutilizáveis em `shared/` |
| `src/hooks/` e `src/providers/` | Hooks de dados e provedores, incluindo TanStack Query |
| `src/contexts/auth-context.tsx` | Estado de autenticação no cliente |
| `src/services/` | Acesso a dados e operações de domínio |
| `src/lib/firebase/` | Configuração cliente, Admin SDK e utilitários de autenticação/sessão |
| `src/lib/validations/`, `src/lib/utils/` e `src/types/` | Schemas Zod, cálculos/utilitários e tipos de domínio |
| `tests/unit/`, `tests/rules/` e `tests/e2e/` | Testes Jest, regras Firestore e fluxos Playwright |
| `firestore.rules` e `firestore.indexes.json` | Autorização, validação dos dados e índices de consultas |

## Convenções de implementação

- Respeite TypeScript estrito e o alias `@/*` para `src/*`. Reutilize tipos, schemas e serviços existentes antes de criar abstrações.
- Siga o estilo do arquivo e a configuração do Prettier: dois espaços, aspas simples e sem ponto e vírgula. Evite `any` e supressões de lint/tipos sem justificativa.
- Respeite a fronteira entre servidor e cliente. Adicione `'use client'` apenas onde necessário e mantenha Admin SDK e credenciais no servidor.
- Mantenha acesso ao Firestore nos serviços e a integração de cache nos hooks existentes. Ao alterar gravações, revise a invalidação de consultas e os dados derivados afetados.
- Para interface, consulte `DESIGN.md` e reutilize os componentes e tokens em `src/components/ui/` e `src/app/globals.css`. Preserve responsividade, navegação por teclado, rótulos acessíveis e estados de carregamento, vazio e erro.
- Atualize a documentação relacionada quando mudar comportamento, configuração ou operação. Planos antigos e relatos de auditoria são contexto histórico; confirme o comportamento no código atual.

## Regras financeiras e segurança

- Valores monetários são inteiros em centavos. Preserve os limites dos schemas e das regras do Firestore; evite cálculos em ponto flutuante para armazenar dinheiro.
- Reutilize os utilitários de datas e faturamento. Data da compra e competência da fatura têm significados distintos; considere fechamento, virada de mês/ano e fuso horário nas alterações.
- Preserve o isolamento por UID em `/users/{uid}`. Valide autenticação, autorização e entradas nas rotas do servidor: o Admin SDK não é limitado pelas regras do Firestore.
- Mudanças nos schemas ou nas operações de dados devem revisar compatibilidade com `firestore.rules`, índices e dados existentes. Consulte `docs/firestore-security.md` e os documentos do fluxo afetado.
- Nunca versione credenciais, tokens ou `.env.local`, nem exponha segredos em logs. Documente variáveis em `.env.example`; credenciais administrativas nunca usam o prefixo `NEXT_PUBLIC_`.
- Execute testes de integração nos projetos fictícios configurados pelos scripts. Não use dados reais ou credenciais de produção para testes; deploys e migrações de produção exigem autorização explícita.

## Verificação

Escolha as verificações pelo impacto da mudança. Consulte os pré-requisitos em `README.md` e o fluxo de CI em `.github/actions/verify/action.yml`.

| Mudança | Verificações |
| --- | --- |
| Código TypeScript/React | `npm run lint`, `npm run typecheck` e testes unitários relacionados |
| Regra de negócio ou correção de bug | Testes do comportamento e da regressão em `tests/unit/` |
| Regras, schemas ou permissões Firestore | `npm run test:rules` e testes relacionados da aplicação |
| Fluxos de interface, autenticação ou integração | `npm run test:e2e`, conforme o fluxo afetado |
| Dependências, configuração Next.js ou build | Lint, tipos, `npm test -- --runInBand` e `npm run build`; regras/E2E quando afetados |
| Somente documentação | Conferência do diff, links, caminhos e comandos citados; sem necessidade de executar a aplicação |

- Para a verificação completa de código, execute lint, tipos, `npm test -- --runInBand`, regras, build e E2E.
- `npm test` não inclui regras nem E2E. Regras exigem Java 21+ e usam `demo-gestone-rules` na porta 8080. E2E usa `demo-gestone-e2e`, Authentication em 9099, Firestore em 8081 e aplicação em 3102; instale Chromium com `npx playwright install chromium`.
- Use `npm run test:e2e` para iniciar o ambiente isolado; executar Playwright diretamente não configura os emuladores. Não encerre processos alheios se uma porta estiver ocupada.
- Registre comandos e resultados. Se houver falha ou pré-requisito indisponível, informe o impedimento e diferencie falhas preexistentes das introduzidas pela alteração. Não declare validações que não executou.

## Entrega de tarefas do Linear e commits

- Quando o pedido estiver vinculado a uma tarefa do Linear, confirme seu identificador e critérios de aceite e atualize-a para `In Progress` ao iniciar o trabalho.
- Pedidos diretos sem tarefa vinculada podem ser executados sem criar uma tarefa no Linear. Não invente identificadores nem associe uma tarefa por suposição.
- Para cada tarefa implementada, conclua as verificações necessárias e crie um commit específico com o código, os testes e a documentação pertinentes antes de encerrar a entrega, salvo instrução explícita em contrário do usuário.
- Revise o diff e adicione somente arquivos ou trechos da tarefa ao stage. Preserve alterações locais anteriores que não pertençam à tarefa; não as inclua no commit. Evite `git add .`, descartes e reescrita de histórico que possam afetar trabalho alheio.
- Após criar o commit, atualize a tarefa vinculada no Linear para `Done`, registrando resumo da implementação, verificações e hash do commit. Só conclua a tarefa se os critérios de aceite estiverem atendidos.
- Se a tarefa estiver incompleta ou o Linear estiver indisponível, registre o impedimento e mantenha ou informe um status compatível. Não afirme que o status foi atualizado sem confirmação.
- Na resposta final, informe resultado, verificações e limitações relevantes, além do identificador da tarefa (quando houver) e do hash do commit. Commit local não implica push, PR ou deploy.
