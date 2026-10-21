/** A mesma busca por trecho da descrição no extrato e na exportação. */
export function normalizeTransactionSearch(search: string) {
  return search.trim().toLocaleLowerCase('pt-BR')
}

export function matchesTransactionSearch(description: string, search: string) {
  return description.toLocaleLowerCase('pt-BR').includes(normalizeTransactionSearch(search))
}
