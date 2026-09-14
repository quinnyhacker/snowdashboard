import { useEffect, useState } from 'react'
import type { Ticket } from '@shared/domain/ticket'
import { useAppStore } from '@renderer/state/store'
import { SlaBadge } from './SlaBadge'
import { SensitivityBanner } from './SensitivityBanner'

export function TicketDetail(): JSX.Element {
  const ticketNumber = useAppStore((s) => s.selectedTicketNumber)
  const selectTicket = useAppStore((s) => s.selectTicket)
  const appendUserMessage = useAppStore((s) => s.appendUserMessage)
  const setChatStreaming = useAppStore((s) => s.setChatStreaming)

  const [ticket, setTicket] = useState<Ticket | undefined>(undefined)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!ticketNumber) return
    setIsLoading(true)
    window.api.dashboard
      .getTicketDetail(ticketNumber)
      .then(setTicket)
      .finally(() => setIsLoading(false))
  }, [ticketNumber])

  if (!ticketNumber) return <p className="p-6 text-slate-500">No ticket selected.</p>
  if (isLoading) return <p className="p-6 text-slate-500">Loading {ticketNumber}…</p>
  if (!ticket) return <p className="p-6 text-slate-500">Couldn&rsquo;t load {ticketNumber}.</p>

  const commentsToShow = showFullHistory ? ticket.comments : ticket.comments.slice(-3)

  const askInChat = (text: string): void => {
    appendUserMessage({ id: crypto.randomUUID(), role: 'user', content: text, createdAt: new Date().toISOString(), ticketContext: ticket.number })
    setChatStreaming(true)
    window.api.chat.sendMessage({ text, ticketNumber: ticket.number })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <button type="button" onClick={() => selectTicket(undefined)} className="mb-4 self-start text-sm text-slate-500 hover:underline">
        ← Back to dashboard
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {ticket.number} — {ticket.shortDescription}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {ticket.table} · {ticket.assignmentGroup}
            {ticket.assignedTo ? ` · Assigned to ${ticket.assignedTo}` : ''}
          </p>
        </div>
        <SlaBadge ticket={ticket} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-slate-400">State</dt>
          <dd className="font-medium">{ticket.state}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Priority</dt>
          <dd className="font-medium">{ticket.priority}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Requested for</dt>
          <dd className="font-medium">{ticket.requestedFor ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Due date</dt>
          <dd className="font-medium">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleString() : '—'}</dd>
        </div>
      </dl>

      {ticket.isSensitivityFlagged ? (
        <div className="mt-4">
          <SensitivityBanner ticketNumber={ticket.number} />
        </div>
      ) : (
        <>
          {ticket.description && (
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {ticket.description}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
              {ticket.comments.length > 3 && (
                <button type="button" onClick={() => setShowFullHistory((v) => !v)} className="text-xs text-slate-500 hover:underline">
                  {showFullHistory ? 'Show recent only' : `Show all ${ticket.comments.length}`}
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {commentsToShow.map((comment) => (
                <li key={comment.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-600">{comment.author}</span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{comment.body}</p>
                </li>
              ))}
              {ticket.comments.length === 0 && <li className="text-sm text-slate-400">No activity yet.</li>}
            </ul>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => askInChat(`Add a work note to ${ticket.number}.`)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Add note
        </button>
        <button type="button" onClick={() => askInChat(`Draft a reply email to the requester for ${ticket.number}.`)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Draft reply
        </button>
        <button type="button" onClick={() => askInChat(`Summarize any recent emails related to ${ticket.number} into this ticket's context.`)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Summarize related emails
        </button>
      </div>
    </div>
  )
}
