import type { BulkSearchRow } from './bulkSearch'
import type { SearchMode } from './search'

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Builds the full bulk lookup results as real CSV text (CRLF line
 * endings, so Excel doesn't complain), including rows that weren't found
 * — a complete record of everything scanned during a recovery batch, not
 * just the hits. This is what gets saved to disk; "Copy all results"
 * still copies quick tab-separated text to the clipboard separately. */
export function buildBulkResultsCsv(rows: BulkSearchRow[], mode: SearchMode): string {
  const header =
    mode === 'device'
      ? ['Input', 'Device', 'User', 'Work District', 'Home District', 'Legal Hold', 'Status']
      : ['Input', 'User', 'Device(s)', 'Work District', 'Home District', 'Legal Hold', 'Status']

  const lines = rows.map((row) => {
    if (!row.found) return [row.term, '', '', '', '', '', 'Not found']

    const work = row.enrichment.district?.found ? (row.enrichment.district.work ?? '') : ''
    const home = row.enrichment.district?.found ? (row.enrichment.district.home ?? '') : ''
    const legalHold = row.enrichment.legalHold ? 'Yes' : 'No'

    const fields =
      mode === 'device'
        ? [row.term, row.device ?? '', row.user ?? '', work, home, legalHold]
        : [row.term, row.user ?? '', (row.devices ?? []).join('; '), work, home, legalHold]

    return [...fields, 'Found']
  })

  return [header, ...lines].map((fields) => fields.map(csvField).join(',')).join('\r\n')
}
