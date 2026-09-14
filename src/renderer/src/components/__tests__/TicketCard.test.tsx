import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Ticket } from '@shared/domain/ticket'
import { TicketCard } from '../TicketCard'

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    sysId: 'sys-1',
    number: 'INC0012345',
    shortDescription: 'VPN drops every few minutes',
    table: 'incident',
    state: 'In Progress',
    priority: '2 - High',
    assignmentGroup: 'Network Ops',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [
      { id: 'c1', author: 'Jane Doe', body: 'Checked the tunnel logs.', createdAt: new Date().toISOString(), isWorkNote: true }
    ],
    isSensitivityFlagged: false,
    ...overrides
  }
}

describe('TicketCard', () => {
  it('renders ticket number, description, and recent comments', () => {
    render(<TicketCard ticket={makeTicket()} onOpen={vi.fn()} onQuickAction={vi.fn()} />)
    expect(screen.getByText(/INC0012345/)).toBeInTheDocument()
    expect(screen.getByText(/VPN drops every few minutes/)).toBeInTheDocument()
    expect(screen.getByText(/Checked the tunnel logs\./)).toBeInTheDocument()
  })

  it('shows a sensitivity banner instead of comments when flagged', () => {
    render(
      <TicketCard
        ticket={makeTicket({ isSensitivityFlagged: true })}
        onOpen={vi.fn()}
        onQuickAction={vi.fn()}
      />
    )
    expect(screen.getByText(/Content withheld/)).toBeInTheDocument()
    expect(screen.queryByText(/Checked the tunnel logs\./)).not.toBeInTheDocument()
  })

  it('calls onOpen with the ticket number when the title is clicked', () => {
    const onOpen = vi.fn()
    render(<TicketCard ticket={makeTicket()} onOpen={onOpen} onQuickAction={vi.fn()} />)
    fireEvent.click(screen.getByText(/INC0012345/))
    expect(onOpen).toHaveBeenCalledWith('INC0012345')
  })

  it('calls onQuickAction with the right action for each button', () => {
    const onQuickAction = vi.fn()
    const ticket = makeTicket()
    render(<TicketCard ticket={ticket} onOpen={vi.fn()} onQuickAction={onQuickAction} />)

    fireEvent.click(screen.getByText('Add note'))
    expect(onQuickAction).toHaveBeenCalledWith(ticket, 'note')

    fireEvent.click(screen.getByText('Draft reply'))
    expect(onQuickAction).toHaveBeenCalledWith(ticket, 'reply')

    fireEvent.click(screen.getByText('Mark in progress'))
    expect(onQuickAction).toHaveBeenCalledWith(ticket, 'in-progress')
  })
})
