# Scripts do projeto

`npm run test:e2e` inicia Authentication e Firestore fictícios e o app de desenvolvimento.

`npm run test:e2e -- --production` constrói com valores fictícios e usa `playwright.production.config.ts`, `next start` e os mesmos emuladores isolados para verificar PWA. Requer Java 21+, Chromium do Playwright e as dependências do lockfile. Não execute junto da suíte comum, pois compartilham portas. Não execute Playwright diretamente, pois isso não prepara os emuladores.
