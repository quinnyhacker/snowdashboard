import type { ReactNode } from 'react'
import { ChevronIcon } from './icons'

interface CollapsibleSectionProps {
  title: string
  summary?: string
  icon: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function CollapsibleSection({ title, summary, icon, open, onToggle, children }: CollapsibleSectionProps): JSX.Element {
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg bg-kiewit-hover px-3 py-2.5 text-left text-white transition hover:bg-neutral-700"
      >
        <ChevronIcon open={open} className="shrink-0 text-neutral-400" />
        <span className="shrink-0 text-kiewit-gold">{icon}</span>
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
      </button>
      {!open && summary && <div className="mt-1 truncate px-3 text-xs text-neutral-400">{summary}</div>}
      <div className={`collapse-grid ${open ? 'open' : ''}`}>
        <div>
          <div className="space-y-2 px-1 pt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
