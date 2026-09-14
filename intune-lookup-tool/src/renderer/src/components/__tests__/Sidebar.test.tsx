import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '@renderer/state/store'
import { Sidebar } from '../Sidebar'

function mockApi(overrides: Partial<Window['api']> = {}): void {
  Object.assign(window, {
    api: {
      app: { getInitialState: vi.fn(), setAlwaysOnTop: vi.fn().mockResolvedValue(undefined) },
      device: {
        browse: vi.fn(),
        confirmColumns: vi.fn(),
        changeColumns: vi.fn(),
        refresh: vi.fn().mockResolvedValue({ status: 'loaded', fileName: 'export.csv', count: 100 })
      },
      legalHold: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      district: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      search: { run: vi.fn() },
      ...overrides
    }
  })
}

describe('Sidebar refresh', () => {
  beforeEach(() => {
    mockApi()
    useAppStore.setState({
      device: { status: 'loaded', fileName: 'export.csv', count: 42 },
      legalHold: { status: 'empty' },
      district: { status: 'empty' },
      sectionOpen: { device: true, legalHold: false, district: false },
      alwaysOnTop: true
    })
  })

  it('shows a Refresh action once a section is loaded', () => {
    render(<Sidebar />)
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('re-reads the file and updates the count on click', async () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => expect(window.api.device.refresh).toHaveBeenCalled())
    // The collapsed-section summary line and the full status text both
    // mention the count once loaded, so there can legitimately be more
    // than one match here.
    await waitFor(() => expect(screen.getAllByText(/100/).length).toBeGreaterThan(0))
  })

  it('surfaces a needs-columns response by opening the column picker state', async () => {
    mockApi({
      device: {
        browse: vi.fn(),
        confirmColumns: vi.fn(),
        changeColumns: vi.fn(),
        refresh: vi.fn().mockResolvedValue({
          status: 'needs-columns',
          headers: ['Device', 'User'],
          guesses: { deviceCol: 'Device', userCol: 'User' }
        })
      }
    })
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => expect(useAppStore.getState().columnPicker?.kind).toBe('device'))
  })
})
