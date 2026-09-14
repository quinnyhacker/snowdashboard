import type { Ticket } from './ticket'
import { assessSla } from './slaPolicy'
import type { DashboardFilters, SortDirection, SortField } from '../types/preferences'

const URGENCY_RANK: Record<string, number> = { breached: 2, approaching: 1, ok: 0 }

export function filterTickets(tickets: Ticket[], filters: DashboardFilters, now: Date = new Date()): Ticket[] {
  return tickets.filter((ticket) => {
    if (filters.states.length > 0 && !filters.states.includes(ticket.state)) return false
    if (filters.assignmentGroups.length > 0 && !filters.assignmentGroups.includes(ticket.assignmentGroup)) {
      return false
    }
    const { urgency } = assessSla(ticket, now)
    if (URGENCY_RANK[urgency] < URGENCY_RANK[filters.minUrgency]) return false
    return true
  })
}

function compareBy(field: SortField, a: Ticket, b: Ticket, now: Date): number {
  switch (field) {
    case 'dueDate': {
      const aRem = assessSla(a, now).hoursRemaining
      const bRem = assessSla(b, now).hoursRemaining
      if (aRem === undefined && bRem === undefined) return 0
      if (aRem === undefined) return 1
      if (bRem === undefined) return -1
      return aRem - bRem
    }
    case 'age':
      return assessSla(a, now).ageHours - assessSla(b, now).ageHours
    case 'priority':
      return a.priority.localeCompare(b.priority)
    case 'assignmentGroup':
      return a.assignmentGroup.localeCompare(b.assignmentGroup)
    case 'state':
      return a.state.localeCompare(b.state)
    default:
      return 0
  }
}

export function sortTickets(tickets: Ticket[], field: SortField, direction: SortDirection, now: Date = new Date()): Ticket[] {
  const sorted = [...tickets].sort((a, b) => compareBy(field, a, b, now))
  return direction === 'desc' ? sorted.reverse() : sorted
}

export function applyView(
  tickets: Ticket[],
  filters: DashboardFilters,
  sortField: SortField,
  sortDirection: SortDirection,
  now: Date = new Date()
): Ticket[] {
  return sortTickets(filterTickets(tickets, filters, now), sortField, sortDirection, now)
}

export function uniqueAssignmentGroups(tickets: Ticket[]): string[] {
  return Array.from(new Set(tickets.map((t) => t.assignmentGroup))).sort()
}

export function uniqueStates(tickets: Ticket[]): string[] {
  return Array.from(new Set(tickets.map((t) => t.state))).sort()
}
