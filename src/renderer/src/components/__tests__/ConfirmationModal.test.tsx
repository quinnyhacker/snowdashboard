import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { PendingConfirmation } from '@shared/types/chat'
import { ConfirmationModal } from '../ConfirmationModal'

function makeConfirmation(overrides: Partial<PendingConfirmation> = {}): PendingConfirmation {
  return {
    id: 'confirm-1',
    kind: 'ticket_update',
    toolName: 'mcp__servicenow__write_task',
    summary: 'Update INC0012345: priority → 1 - Critical',
    ticketNumber: 'INC0012345',
    changes: [{ field: 'priority', toValue: '1 - Critical' }],
    rawInput: { number: 'INC0012345', priority: '1 - Critical' },
    requestedAt: new Date().toISOString(),
    ...overrides
  }
}

describe('ConfirmationModal', () => {
  it('renders the ticket number, summary, and field changes', () => {
    render(<ConfirmationModal confirmation={makeConfirmation()} onRespond={vi.fn()} />)
    expect(screen.getByText('INC0012345')).toBeInTheDocument()
    expect(screen.getByText(/priority.*Critical/)).toBeInTheDocument()
    expect(screen.getByText('priority')).toBeInTheDocument()
  })

  it('calls onRespond with approve=true when Approve is clicked', () => {
    const onRespond = vi.fn()
    render(<ConfirmationModal confirmation={makeConfirmation()} onRespond={onRespond} />)
    fireEvent.click(screen.getByText('Approve'))
    expect(onRespond).toHaveBeenCalledWith('confirm-1', true)
  })

  it('calls onRespond with approve=false when Decline is clicked', () => {
    const onRespond = vi.fn()
    render(<ConfirmationModal confirmation={makeConfirmation()} onRespond={onRespond} />)
    fireEvent.click(screen.getByText('Decline'))
    expect(onRespond).toHaveBeenCalledWith('confirm-1', false)
  })

  it('labels an email-send confirmation distinctly from a ticket update', () => {
    render(
      <ConfirmationModal
        confirmation={makeConfirmation({ kind: 'email_send', summary: 'Send an email to jane@example.com' })}
        onRespond={vi.fn()}
      />
    )
    expect(screen.getByText('Send email')).toBeInTheDocument()
  })
})
