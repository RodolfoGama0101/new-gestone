# Dependências — ROD-126 e ROD-107

Data: 19/10/2026. Node 24.15.0, npm 12.0.2. Relatórios obtidos do registro npm; contagens incluem propagação aos pacotes pais, não falhas independentes nem exploração confirmada.

## Resultado da auditoria

| Árvore | Antes | Depois | Altos antes/depois | Moderados antes/depois | Críticos |
| --- | ---: | ---: | --- | --- | ---: |
| Completa | 38 | 33 | 17 / 12 | 21 / 21 | 0 |
| `--omit=dev` | 8 | 4 | 8 / 4 | 0 / 0 | 0 |

Evidências: [audit anterior](audit-before.json), [audit final](audit-after.json), [produção anterior](audit-production-before.json), [produção final](audit-production-after.json). `--omit=dev` ainda contém next-pwa, uma ferramenta de build; essa lista não equivale ao código executado pelo servidor ou navegador. O quinto pacote eliminado da árvore completa é a propagação para a ferramenta de testes de regras.

## Alterações

Atualizações minor/patch dentro das faixas existentes, incluindo Base UI, TanStack Query/Virtual, ícones, nuqs, React Hook Form, React Day Picker, Recharts, Sonner, Tailwind Merge, Playwright, Jest, PostCSS, Prettier e tipos. A [tabela de versões](versions.md) detalha as mudanças diretas. Os mínimos no manifesto acompanham as versões resolvidas; Next/config 16.4.2 e React/DOM 19.3.1 permanecem alinhados. O lockfile também atualiza dependências transitivas. Os relatórios `versions-before.json` e `versions-after.json` mostram que as atualizações diretas ainda disponíveis são mudanças de major; exigem migrações próprias e não foram aplicadas para eliminar alertas à força.

Foi adicionado somente um override de segurança: `@firebase/firestore → @grpc/grpc-js ^1.14.6`. O Firebase 12.19.0 restringe gRPC a `~1.9.0`; o Firebase 13/Firestore 4.18.0 consultado ainda usa essa faixa. A correção fica na mesma major 1 do gRPC, mas amplia a faixa do pai e exige validação de integração. O override é específico ao Firestore, sem alterar as faixas das demais bibliotecas. [Advisory de certificados](https://github.com/advisories/GHSA-m9gg-hp2v-232j) e [advisory de mensagens de erro](https://github.com/advisories/GHSA-f596-whhp-79r4) indicam correção a partir de 1.13.6. O Admin já usava uma cópia corrigida. Remover o override quando a dependência do SDK passar a incluir uma versão corrigida.

Os overrides anteriores foram preservados; PostCSS foi alinhado à dependência direta 8.5.31. Não foi usado `npm audit fix --force`. Firebase 9 e Jest 25 sugeridos pelo audit são downgrades incompatíveis. Também não foi imposta a major 2 de OpenTelemetry sobre a API 1 exigida pelo Pub/Sub.

## Matriz de aplicabilidade

As evidências `explain-*-before.json` registram todos os caminhos com `npm explain`. As conclusões de exposição são inferências das importações locais e das condições dos advisories, sem comprovar o ambiente publicado.

| Advisory / pacote | Caminho e ambiente | Aplicabilidade e decisão |
| --- | --- | --- |
| GHSA-m9gg-hp2v-232j e GHSA-f596-whhp-79r4, gRPC 1.9.16 | Firebase → Firestore/compat; Node e ferramentas de testes. No navegador o SDK usa transporte web; rotas usam Admin. | Corrigido por override específico 1.14.6. O app não cria servidor gRPC nem usa `getAuthContext`. Validar regras/E2E, pois a faixa estreita do pai foi ampliada. |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), braces 3.0.3 | next-pwa → fast-glob → micromatch; ESLint Next e shadcn/ts-morph; Firebase CLI → chokidar. Build, lint, geração e emuladores. | Sem patch publicado no audit. Padrões glob vêm do repositório; nenhuma rota importa essas ferramentas nem aceita padrões de visitantes. Manter a execução restrita a configurações confiáveis. Os quatro alertas na árvore de produção pertencem à cadeia de build PWA. |
| [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf), OpenTelemetry Core 1.30.1 | Firebase CLI 15.34.0 → Pub/Sub 5.3.1 → Core ^1.30.1; somente desenvolvimento/operação. | Correção publicada na major 2.8.0; nenhuma correção 1.x encontrada. Pub/Sub 6 já usa Core ^2.8.0, mas o CLI exige Pub/Sub 5. Não forçar troca de major no transporte do CLI. O app não consome Pub/Sub nem baggage. Não usar o CLI como endpoint público ou processador de mensagens não confiáveis. |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), sprintf-js 1.0.3 | Jest/Istanbul → js-yaml → argparse → sprintf-js; somente testes. | Sem patch publicado no audit. A condição é controle da string de formatação/precisão. Configuração e argumentos de teste vêm do repositório; não expor essa cadeia como serviço. |

Responsável pela revisão das exceções e do override: mantenedor do GestOne (Rodolfo Gama). Próxima revisão até **26/10/2026**, ou antes se houver patch/advisory novo ou mudança de uso. Reavaliar braces nas cadeias PWA/ESLint/CLI, a dependência Pub/Sub do Firebase CLI e a cadeia Istanbul/Jest. As exceções continuam visíveis; não há supressão de audit nem garantia de risco zero.

## Manutenção contínua

`.github/dependabot.yml` agenda verificações semanais npm e Actions. Minor/patch de framework, runtime e tooling são agrupadas separadamente. Majors ficam em PRs individuais, com revisão de migração, sem auto-merge. GitHub Actions são fixados nos commits resolvidos das tags oficiais em 19/10/2026; o Dependabot pode atualizar essas referências. Node está fixado em 24.15.0 nos jobs; Java permanece na linha 21.

Os workflows de CI e deploy usam a action local `verify` para instalar pelo lockfile, lint, tipos, unitários, regras e build. Node 24.15.0 e npm 12.0.2 são instalados explicitamente. E2E mantém job isolado sem secrets, inclusive para PRs do Dependabot. Preview com secrets permanece restrito a branches do repositório; a validação sem credenciais ocorre no CI. Firebase CLI está em 15.34.0 no lockfile; os dois inputs `firebaseToolsVersion` leem essa versão instalada, evitando divergência em atualizações futuras. Regras usam o executável local com `npm exec --no` para impedir fallback de download.

Credenciais JSON/ADC, revisão de preview e procedimento de rollback estão no [README principal](../../../README.md). Variáveis Admin fictícias não consumidas foram removidas do CI. Nenhuma publicação de regras, índices ou Hosting foi executada nesta tarefa.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm ci` com lockfile final | Aprovado; 1.714 pacotes auditados |
| `npm run lint` e `npm run typecheck` | Aprovados |
| `npm test -- --runInBand` | 15 suítes, 104 testes aprovados |
| `npm run test:rules` | 117 testes aprovados no Firestore local |
| `npm run test:e2e` | 4 testes aprovados no Chromium 156/Playwright 1.64.1; cadastro, login, CRUD, CSV, exclusão de conta, 105 compras, saldo, concorrência e isolamento |
| `npm run build` | Aprovado com webpack, geração de páginas e service worker |
| PWA em servidor de produção local | Worker `/sw.js` ativado, controlador presente e escopo `/`; Workbox, manifesto e quatro ícones com HTTP 200; nenhuma exceção JavaScript antes do teste offline |
| PWA com servidor indisponível | Servidor na porta 3103 encerrado e ausência de listener confirmada; recarga de `/login` manteve formulário e controlador. Isso verifica a tela pública em cache, não operações autenticadas offline. |
| YAML e diff | Cinco arquivos YAML analisados sem erros/chaves duplicadas; diff sem erros de whitespace |

As evidências `pwa-online.json`, `pwa-server-offline.json` e as duas capturas PNG registram a verificação do navegador isolado. A indisponibilidade foi produzida encerrando o servidor temporário, pois a emulação offline do navegador foi reiniciada ao recarregar. Os artefatos gerados em `public/sw.js`/Workbox foram restaurados ao conteúdo anterior depois da verificação; `next build` os regenera para cada publicação.

O `npm ci` inicial encontrou arquivo nativo bloqueado pelo servidor de desenvolvimento; após encerrá-lo temporariamente, a instalação completa e os checks passaram. O servidor original na porta 3000 foi restaurado ao final. Os emuladores foram executados com Java 25 instalado localmente; CI permanece com Java 21. Os scripts de instalação bloqueados pelo padrão do npm 12 não impediram os checks.

Preview autenticado com ADC, criação de PRs pelo Dependabot e execução remota dos workflows dependem da publicação das alterações e do ambiente GitHub/Firebase; não foram declarados validados apenas pelo checkout local. **ROD-126 concluída localmente**, com exceções documentadas; **ROD-107 implementada no repositório**, pendente dessas comprovações remotas para encerrar os critérios de aceite.
