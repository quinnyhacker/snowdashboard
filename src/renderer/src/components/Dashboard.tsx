import { useMemo } from 'react'
import type { Ticket } from '@shared/domain/ticket'
import { applyView, uniqueAssignmentGroups, uniqueStates } from '@shared/domain/ticketView'
import type { DashboardFilters, SortDirection, SortField } from '@shared/types/preferences'
import { useAppStore } from '@renderer/state/store'
import { TicketCard } from './TicketCard'
import { FilterBar } from './FilterBar'

export function Dashboard(): JSX.Element {
  const tickets = useAppStore((s) => s.tickets)
  const isLoadingTickets = useAppStore((s) => s.isLoadingTickets)
  const lastRefreshedAt = useAppStore((s) => s.lastRefreshedAt)
  const preferences = useAppStore((s) => s.preferences)
  const setPreferences = useAppStore((s) => s.setPreferences)
  const setTickets = useAppStore((s) => s.setTickets)
  const setLoadingTickets = useAppStore((s) => s.setLoadingTickets)
  const selectTicket = useAppStore((s) => s.selectTicket)
  const appendUserMessage = useAppStore((s) => s.appendUserMessage)
  const setChatStreaming = useAppStore((s) => s.setChatStreaming)

  const visibleTickets = useMemo(
    () => applyView(tickets, preferences.filters, preferences.sortField, preferences.sortDirection),
    [tickets, preferences.filters, preferences.sortField, preferences.sortDirection]
  )
  const availableStates = useMemo(() => uniqueStates(tickets), [tickets])
  const availableGroups = useMemo(() => uniqueAssignmentGroups(tickets), [tickets])

  const persistPrefs = (partial: Partial<typeof preferences>): void => {
    const next = { ...preferences, ...partial }
    setPreferences(next)
    window.api.prefs.update(partial)
  }

  const handleRefresh = (): void => {
    setLoadingTickets(true)
    window.api.dashboard.getAllWork().then(setTickets).finally(() => setLoadingTickets(false))
  }

  const handleQuickAction = (ticket: Ticket, action: 'note' | 'reply' | 'in-progress'): void => {
    const prompts: Record<typeof action, string> = {
      note: `Add a work note to ${ticket.number} summarizing where things stand.`,
      reply: `Draft a reply email to the requester for ${ticket.number} with a status update.`,
      'in-progress': `Move ${ticket.number} to In Progress.`
    }
    const text = prompts[action]
    appendUserMessage({ id: crypto.randomUUID(), role: 'user', content: text, createdAt: new Date().toISOString(), ticketContext: ticket.number })
    setChatStreaming(true)
    window.api.chat.sendMessage({ text, ticketNumber: ticket.number })
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBar
        filters={preferences.filters}
        sortField={preferences.sortField}
        sortDirection={preferences.sortDirection}
        availableStates={availableStates}
        availableGroups={availableGroups}
        onChangeFilters={(filters: DashboardFilters) => persistPrefs({ filters })}
        onChangeSort={(sortField: SortField, sortDirection: SortDirection) => persistPrefs({ sortField, sortDirection })}
        onRefresh={handleRefresh}
        isRefreshing={isLoadingTickets}
        lastRefreshedAt={lastRefreshedAt}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {visibleTickets.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {isLoadingTickets ? 'Loading your work…' : 'Nothing matches the current filters.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleTickets.map((ticket) => (
              <TicketCard key={ticket.sysId} ticket={ticket} onOpen={selectTicket} onQuickAction={handleQuickAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
