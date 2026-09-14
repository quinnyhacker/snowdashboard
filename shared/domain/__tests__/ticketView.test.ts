import { describe, expect, it } from 'vitest'
import type { Ticket } from '../ticket'
import { filterTickets, sortTickets, uniqueAssignmentGroups, uniqueStates } from '../ticketView'

const NOW = new Date('2026-09-14T12:00:00Z')

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    sysId: overrides.sysId ?? Math.random().toString(36),
    number: overrides.number ?? 'INC0000001',
    shortDescription: 'Test ticket',
    table: 'incident',
    state: 'New',
    priority: '3 - Moderate',
    assignmentGroup: 'Service Desk',
    createdAt: '2026-09-14T00:00:00Z',
    updatedAt: '2026-09-14T00:00:00Z',
    comments: [],
    isSensitivityFlagged: false,
    ...overrides
  }
}

describe('filterTickets', () => {
  const tickets = [
    makeTicket({ number: 'A', state: 'New', assignmentGroup: 'Network Ops' }),
    makeTicket({ number: 'B', state: 'In Progress', assignmentGroup: 'Service Desk' }),
    makeTicket({
      number: 'C',
      state: 'In Progress',
      assignmentGroup: 'Service Desk',
      dueDate: '2026-09-14T18:00:00Z'
    })
  ]

  it('filters by state', () => {
    const result = filterTickets(tickets, { states: ['New'], assignmentGroups: [], minUrgency: 'ok' }, NOW)
    expect(result.map((t) => t.number)).toEqual(['A'])
  })

  it('filters by assignment group', () => {
    const result = filterTickets(
      tickets,
      { states: [], assignmentGroups: ['Network Ops'], minUrgency: 'ok' },
      NOW
    )
    expect(result.map((t) => t.number)).toEqual(['A'])
  })

  it('filters by minimum urgency', () => {
    const result = filterTickets(tickets, { states: [], assignmentGroups: [], minUrgency: 'approaching' }, NOW)
    expect(result.map((t) => t.number)).toEqual(['C'])
  })
})

describe('sortTickets', () => {
  it('sorts by due date ascending, undated tickets last', () => {
    const tickets = [
      makeTicket({ number: 'no-due' }),
      makeTicket({ number: 'due-soon', dueDate: '2026-09-15T00:00:00Z' }),
      makeTicket({ number: 'due-later', dueDate: '2026-09-20T00:00:00Z' })
    ]
    const result = sortTickets(tickets, 'dueDate', 'asc', NOW)
    expect(result.map((t) => t.number)).toEqual(['due-soon', 'due-later', 'no-due'])
  })

  it('reverses order for desc direction', () => {
    const tickets = [makeTicket({ number: 'A', priority: 'A' }), makeTicket({ number: 'B', priority: 'B' })]
    const asc = sortTickets(tickets, 'priority', 'asc', NOW).map((t) => t.number)
    const desc = sortTickets(tickets, 'priority', 'desc', NOW).map((t) => t.number)
    expect(desc).toEqual([...asc].reverse())
  })
})

describe('unique helpers', () => {
  it('dedupes and sorts assignment groups and states', () => {
    const tickets = [
      makeTicket({ assignmentGroup: 'B Team', state: 'New' }),
      makeTicket({ assignmentGroup: 'A Team', state: 'New' }),
      makeTicket({ assignmentGroup: 'A Team', state: 'Closed' })
    ]
    expect(uniqueAssignmentGroups(tickets)).toEqual(['A Team', 'B Team'])
    expect(uniqueStates(tickets)).toEqual(['Closed', 'New'])
  })
})
