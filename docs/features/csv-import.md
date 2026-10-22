# Importação CSV — ROD-122

No extrato, “Importar CSV” aceita o formato exportado pelo GestOne: UTF-8, BOM opcional, ponto e vírgula e sete colunas na ordem `Data;Descrição;Categoria;Tipo;Valor (BRL);Tags;Anotações`. Aspas duplicadas, delimitadores e quebras de linha dentro de campos são preservados. Datas usam `dd/MM/aaaa`; valores em reais têm duas casas decimais e agrupamento de milhares opcional. O limite é 1 MiB e 500 lançamentos.

A prévia mostra todas as linhas, valores e erros. Categorias são resolvidas por nome e tipo, ou pelo mapeamento explícito selecionado pelo usuário; categorias arquivadas e tipos incompatíveis são rejeitados. O arquivo inteiro deve estar válido antes de confirmar. A operação revalida categorias atuais antes de gravar. Fórmulas permanecem texto; o escape de apóstrofo conhecido do exportador é removido para preservar a descrição original.

Os valores são convertidos com aritmética inteira, sem arredondamento. O CSV não contém cartão, fechamento ou recorrência: a interface explica que serão lançamentos avulsos sem cartão. Não há integração bancária nem criação automática de categorias.

Cada linha é confirmada em uma transação Firestore independente. O ID combina SHA-256 do arquivo (BOM e CRLF normalizados) e posição da linha, sob `/users/{uid}/transactions`. Uma transação lê esse ID e cria somente se ausente; repetições e execuções concorrentes do mesmo arquivo não duplicam linhas. Linhas idênticas em posições diferentes são preservadas. Arquivos diferentes são lotes diferentes: não há deduplicação semântica entre arquivos ou com lançamentos manuais.

Em falha de rede ou permissão, o progresso informa quantas linhas foram confirmadas; a mensagem informa a interrupção e orienta repetir o mesmo arquivo. A retomada ignora IDs existentes, preservando edições posteriores. Alterar o conteúdo do arquivo gera outro lote; para retomar sem duplicar, mantenha o arquivo original. A importação não é uma transação atômica de 500 linhas: falhas após validação podem deixar progresso parcial explícito. Ao finalizar ou interromper, o cache de lançamentos, análises, cartões e orçamentos é invalidado.
