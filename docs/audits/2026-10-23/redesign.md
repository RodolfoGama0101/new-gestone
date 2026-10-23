# Verificação do redesign — 23/10/2026

## Resultado

Redesign do produto com Shadcn/Base UI e Tailwind, preservando serviços, rotas, centavos, isolamento por UID e regras financeiras. A revisão inclui navegação agrupada, atalho global, formulário responsivo, filtros recolhíveis, painel, faturas, planejamento, categorias e autenticação.

## Verificações

| Verificação              | Resultado                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| Node / npm               | 24.15.0 / 12.0.2                                                   |
| npm run lint             | Aprovado                                                           |
| npm run typecheck        | Aprovado                                                           |
| npm test -- --runInBand  | 33 suítes, 171 testes aprovados                                    |
| npm run test:rules       | 1 suíte, 145 testes aprovados em demo-gestone-rules                |
| npm run build            | Aprovado fora do sandbox após EPERM na saída de build              |
| npm run test:e2e         | 29 testes aprovados na versão final, incluindo calendário e reflow |
| axe-core 4.12.1 no login | 37 verificações aprovadas e nenhuma violação, em claro e escuro    |

A matriz de layout cobre painel, extrato, despesas, relatórios e faturas em 320, 390, 768, 1280 e 1536 px, dois temas e redução de viewport equivalente a 200% de zoom. Os dados fictícios incluem descrição de 200 caracteres, categoria extensa, valores negativos e R$ 9.999.999,99. Capturas determinísticas desabilitam animações na captura.

Os E2E cobrem também CRUD, CSV, busca esparsa com continuação, paginação, temas sincronizados, autenticação, quitação/estorno informativos, recorrências e parcelas. A regressão do redesign confere abertura global, foco no primeiro erro, calendário móvel, campos preservados ao redimensionar, bloqueio de envio duplicado, resumo dos filtros, Tabs por teclado e menu Mais em 320 × 360 px.

Os pares principais de texto/fundo foram calculados por luminância relativa: menor contraste entre os pares verificados foi 5,25:1 no claro e 6,33:1 no escuro. Isso não substitui uma auditoria integral de todas as combinações/estados.

## Capturas atuais

- [Painel claro em desktop](redesign/dashboard-light.png)
- [Extrato claro em 320 px](redesign/transactions-320.png)
- [Fatura escura em 390 px](redesign/invoice-dark-390.png)
- [Formulário em desktop](redesign/form-desktop.png)
- [Formulário móvel](redesign/form-mobile.png)
- [Login em desktop](redesign/login-desktop.png)
- [Login escuro em 390 px](redesign/login-mobile-dark.png)

As capturas usam somente dados fictícios. A matriz integral fica em dogfood-output/redesign/; relatórios Playwright em playwright-report/.

## Ambiente e limitações

- npm ci encontrou primeiro indisponibilidade de rede no sandbox e depois bibliotecas nativas bloqueadas pelo servidor Next já aberto. A instalação foi recuperada com npm install --ignore-scripts --no-audit --no-fund; manifesto e lockfile não tiveram alteração de conteúdo.
- A descoberta anterior do Jest carregava testes de outras worktrees. roots agora restringe cada comando ao diretório correto deste checkout; os números acima correspondem apenas ao projeto atual.
- O Next de testes usa .next/e2e para preservar o servidor local da porta 3000. Um emulador antigo na porta 8081 foi encerrado com autorização do usuário. Não foram usados dados de produção.
- Houve uma interrupção do processo de regras no Windows; a repetição isolada passou. A execução do build no sandbox encontrou EPERM em um diretório de saída; a repetição final usa execução fora do sandbox.
- Leitura com leitor de tela real, teclado virtual em dispositivo e safe-area física permanecem pendentes. A auditoria axe documentada cobre login; não é certificação WCAG do produto inteiro.
- Não houve publicação manual de regras, migração ou deploy de produção.
