# Dados textuais dos gráficos

Gastos por Categoria mostra a lista integral de categorias, valores em BRL e percentuais calculados sobre os mesmos centavos enviados ao gráfico. O total está visível. Nomes não são abreviados; a lista cresce com as categorias em vez de depender de uma legenda de altura fixa.

Fluxo de Caixa e Evolução de Saldo oferecem “Ver dados por período”, um controle nativo `details/summary` acessível por teclado. O primeiro expõe receitas, despesas e investimentos por mês; o segundo mostra o saldo acumulado de cada mês. As listas usam os mesmos objetos `MonthlySummary` das séries, sem recalcular o saldo.

As representações visuais são ocultas de tecnologias assistivas para evitar navegação duplicada pelos SVGs. A alternativa textual permanece no documento. Os marcadores de categoria têm contorno na cor do texto; a identificação e os valores não dependem das cores configuráveis. Texto usa os tokens de primeiro e segundo plano do tema.

`tests/unit/chart-data.test.tsx` confere 20 categorias, percentuais, total, centavos das séries e vazio. `tests/e2e/chart-data.test.ts` confere nomes longos em 320 px, teclado para expandir os dados e capturas claro/escuro em `dogfood-output/rod-120/`. A leitura com um leitor de tela real permanece uma verificação manual.

Capturas em 320 px: [tema claro](../audits/2026-10-22/rod-120/light-320.png) e [tema escuro](../audits/2026-10-22/rod-120/dark-320.png).

## Revisão dos relatórios — 23/10/2026

A tela apresenta totais de receitas, despesas, investimentos e resultado do
período antes dos gráficos. O resultado usa o último saldo acumulado da mesma
série mensal; não é saldo bancário nem inclui períodos anteriores ao filtro.
O intervalo aparece por extenso e os botões de 3, 6 e 12 meses informam o estado
selecionado para tecnologia assistiva. Serviços, competência e armazenamento
em centavos permanecem iguais.

Fluxo de Caixa tem mais espaço, grade discreta e três cores semânticas. A
legenda permite ocultar e restaurar séries para comparação, mantendo pelo
menos uma visível. A alternativa “Ver dados por período” conserva os valores
de todas as séries, mesmo quando alguma estiver oculta visualmente.

Evolução de Saldo fica visível sem expansão, com pontos mensais e segmentos
lineares, sem interpolar picos. A linha zero aparece se há saldo negativo.
Os IDs dos gradientes são exclusivos por instância e animações não interferem
na comparação nem na preferência por movimento reduzido.

Gastos por categoria combina uma rosca e a lista integral, ordenada por valor.
A rosca destaca as cinco maiores categorias e agrupa as demais em “Outras
categorias”; a lista mantém todas as categorias com valores exatos, percentuais
e barras. Cores correspondem à posição no gráfico e têm marcadores na lista;
não substituem os nomes nem representam mudanças nas cores do cadastro.
Tooltips exibem valores monetários completos e nomes em português. Eixos
compactam apenas a apresentação e identificam a unidade em reais.

Verificação desta revisão:

- `npm run lint -- --ignore-pattern '.worktrees/**' --ignore-pattern 'dogfood-output/**'` e `npm run typecheck`: aprovados.
- `npm test -- --runInBand --testPathIgnorePatterns '/node_modules/' '/.worktrees/' '/dogfood-output/'`: 41 suítes e 221 testes aprovados.
- Build de produção aprovado na cópia isolada de QA, sem `.env.local`, com as variáveis fictícias do runner E2E.

A cópia em `dogfood-output/cards-validation/` usa `demo-gestone-e2e`,
Authentication/Firestore em 29099/28081 e aplicação em 3212. Portas e guardas
são adaptadas somente nessa cópia para preservar os processos do ambiente
principal. Os comandos de lint/Jest excluem cópias antigas em `.worktrees` e
os artefatos de QA; a configuração versionada permanece igual. A primeira
execução do novo teste de resumo usava uma consulta singular para quatro
valores; a asserção foi corrigida para conferir cada indicador pelo seu rótulo.
Regras e índices não foram alterados; testes de regras não foram repetidos
nesta revisão de interface.

Na revisão das capturas, os totais de seis dígitos quebravam no meio do número
em 320 px. Os resumos passaram a usar tipografia e espaçamento menores no
celular, permitindo a quebra entre moeda e valor; o novo E2E confere a altura
do total nesse viewport. Os eixos têm rótulos de 12 px. A legenda respeita a
largura de painéis estreitos. O filtro permanece montado durante o carregamento,
preservando o foco de teclado após a troca de período.

A rodada final aprovou novamente lint, tipos, 41 suítes/221 testes unitários,
build de produção e **35 E2E/PWA**. As capturas finais em claro/escuro e
320/1280 px estão em `dogfood-output/cards-validation/dogfood-output/report-charts/`.
A captura móvel foi revisada após o ajuste: os totais da massa de teste ficam
em uma linha, verificado também pelo E2E. O cenário confere a troca de 3/12
meses, o foco preservado no filtro, a ocultação/restauração das séries e a
presença das curvas e setores. A matriz financeira existente cobre valores
longos e reflow equivalente a 200%. Nenhum dado de produção foi acessado.
