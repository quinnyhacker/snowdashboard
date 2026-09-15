import { useMemo } from 'react'
import { parseBulkTerms, type BulkSearchRow } from '@shared/domain/bulkSearch'
import { useAppStore } from '@renderer/state/store'
import { buildBulkResultsTsv } from '@renderer/lib/bulkExport'
import { ModeToggle } from './ModeToggle'
import { CopyIcon, SearchIcon, ShieldIcon } from './icons'

function LegalHoldCell({ legalHold }: { legalHold: boolean | undefined }): JSX.Element {
  if (legalHold) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-sm font-semibold text-red-800">
        <ShieldIcon className="h-3.5 w-3.5" />
        Legal hold
      </span>
    )
  }
  if (legalHold === false) return <span className="text-sm text-neutral-400">No</span>
  return <span className="text-sm text-neutral-300">—</span>
}

function ResultsTable({ rows, mode }: { rows: BulkSearchRow[]; mode: 'user' | 'device' }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-sm text-neutral-500">
            <th className="px-4 py-2.5 font-semibold">{mode === 'device' ? 'Device' : 'User'}</th>
            <th className="px-4 py-2.5 font-semibold">{mode === 'device' ? 'User' : 'Device(s)'}</th>
            <th className="px-4 py-2.5 font-semibold">District</th>
            <th className="px-4 py-2.5 font-semibold">Legal hold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.term} className={`border-b border-neutral-100 last:border-0 ${row.enrichment.legalHold ? 'bg-red-50' : ''}`}>
              <td className="px-4 py-3 text-lg font-semibold text-black">{mode === 'device' ? row.device : row.user}</td>
              <td className="px-4 py-3 text-base text-neutral-600">
                {mode === 'device' ? row.user : (row.devices ?? []).join(', ') || '—'}
              </td>
              <td className="px-4 py-3 text-base text-black">
                {row.enrichment.district?.found ? row.enrichment.district.work || '(blank)' : '—'}
              </td>
              <td className="px-4 py-3">
                <LegalHoldCell legalHold={row.enrichment.legalHold} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

          {foundRows.length > 0 && <ResultsTable rows={foundRows} mode={searchMode} />}

          <NotFoundList rows={notFoundRows} onInvestigate={investigate} />
        </div>
      )}
    </div>
  )
}
