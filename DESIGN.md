# Design do GestOne

O GestOne usa uma direção sóbria e refinada: grade alinhada à esquerda, tipografia Geist, superfícies neutras e azul para ações principais. A hierarquia reúne valor, período e contexto financeiro, sem apresentar projeções como saldo bancário.

## Fundação

A fonte de verdade dos tokens é src/app/globals.css. O projeto usa Tailwind 4 e componentes locais do Shadcn base-nova com Base UI. Reutilize os componentes; não substitua sua implementação por exemplos Radix.

| Papel          | Claro   | Escuro  |
| -------------- | ------- | ------- |
| Fundo          | #f7f7f8 | #0b0e14 |
| Painel         | #ffffff | #121722 |
| Texto          | #111111 | #ededed |
| Ação principal | #002fa7 | #9aafff |
| Receita        | #107d32 | #71df9b |
| Despesa        | #c90030 | #ff676d |
| Investimento   | #7132b4 | #c5a3ff |

Use tokens semânticos (background, card, primary, income, expense e investment). Cores configuradas pelo usuário em categorias/cartões são conteúdo, não tokens da interface. Não use background-100/background-200: esses tokens não existem.

## Tipografia, espaço e forma

- Geist Sans na interface; números financeiros com tabular-nums, sem alterar o armazenamento em centavos.
- Títulos de página: 24–32 px; corpo: 14–16 px; informações auxiliares: no mínimo 12 px.
- Grade de 4 px. Margens da página: 16 px no celular, 24 px em sm e 32 px em lg. Largura máxima: 1280 px.
- Controles com área interativa mínima de 44 × 44 px. Raio de 6 px em controles e 12 px em painéis, diálogos e sheets.
- Bordas e superfícies estabelecem hierarquia. Sombras discretas em painéis; sombras elevadas apenas em sobreposições.
- Não truncar descrições financeiras ou nomes de categorias nas listas. Permitir quebra de linha e altura variável.

## Layout responsivo

Breakpoints do Tailwind: sm 640, md 768, lg 1024, xl 1280 e 2xl 1536 px. Não redefinir esses valores em documentação ou CSS.

Desktop usa navegação lateral agrupada, cabeçalho de 64 px e conteúdo flexível. Celular usa Painel, Extrato, Cartões e Mais; o menu Mais é rolável. Novo lançamento fica acima da navegação inferior com margem para safe-area. O conteúdo reserva espaço para ambos.

O formulário de lançamento usa uma única instância de Dialog do Base UI: em md ou maior é centralizado; abaixo de md adota apresentação de Sheet inferior amplo. A mudança de largura não remonta o formulário. A rolagem fica dentro da sobreposição, com margem inferior para acessar a ação usando teclado virtual.

## Hierarquia e interação

- Painel: mês, saldo projetado, reserva futura, disponível após reservas, indicadores e lançamentos recentes. Explicação essencial sempre visível; detalhes de cálculo em expansão acessível.
- Extrato: busca e datas visíveis; filtros adicionais recolhíveis e identificados quando ativos. Importar/exportar é uma ação secundária. Manter paginação e continuação da busca por cursor.
- Cartões: seleção compacta no celular; seleção lateral no desktop. Competência, total e status precedem as ações da fatura. Quitação é registro de pagamento externo e não cria outra despesa.
- Metas e limites: progresso acompanhado de valores textuais; excesso explícito, nunca apenas uma cor. Ausência de meta não significa meta zero.
- Configurações: Tabs com Perfil, Aparência, Segurança e Exclusão da conta. Ações destrutivas têm consequências e confirmação específicas.

## Conteúdo e acessibilidade

Português brasileiro, ações concretas e mensagens sem jargão. Use estados distintos para carregamento inicial, atualização, ausência de dados, ausência de resultados e erro. Falhas nunca devem aparecer como valores zero. Feedback de salvamento deve preservar o formulário em caso de erro.

Preserve h1, landmarks, skip link, aria-current, erros associados aos campos, foco visível, devolução de foco em diálogos e alternativa textual dos gráficos. Não dependa de hover ou cor para identificar ações/estados. Alvo: WCAG 2.2 AA; contraste mínimo de texto comum 4,5:1. Animações curtas apenas em componentes, respeitando prefers-reduced-motion.

## Verificação

Validar 320/390/768/1280/1536 px, ambos os temas, reflow de 200%, descrições de 200 caracteres e R$ 9.999.999,99. Use testes com projetos Firebase fictícios e registre capturas atuais em dogfood-output/redesign/. Leitor de tela real, teclado virtual e área segura física requerem verificação manual em dispositivo.
