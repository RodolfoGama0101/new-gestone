# Cache e funcionamento offline — ROD-106

O worker guarda somente recursos públicos precacheados e arquivos em `/_next/static/`. Documentos autenticados, payloads RSC, APIs e Firebase usam `NetworkOnly`; não há cache da URL inicial nem de navegação pelo cliente. A instalação depende de uma visita online.

Uma navegação sem rede mostra `public/offline.html`, página estática independente de sessão e React. Dados financeiros não são oferecidos offline. APIs falham sem rede e não recebem o HTML de fallback. Ao voltar à rede, o usuário pode tentar novamente.

O fallback usa superfícies neutras e foco visível. Sua aparência acompanha o
tema local (`light` ou `dark` na chave `theme`) ou a preferência do sistema,
sem consultar a conta nem depender de recursos remotos. Ele não introduz uma
nova marca; as telas React continuam reutilizando o componente `Logo` original.

Os ícones públicos e de instalação usam o mesmo “G” de seta circular da interface.
`node scripts/generate-brand-icons.mjs` extrai os traços de `Logo` e gera
`public/logo.svg`, `public/logo.png`, o recurso local
`plugins/gestone-private/assets/icon.jpg` e os quatro PNGs do manifest nas
dimensões 192 e 512. As variantes maskable mantêm o desenho na área central segura.
O build inclui as revisões novas no precache. Instaladores do sistema podem
reter um ícone antigo até atualizar ou reinstalar o atalho do PWA.
Categorias com o identificador legado do ícone substituído exibem uma carteira;
ao salvar a edição, passam a usar essa opção, sem migração de dados em produção.

Verificação da substituição de marca em 26/10/2026: lint, tipos, dez testes de
categorias, dimensões dos PNGs e inspeção visual aprovados. O build com a
configuração fictícia do runner PWA passou. No E2E de produção local, o teste
de cache/fallback passou; o de logout offline falhou esperando `/login` após
limpar o histórico visível. A tentativa de repetição encontrou a porta 8081
ocupada e não encerrou processos alheios. Autenticação e worker não foram
alterados nesta entrega; a causa desse resultado de logout não foi determinada.

Uma nova versão assume controle com `skipWaiting`/`clientsClaim`. Na ativação, o worker personalizado remove caches antigos que não pertencem ao prefixo público atual. Assim, caches legados de páginas e APIs deixam de sobreviver à atualização. Esse trabalho é limitado ao origin da aplicação.

Logout e troca de UID cancelam consultas e limpam o QueryClient antes de disponibilizar a próxima conta. A saída local funciona mesmo se a exclusão do cookie falhar. Um cookie HttpOnly só pode ser removido pelo servidor: se a saída ocorrer offline, a interface informa a necessidade de reconectar. O estado Firebase local é encerrado e a área financeira exige usuário ativo no cliente.

`sw.js`, `workbox-*`, `worker-*` e `fallback-*` são saídas ignoradas pelo Git. O deploy da Vercel executa `next build`, que gera os artefatos junto dos arquivos com hash correspondentes. Nunca publique apenas o worker de outro build. O rollback deve restaurar o build completo.

Execute `npm run test:e2e -- --production` para construir com configuração fictícia, iniciar emuladores e testar o worker em produção local. A suíte verifica ativação de uma versão alterada, remoção de cache legado, exclusão de APIs e fallback offline. Não usa credenciais reais. Para os demais fluxos, use `npm run test:e2e`.

## Particularidades verificadas do plugin

Na versão instalada, `cacheStartUrl: false` precisa vir junto de `dynamicStartUrl: false`: caso contrário o worker ainda recebe uma regra `NetworkFirst` para `/`. A regra `NetworkOnly` precisa de `options: {}` para o plugin injetar seu fallback. O caminho `customWorkerSrc: src/worker` garante que o worker de limpeza seja compilado. Essas condições foram conferidas no código distribuído do plugin e no `sw.js` gerado; a suíte de produção também rejeita a presença de `start-url` e testa uma visita à raiz antes de inspecionar os caches.

Execute localmente `npm run test:e2e` e depois `npm run test:e2e -- --production`. O Jest usa descoberta explícita em `tests/unit/`, evitando misturar regras e Playwright em caminhos Windows com diretórios ocultos.

## Validação da liberação MCP 0.3.0 — 26/10/2026

O cenário de logout offline ainda procurava o menu pelo nome aleatório da conta,
embora o botão atual tenha o rótulo acessível “Abrir menu da conta”. O seletor foi
atualizado para esse rótulo, sem alterar o aplicativo ou o isolamento de cache.
A primeira execução parou antes de realizar logout; após o ajuste, os dois
testes de `npm run test:e2e -- --production` passaram em 12,6 segundos, além do
build de produção com configuração Firebase fictícia. O teste continua verificando
que a primeira conta desaparece da interface offline e não reaparece após criar
ou navegar com a segunda conta. Nenhum dado ou credencial de produção foi usado.
