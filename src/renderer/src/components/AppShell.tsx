import { useAppInit } from '@renderer/hooks/useAppInit'
import { useAppStore, type ViewName } from '@renderer/state/store'
import { Dashboard } from './Dashboard'
import { TicketDetail } from './TicketDetail'
import { SettingsView } from './SettingsView'
import { DailySummary } from './DailySummary'
import { ChatPanel } from './ChatPanel'
import { ActivityToast } from './ActivityToast'

const NAV_ITEMS: { key: ViewName; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'daily-summary', label: 'Today' },
  { key: 'settings', label: 'Settings' }
]

export function AppShell(): JSX.Element {
  useAppInit()

  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const chatPanelPosition = useAppStore((s) => s.preferences.chatPanelPosition)

  const mainContent = (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {view === 'dashboard' && <Dashboard />}
      {view === 'ticket-detail' && <TicketDetail />}
      {view === 'daily-summary' && <DailySummary />}
      {view === 'settings' && <SettingsView />}
    </div>
  )

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-2">
        <span className="mr-4 text-sm font-semibold text-slate-900">ServiceNow Command Center</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setView(item.key)}
            className={`rounded px-3 py-1.5 text-sm ${
              view === item.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </header>

      <div className={`flex flex-1 overflow-hidden ${chatPanelPosition === 'bottom' ? 'flex-col' : 'flex-row'}`}>
        {mainContent}
        <div
          className={chatPanelPosition === 'bottom' ? 'h-72 w-full' : 'h-full w-[380px] shrink-0'}
        >
          <ChatPanel />
        </div>
      </div>

      <ActivityToast />
    </div>
  )
}
