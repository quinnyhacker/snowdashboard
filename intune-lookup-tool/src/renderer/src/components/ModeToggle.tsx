import { useAppStore } from '@renderer/state/store'

/** By-user / by-device pill toggle, shared between single and bulk lookup
 * since "which field am I matching on" is the same concept in both. */
export function ModeToggle(): JSX.Element {
  const searchMode = useAppStore((s) => s.searchMode)
  const setSearchMode = useAppStore((s) => s.setSearchMode)

  return (
    <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-1">
      {(['user', 'device'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setSearchMode(mode)}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
            searchMode === mode ? 'bg-kiewit-gold text-black' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {mode === 'user' ? 'By user' : 'By device name'}
        </button>
      ))}
    </div>
  )
}
