# Aparência e personalização dos cartões

A carteira em `/credit-cards` apresenta a cor cadastrada em toda a superfície,
com chip ilustrativo, símbolo de aproximação e bandeira. Os elementos físicos
são decorativos: não indicam compatibilidade com aproximação ou dados de um
cartão emitido. Nenhum número, CVV ou validade é solicitado ou gerado.

“Personalizar” abre os dados do cartão ao lado da prévia ao vivo no desktop;
no celular, a prévia aparece antes dos campos. É possível escolher entre 12
cores, usar o seletor livre ou digitar uma cor hexadecimal, além de editar
apelido, banco, titular e bandeira. A cor é salva no campo `color` existente;
não há migração, novo campo ou mudança nas regras/índices do Firestore.
Hexadecimal curto e HSL legado continuam aceitos. A validação do formulário
limita a cor a 32 caracteres e aos formatos suportados; valores antigos que
não possam ser interpretados usam grafite na apresentação.

A cor do texto se adapta à luminância da superfície, independentemente do tema.
O acabamento tonal reforça o contraste. Os cartões preservam nomes longos e
largura máxima de 400 px. Seleção e status possuem rótulos textuais. Os controles
mantêm rótulos acessíveis, foco de teclado e bloqueio durante a gravação.

Fechamento, vencimento, arquivamento, faturas e quitação mantêm seus fluxos.
Esta apresentação substitui o aspecto neutro descrito nas etapas anteriores
do [redesign Geist](../design/geist-redesign.md).

## Verificação em 23/10/2026

- `npm run lint -- --ignore-pattern '.worktrees/**' --ignore-pattern 'dogfood-output/**'`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test -- --runInBand --testPathIgnorePatterns '/node_modules/' '/.worktrees/'`: 37 suítes, 194 testes aprovados.
- `npm run test:rules`: 145 testes aprovados na cópia isolada.
- `npm run test:e2e -- --production`: build de produção e 33 E2E/PWA aprovados na cópia isolada, com a configuração de Playwright ampliada somente nessa cópia para incluir todos os cenários.
- Revisão visual da carteira e editor em 320/1280 px e claro/escuro. Capturas em `dogfood-output/cards-validation/dogfood-output/card-personalization/`.

Os comandos padrão de lint/Jest alcançaram cópias antigas em `.worktrees`, com
falhas e colisões de módulos alheias à entrega. As repetições excluem essas
cópias sem alterar configurações versionadas. As portas padrão do Firebase
estavam ocupadas; a cópia em `dogfood-output/cards-validation/` usa 29099/28081
para E2E, 28080 para regras e aplicação em 3212, mantendo os projetos fictícios
`demo-gestone-e2e` e `demo-gestone-rules`. Portas e guardas foram ajustadas
somente na cópia. Nenhuma regra, índice ou dado de produção foi publicado.
