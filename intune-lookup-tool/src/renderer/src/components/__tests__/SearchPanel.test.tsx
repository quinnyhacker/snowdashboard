import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '@renderer/state/store'
import { SearchPanel } from '../SearchPanel'

function mockApi(run: ReturnType<typeof vi.fn>): void {
  Object.assign(window, {
    api: {
      app: { getInitialState: vi.fn(), setAlwaysOnTop: vi.fn() },
      device: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      legalHold: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      district: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      search: { run, runBulk: vi.fn() },
      sync: { onSectionUpdated: vi.fn() }
    }
  })
}

beforeEach(() => {
  useAppStore.setState({
    searchMode: 'device',
    searchTerm: '',
    searchResult: undefined,
    isSearching: false,
    device: { status: 'loaded', fileName: 'export.csv', count: 3 }
  })
})

describe('SearchPanel scan recognition', () => {
  it('shows a recognized-from-scan hint when a Dell QR URL is pasted in', () => {
    mockApi(vi.fn())
    render(<SearchPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), {
      target: { value: 'https://www.dell.com/support/pid?s=q3&t=282QFH4' }
    })
    expect(screen.getByText('Recognized from scan: A-282QFH4')).toBeInTheDocument()
  })

  it('searches using the extracted device name, not the raw scanned URL', async () => {
    const run = vi.fn().mockResolvedValue({ kind: 'none', mode: 'device', term: 'A-282QFH4' })
    mockApi(run)
    render(<SearchPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), {
      target: { value: 'https://www.dell.com/support/pid?s=q3&t=282QFH4' }
    })
    fireEvent.click(screen.getByText('Search'))
    await waitFor(() => expect(run).toHaveBeenCalledWith({ mode: 'device', term: 'A-282QFH4' }))
  })

  it('shows no hint and searches the plain term unchanged for ordinary typed input', async () => {
    const run = vi.fn().mockResolvedValue({ kind: 'none', mode: 'device', term: 'LAPTOP-001' })
    mockApi(run)
    render(<SearchPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    expect(screen.queryByText(/Recognized from scan/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Search'))
    await waitFor(() => expect(run).toHaveBeenCalledWith({ mode: 'device', term: 'LAPTOP-001' }))
  })
})
