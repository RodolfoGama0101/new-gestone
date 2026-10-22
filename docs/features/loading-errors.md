# Falhas de carregamento — ROD-108

Dashboard, relatórios, categorias, cartões, extrato, listas por tipo e lançamentos recentes distinguem falhas de consultas de ausência de registros. O formulário de lançamento também impede operar com listas auxiliares que falharam. Em caso de erro, os valores de fallback não são apresentados como saldo zero ou histórico vazio.

O componente compartilhado anuncia o erro e oferece “Tentar novamente”, repetindo as consultas afetadas. Sem rede, orienta verificar a conexão; erros de permissão/autenticação orientam entrar novamente; outras falhas recebem mensagem de indisponibilidade. Mensagens técnicas, URLs de índices, tokens e dados financeiros não são exibidos.

O cache de consultas registra somente o evento fixo `query-load-failed`. A fronteira `error.tsx` do dashboard usa `retry`, conforme a API local do Next.js instalado, e registra somente `dashboard-render-failed`.

Atualizações de lançamentos mantêm os dados em tela enquanto a consulta está em andamento e anunciam “Atualizando lançamentos…”. Carregamento inicial continua separado. Após uma falha, a tela oferece retry e não apresenta dados antigos como resultado atualizado.

Testes unitários verificam a mensagem segura, ação de retry, distinção de offline/permissão e ausência de saldo zero quando o resumo falha.
