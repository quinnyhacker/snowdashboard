import { useAppInit } from '@renderer/hooks/useAppInit'
import { useAppStore } from '@renderer/state/store'
import { Sidebar } from './Sidebar'
import { SearchPanel } from './SearchPanel'
import { ResultView } from './ResultView'
import { BulkLookupPanel } from './BulkLookupPanel'
import { ColumnPickerModal } from './ColumnPickerModal'
import { Toast } from './Toast'

export function AppShell(): JSX.Element {
  useAppInit()
  const viewMode = useAppStore((s) => s.viewMode)
  const setViewMode = useAppStore((s) => s.setViewMode)

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className={`mx-auto flex h-full flex-col gap-6 ${viewMode === 'bulk' ? 'max-w-4xl' : 'max-w-2xl'}`}>
          <div className="inline-flex self-start rounded-lg border border-neutral-300 bg-white p-1">
            {(['single', 'bulk'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                  viewMode === mode ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {mode === 'single' ? 'Single lookup' : 'Bulk lookup'}
              </button>
            ))}
          </div>

          {viewMode === 'single' ? (
            <>
              <SearchPanel />
              <div className="flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Result</p>
                <ResultView />
              </div>
            </>
          ) : (
            <BulkLookupPanel />
          )}
        </div>
      </main>
      <ColumnPickerModal />
      <Toast />
    </div>
  )
}
