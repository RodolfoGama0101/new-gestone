# Preferências de exibição e moeda — ROD-109

O GestOne usa exclusivamente reais brasileiros (BRL). A moeda não é uma preferência: todas as contas e dispositivos usam o mesmo contrato. A opção sem efeito de dólar foi removida. Valores continuam inteiros em centavos; nenhuma conversão ou regravação de lançamentos ocorre ao alterar o tema.

O formatador central em src/lib/utils/format-money.ts usa pt-BR e BRL em telas e gráficos. O CSV mantém separador ponto e vírgula, vírgula decimal, duas casas e coluna “Valor (BRL)”, sem símbolo monetário dentro das células.

Tema claro, escuro ou do sistema é salvo em /users/{uid}/preferences/display pelo serviço de preferências. O provedor aplica a configuração ao entrar na conta em outro dispositivo. Sem configuração salva, usa “system”. Deslogado, o seletor mantém apenas a preferência local do navegador. A consulta e a gravação são isoladas por UID; erro de carregamento oferece retry em Configurações e falha ao salvar preserva o tema anterior.

As regras aceitam somente theme e updatedAt no documento display do próprio usuário. Não há novos índices nem migração dos dados financeiros. A exclusão em cascata da conta também remove essas preferências.
