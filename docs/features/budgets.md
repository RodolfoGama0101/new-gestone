# Orçamentos e metas — ROD-123

O MVP oferece limites mensais por categoria de despesa e uma meta mensal de economia, acessíveis em “Orçamentos”, inclusive no menu móvel. O usuário seleciona o mês e pode criar, substituir e remover valores. Não há transporte automático, alteração de transações ou recomendações de investimentos.

Limites exibem realizado e restante, ou excesso escrito em texto. O realizado soma apenas despesas da categoria pela mesma função de competência do dashboard. Compras de cartão consideram o fechamento registrado na compra, inclusive na virada do ano. Categorias arquivadas preservam limites e consumo histórico: não aceitam novos limites ou edição, mas permitem remover o limite. O nome salvo é fallback caso a categoria deixe de ser retornada.

Os indicadores visuais usam esses mesmos centavos e expõem valores em reais
para tecnologias assistivas. A barra se limita ao intervalo visual entre zero
e a meta/limite, mas o texto mantém economia negativa, economia acima da meta
e consumo excedente sem truncar os valores reais.

Economia é receita menos despesa de consumo no mês. Inclui dinheiro investido e saldo mantido; investimentos não são subtraídos novamente nem somados como uma segunda receita. Reservas de futuras faturas não são outra despesa. A meta exibe o valor realizado, quanto falta ou que foi atingida. Os valores de entrada e cálculo usam centavos inteiros; totais acima do limite seguro geram erro.

Persistência: `/users/{uid}/budgets/{yyyy-MM}` contém `amount` e `updatedAt` para a meta. `/limits/{categoryId}` contém `name`, `amount` e `updatedAt`. Excluir a meta não exclui limites; cada registro é independente. As regras exigem dono, mês válido, centavos positivos seguros e categoria ativa de despesa ou `both` do mesmo UID para gravar limites. Leitura e remoção continuam possíveis após arquivamento.

Não há migração de dados antigos. A nova rota depende da publicação autorizada das novas regras antes do uso em produção; esta entrega não publica regras. Alterações de lançamentos invalidam também o cache dos orçamentos. Cada mês começa sem configurações até que sejam salvas.

O cadastro de limites usa o Select shadcn compartilhado para categorias ativas de despesa/both. Select, campo de limite e botão mantêm altura de 40 px; os campos ficam bloqueados durante o salvamento.

Mês de competência usa um seletor mensal construído com Popover e Button shadcn, com navegação por ano, mês selecionado e retorno ao mês atual. O valor continua yyyy-MM, sem conversão UTC.

Validação: lint e tipos aprovados; suíte unitária local aprovada (incluindo navegação mensal e troca de ano). Build e E2E de orçamento aprovados na cópia isolada demo-gestone-e2e, portas 29099/28081/3212. O E2E verifica os dois controles com a mesma altura e a persistência ao alternar competências.
