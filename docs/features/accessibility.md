# Acessibilidade dos fluxos principais — ROD-117

Autenticação e dashboard têm um único main com destino para “Pular para o conteúdo”. Login, cadastro e recuperação exibem h1 mesmo no celular. Títulos de cards são h2; estados vazios mantêm a sequência de títulos. Logos com link possuem nome acessível.

Erros dos formulários são associados por aria-describedby, campos inválidos recebem aria-invalid e mensagens têm role=alert. Formulários anunciam processamento; o resultado de recuperação recebe foco. No lançamento, o primeiro inválido segue a ordem visual, pois Controllers do React Hook Form podem ser registrados depois dos inputs nativos.

Botões de tipo, tema, seção e cor anunciam seleção. Links de navegação identificam a página atual com aria-current. Os filtros têm nomes acessíveis, controles de fechar estão em português e foco por teclado permanece visível. O diálogo conserva o foco e o devolve ao gatilho ao fechar.

Os tokens de erro no tema claro, o breadcrumb e os rótulos da navegação móvel foram ajustados para contraste. A prévia do cartão mantém a cor escolhida sob uma camada escura e texto branco opaco, para legibilidade também em cores claras.

Veja a [auditoria e seus limites](../audits/2026-10-22/accessibility.md). Os testes Playwright verificam teclado, foco, temas, mensagens e reflow. npm run test:e2e usa somente projetos fictícios.

No painel, o mês fica no cabeçalho e o botão de novo lançamento fica junto ao título. Abaixo de 601 px, o botão ocupa a largura disponível. O mês mantém as setas na mesma linha e anuncia sua alteração. O menu da conta tem nome acessível explícito, os botões de fechar diálogos e menus têm alvos de 48 px e as seções de configurações quebram linha. O indicador de desenvolvimento do Next.js fica desativado para não cobrir a navegação inferior. Os erros de compilação e execução continuam disponíveis.

A partir de 961 px, a navegação lateral agrupa rotas por finalidade e informa a moeda. Em larguras menores, a barra inferior oferece Painel, Extrato, Cartões e Mais. Mais abre uma lista agrupada e rolável, com foco contido e indicação da rota atual. A preferência de tema fica no cabeçalho em todas as larguras. A regressão de navegação e alvos de toque está em `tests/e2e/mobile-navigation.test.ts`.

Validação da correção em 23/10/2026: tipos, lint dos arquivos alterados e build passaram; a suíte com `npm test -- --runInBand --roots tests/unit` passou em 43 suítes/226 testes. O lint global encontrou erros em artefatos locais de `dogfood-output`; o Jest sem raiz explícita incluiu outros worktrees e apresentou colisões. O E2E não iniciou porque a porta 8081 estava ocupada. O novo teste de layout e a conferência visual permanecem pendentes.
