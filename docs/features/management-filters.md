# Filtros das telas de gestão

Categorias, cartões, séries e orçamentos filtram os dados já carregados no navegador. Os critérios permanecem na URL, podem ser combinados e limpos e não fazem consultas ao Firestore a cada tecla. Sem correspondências, a tela informa que os filtros não encontraram resultados; isso é diferente de não haver cadastros.

Categorias aceitam nome, tipo e arquivamento; cartões aceitam nome ou banco e situação ativa, inativa ou arquivada. Esses cadastros não dependem do mês de trabalho. O histórico arquivado continua disponível para consulta e as regras existentes impedem novos vínculos indisponíveis.

Séries aceitam descrição, modalidade, tipo financeiro, categoria, cartão, cancelamento e pendência de geração. A programação pode mostrar todas ou apenas as que têm ocorrência na competência do mês, considerando fechamento, início, fim e cancelamento. Esse filtro não gera lançamentos; a pendência usa a data real e o cursor de geração, não o mês selecionado. Parcelamentos ainda não totalmente processados são pendentes mesmo quando têm parcelas futuras.

Nos orçamentos, categoria e situação distinguem ausência de limite, valor dentro do limite (inclusive igual) e excesso. Os valores e limites pertencem ao mês global. Categorias arquivadas e limites históricos sem cadastro continuam visíveis; categorias indisponíveis não aceitam edição de limite.
