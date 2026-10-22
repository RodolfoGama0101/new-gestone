# Cartões inativos — ROD-116

Um cartão com isActive=false não pode receber novas compras nem novos vínculos em lançamentos existentes. O formulário oferece somente cartões ativos e não arquivados. Na edição de uma despesa que já usa o cartão, o vínculo permanece disponível com indicação “inativo” ou “arquivado”.

As regras verificam o estado final do cartão com getAfter; desativar e adicionar compra no mesmo lote é negado. O serviço também verifica disponibilidade ao criar ou trocar vínculo, mas as regras são a garantia contra escritas diretas e concorrência.

Compras antigas continuam legíveis e editáveis com o mesmo tipo/cartão, preservando o fechamento capturado. É permitido desvincular ou trocar para cartão ativo. Depois de remover o vínculo, não é possível voltar ao cartão inativo até reativá-lo. Arquivamento continua permanente e não pode ser revertido por reativação.
