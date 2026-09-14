import type { Ticket } from '@shared/domain/ticket'
import { SlaBadge } from './SlaBadge'
import { SensitivityBanner } from './SensitivityBanner'

interface TicketCardProps {
  ticket: Ticket
  onOpen: (ticketNumber: string) => void
  onQuickAction: (ticket: Ticket, action: 'note' | 'reply' | 'in-progress') => void
}

export function TicketCard({ ticket, onOpen, onQuickAction }: TicketCardProps): JSX.Element {
  const recentComments = ticket.comments.slice(-2)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(ticket.number)}
          className="text-left font-semibold text-slate-900 hover:underline"
        >
          {ticket.number} <span className="font-normal text-slate-600">— {ticket.shortDescription}</span>
        </button>
        <SlaBadge ticket={ticket} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{ticket.assignmentGroup}</span>
        <span>{ticket.state}</span>
        <span>{ticket.priority}</span>
        {ticket.assignedTo && <span>Assigned: {ticket.assignedTo}</span>}
      </div>

      {ticket.isSensitivityFlagged ? (
        <SensitivityBanner ticketNumber={ticket.number} />
      ) : (
        recentComments.length > 0 && (
          <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm text-slate-600">
            {recentComments.map((comment) => (
              <li key={comment.id} className="truncate">
                <span className="font-medium text-slate-700">{comment.author}:</span> {comment.body}
              </li>
            ))}
          </ul>
        )
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onQuickAction(ticket, 'note')}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Add note
        </button>
        <button
          type="button"
          onClick={() => onQuickAction(ticket, 'reply')}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Draft reply
        </button>
        <button
          type="button"
          onClick={() => onQuickAction(ticket, 'in-progress')}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Mark in progress
        </button>
      </div>
    </div>
  )
}
