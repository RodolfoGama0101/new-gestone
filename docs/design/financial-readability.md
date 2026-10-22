# Legibilidade das telas financeiras

Painel, extrato, listas e faturas usam texto secundário de pelo menos 12 px e descrições com quebra de linha. Categorias longas podem ocupar mais de uma linha. Valores usam numerais tabulares; o armazenamento em centavos não muda.

Ações de lançamentos têm alvos de 44 px, sem ocultação por hover. Cabeçalhos e paginação quebram ações em linhas. O resumo mensal usa três colunas somente em telas largas. A navegação móvel reserva `safe-area-inset-bottom`.

O teste `tests/e2e/financial-layout.test.ts` usa emuladores, descrição de 200 caracteres, categoria longa e R$ 9.999.999,99. Exercita 320/390/768/1280 px, dois temas e redução de viewport equivalente a zoom de 200%. Capturas: `dogfood-output/rod-118/`.

A revisão no Chromium não comprova a área segura em aparelho físico. A conferência física permanece pendente.

Capturas verificadas: [claro em 320 px](../audits/2026-10-22/rod-118/light-320.png), [escuro em 390 px](../audits/2026-10-22/rod-118/dark-390.png) e [painel em 1280 px](../audits/2026-10-22/rod-118/dashboard-1280.png).

A matriz também cobre a fatura: [captura em 320 px](../audits/2026-10-22/rod-118/invoice-320.png).

Comparação em 320 px: [antes](../audits/2026-10-22/rod-118/before-320.png) e [depois](../audits/2026-10-22/rod-118/light-320.png), com os mesmos dados fictícios.

Após integrar a apresentação compartilhada dos lançamentos e os gráficos acessíveis, painel e relatórios usam colunas que podem encolher abaixo da largura mínima do conteúdo. Os totais dos relatórios podem quebrar linha e seus cartões crescem com o texto, evitando cortes no reflow de 200%.
