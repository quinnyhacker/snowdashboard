import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Ticket } from '@shared/domain/ticket'
import { DEFAULT_PREFERENCES } from '@shared/types/preferences'
import { useAppStore } from '@renderer/state/store'
import { Dashboard } from '../Dashboard'

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    sysId: overrides.number ?? 'sys',
    number: 'INC0000001',
    shortDescription: 'Test ticket',
    table: 'incident',
    state: 'New',
    priority: '3 - Moderate',
    assignmentGroup: 'Service Desk',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
    isSensitivityFlagged: false,
    ...overrides
  }
}

const tickets = [
  makeTicket({ number: 'A', state: 'New', assignmentGroup: 'Network Ops' }),
  makeTicket({ number: 'B', state: 'In Progress', assignmentGroup: 'Service Desk' })
]

describe('Dashboard', () => {
  beforeEach(() => {
    useAppStore.setState({
      tickets,
      preferences: DEFAULT_PREFERENCES,
      isLoadingTickets: false,
      lastRefreshedAt: undefined
    })
    ;(globalThis as { window: Window & typeof globalThis }).window.api = {
      dashboard: {
        getAllWork: vi.fn().mockResolvedValue(tickets),
        getTicketDetail: vi.fn(),
        findTask: vi.fn()
      },
      chat: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        respondConfirmation: vi.fn(),
        startNewConversation: vi.fn(),
        onTextDelta: vi.fn(),
        onMessageComplete: vi.fn(),
        onConfirmationRequest: vi.fn(),
        onActivity: vi.fn(),
        onError: vi.fn()
      },
      settings: {
        getStatus: vi.fn(),
        setApiKey: vi.fn(),
        clearApiKey: vi.fn(),
        saveMcpConfig: vi.fn(),
        getMcpConfigRaw: vi.fn()
      },
      prefs: {
        get: vi.fn(),
        update: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES)
      },
      email: { searchForTicket: vi.fn() }
    } as unknown as Window['api']
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all visible tickets by default', () => {
    render(<Dashboard />)
    const titles = screen.getAllByRole('button', { name: /Test ticket/ })
    expect(titles).toHaveLength(2)
    expect(titles.map((el) => el.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('A'), expect.stringContaining('B')])
    )
  })

  it('narrows the list when a state filter is toggled and persists the preference', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(screen.getAllByText(/Test ticket/)).toHaveLength(1)
    expect(window.api.prefs.update).toHaveBeenCalledWith({
      filters: { ...DEFAULT_PREFERENCES.filters, states: ['New'] }
    })
  })

  it('sends a chat message with ticket context when a quick action is clicked', () => {
    render(<Dashboard />)
    fireEvent.click(screen.getAllByText('Add note')[0])
    expect(window.api.chat.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketNumber: 'A' })
    )
  })
})
