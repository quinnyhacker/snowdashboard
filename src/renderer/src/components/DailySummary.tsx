import { useMemo } from 'react'
import { assessSla } from '@shared/domain/slaPolicy'
import { useAppStore } from '@renderer/state/store'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function DailySummary(): JSX.Element {
  const tickets = useAppStore((s) => s.tickets)
  const selectTicket = useAppStore((s) => s.selectTicket)

  const { overdue, dueToday, newSinceYesterday, needsAttention } = useMemo(() => {
    const now = new Date()
    const overdue = tickets.filter((t) => assessSla(t, now).urgency === 'breached')
    const dueToday = tickets.filter((t) => {
      const a = assessSla(t, now)
      return a.urgency === 'approaching'
    })
    const newSinceYesterday = tickets.filter((t) => Date.now() - new Date(t.createdAt).getTime() < ONE_DAY_MS)
    const needsAttention = [...new Set([...overdue, ...dueToday])]
    return { overdue, dueToday, newSinceYesterday, needsAttention }
  }, [tickets])

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-y-auto p-6">
      <h1 className="text-lg font-semibold text-slate-900">Today at a glance</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-2xl font-semibold text-red-700">{overdue.length}</p>
          <p className="text-sm text-red-700">Past due</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-2xl font-semibold text-amber-700">{dueToday.length}</p>
          <p className="text-sm text-amber-700">Due soon</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-2xl font-semibold text-slate-700">{newSinceYesterday.length}</p>
          <p className="text-sm text-slate-700">New in last 24h</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Needs your attention today</h2>
        {needsAttention.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing urgent right now.</p>
        ) : (
          <ul className="space-y-2">
            {needsAttention.map((ticket) => (
              <li key={ticket.sysId}>
                <button
                  type="button"
                  onClick={() => selectTicket(ticket.number)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium">{ticket.number}</span> — {ticket.shortDescription}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
