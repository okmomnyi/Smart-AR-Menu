/**
 * Case- and accent-insensitive matching, so "creme brulee" finds
 * "Crème brûlée" and "JALAPENO" finds "jalapeño". Menus are full of both.
 */
export function normalise(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** True when every word of the query appears somewhere in the given fields. */
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalise(fields.filter(Boolean).join(' '))
  return words.every((word) => haystack.includes(word))
}
