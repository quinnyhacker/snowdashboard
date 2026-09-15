import { useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { parseBulkTerms, type BulkSearchRow } from '@shared/domain/bulkSearch'
import { deviceNameFromScan, normalizeScannedTerm } from '@shared/domain/scanParsing'
import { useAppStore } from '@renderer/state/store'
import { buildBulkResultsTsv } from '@renderer/lib/bulkExport'
import { extractCompletedLineOnEnter } from '@renderer/lib/liveScan'
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
            <th className="px-4 py-2.5 font-semibold">Work District</th>
            <th className="px-4 py-2.5 font-semibold">Home District</th>
            <th className="px-4 py-2.5 font-semibold">Legal hold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.term}-${index}`} className={`border-b border-neutral-100 last:border-0 ${row.enrichment.legalHold ? 'bg-red-50' : ''}`}>
              <td className="px-4 py-3 text-lg font-semibold text-black">{mode === 'device' ? row.device : row.user}</td>
              <td className="px-4 py-3 text-base text-neutral-600">
                {mode === 'device' ? row.user : (row.devices ?? []).join(', ') || '—'}
              </td>
              <td className="px-4 py-3 text-base text-black">
                {row.enrichment.district?.found ? row.enrichment.district.work || '(blank)' : '—'}
              </td>
              <td className="px-4 py-3 text-base text-black">
                {row.enrichment.district?.found ? row.enrichment.district.home || '(blank)' : '—'}
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

function LastScannedCallout({ row, mode }: { row: BulkSearchRow; mode: 'user' | 'device' }): JSX.Element {
  if (!row.found) {
    return (
      <div data-testid="last-scanned" className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Last scanned</p>
        <p className="mt-0.5 text-lg font-semibold text-neutral-500">{row.term} — not found</p>
      </div>
    )
  }

  const name = mode === 'device' ? row.device : row.user
  const counterpart = mode === 'device' ? row.user : (row.devices ?? []).join(', ')

  return (
    <div
      data-testid="last-scanned"
      className={`rounded-lg border px-4 py-3 ${row.enrichment.legalHold ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Last scanned</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xl font-bold text-black">{name}</span>
        {counterpart && <span className="text-base text-neutral-600">{counterpart}</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-black">
          Work: {row.enrichment.district?.found ? row.enrichment.district.work || '(blank)' : '—'}
        </span>
        <span className="text-black">
          Home: {row.enrichment.district?.found ? row.enrichment.district.home || '(blank)' : '—'}
        </span>
        {row.enrichment.legalHold && (
          <span className="flex items-center gap-1 font-semibold text-red-700">
            <ShieldIcon className="h-4 w-4" />
            LEGAL HOLD — do not redeploy
          </span>
        )}
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
        {rows.map((row, index) => (
          <button
            key={`${row.term}-${index}`}
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
  const appendBulkRows = useAppStore((s) => s.appendBulkRows)
  const isBulkSearching = useAppStore((s) => s.isBulkSearching)
  const setIsBulkSearching = useAppStore((s) => s.setIsBulkSearching)
  const device = useAppStore((s) => s.device)
  const showToast = useAppStore((s) => s.showToast)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const setSearchTerm = useAppStore((s) => s.setSearchTerm)
  const setSearchResult = useAppStore((s) => s.setSearchResult)

  // Chains live-scan lookups one after another, so results land in the
  // same order laptops were scanned even if someone scans faster than a
  // single lookup takes to resolve.
  const scanQueueRef = useRef(Promise.resolve())

  const rawTerms = useMemo(() => parseBulkTerms(bulkInput), [bulkInput])
  const terms = useMemo(() => rawTerms.map(normalizeScannedTerm), [rawTerms])
  const scannedCount = useMemo(() => rawTerms.filter((t) => deviceNameFromScan(t) !== undefined).length, [rawTerms])
  const noDeviceLoaded = device.status !== 'loaded'

  const runBulk = async (): Promise<void> => {
    if (terms.length === 0) return
    setIsBulkSearching(true)
    try {
      const rows = await window.api.search.runBulk({ mode: searchMode, terms })
      appendBulkRows(rows)
      setBulkInput('')
    } finally {
      setIsBulkSearching(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Enter' || noDeviceLoaded) return
    const target = e.currentTarget
    const completed = extractCompletedLineOnEnter(target.value, target.selectionStart, target.selectionEnd)
    if (!completed) return

    e.preventDefault()
    setBulkInput(completed.remaining)

    const term = normalizeScannedTerm(completed.line)
    scanQueueRef.current = scanQueueRef.current
      .then(() => window.api.search.runBulk({ mode: searchMode, terms: [term] }))
      .then((rows) => appendBulkRows(rows))
      .catch(() => showToast(`Couldn't look up "${completed.line}"`, 'error'))
  }

  const copyAll = (): void => {
    if (!bulkRows) return
    navigator.clipboard.writeText(buildBulkResultsTsv(bulkRows, searchMode)).then(() => showToast('Copied results to clipboard', 'success'))
  }

  const clearResults = (): void => {
    setBulkRows(undefined)
  }

  const investigate = (term: string): void => {
    setSearchTerm(term)
    setSearchResult(undefined)
    setViewMode('single')
  }

  const foundRows = bulkRows?.filter((r) => r.found) ?? []
  const notFoundRows = bulkRows?.filter((r) => !r.found) ?? []
  const lastRow = bulkRows && bulkRows.length > 0 ? bulkRows[bulkRows.length - 1] : undefined

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-black">Bulk lookup</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Scan devices directly into the box — each one looks up the moment you scan it. Or paste a whole list
          and click <span className="font-medium text-black">Look up all</span>.
        </p>
      </div>

      <div>
        <ModeToggle />
      </div>

      <div className="flex gap-4">
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchMode === 'device' ? 'Scan here, or type LAPTOP-00123' : 'jdoe\njsmith\najones'}
          rows={8}
          spellCheck={false}
          className="w-full max-w-md rounded-lg border border-neutral-300 p-3 font-mono text-sm focus:border-kiewit-gold focus:outline-none focus:ring-1 focus:ring-kiewit-gold"
        />
        <div className="flex flex-col justify-between">
          <p className="text-sm text-neutral-500">
            {terms.length} {terms.length === 1 ? 'entry' : 'entries'}
            {scannedCount > 0 && <span className="text-emerald-600"> · {scannedCount} from scans</span>}
          </p>
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

      {lastRow && <LastScannedCallout row={lastRow} mode={searchMode} />}

      {bulkRows && bulkRows.length > 0 && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {foundRows.length} found{notFoundRows.length > 0 ? `, ${notFoundRows.length} not found` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyAll}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                <CopyIcon />
                Copy all results
              </button>
              <button
                type="button"
                onClick={clearResults}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Clear results
              </button>
            </div>
          </div>

          {foundRows.length > 0 && <ResultsTable rows={foundRows} mode={searchMode} />}

          <NotFoundList rows={notFoundRows} onInvestigate={investigate} />
        </div>
      )}
    </div>
  )
}
