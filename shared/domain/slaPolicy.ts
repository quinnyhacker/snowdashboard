import type { SlaUrgency, Ticket } from './ticket'

/** Tickets due within this many hours are "approaching" (amber). Past due
 * date is "breached" (red). Everything else is "ok" (green/neutral). */
export const SLA_APPROACHING_WINDOW_HOURS = 24

export interface SlaAssessment {
  urgency: SlaUrgency
  /** Hours until due (negative if already past due). Undefined when the
   * ticket has no due date / SLA date to evaluate. */
  hoursRemaining?: number
  ageHours: number
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** Pure function: given a ticket and "now", compute SLA urgency and age.
 * Kept pure/deterministic (now injected) so it is trivially unit-testable. */
export function assessSla(ticket: Pick<Ticket, 'dueDate' | 'slaDueDate' | 'createdAt' | 'state'>, now: Date = new Date()): SlaAssessment {
  const created = parseDate(ticket.createdAt) ?? now
  const ageHours = (now.getTime() - created.getTime()) / 3_600_000

  const dueRaw = ticket.slaDueDate ?? ticket.dueDate
  const due = parseDate(dueRaw)

  const closedStates = new Set(['Resolved', 'Closed', 'Cancelled'])
  if (closedStates.has(ticket.state)) {
    return { urgency: 'ok', ageHours, hoursRemaining: undefined }
  }

  if (!due) {
    return { urgency: 'ok', ageHours, hoursRemaining: undefined }
  }

  const hoursRemaining = (due.getTime() - now.getTime()) / 3_600_000

  let urgency: SlaUrgency = 'ok'
  if (hoursRemaining < 0) urgency = 'breached'
  else if (hoursRemaining <= SLA_APPROACHING_WINDOW_HOURS) urgency = 'approaching'

  return { urgency, hoursRemaining, ageHours }
}

/** Tailwind-friendly color tokens for each urgency level, used consistently
 * across ticket cards, detail views, and badges. */
export const SLA_COLOR_TOKENS: Record<SlaUrgency, { bg: string; text: string; border: string; label: string }> = {
  ok: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'On track' },
  approaching: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', label: 'Due soon' },
  breached: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Past due' }
}
