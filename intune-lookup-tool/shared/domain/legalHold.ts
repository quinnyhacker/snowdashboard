import type { CsvRow } from './lookupIndex'
import { getNameKey, getNameKeyFromUser } from './nameMatch'

export function buildLegalHoldSet(rows: CsvRow[], firstCol: string, lastCol: string): Set<string> {
  const set = new Set<string>()
  for (const row of rows) {
    const first = (row[firstCol] ?? '').trim()
    const last = (row[lastCol] ?? '').trim()
    if (first && last) set.add(getNameKey(first, last))
  }
  return set
}

export function isOnLegalHold(set: Set<string> | undefined, userString: string | undefined): boolean {
  if (!set || !userString) return false
  const key = getNameKeyFromUser(userString)
  if (!key) return false
  return set.has(key)
}
