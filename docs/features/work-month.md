# Mês de trabalho

O cabeçalho da área autenticada seleciona o mês usado pelo painel, extrato, listas financeiras, faturas, orçamentos e período final dos relatórios. As listas usam competência; no extrato, o critério pode ser alterado para data da compra. A tela de séries continua mostrando todas as séries, com o mês de trabalho como contexto.

O parâmetro `month=AAAA-MM` válido tem prioridade sobre a preferência deste navegador, salva separadamente por UID em `localStorage`. Na ausência de ambos, usa-se o mês local atual. Valores inválidos não são consultados. A preferência acompanha o mês confirmado na URL, inclusive ao voltar ou avançar rapidamente no histórico. A seleção também é refletida nos links de navegação. Se o armazenamento estiver indisponível, a URL mantém o mês durante a navegação.

O extrato permite um intervalo personalizado com limites abertos. Limpar os filtros restaura o mês de trabalho; ao mudar o mês pelo seletor, os parâmetros desse intervalo são removidos. Reabrir um link ou usar voltar/avançar restaura os parâmetros presentes naquela entrada do histórico.

Mudar o mês não altera lançamentos e não dispara geração de séries para o futuro. A geração e o corte mínimo de cancelamento continuam vinculados à data real. Categorias e configurações não são filtradas por mês. A leitura por competência mantém o custo documentado em [Período e cartão no extrato](transaction-period.md).
