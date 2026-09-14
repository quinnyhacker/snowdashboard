import type { CsvRow } from './lookupIndex'
import { getNameKey, getNameKeyFromUser } from './nameMatch'

export interface DistrictInfo {
  work: string
  home: string
}

export type DistrictMap = Map<string, DistrictInfo>

/** Ported from Load-WorkDistrict's merge behavior: if the same person
 * appears in more than one row, a blank Work/Home value is filled in by a
 * later row rather than overwriting an already-known value. */
export function buildDistrictMap(
  rows: CsvRow[],
  firstCol: string,
  lastCol: string,
  workCol: string,
  homeCol: string
): DistrictMap {
  const map: DistrictMap = new Map()

  for (const row of rows) {
    const first = (row[firstCol] ?? '').trim()
    const last = (row[lastCol] ?? '').trim()
    const work = (row[workCol] ?? '').trim()
    const home = (row[homeCol] ?? '').trim()
    if (!first || !last) continue

    const key = getNameKey(first, last)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { work, home })
    } else {
      if (!existing.work && work) existing.work = work
      if (!existing.home && home) existing.home = home
    }
  }

  return map
}

export interface DistrictLookupResult {
  found: boolean
  work?: string
  home?: string
}

export function getDistrict(map: DistrictMap | undefined, userString: string | undefined): DistrictLookupResult {
  if (!map || !userString) return { found: false }
  const key = getNameKeyFromUser(userString)
  if (!key) return { found: false }
  const entry = map.get(key)
  if (!entry) return { found: false }
  return { found: true, work: entry.work, home: entry.home }
}
