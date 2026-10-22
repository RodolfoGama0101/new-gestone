# Dados textuais dos gráficos

Gastos por Categoria mostra a lista integral de categorias, valores em BRL e percentuais calculados sobre os mesmos centavos enviados ao gráfico. O total está visível. Nomes não são abreviados; a lista cresce com as categorias em vez de depender de uma legenda de altura fixa.

Fluxo de Caixa e Evolução de Saldo oferecem “Ver dados por período”, um controle nativo `details/summary` acessível por teclado. O primeiro expõe receitas, despesas e investimentos por mês; o segundo mostra o saldo acumulado de cada mês. As listas usam os mesmos objetos `MonthlySummary` das séries, sem recalcular o saldo.

As representações visuais são ocultas de tecnologias assistivas para evitar navegação duplicada pelos SVGs. A alternativa textual permanece no documento. Os marcadores de categoria têm contorno na cor do texto; a identificação e os valores não dependem das cores configuráveis. Texto usa os tokens de primeiro e segundo plano do tema.

`tests/unit/chart-data.test.tsx` confere 20 categorias, percentuais, total, centavos das séries e vazio. `tests/e2e/chart-data.test.ts` confere nomes longos em 320 px, teclado para expandir os dados e capturas claro/escuro em `dogfood-output/rod-120/`. A leitura com um leitor de tela real permanece uma verificação manual.

Capturas em 320 px: [tema claro](../audits/2026-10-22/rod-120/light-320.png) e [tema escuro](../audits/2026-10-22/rod-120/dark-320.png).
