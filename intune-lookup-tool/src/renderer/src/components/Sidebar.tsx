import { useState } from 'react'
import { useAppStore, type SectionKind } from '@renderer/state/store'
import { browseSection, changeColumnsForSection, refreshSection } from '@renderer/lib/sectionActions'
import { SECTION_TITLES } from '@renderer/lib/columnFields'
import { CollapsibleSection } from './CollapsibleSection'
import { LaptopIcon, MapPinIcon, PinIcon, RefreshIcon, ShieldIcon, UploadIcon } from './icons'
import type { SectionSummary } from '@shared/types/sections'

const ICONS: Record<SectionKind, JSX.Element> = {
  device: <LaptopIcon />,
  legalHold: <ShieldIcon />,
  district: <MapPinIcon />
}

const LOAD_LABELS: Record<SectionKind, string> = {
  device: 'Load export…',
  legalHold: 'Load legal hold list…',
  district: 'Load district list…'
}

const EMPTY_LABELS: Record<SectionKind, string> = {
  device: 'No file loaded yet.',
  legalHold: 'No legal hold list loaded.',
  district: 'No district list loaded.'
}

function statusText(kind: SectionKind, summary: SectionSummary): string {
  if (summary.status === 'loaded') {
    return `${summary.fileName}\n${summary.count?.toLocaleString()} loaded`
  }
  if (summary.status === 'error') return summary.message ?? 'Something went wrong.'
  return EMPTY_LABELS[kind]
}

function SectionBody({ kind }: { kind: SectionKind }): JSX.Element {
  const summary = useAppStore((s) => s[kind])
  const setSection = useAppStore((s) => s.setSection)
  const openColumnPicker = useAppStore((s) => s.openColumnPicker)
  const showToast = useAppStore((s) => s.showToast)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleBrowse = async (): Promise<void> => {
    const result = await browseSection(kind)
    if (!result) return
    if (result.status === 'needs-columns') {
      openColumnPicker({ kind, headers: result.headers ?? [], guesses: result.guesses ?? {} })
      return
    }
    setSection(kind, result)
    if (result.status === 'loaded') {
      showToast(`${SECTION_TITLES[kind]}: ${result.count?.toLocaleString()} loaded`, 'success')
    } else if (result.status === 'error') {
      showToast(result.message ?? 'Something went wrong.', 'error')
    }
  }

  const handleChangeColumns = async (): Promise<void> => {
    const result = await changeColumnsForSection(kind)
    if (!result || result.status !== 'needs-columns') return
    openColumnPicker({ kind, headers: result.headers ?? [], guesses: result.guesses ?? {} })
  }

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true)
    try {
      const result = await refreshSection(kind)
      if (result.status === 'needs-columns') {
        showToast(`${SECTION_TITLES[kind]}'s columns changed — confirm the new layout.`, 'info')
        openColumnPicker({ kind, headers: result.headers ?? [], guesses: result.guesses ?? {} })
        return
      }
      setSection(kind, result)
      if (result.status === 'loaded') {
        showToast(`${SECTION_TITLES[kind]} refreshed: ${result.count?.toLocaleString()} loaded`, 'success')
      } else if (result.status === 'error') {
        showToast(result.message ?? 'Something went wrong.', 'error')
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBrowse}
        className="flex w-full items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm text-white transition hover:bg-neutral-800"
      >
        <UploadIcon className="text-kiewit-gold" />
        {LOAD_LABELS[kind]}
      </button>
      <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-400">{statusText(kind, summary)}</p>
      {summary.status === 'loaded' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-xs text-kiewit-gold hover:underline disabled:opacity-50"
          >
            <RefreshIcon className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={handleChangeColumns} className="text-xs text-kiewit-gold hover:underline">
            Change columns
          </button>
        </div>
      )}
    </>
  )
}

export function Sidebar(): JSX.Element {
  const sectionOpen = useAppStore((s) => s.sectionOpen)
  const toggleSection = useAppStore((s) => s.toggleSection)
  const device = useAppStore((s) => s.device)
  const legalHold = useAppStore((s) => s.legalHold)
  const district = useAppStore((s) => s.district)
  const alwaysOnTop = useAppStore((s) => s.alwaysOnTop)
  const setAlwaysOnTop = useAppStore((s) => s.setAlwaysOnTop)

  const summaries: Record<SectionKind, SectionSummary> = { device, legalHold, district }

  const handleToggleTop = async (): Promise<void> => {
    const next = !alwaysOnTop
    setAlwaysOnTop(next)
    await window.api.app.setAlwaysOnTop(next)
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-black px-4 py-6">
      <h1 className="mb-1 text-lg font-bold leading-tight text-white">Device &amp; User Lookup</h1>
      <div className="my-4 h-px bg-neutral-800" />

      <div className="flex-1 overflow-y-auto pr-1">
        {(Object.keys(ICONS) as SectionKind[]).map((kind) => (
          <CollapsibleSection
            key={kind}
            title={SECTION_TITLES[kind]}
            summary={summaries[kind].status === 'loaded' ? `${summaries[kind].count?.toLocaleString()} loaded` : undefined}
            icon={ICONS[kind]}
            open={sectionOpen[kind]}
            onToggle={() => toggleSection(kind)}
          >
            <SectionBody kind={kind} />
          </CollapsibleSection>
        ))}
      </div>

      <button
        type="button"
        onClick={handleToggleTop}
        className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
          alwaysOnTop ? 'bg-kiewit-gold text-black' : 'bg-kiewit-hover text-white'
        }`}
      >
        <PinIcon />
        Always on top: {alwaysOnTop ? 'ON' : 'OFF'}
      </button>
    </aside>
  )
}
