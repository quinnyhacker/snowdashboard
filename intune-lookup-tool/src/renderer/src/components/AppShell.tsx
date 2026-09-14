import { useAppInit } from '@renderer/hooks/useAppInit'
import { Sidebar } from './Sidebar'
import { SearchPanel } from './SearchPanel'
import { ResultView } from './ResultView'
import { ColumnPickerModal } from './ColumnPickerModal'
import { Toast } from './Toast'

export function AppShell(): JSX.Element {
  useAppInit()

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex h-full max-w-2xl flex-col gap-6">
          <SearchPanel />
          <div className="flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Result</p>
            <ResultView />
          </div>
        </div>
      </main>
      <ColumnPickerModal />
      <Toast />
    </div>
  )
}
