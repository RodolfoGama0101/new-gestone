# Recorrência mensal — ROD-110

O MVP foi aprovado pelo usuário em 22/10/2026: recorrência mensal gerada ao abrir o app, término opcional, edição das futuras não geradas e cancelamento das futuras. A série nasce no formulário de lançamento e é administrada em Séries.

A data deriva sempre da âncora original: 31/janeiro → último dia de fevereiro → 31/março. A série registra o deslocamento UTC do fuso local na criação, preservado entre dispositivos. Não segue futuras mudanças de horário de verão: o deslocamento é fixo. O limite é 1.200 meses. Sem app aberto não há execução em segundo plano; ao retornar, são geradas até 120 ocorrências atrasadas por execução. Gerar pendentes permite continuar atrasos maiores. Datas finais são inclusivas.

/users/{uid}/transactionSeries/{id} guarda os dados originais, tipo da série, limite, cursor nextIndex, corte de cancelamento e fuso. Cada ocorrência usa o ID series-{id}-{índice}. Uma transação lê a série e a ocorrência, cria se ausente e avança o cursor. Execuções concorrentes se repetem pelo protocolo de transações; uma falha pode deixar progresso parcial explícito, retomável sem duplicar. Excluir uma ocorrência não retrocede o cursor e não a recria. O ID de criação permanece estável durante tentativas do formulário.

Editar futuras altera valor e descrição apenas das ocorrências ainda não geradas. O histórico continua editável individualmente. Cancelar bloqueia geração a partir da data escolhida e remove ocorrências com data igual ou posterior; hoje e datas futuras são aceitos. O bloqueio é confirmado antes da limpeza, que pode ser repetida após interrupção. Categorias arquivadas e cartões inativos impedem novos vínculos: a geração mostra erro e preserva o progresso; corrija o cadastro ou cancele a série.

Transações antigas com recurring=true sem seriesId continuam avulsas. Não existe migração ou geração automática a partir desse sinalizador antigo. As regras novas precisam de publicação separada autorizada antes da liberação em produção.

O campo Modo do lançamento usa o Select shadcn compartilhado, com rótulo associado, opções em 14 px e bloqueio durante o salvamento. As escolhas e regras de geração não mudam.

Validação da troca do seletor: lint, tipos, 221 testes unitários, build e os dois E2E de recorrência/parcelamento aprovados. Build e E2E executados na cópia isolada com projeto demo-gestone-e2e e portas 29099/28081/3212.

## Gestão simplificada — issue #41

Séries oferece **Nova recorrência** e **Nova compra parcelada**, reutilizando o formulário de lançamento com o modo já selecionado. A data de criação continua independente do mês global de consulta; Repetição permite conferir o término ou a quantidade de parcelas. Criar uma série invalida o cache existente sem mudar os filtros da tela. Em falha de criação, o cache também é atualizado para expor séries parcialmente salvas; o formulário mantém o ID da tentativa para retomada.

A lista começa com resumos de descrição, categoria, cartão, valor mensal ou total, faixa dos valores das parcelas e ocorrências processadas. Expandir um resumo revela início/fim, próxima ocorrência ainda não processada, programação do mês global e ações de edição/cancelamento. A programação considera competência das faturas, âncora original, término inclusivo e corte de cancelamento. Todas as séries e os filtros de gestão continuam disponíveis, inclusive histórico cancelado.

**Programada, ainda não gerada** não é um lançamento nem entra em totais financeiros. Processamento é avanço do cursor de geração; não significa pagamento nem garante que o lançamento continue existindo após exclusão no extrato. Parcelamentos completamente processados podem ter competências futuras. A programação e a distribuição nas faturas são o plano original; edições individuais podem alterar os valores reais. A faixa das parcelas preserva os centavos distribuídos nas primeiras parcelas.

Editar recorrência mostra descrição/valor propostos, quantidade de ocorrências ainda não processadas e a primeira data abrangida. A edição afeta somente futuras ainda não geradas, inclusive pendentes atrasadas; preserva todas as já geradas, mesmo com competência futura. Parcelas continuam editáveis individualmente pelo extrato.

Cancelar futuras primeiro lê a série e **todos os registros existentes vinculados**, sob o UID autenticado. A confirmação mostra o corte em data local, quantos registros serão removidos e quantos anteriores serão preservados. O cálculo usa a data atual de cada lançamento (inclusive após edição), sem inferir existência pelo cursor. Em retomada prevalece o corte anterior mais cedo. A data solicitada deve ser hoje ou futura, independentemente do mês global; um corte efetivo antigo de uma tentativa anterior continua sendo usado pelo serviço para concluir a limpeza.

A prévia é uma consulta sem gravação e retrata aquele instante: operações concorrentes podem mudar a quantidade até a confirmação. Cada prévia custa uma leitura da série e a consulta de seus lançamentos, sem limite de página; não requer novo índice composto nem migração. A confirmação mantém o protocolo existente de bloqueio da série seguido de exclusões transacionais retomáveis. Após falha, consulte outra prévia e repita; o item permanece no contexto dos filtros durante a recuperação, mesmo se o bloqueio já o tornou cancelado. O contexto é liberado ao mudar filtros/mês ou concluir a operação.

Geração ao abrir o app e Gerar pendentes mantêm IDs determinísticos, limite de 120 ocorrências por série/execução e ausência de execução em segundo plano. Progresso processado permanece visível após refetch, e mensagens de falha orientam retomada sem duplicar. Sem alteração de schema, regras, índices ou contratos MCP.
