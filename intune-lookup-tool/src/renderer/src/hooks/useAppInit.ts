import { useEffect } from 'react'
import { useAppStore } from '@renderer/state/store'
import { SECTION_TITLES } from '@renderer/lib/columnFields'

/** Loads the persisted state on mount: auto-loads the last device export /
 * legal hold list / district list (matching each one's remembered columns
 * where possible), and restores the always-on-top preference. Any section
 * that can't fully auto-resolve (file moved, or its columns no longer
 * match) surfaces as an error or a column-picker prompt, same as a fresh
 * manual load. Also subscribes to background auto-sync updates, so a
 * shared file someone else overwrote propagates here without a manual
 * Refresh click. */
export function useAppInit(): void {
  const setSection = useAppStore((s) => s.setSection)
  const setAlwaysOnTop = useAppStore((s) => s.setAlwaysOnTop)
  const openColumnPicker = useAppStore((s) => s.openColumnPicker)
  const showToast = useAppStore((s) => s.showToast)

  useEffect(() => {
    window.api.app.getInitialState().then((state) => {
      setAlwaysOnTop(state.alwaysOnTop)
      ;(['device', 'legalHold', 'district'] as const).forEach((kind) => {
        const summary = state[kind]
        setSection(kind, summary)
        if (summary.status === 'needs-columns') {
          openColumnPicker({ kind, headers: summary.headers ?? [], guesses: summary.guesses ?? {} })
        }
      })
    })

    const unsubscribe = window.api.sync.onSectionUpdated(({ kind, summary }) => {
      setSection(kind, summary)
      if (summary.status === 'loaded') {
        showToast(`${SECTION_TITLES[kind]} updated automatically: ${summary.count?.toLocaleString()} loaded`, 'success')
      } else if (summary.status === 'needs-columns') {
        showToast(`${SECTION_TITLES[kind]} changed on disk — confirm the new column layout.`, 'info')
        openColumnPicker({ kind, headers: summary.headers ?? [], guesses: summary.guesses ?? {} })
      } else if (summary.status === 'error') {
        showToast(`${SECTION_TITLES[kind]}: ${summary.message}`, 'error')
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
