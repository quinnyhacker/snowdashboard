import type { BulkSearchRow } from './bulkSearch'
import type { SearchMode } from './search'

/** Bucket for found rows with no district on record, so a recovered
 * laptop never silently falls out of the ticket text just because the
 * district list didn't have a match for its user. */
export const UNKNOWN_DISTRICT_LABEL = 'No district on record'

export interface SeedStockEntry {
  name: string
  legalHold: boolean
}

export interface SeedStockGroup {
  district: string
  entries: SeedStockEntry[]
}

/** The device name(s) a found row contributes to the seed stock list: the
 * row's own device in "by device" mode, or all of a user's devices in "by
 * user" mode (a recovered user can have more than one machine). */
function deviceNamesFor(row: BulkSearchRow, mode: SearchMode): string[] {
  if (mode === 'device') return row.device ? [row.device] : []
  return row.devices ?? []
}

/** Groups found rows by Work District — the field that determines which
 * physical seed stock pile a recovered laptop goes into for redeployment.
 * Legal hold devices stay in their district's group rather than being
 * dropped, but are marked, since shipping one is a judgment call for the
 * technician, not something this tool should decide silently. */
export function groupBulkRowsByDistrict(rows: BulkSearchRow[], mode: SearchMode): SeedStockGroup[] {
  const groups = new Map<string, SeedStockEntry[]>()

  for (const row of rows) {
    if (!row.found) continue
    const district = row.enrichment.district?.found ? row.enrichment.district.work || UNKNOWN_DISTRICT_LABEL : UNKNOWN_DISTRICT_LABEL
    const names = deviceNamesFor(row, mode)
    if (names.length === 0) continue

    const entries = groups.get(district) ?? []
    for (const name of names) entries.push({ name, legalHold: row.enrichment.legalHold === true })
    groups.set(district, entries)
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([district, entries]) => ({ district, entries }))
}

/** Formats a group as the exact line techs paste into the seed stock
 * ServiceNow ticket, e.g. "KPE Seed Stock: A-001, A-002 (LEGAL HOLD)". */
export function buildSeedStockTicketText(group: SeedStockGroup): string {
  const names = group.entries.map((entry) => (entry.legalHold ? `${entry.name} (LEGAL HOLD)` : entry.name))
  return `${group.district} Seed Stock: ${names.join(', ')}`
}
