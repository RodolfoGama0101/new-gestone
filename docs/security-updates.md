# Atualização de segurança — 19/10/2026

## ROD-93 — Next.js e React

- Next.js e eslint-config-next: 16.3.3 → 16.4.2, com versões alinhadas e exatas.
- React e React DOM: 19.2.7 → 19.3.1, com versões alinhadas e exatas.
- sharp transitivo: 0.35.4 → 0.35.5.
- Lockfile regenerado pelo npm 12.0.2 com Node.js 24.15.0.
- Instruções geradas em AGENTS.md atualizadas pelo próprio Next.js; continuam apontando para a documentação da versão instalada.

### Triagem

O [aviso oficial de 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026) recomenda Next.js 16.4.1 ou posterior. A versão instalada é 16.4.2.

| Alerta | Alcance neste projeto | Tratamento |
| --- | --- | --- |
| GHSA-673q-mjm6-r5xr — execução remota em `use cache` com typed arrays | App Router presente, mas não foram encontrados Cache Components habilitados nem funções `use cache` | Atualização do framework, sem depender dessa ausência |
| GHSA-2464-fhr4-w9xw — otimização de SVG/sharp em Linux com glibc | O deploy usa Linux; validar somente no Windows não elimina o risco | sharp 0.35.5 confirmado no lockfile e na árvore instalada |
| GHSA-p3m5-59mp-jv5r — negação de serviço em Server Actions | Não foram encontradas Server Actions; APIs de sessão e conta são Route Handlers | Framework e React atualizados |

### Auditoria e verificação

| Estado | Moderados | Altos | Críticos | Total |
| --- | ---: | ---: | ---: | ---: |
| Checkout d10c026, árvore completa | 7 | 23 | 3 | 33 |
| Checkout d10c026, `--omit=dev` | 1 | 14 | 1 | 16 |
| Após Next.js/React, árvore completa | 7 | 22 | 2 | 31 |

Contagens representam pacotes sinalizados, incluindo propagação de alertas pela cadeia de dependências; não representam 33 vulnerabilidades independentes ou exploração comprovada. `--omit=dev` ainda inclui ferramentas de build como next-pwa e não comprova exposição em runtime.

Lint, TypeScript, 2 suítes/6 testes e build de produção aprovados. O build precisou ser executado fora da restrição de escrita do sandbox, que bloqueou a criação de um diretório gerado. Telas públicas verificadas em servidor local de produção. Login real com senha/Google e sessão autenticada em preview continuam dependendo de uma conta de teste e ambiente isolado; não foram declarados como validados.

## ROD-94 — Dependências transitivas e overrides

Firebase cliente atualizado para 12.19.0 e Admin para 14.5.0, sem migração de major. shadcn atualizado para 4.22.1; é necessário no build porque `globals.css` importa `shadcn/tailwind.css`. `ts-jest` removido: a configuração usa `next/jest`, e não havia outro consumidor no projeto. Isso elimina a cadeia desnecessária de handlebars.

Atualizações transitivas foram limitadas às faixas compatíveis dos pais. Não foram aceitos os downgrades para Firebase 9, shadcn 1, Jest 25 ou Next 14 sugeridos pelo audit. A simulação de `npm audit fix` foi interrompida pelo npm com EALLOWREMOTE; as correções foram feitas por atualização explícita dos pacotes.

### Comparação final

| Escopo | Moderados antes → depois | Altos antes → depois | Críticos antes → depois | Total antes → depois |
| --- | ---: | ---: | ---: | ---: |
| Árvore completa | 7 → 19 | 23 → 14 | 3 → 0 | 33 → 33 |
| `--omit=dev` | 1 → 0 | 14 → 8 | 1 → 0 | 16 → 8 |

O aumento de moderados decorre da propagação de `sprintf-js` pela cadeia Jest após corrigir os alertas altos de js-yaml. Há três pacotes com advisories próprios restantes; os outros 30 registros propagam esses alertas pelos pais. A contagem total não diminuiu e a auditoria ainda retorna código 1. As capturas normalizadas, caminhos e links de cada alerta estão em [dependency-audit.json](dependency-audit.json).

### Caminhos tratados

Mapeamento conferido com `npm explain`, comparando também os caminhos presentes nas capturas do audit e no lockfile:

| Origem | Pacotes afetados no estado inicial | Resultado |
| --- | --- | --- |
| Next.js | next, sharp | Corrigidos na ROD-93 |
| ts-jest → handlebars | handlebars | Cadeia removida; testes continuam usando next/jest |
| shadcn → MCP SDK → Express | @modelcontextprotocol/sdk, @hono/node-server, hono, proxy-addr, qs | Atualizados; alertas eliminados |
| shadcn → dotenvx / ferramentas de rede | undici, ip-address | Atualizados; alertas eliminados |
| Firebase Admin → parser multipart | @fastify/busboy | Atualizado; alertas eliminados |
| Firebase Admin → Firestore → google-gax | @grpc/grpc-js | Cópia do Admin atualizada; resta apenas a cópia do SDK cliente |
| Firebase cliente → @firebase/firestore / compat | @grpc/grpc-js, com propagação a firebase e firestore | Risco residual analisado abaixo |
| Next PWA / ESLint Next / shadcn → fast-glob → micromatch | braces, com propagação aos pais, ts-morph e @ts-morph/common | Sem patch publicado; risco residual analisado abaixo |
| Jest → instrumentação Istanbul → js-yaml → argparse | js-yaml, argparse, sprintf-js | js-yaml atualizado; sprintf-js permanece sem patch |
| Next/Tailwind/PostCSS/shadcn | source-map-js, postcss-selector-parser, browserslist, baseline-browser-mapping | Atualizados; alertas eliminados |
| minimatch / AJV | brace-expansion, fast-uri | Patches aplicados; alertas eliminados |

### Overrides

- `brace-expansion`: substituído override global 2.x por seletores para as faixas 1.x e 2.x, com mínimos 1.1.21 e 2.1.7. Cada pai conserva a major esperada.
- `fast-uri`: mínimo elevado para 3.1.8; permanece na major 3 usada por AJV.
- `glob` 10.x: override preexistente mantido; usado pelas ferramentas de build/teste. Não foi introduzida nova migração nesta tarefa.
- `fast-xml-parser` 5.x, `uuid` 11.x e `serialize-javascript` 7.x: overrides preexistentes mantidos; não há alertas para as versões resolvidas. Compatibilidade exercitada por reinstalação, testes e build; isso não equivale a cobertura de todas as APIs desses pacotes.
- `postcss` 8.x: mantido alinhado ao PostCSS direto e às ferramentas de CSS.
- `jwks-rsa → jose` 4.15.9: override específico preexistente mantido para preservar a cadeia de autenticação CommonJS; sem alerta nessa versão no audit atual.

### Riscos residuais e mitigação

1. **braces 3.0.3 — alto, sem patch.** O [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) descreve estouro da pilha com padrões profundamente aninhados. Os caminhos encontrados são ferramentas de lint, geração de componentes e precache do PWA. Nenhuma rota em `src` importa essas ferramentas ou recebe padrões glob do usuário. Mitigação no uso atual: padrões e configuração de build vêm do repositório; não executar geração de componentes/build com padrões fornecidos por visitantes. Rever ao disponibilizar patch ou substituir a cadeia PWA. Isso é uma inferência do código local, não uma auditoria de produção.
2. **@grpc/grpc-js 1.9.16 — alto.** Firebase 12.19.0 ainda exige `~1.9.0` no SDK cliente. O [advisory de autenticação](https://github.com/advisories/GHSA-m9gg-hp2v-232j) exige servidor gRPC com certificados de cliente opcionais e autenticação baseada em `getAuthContext`; o outro advisory da captura trata de mensagens de erro de handlers de servidor. O GestOne não cria servidor gRPC nem usa `getAuthContext`. O acesso do navegador usa o SDK web; as rotas de servidor usam Firebase Admin, cuja cópia gRPC já foi atualizada. Mitigação: conservar essa separação, sem ativar servidor gRPC ou autenticação por certificados nessa cópia. Não forçamos uma versão fora da faixa exigida pelo Firebase sem testes de integração. Revisitar quando o SDK cliente corrigir sua dependência ou na migração validada para Firebase 13.
3. **sprintf-js 1.0.3 — moderado, sem patch.** O [advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) exige controle da string de formatação. O caminho encontrado é Jest → Istanbul → js-yaml/argparse, somente desenvolvimento; não há importação no aplicativo. Mitigação: configuração e argumentos de testes controlados pelo repositório; não oferecer essa ferramenta como serviço a usuários. Revisitar quando houver patch na cadeia Jest.

Essas exceções têm alcance delimitado e permanecem visíveis no audit. Não constituem garantia de ausência de exploração ou validação do ambiente publicado.

### Verificação final da ROD-94

`npm ci`, lint, TypeScript, 2 suítes/6 testes e build de produção aprovados com o lockfile final. Login, cadastro, recuperação de senha e redirecionamento de `/settings` para `/login` verificados em navegador isolado, sem erros de JavaScript reportados. Não houve autenticação real, envio de e-mail ou exclusão de conta. A validação autenticada em preview continua pendente na ROD-93.
