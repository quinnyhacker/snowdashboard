import type { PendingConfirmation } from '@shared/types/chat'

interface ConfirmationModalProps {
  confirmation: PendingConfirmation
  onRespond: (id: string, approve: boolean) => void
}

const KIND_LABEL: Record<PendingConfirmation['kind'], string> = {
  ticket_update: 'High-impact ticket update',
  email_send: 'Send email',
  other: 'Confirm action'
}

export function ConfirmationModal({ confirmation, onRespond }: ConfirmationModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{KIND_LABEL[confirmation.kind]}</p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          {confirmation.ticketNumber ? `${confirmation.ticketNumber}` : 'Confirm this action'}
        </h2>
        <p className="mt-2 text-sm text-slate-700">{confirmation.summary}</p>

        {confirmation.changes.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            {confirmation.changes.map((change) => (
              <li key={change.field}>
                <span className="font-medium text-slate-800">{change.field}</span> → {change.toValue ?? '(cleared)'}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onRespond(confirmation.id, false)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => onRespond(confirmation.id, true)}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
