import { useAppStore } from '@renderer/state/store'
import { SearchIcon } from './icons'
import { ModeToggle } from './ModeToggle'

export function SearchPanel(): JSX.Element {
  const searchMode = useAppStore((s) => s.searchMode)
  const searchTerm = useAppStore((s) => s.searchTerm)
  const setSearchTerm = useAppStore((s) => s.setSearchTerm)
  const isSearching = useAppStore((s) => s.isSearching)
  const setIsSearching = useAppStore((s) => s.setIsSearching)
  const setSearchResult = useAppStore((s) => s.setSearchResult)
  const device = useAppStore((s) => s.device)

  const runSearch = async (): Promise<void> => {
    if (!searchTerm.trim()) return
    setIsSearching(true)
    try {
      const result = await window.api.search.run({ mode: searchMode, term: searchTerm })
      setSearchResult(result)
    } finally {
      setIsSearching(false)
    }
  }

  const noDeviceLoaded = device.status !== 'loaded'

  return (
    <div>
      <h2 className="text-2xl font-bold text-black">Look up</h2>

      <div className="mt-4">
        <ModeToggle />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          runSearch()
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchMode === 'user' ? 'e.g. jdoe or jdoe@kiewit.com' : 'e.g. LAPTOP-00123'}
          className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-kiewit-gold focus:outline-none focus:ring-1 focus:ring-kiewit-gold"
        />
        <button
          type="submit"
          disabled={noDeviceLoaded || isSearching || !searchTerm.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
        >
          <SearchIcon />
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {noDeviceLoaded && <p className="mt-2 text-xs text-neutral-400">Load a device export first.</p>}
    </div>
  )
}
