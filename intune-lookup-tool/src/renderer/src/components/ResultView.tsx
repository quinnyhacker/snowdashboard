import type { ReactNode } from 'react'
import type { MatchEnrichment, SearchResult } from '@shared/domain/search'
import { useAppStore } from '@renderer/state/store'
import { CheckIcon, CopyIcon, LaptopIcon, MapPinIcon, ShieldIcon, UserIcon } from './icons'

function Chip({ children }: { children: ReactNode }): JSX.Element {
  return <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-black">{children}</span>
}

function LegalHoldBanner({ legalHold }: { legalHold?: boolean }): JSX.Element | null {
  if (legalHold === undefined) return null
  if (legalHold) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        <ShieldIcon />
        LEGAL HOLD — do not wipe or reassign
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-400">
      <CheckIcon className="text-emerald-500" />
      Not on legal hold
    </div>
  )
}

function DistrictBadges({ district }: { district?: MatchEnrichment['district'] }): JSX.Element | null {
  if (!district) return null
  if (!district.found) {
    return <p className="text-xs text-neutral-400">Not found in the district list.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Chip>Work: {district.work || 'blank in source list'}</Chip>
      <Chip>Home: {district.home || 'blank in source list'}</Chip>
    </div>
  )
}

function CopyButton({ text }: { text: string }): JSX.Element {
  const showToast = useAppStore((s) => s.showToast)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'))
      }}
      className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
    >
      <CopyIcon />
      Copy
    </button>
  )
}

function summaryText(result: Extract<SearchResult, { kind: 'exact' }>): string {
  const lines: string[] = []
  if (result.mode === 'device') {
    lines.push(`Device: ${result.device}`, `User: ${result.user}`)
  } else {
    lines.push(`User: ${result.user}`, `Device(s): ${(result.devices ?? []).join(', ') || '(none)'}`)
  }
  if (result.enrichment.legalHold) lines.push('LEGAL HOLD — do not wipe or reassign')
  if (result.enrichment.district?.found) {
    lines.push(`Work district: ${result.enrichment.district.work || 'blank'}`, `Home district: ${result.enrichment.district.home || 'blank'}`)
  }
  return lines.join('\n')
}

function ExactMatchCard({ result }: { result: Extract<SearchResult, { kind: 'exact' }> }): JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {result.mode === 'device' ? <LaptopIcon className="text-neutral-400" /> : <UserIcon className="text-neutral-400" />}
          <h3 className="text-lg font-semibold text-black">{result.mode === 'device' ? result.device : result.user}</h3>
        </div>
        <CopyButton text={summaryText(result)} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-neutral-700">
        {result.mode === 'device' ? (
          <p>
            Assigned user: <span className="font-medium text-black">{result.user}</span>
          </p>
        ) : (
          <div>
            <p className="mb-1">Device(s):</p>
            <div className="flex flex-wrap gap-1.5">
              {(result.devices ?? []).length > 0 ? (
                result.devices!.map((d) => <Chip key={d}>{d}</Chip>)
              ) : (
                <span className="text-neutral-400">No devices on record.</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
        <LegalHoldBanner legalHold={result.enrichment.legalHold} />
        <DistrictBadges district={result.enrichment.district} />
      </div>
    </div>
  )
}

function PartialMatchList({ result }: { result: Extract<SearchResult, { kind: 'partial' }> }): JSX.Element {
  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">{result.rows.length} possible matches:</p>
      {result.rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-black">{row.label}</span>
            <span className="text-sm text-neutral-500">
              {Array.isArray(row.counterpart) ? row.counterpart.join(', ') || '(no devices)' : row.counterpart}
            </span>
          </div>
          {(row.enrichment.legalHold || row.enrichment.district?.found) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {row.enrichment.legalHold && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <ShieldIcon className="h-3 w-3" /> Legal hold
                </span>
              )}
              {row.enrichment.district?.found && (
                <>
                  <Chip>Work: {row.enrichment.district.work || 'blank'}</Chip>
                  <Chip>Home: {row.enrichment.district.home || 'blank'}</Chip>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ResultView(): JSX.Element {
  const result = useAppStore((s) => s.searchResult)

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-400">
        <MapPinIcon className="h-6 w-6" />
        <p className="text-sm">Search for a user or device to see details here.</p>
      </div>
    )
  }

  if (result.kind === 'none') {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        No {result.mode === 'device' ? 'device' : 'user'} found matching &ldquo;{result.term}&rdquo;.
      </div>
    )
  }

  if (result.kind === 'exact') return <ExactMatchCard result={result} />
  return <PartialMatchList result={result} />
}
