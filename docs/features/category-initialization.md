# Inicialização de categorias — ROD-104

`POST /api/categories/initialize` verifica origem e cookie de sessão e usa exclusivamente o UID autenticado. O serviço Admin executa uma transação com o catálogo e o marcador `/users/{uid}/internal/category-initialization-v1`. Essa subcoleção não é acessível aos clientes pelas regras existentes.

Contas sem categorias recebem 19 padrões com IDs determinísticos. Contas antigas sem investimentos recebem as categorias desse tipo; a categoria padrão antiga “Investimentos” mantém seu ID ao virar “Outros Investimentos”. Categorias personalizadas não são renomeadas. Os vínculos existentes não são regravados.

O marcador e as categorias são confirmados atomicamente. Chamadas concorrentes disputam o mesmo marcador; retries não regravam dados já migrados nem recriam categorias removidas. `getAll` apenas consulta. O hook e o cadastro chamam a inicialização explicitamente; o servidor precisa de ADC/credenciais Admin conforme o README.

O catálogo v1 e seus índices são imutáveis. Mudanças futuras exigem outra migração versionada. A operação não remove duplicatas históricas nem migra lançamentos existentes.

Cobertura: testes unitários do serviço e da autorização da rota; concorrência real, repetição e preservação de IDs em `tests/e2e/financial-flows.test.ts`, usando somente emuladores.
