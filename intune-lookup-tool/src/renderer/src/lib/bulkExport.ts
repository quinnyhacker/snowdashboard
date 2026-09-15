import type { BulkSearchRow } from '@shared/domain/bulkSearch'
import type { SearchMode } from '@shared/domain/search'

/** Formats bulk lookup results as tab-separated text, ready to paste into
 * Excel/Sheets — the record technicians keep of what went where when
 * processing a batch of recovered hardware. */
export function buildBulkResultsTsv(rows: BulkSearchRow[], mode: SearchMode): string {
  const header =
    mode === 'device'
      ? ['Input', 'Device', 'User', 'Work District', 'Home District', 'Legal Hold']
      : ['Input', 'User', 'Device(s)', 'Work District', 'Home District', 'Legal Hold']

  const lines = rows.map((row) => {
    if (!row.found) return [row.term, 'NOT FOUND', '', '', '', ''].join('\t')

    const work = row.enrichment.district?.found ? (row.enrichment.district.work ?? '') : ''
    const home = row.enrichment.district?.found ? (row.enrichment.district.home ?? '') : ''
    const legalHold = row.enrichment.legalHold ? 'YES' : ''

    if (mode === 'device') {
      return [row.term, row.device ?? '', row.user ?? '', work, home, legalHold].join('\t')
    }
    return [row.term, row.user ?? '', (row.devices ?? []).join('; '), work, home, legalHold].join('\t')
  })

  return [header.join('\t'), ...lines].join('\n')
}
