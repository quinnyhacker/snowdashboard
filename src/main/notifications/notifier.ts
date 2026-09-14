import { Notification } from 'electron'
import type { Ticket } from '@shared/domain/ticket'
import { assessSla } from '@shared/domain/slaPolicy'

/** Fires a desktop notification for a newly-seen ticket assignment. */
export function notifyNewAssignment(ticket: Ticket): void {
  if (!Notification.isSupported()) return
  new Notification({
    title: `New assignment: ${ticket.number}`,
    body: ticket.shortDescription,
    silent: false
  }).show()
}

/** Fires a desktop notification when a ticket's SLA is close to breaching. */
export function notifySlaApproaching(ticket: Ticket): void {
  if (!Notification.isSupported()) return
  new Notification({
    title: `SLA due soon: ${ticket.number}`,
    body: ticket.shortDescription,
    urgency: 'critical'
  }).show()
}

/** Diffs a previous and current ticket snapshot to decide which
 * notifications to fire, without ever persisting the ticket content itself
 * (only sys_ids are kept in memory across refreshes). */
export function detectNotifiableChanges(
  previous: Map<string, Ticket>,
  current: Ticket[]
): { newAssignments: Ticket[]; slaApproaching: Ticket[] } {
  const newAssignments: Ticket[] = []
  const slaApproaching: Ticket[] = []

  for (const ticket of current) {
    if (!previous.has(ticket.sysId)) {
      newAssignments.push(ticket)
      continue
    }
    const wasApproaching = previous.get(ticket.sysId)
    const assessment = assessSla(ticket)
    const wasAssessment = wasApproaching ? assessSla(wasApproaching) : undefined
    if (assessment.urgency === 'approaching' && wasAssessment?.urgency === 'ok') {
      slaApproaching.push(ticket)
    }
  }

  return { newAssignments, slaApproaching }
}
