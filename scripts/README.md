# Scripts de verificação

`npm run test:e2e` inicia Authentication, Firestore e Playwright com `demo-gestone-e2e`. Requer Java 21+ e Chromium instalado pelo Playwright; não execute Playwright diretamente sem os emuladores.

`npm run test:e2e -- --production` constrói com valores fictícios e usa `playwright.production.config.ts`, `next start` e os mesmos emuladores isolados para verificar PWA.

`npm run test:e2e -- --review` prepara o mesmo ambiente fictício e mantém `next dev --turbopack` na porta 3102 para auditoria interativa. Não executa testes automaticamente; encerre com Ctrl+C e confirme que os processos dessa sessão terminaram antes de rodar outra suíte. Não encerre processos de outras sessões.

Os modos compartilham portas e devem ser executados separadamente. Consulte a [auditoria de acessibilidade](../docs/audits/2026-10-22/accessibility.md) para alcance e limites da revisão.
