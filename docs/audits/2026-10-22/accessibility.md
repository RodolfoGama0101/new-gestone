# Auditoria de acessibilidade — ROD-117

## Ambiente e evidências

Revisão local com agent-browser 0.34.0, Chromium 152 e axe-core 4.12.1, usando somente demo-gestone-e2e. O [resumo estruturado](accessibility-summary.json) contém resultados das páginas e diálogos cobertos, sem credenciais ou dados financeiros. Relatórios brutos e screenshots descartáveis permanecem em dogfood-output, ignorado pelo Git.

Login, cadastro e recuperação foram auditados em 1280×900 e 390×844, nos temas claro e escuro. Após as correções, não houve violações confirmadas nas amostras finais. Dashboard também passou nos dois temas. Isso não equivale a auditar todas as páginas e combinações de dados da aplicação.

## Verificações inconclusivas

A grade SVG do painel de marca impede o axe de inferir o fundo. Revisão por captura e cálculo sobre o fundo mais claro da grade (#090909) encontrou contraste mínimo de 7,71:1 para texto #a1a1a1; branco atingiu 19,91:1. Inconclusivo não foi tratado como falha confirmada.

Na navegação móvel translúcida, os rótulos agora usam a cor integral do tema. Considerando inclusive os extremos de conteúdo sob o fundo a 90%, as combinações permanecem acima de 4,5:1. A prévia do cartão usa uma camada preta a 60%; mesmo com brilho branco a 10%, o fundo fica no máximo próximo de #767676, mantendo texto branco acima de 4,5:1. Labels secundários deixam de usar transparência.

Os focus guards e o fundo inerte dos diálogos Base UI geram verificações manuais de aria-hidden-focus. Os testes por teclado percorrem o diálogo, verificam que o foco fica nele e validam Escape e retorno ao gatilho; não removemos os guards da biblioteca.

## Ampliação e limites

O reflow equivalente a zoom de 200% em uma janela 1280×900 foi emulado com viewport CSS 640×450 e deviceScaleFactor=2. As capturas foram inspecionadas e o scrollWidth permaneceu igual ao viewport, sem perda dos títulos ou ações. Isso verifica o reflow equivalente; não é um teste do comando de zoom da interface nativa do navegador. Também foi verificado o viewport móvel 390×844.

Para reproduzir a revisão interativa, execute npm run test:e2e -- --review. O runner prepara os mesmos emuladores fictícios e mantém Next dev com Turbopack explícito na porta 3102. Encerre a sessão ao terminar e não rode simultaneamente à suíte E2E. Para regressões automatizadas, execute npm run test:e2e.
