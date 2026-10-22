# Recorrência mensal — ROD-110

O MVP foi aprovado pelo usuário em 22/10/2026: recorrência mensal gerada ao abrir o app, término opcional, edição das futuras não geradas e cancelamento das futuras. A série nasce no formulário de lançamento e é administrada em Séries.

A data deriva sempre da âncora original: 31/janeiro → último dia de fevereiro → 31/março. A série registra o deslocamento UTC do fuso local na criação, preservado entre dispositivos. Não segue futuras mudanças de horário de verão: o deslocamento é fixo. O limite é 1.200 meses. Sem app aberto não há execução em segundo plano; ao retornar, são geradas até 120 ocorrências atrasadas por execução. Gerar pendentes permite continuar atrasos maiores. Datas finais são inclusivas.

/users/{uid}/transactionSeries/{id} guarda os dados originais, tipo da série, limite, cursor nextIndex, corte de cancelamento e fuso. Cada ocorrência usa o ID series-{id}-{índice}. Uma transação lê a série e a ocorrência, cria se ausente e avança o cursor. Execuções concorrentes se repetem pelo protocolo de transações; uma falha pode deixar progresso parcial explícito, retomável sem duplicar. Excluir uma ocorrência não retrocede o cursor e não a recria. O ID de criação permanece estável durante tentativas do formulário.

Editar futuras altera valor e descrição apenas das ocorrências ainda não geradas. O histórico continua editável individualmente. Cancelar bloqueia geração a partir da data escolhida e remove ocorrências com data igual ou posterior; hoje e datas futuras são aceitos. O bloqueio é confirmado antes da limpeza, que pode ser repetida após interrupção. Categorias arquivadas e cartões inativos impedem novos vínculos: a geração mostra erro e preserva o progresso; corrija o cadastro ou cancele a série.

Transações antigas com recurring=true sem seriesId continuam avulsas. Não existe migração ou geração automática a partir desse sinalizador antigo. As regras novas precisam de publicação separada autorizada antes da liberação em produção.
