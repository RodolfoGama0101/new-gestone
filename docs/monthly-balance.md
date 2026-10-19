# Saldo mensal e reservas de cartão — ROD-98

## Regra aplicada

O dashboard apresenta uma projeção mensal dos lançamentos cadastrados, não um saldo bancário conciliado ou acumulado de todos os meses.

- **Saldo projetado do mês:** receitas menos despesas e investimentos cuja competência pertence ao mês selecionado. Para compras no cartão, preserva a regra existente: compra até o dia do fechamento, inclusive, pertence ao próprio mês; depois do fechamento, ao mês seguinte. A fatura do próprio mês já está deduzida desse saldo, mesmo antes do fechamento.
- **Reserva para faturas após este mês:** soma somente compras de cartão realizadas até a data de referência cuja competência pertence a meses posteriores ao selecionado. Não inclui despesas já deduzidas do saldo mensal, compras de outros usuários ou receitas/investimentos.
- **Disponível após reservas:** saldo projetado do mês menos a reserva acima. Valores negativos permanecem visíveis.

A data de referência é um argumento obrigatório de `calculateSummary`. Ela é limitada ao último dia do mês selecionado e considera o dia completo no fuso local, como o restante do calendário do aplicativo. O dashboard fornece a data atual: meses encerrados usam seu último dia; mês atual/futuro usa hoje. Compras com data posterior a esse corte não entram na reserva. Receitas e despesas programadas dentro do mês continuam participando da projeção mensal, como antes.

| Cenário: receita de R$ 1.000, compra de R$ 100, fechamento dia 20 | Saldo do mês | Reserva | Disponível |
| --- | ---: | ---: | ---: |
| Julho selecionado; compra em 05/07; referência 10/07 | R$ 900 | R$ 0 | R$ 900 |
| Julho selecionado; compra em 20/07; referência 22/07 | R$ 900 | R$ 0 | R$ 900 |
| Julho selecionado; compra em 21/07; referência 22/07 | R$ 1.000 | R$ 100 | R$ 900 |
| Agosto selecionado; mesma compra de 21/07; receita em agosto | R$ 900 | R$ 0 | R$ 900 |

A compra migra da reserva para a despesa quando o mês da fatura é selecionado; nunca pertence aos dois conjuntos no mesmo resumo. Consultar julho posteriormente não incorpora compras realizadas em agosto nem remove reservas só porque o relógio atual avançou.

## Integração e verificações

O componente exibe as definições, a data de referência e as reservas mesmo quando zeradas. A consulta fornece a referência explicitamente e sua chave inclui o dia, evitando reutilizar no próximo dia um resumo calculado com outro corte após nova renderização. As invalidações por prefixo já usadas nas mutações continuam funcionando.

Os testes cobrem a dedução única, compras antes/no dia/após fechamento, meses passados e futuros, transferência de reserva para fatura, corte por data da compra, ausência de cartão, múltiplos cartões, investimentos, saldo negativo, dados vazios, virada de ano, fevereiro com fechamento dia 31, Timestamp do Firestore, independência do relógio do sistema e rótulos da interface.

Validação local: lint, TypeScript, 8 suítes/80 testes (19 novos) e build de produção aprovados. As verificações usam dados fictícios e não confirmam os valores de contas reais em produção.

## Limites preservados

Não foi acrescentado controle de pagamento de faturas ou conciliação bancária. Cartões ausentes no cadastro ainda usam o fechamento padrão preexistente no serviço (dia 10). A escolha desse fallback e os efeitos de alterações no cadastro precisam ser considerados ao revisar a competência.

A unificação das datas dos gráficos e relatórios é escopo da ROD-99. Limites das consultas, cobertura do mês comparativo e atualização automática ao virar o dia com a tela aberta permanecem na ROD-101. Esta implementação não declara esses problemas resolvidos. Não houve leitura ou alteração de dados de produção.
