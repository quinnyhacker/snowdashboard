import { useMemo } from 'react'
import { groupByDistrict, parseBulkTerms, type BulkSearchRow } from '@shared/domain/bulkSearch'
import { useAppStore } from '@renderer/state/store'
import { buildBulkResultsTsv } from '@renderer/lib/bulkExport'
import { ModeToggle } from './ModeToggle'
import { CopyIcon, SearchIcon, ShieldIcon } from './icons'

function Chip({ flagged, children }: { flagged: boolean; children: string }): JSX.Element {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1.5 text-base font-medium ${
        flagged ? 'bg-red-100 font-semibold text-red-800' : 'bg-neutral-100 text-black'
      }`}
    >
      {children}
    </span>
  )
}

function DistrictGroupCard({
  district,
  rows,
  mode
}: {
  district: string | undefined
  rows: BulkSearchRow[]
  mode: 'user' | 'device'
}): JSX.Element {
  const showToast = useAppStore((s) => s.showToast)
  const legalHoldCount = rows.filter((r) => r.enrichment.legalHold).length

  const copyList = (): void => {
    const labels = rows.map((r) => (mode === 'device' ? (r.device ?? r.term) : (r.user ?? r.term)))
    navigator.clipboard.writeText(labels.join('\n')).then(() => showToast('Copied list to clipboard', 'success'))
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-black">
          {district ?? 'No district on record'} <span className="font-normal text-neutral-400">({rows.length})</span>
        </h3>
        <button
          type="button"
          onClick={copyList}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          <CopyIcon />
          Copy list
        </button>
      </div>

      {legalHoldCount > 0 && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-red-700">
          <ShieldIcon className="h-4 w-4" />
          {legalHoldCount} on legal hold — do not redeploy
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <Chip key={row.term} flagged={Boolean(row.enrichment.legalHold)}>
            {mode === 'device' ? (row.device ?? row.term) : (row.user ?? row.term)}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function NotFoundList({ rows, onInvestigate }: { rows: BulkSearchRow[]; onInvestigate: (term: string) => void }): JSX.Element | null {
  if (rows.length === 0) return null
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <h3 className="text-base font-semibold text-neutral-700">{rows.length} not found</h3>
      <p className="mt-1 text-sm text-neutral-500">No exact match in the device export. Check for typos, or click one to investigate in single lookup.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((row) => (
          <button
            key={row.term}
            type="button"
            onClick={() => onInvestigate(row.term)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            {row.term}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BulkLookupPanel(): JSX.Element {
  const searchMode = useAppStore((s) => s.searchMode)
  const bulkInput = useAppStore((s) => s.bulkInput)
  const setBulkInput = useAppStore((s) => s.setBulkInput)
  const bulkRows = useAppStore((s) => s.bulkRows)
  const setBulkRows = useAppStore((s) => s.setBulkRows)
  const isBulkSearching = useAppStore((s) => s.isBulkSearching)
  const setIsBulkSearching = useAppStore((s) => s.setIsBulkSearching)
  const device = useAppStore((s) => s.device)
  const showToast = useAppStore((s) => s.showToast)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const setSearchTerm = useAppStore((s) => s.setSearchTerm)
  const setSearchResult = useAppStore((s) => s.setSearchResult)

  const terms = useMemo(() => parseBulkTerms(bulkInput), [bulkInput])
  const noDeviceLoaded = device.status !== 'loaded'

  const runBulk = async (): Promise<void> => {
    if (terms.length === 0) return
    setIsBulkSearching(true)
    try {
      const rows = await window.api.search.runBulk({ mode: searchMode, terms })
      setBulkRows(rows)
    } finally {
      setIsBulkSearching(false)
    }
  }

  const copyAll = (): void => {
    if (!bulkRows) return
    navigator.clipboard.writeText(buildBulkResultsTsv(bulkRows, searchMode)).then(() => showToast('Copied results to clipboard', 'success'))
  }

  const investigate = (term: string): void => {
    setSearchTerm(term)
    setSearchResult(undefined)
    setViewMode('single')
  }

  const foundRows = bulkRows?.filter((r) => r.found) ?? []
  const notFoundRows = bulkRows?.filter((r) => !r.found) ?? []
  const groups = useMemo(() => (bulkRows ? groupByDistrict(bulkRows) : []), [bulkRows])

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-black">Bulk lookup</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Paste or type one device name (or username) per line — handy for sorting a batch of recovered laptops by district.
        </p>
      </div>

      <div>
        <ModeToggle />
      </div>

      <div className="flex gap-4">
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder={searchMode === 'device' ? 'LAPTOP-00123\nLAPTOP-00456\nLAPTOP-00789' : 'jdoe\njsmith\najones'}
          rows={8}
          spellCheck={false}
          className="w-full max-w-md rounded-lg border border-neutral-300 p-3 font-mono text-sm focus:border-kiewit-gold focus:outline-none focus:ring-1 focus:ring-kiewit-gold"
        />
        <div className="flex flex-col justify-between">
          <p className="text-sm text-neutral-500">{terms.length} {terms.length === 1 ? 'entry' : 'entries'}</p>
          <button
            type="button"
            onClick={runBulk}
            disabled={noDeviceLoaded || isBulkSearching || terms.length === 0}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
          >
            <SearchIcon />
            {isBulkSearching ? 'Looking up…' : 'Look up all'}
          </button>
        </div>
      </div>

      {noDeviceLoaded && <p className="text-xs text-neutral-400">Load a device export first.</p>}

      {bulkRows && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {foundRows.length} found{notFoundRows.length > 0 ? `, ${notFoundRows.length} not found` : ''}
            </p>
            <button
              type="button"
              onClick={copyAll}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              <CopyIcon />
              Copy all results
            </button>
          </div>

          {groups.map((group) => (
            <DistrictGroupCard key={group.district ?? '__none__'} district={group.district} rows={group.rows} mode={searchMode} />
          ))}

          <NotFoundList rows={notFoundRows} onInvestigate={investigate} />
        </div>
      )}
    </div>
  )
}
