# Acessibilidade dos fluxos principais — ROD-117

Autenticação e dashboard têm um único main com destino para “Pular para o conteúdo”. Login, cadastro e recuperação exibem h1 mesmo no celular. Títulos de cards são h2; estados vazios mantêm a sequência de títulos. Logos com link possuem nome acessível.

Erros dos formulários são associados por aria-describedby, campos inválidos recebem aria-invalid e mensagens têm role=alert. Formulários anunciam processamento; o resultado de recuperação recebe foco. No lançamento, o primeiro inválido segue a ordem visual, pois Controllers do React Hook Form podem ser registrados depois dos inputs nativos.

Botões de tipo, tema, seção e cor anunciam seleção. Links de navegação identificam a página atual com aria-current. Os filtros têm nomes acessíveis, controles de fechar estão em português e foco por teclado permanece visível. O diálogo conserva o foco e o devolve ao gatilho ao fechar.

Os tokens de erro no tema claro, o breadcrumb e os rótulos da navegação móvel foram ajustados para contraste. A prévia do cartão mantém a cor escolhida sob uma camada escura e texto branco opaco, para legibilidade também em cores claras.

Veja a [auditoria e seus limites](../audits/2026-10-22/accessibility.md). Os testes Playwright verificam teclado, foco, temas, mensagens e reflow. npm run test:e2e usa somente projetos fictícios.
