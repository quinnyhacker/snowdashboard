import { findDeviceExact, findUserExact, type DeviceIndex } from './lookupIndex'
import type { DistrictMap } from './district'
import { DEFAULT_EMAIL_DOMAIN, enrich, type MatchEnrichment, type SearchMode } from './search'

export interface BulkSearchRow {
  /** Exactly what the technician typed/pasted for this line, so results
   * always trace back to what they entered — critical when processing a
   * stack of laptops in order. */
  term: string
  found: boolean
  device?: string
  user?: string
  devices?: string[]
  enrichment: MatchEnrichment
}

/** Splits pasted/typed input into individual lookup terms. Tolerant of
 * newlines, commas, and tabs so it works whether someone types one device
 * per line, pastes a comma-separated list, or pastes a column copied out
 * of Excel. */
export function parseBulkTerms(raw: string): string[] {
  return raw
    .split(/[\r\n,\t]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
}

export interface RunBulkSearchParams {
  mode: SearchMode
  terms: string[]
  index: DeviceIndex
  legalHoldSet?: Set<string>
  districtMap?: DistrictMap
}

/** Bulk lookup only does exact matching — deliberately, unlike the
 * single-lookup partial-match fallback. With dozens of laptops being
 * processed at once, a line that doesn't match exactly should be called
 * out as "not found" for the technician to check individually, rather
 * than silently guessing among several partial matches. */
export function runBulkSearch(params: RunBulkSearchParams): BulkSearchRow[] {
  const { mode, terms, index, legalHoldSet, districtMap } = params

  return terms.map((term) => {
    if (mode === 'device') {
      const exact = findDeviceExact(index, term)
      if (!exact) return { term, found: false, enrichment: {} }
      return {
        term,
        found: true,
        device: exact.device,
        user: exact.user,
        enrichment: enrich(exact.user, legalHoldSet, districtMap)
      }
    }

    const lookupTerm = term.includes('@') ? term : `${term}@${DEFAULT_EMAIL_DOMAIN}`
    const exact = findUserExact(index, lookupTerm)
    if (!exact) return { term, found: false, enrichment: {} }
    return {
      term,
      found: true,
      user: exact.user,
      devices: exact.devices,
      enrichment: enrich(exact.user, legalHoldSet, districtMap)
    }
  })
}

export interface DistrictGroup {
  /** undefined groups together rows with no district on record. */
  district: string | undefined
  rows: BulkSearchRow[]
}

/** Groups found rows by work district — the piece of information that
 * actually decides which redeployment stockpile a recovered laptop goes
 * into. Rows without a resolved district (not found in the district list,
 * or blank in the source data) land in one "No district on record" group
 * at the end. Groups are sorted alphabetically by district name so the
 * list matches however the depot's piles are labeled. */
export function groupByDistrict(rows: BulkSearchRow[]): DistrictGroup[] {
  const groups = new Map<string | undefined, BulkSearchRow[]>()

  for (const row of rows) {
    if (!row.found) continue
    const work = row.enrichment.district?.found ? row.enrichment.district.work : undefined
    const key = work && work.trim().length > 0 ? work : undefined
    const bucket = groups.get(key)
    if (bucket) bucket.push(row)
    else groups.set(key, [row])
  }

  const named = Array.from(groups.entries())
    .filter(([district]) => district !== undefined)
    .sort(([a], [b]) => (a as string).localeCompare(b as string))
    .map(([district, groupRows]) => ({ district, rows: groupRows }))

  const unnamed = groups.get(undefined)
  return unnamed ? [...named, { district: undefined, rows: unnamed }] : named
}
