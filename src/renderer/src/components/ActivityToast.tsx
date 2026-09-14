import { useEffect, useState } from 'react'
import type { ActivityLogEntry } from '@shared/types/chat'
import { useAppStore } from '@renderer/state/store'

/** Surfaces a brief toast whenever a new activity entry lands (an
 * automatic ticket update, a declined confirmation, an error), so changes
 * the assistant makes are visible even when the chat panel isn't in focus. */
export function ActivityToast(): JSX.Element | null {
  const latest = useAppStore((s) => s.activityLog[0])
  const [visible, setVisible] = useState<ActivityLogEntry | undefined>()

  useEffect(() => {
    if (!latest) return
    setVisible(latest)
    const timeout = setTimeout(() => setVisible(undefined), 5000)
    return () => clearTimeout(timeout)
  }, [latest])

  if (!visible) return null

  const tone =
    visible.kind === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : visible.kind === 'declined-update'
        ? 'border-slate-300 bg-slate-50 text-slate-700'
        : 'border-emerald-300 bg-emerald-50 text-emerald-800'

  return (
    <div className={`pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg ${tone}`}>
      {visible.message}
    </div>
  )
}
