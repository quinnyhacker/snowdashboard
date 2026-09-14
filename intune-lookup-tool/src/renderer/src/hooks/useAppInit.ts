import { useEffect } from 'react'
import { useAppStore } from '@renderer/state/store'

/** Loads the persisted state on mount: auto-loads the last device export /
 * legal hold list / district list (matching each one's remembered columns
 * where possible), and restores the always-on-top preference. Any section
 * that can't fully auto-resolve (file moved, or its columns no longer
 * match) surfaces as an error or a column-picker prompt, same as a fresh
 * manual load. */
export function useAppInit(): void {
  const setSection = useAppStore((s) => s.setSection)
  const setAlwaysOnTop = useAppStore((s) => s.setAlwaysOnTop)
  const openColumnPicker = useAppStore((s) => s.openColumnPicker)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
