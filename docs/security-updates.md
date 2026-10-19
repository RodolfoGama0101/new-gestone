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
