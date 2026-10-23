# Redesign Geist — ROD-127

Referência: `DESIGN.md` e https://vercel.com/design.md.

## Identidade preservada

Reutilizar `src/components/shared/logo.tsx` sem substituir símbolo, lettering,
proporções ou variantes. O ícone ilustrativo do protótipo não substitui a logo.

A sidebar apresenta a logo seguida pela navegação, sem o avatar decorativo
“G” nem o bloco “Finanças pessoais / Seu espaço financeiro”, que não
representavam uma conta ou um espaço selecionável.

No painel, o botão “Novo lançamento” tem 50 px de altura, alinhado à altura
do seletor de mês em uma linha (controle de 40 px, padding e bordas).

## Etapas

1. Base visual: tokens dos temas e componentes compartilhados.
2. Navegação: sidebar, cabeçalho e navegação móvel.
3. Autenticação: entrar, criar conta e recuperar senha.
4. Painel e listas: extrato, receitas, despesas e investimentos.
5. Formulários: lançamento e importação CSV.
6. Cartões e planejamento: faturas, séries e orçamentos.
7. Relatórios, categorias, configurações e estado offline.

## Implementação iniciada

- Tokens neutros do tema claro e contraste de foco/links nos dois temas.
- Mapeamento dos tokens de sidebar e superfícies para utilitários Tailwind.
- Controles padrão de 40 px, variante grande de 48 px, cartões com espaçamento
  de 24 px e diálogos com superfície e elevação compartilhadas.
- Sidebar de 224 px, cabeçalho de 64 px e conteúdo limitado a 1.200 px.
- Navegação móvel com menu expansível e rolagem em telas baixas.
- Estrutura centralizada compartilhada entre login, cadastro e recuperação,
  reutilizando a logo original e preservando formulários, erros e foco.

- Painel com resumos neutros antes do saldo projetado, curva ampliada e histórico
  em uma seção de largura completa. Os valores, reservas e explicações mantêm
  os mesmos dados e cálculos.
- Extrato e listas por tipo com espaçamento de 24 px, textos secundários de
  pelo menos 12 px e linhas com ações visíveis. Cabeçalhos de datas respeitam
  a altura atual do cabeçalho da aplicação.
- Formulário com seleção neutra de tipo e botões empilhados em telas estreitas;
  prévia CSV com tabela, cabeçalhos e arquivo visualmente delimitados.

- Cartões e faturas com ações, totais e metadados organizados em superfícies
  neutras; as cores escolhidas pelo usuário e a camada de contraste dos cartões
  são preservadas.
- Séries e orçamentos com cabeçalhos, formulários responsivos e indicadores
  de progresso acessíveis. Barras saturam visualmente no limite, enquanto o
  texto preserva o valor real, inclusive excessos e economia negativa.
- Relatórios com resumos neutros, gráficos em largura completa e alternativas
  textuais preservadas; categorias e configurações usam controles legíveis.
- Estado offline React reutiliza a logo original. O HTML estático de fallback
  mantém sua estrutura sem uma nova marca e acompanha o tema local/sistema.

As 18 propostas foram adaptadas às rotas e aos fluxos existentes. Não foram
introduzidos dados fictícios nas telas do produto nem alterações nos serviços,
regras financeiras, autenticação ou contratos do Firestore.

## Verificação local

O E2E em desenvolvimento pode ser impedido por outro `next dev` aberto no
mesmo diretório, mesmo usando portas distintas. Não encerrar esse processo.
Para a revisão desta etapa, foi preparada uma configuração temporária em
`dogfood-output/` para executar a suíte existente sobre o build de produção,
com os mesmos emuladores e variáveis fictícias de `scripts/run-e2e.mjs`.
Essa configuração não altera os scripts versionados de teste.

Na revisão desta etapa, o build com variáveis fictícias passou, mas a execução
E2E de produção também encontrou a porta 8081 ocupada. Nenhum processo alheio
foi encerrado. Portanto, os fluxos integrados ainda precisam de validação.
Lint, tipos, 171 testes unitários e 808 testes de regras passaram.
As telas de autenticação foram inspecionadas no build local na porta 3104,
com capturas desktop e móvel em `dogfood-output/rod127-*.png`.

Para conferir as telas financeiras sem disputar esses processos, a revisão
seguinte usa uma cópia descartável em
`dogfood-output/rod127-financial-review/`, sem `.env.local`, com os módulos já
instalados. Somente na cópia, os endpoints dos emuladores e as respectivas
guardas dos testes passam para Authentication 19099 e Firestore 18081; o
projeto permanece `demo-gestone-e2e`. Os arquivos do produto mantêm as portas
originais. Os resultados dessa execução devem ser distinguidos do comando
E2E padrão.

Após a validação, a aplicação temporária foi arquivada fora do repositório,
para não interferir na descoberta de testes e no lint. As capturas foram
preservadas no diretório `dogfood-output/rod127-final-captures/`.

Nesta cópia, build de produção, lint, tipos, 171 testes unitários e 28 E2E
passaram para a etapa de painel, listas, lançamento e CSV. O teste de reflow
encontrou e permitiu corrigir o seletor de mês na largura equivalente a 160 px.
As capturas da matriz estão em
`dogfood-output/rod127-final-captures/rod-118/`.

## Verificação final

- Lint com exclusão dos artefatos em `dogfood-output/` e cópias em `.worktrees/`.
- `npm run typecheck` e 34 suítes/173 testes unitários aprovados.
- Build de produção com configuração fictícia aprovado na cópia isolada.
- 28 fluxos E2E existentes, a nova matriz visual e 2 testes PWA aprovados.
- 145 testes de regras aprovados na mesma cópia, com a porta 18080 e projeto
  `demo-gestone-rules`. Portas e guardas foram adaptadas somente na cópia;
  `firestore.rules`, índices e testes de regras do produto permanecem intactos.
- Capturas de sete superfícies nos dois temas e em 320/1280 px em
  `dogfood-output/rod127-final-captures/rod127-surfaces/`; a matriz financeira
  também cobre reflow equivalente a 200%.
- A logo em `src/components/shared/logo.tsx` permanece sem alterações desde o
  início do redesign.

As execuções padrão de desenvolvimento foram impedidas por servidores/portas
já ocupados e apresentaram falhas de inicialização durante a compilação sob
demanda da cópia. A validação aprovada foi feita sobre o build de produção
isolado. Isso não comprova integração com contas reais nem substitui revisão
em aparelhos físicos. Não houve deploy de produção.

## Critérios de aceite

- Preservar regras financeiras, autenticação, hooks, serviços e cache.
- Usar dados reais do usuário na implementação, sem dados fictícios do protótipo.
- Preservar estados de carregamento, vazio, erro e validação.
- Conferir temas, teclado, contraste, reflow, textos e valores longos.
- Executar lint, tipos, testes unitários, regras, build e E2E conforme AGENTS.md.
- Publicar entregas em branch codex/; produção exige autorização explícita.

Os 18 desenhos representam páginas e estados de fluxos existentes; fatura,
lançamento e importação não precisam se tornar novas rotas.

## Correção de fidelidade após revisão do usuário

A revisão anterior validou funcionamento e reflow, mas não garantiu a composição
aprovada. A ROD-127 foi reaberta para corrigir essa diferença. A referência desta
etapa é o protótipo `gestone-telas-geist.html` apresentado no chat (18 desenhos),
além de `DESIGN.md`; os números ilustrativos são substituídos pelos dados da conta.

- Painel: título, resumos, saldo com curva de 180 px antes das reservas e tabela de
  lançamentos recentes; ícones neutros e categorias em etiquetas discretas.
- Extrato e listas por tipo: colunas de data, descrição, categoria, valor e ações;
  reflow no celular, preservando filtros, paginação, importação e edição.
- Navegação: sidebar de 200 px, contexto financeiro, cabeçalho e rodapé do desenho.
- Categorias: abas por tipo e tabela de largura completa.
- Relatórios: fluxo de caixa seguido por barras horizontais de gastos por
  categoria. A evolução acumulada continua disponível em uma seção expansível.
- Cartões: apresentação neutra, sem chip ou gradiente decorativo, com todos os
  metadados reais e operações existentes preservados.
- Séries: grupos de recorrências/parcelamentos e ações que revelam os formulários.
- Orçamentos: seleção mensal no cabeçalho e campos da meta/economia lado a lado.
- Conta: Google antes do formulário, medidas de controles compartilhadas,
  abas de configurações e e-mail visível no perfil; offline em painel central.
- Os painéis compartilham borda, cabeçalho e espaçamento sem o espaço duplicado
  entre cabeçalho e conteúdo. A logo original permanece intacta.

O gráfico mensal usa SVG dimensionado e mostra também um único ponto ou série
zerada, com rótulos `dd/MM` recebidos pelo serviço. Nenhum cálculo financeiro,
serviço, regra ou dado persistido foi alterado. Explicações de projeção continuam
acessíveis em “Sobre a projeção”.

A matriz visual passa a cobrir todas as rotas (15 páginas), claro/escuro e
320/1280 px, além da matriz financeira existente que inclui reflow de 200%.
Os testes de regressão verificam os valores acessíveis, ações e séries de saldo
com um único ponto. Capturas e resultados desta revisão são registrados ao
concluir a validação.

A conferência adicional alinhou a separação entre cartões e fatura detalhada:
“Ver fatura” abre uma visualização de largura total, com total, valor de quitação
registrado, situação do saldo e compras em tabela. “Voltar aos cartões” preserva
a seleção. Próximas faturas usam o mesmo hook/serviço de consulta existente;
nenhuma data, valor ou bandeira fictícia foi adicionada ao produto. Registros de
quitação divergentes do total pedem revisão, sem inferir pagamentos parciais.

Extrato e listas por tipo incluem abas de navegação e resumos com escopo
explícito de página. Não são apresentados como total do mês ou de todo o
histórico: filtros e paginação existentes continuam definindo o conjunto
exibido. Valores de receitas, despesas e investimentos permanecem em centavos.

As tabelas respondem também à largura do próprio componente, evitando descrições
quebradas letra por letra em painéis estreitos. A matriz verifica a altura da
descrição da compra, além do overflow horizontal. Inclui abertura de fatura
futura e retorno à visualização do cartão.

## Validação da correção de fidelidade — 23/10/2026

- Lint e `npm run typecheck` aprovados; 35 suítes e 175 testes unitários aprovados.
- Build de produção aprovado na cópia isolada, sem `.env.local`, com configuração
  fictícia de `scripts/run-e2e.mjs` e emuladores `demo-gestone-e2e` em 19099/18081.
- Os 32 cenários únicos de E2E/PWA foram aprovados entre a execução da suíte e
  repetições dirigidas. A última suíte completa teve 30 aprovações; os dois testes
  restantes precisaram seguir a nova ação “Ver fatura” e foram repetidos com
  sucesso. A preparação dos testes também passou a aguardar as categorias antes
  de criar compras, eliminando a corrida observada ao executar quitação isolada.
- Matriz final: 84 capturas em `dogfood-output/rod127-fidelity-final/`, incluindo
  cartões, fatura de largura total, formulários e abas de configurações. Revisão
  visual em claro/escuro, 320/1280 px; matriz financeira com reflow de 200% aprovada.
- Serviços, hooks, regras, índices, dependências e logo original sem alterações.
  As portas alternativas e configurações de execução existem somente na cópia.
- Logs desta revisão: `rod127-redesign-unit.log`, `rod127-redesign-e2e.log`,
  `rod127-final-directed.log`, `rod127-payment-verified.log`, `rod127-delivery-lint.log`
  e `rod127-delivery-types.log`, no diretório ignorado `dogfood-output/`.

As falhas intermediárias e suas repetições estão registradas nesses logs;
nenhum resultado desta revisão depende de contas ou dados de produção.

## Correções dos controles e cartões — 23/10/2026

Os filtros usam DatePicker (Calendar/Popover shadcn) e Select shadcn para cartão.
Datas continuam civis, sem conversão UTC, com restauração pela URL, limpeza
individual e validação de intervalo. O calendário abre no mês selecionado.
Recorrência e encerramento de séries também reutilizam o DatePicker; o corte
da série mantém a restrição de datas anteriores a hoje. Cartões homônimos
mostram nome e banco no filtro e no nome acessível da seleção.

Nas tabelas compartilhadas, categorias extensas têm nome integral com quebra
de linha, sem cápsula. O Select compartilhado permite que as opções extensas
quebrem dentro do menu. Cartões têm largura máxima de 400 px, grade responsiva,
superfície escura e texto branco nos dois temas, com a cor cadastrada na borda
superior. Isso corrige a superfície branca causada pelo token `primary` no
tema escuro. A logo original não foi alterada.

O QueryCache deixou de emitir `console.error` com um objeto genérico. Falhas
continuam rejeitadas no TanStack Query e disponíveis para os estados de erro e
retry existentes. Um aviso registra somente um código técnico conhecido, ou
`unknown`, sem mensagens, chaves de consulta, UID ou payload. Um teste cobre a
falha, a orientação de sessão e a recuperação por retry. O objeto `{}` informado
no relato não permite identificar a causa da consulta original; não se presume
que seja índice, permissão ou rede, nem se alteram regras para contorná-la.

Validação desta correção:

- Lint e tipos aprovados; 36 suítes e 177 testes unitários aprovados.
- Build e suíte completa de 32 E2E/PWA aprovados na execução final, com a cópia
  isolada e os emuladores fictícios já descritos acima. Regras e índices não
  foram alterados nem republicados; testes de regras não foram repetidos nesta
  correção de interface e diagnóstico.
- A primeira execução encontrou overflow no campo de data em reflow de 200%;
  a largura mínima e o texto vazio foram corrigidos e a matriz financeira
  passou. O teste do intervalo passou a avançar o mês no calendário antes de
  selecionar novembro; também verifica limpeza individual e desbloqueio do CSV.
- Revisão visual de cartões e calendário em claro/escuro e desktop/móvel.
  Capturas da matriz em `dogfood-output/rod127-controls-final/` (92 arquivos).
- Logs em `dogfood-output/`: `rod127-controls-unit-final.log`,
  `rod127-controls-lint-final.log`, `rod127-controls-types-final.log` e
  `rod127-controls-e2e-final.log`. A execução inicial com os dois problemas está
  registrada em `rod127-controls-e2e.log`.
- Logo original intacta desde `415e265`; nenhuma alteração de regra financeira,
  serviço de dados, autenticação, dependência ou configuração de produção.
