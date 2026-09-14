/**
 * Ported from the original PowerShell tool's Find-BestColumn: given a
 * CSV's headers and an ordered list of likely column-name patterns, find
 * the best guess. Exact (case-insensitive) matches are preferred, in
 * pattern-priority order, before falling back to substring matches, also
 * in pattern-priority order.
 */
export function findBestColumn(headers: string[], priorityPatterns: string[]): string | undefined {
  for (const pattern of priorityPatterns) {
    const exact = headers.find((h) => h.toLowerCase() === pattern.toLowerCase())
    if (exact) return exact
  }

  for (const pattern of priorityPatterns) {
    const lowerPattern = pattern.toLowerCase()
    const partial = headers.find((h) => h.toLowerCase().includes(lowerPattern))
    if (partial) return partial
  }

  return undefined
}

export interface ColumnGuessField {
  key: string
  label: string
  guesses: string[]
}
