import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '@renderer/state/store'
import { BulkLookupPanel } from '../BulkLookupPanel'

function mockApi(runBulk: ReturnType<typeof vi.fn>): void {
  Object.assign(window, {
    api: {
      app: { getInitialState: vi.fn(), setAlwaysOnTop: vi.fn() },
      device: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      legalHold: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      district: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      search: { run: vi.fn(), runBulk },
      sync: { onSectionUpdated: vi.fn() }
    }
  })
}

beforeEach(() => {
  useAppStore.setState({
    searchMode: 'device',
    bulkInput: '',
    bulkRows: undefined,
    isBulkSearching: false,
    device: { status: 'loaded', fileName: 'export.csv', count: 3 },
    viewMode: 'bulk'
  })
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('BulkLookupPanel', () => {
  it('counts parsed entries as the technician types', () => {
    mockApi(vi.fn())
    render(<BulkLookupPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001\nLAPTOP-002\n\nLAPTOP-003' } })
    expect(screen.getByText('3 entries')).toBeInTheDocument()
  })

  it('runs the bulk search and lists each result as its own row with district and legal hold', async () => {
    const runBulk = vi.fn().mockResolvedValue([
      { term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', user: 'jane.doe@kiewit.com', enrichment: { legalHold: false, district: { found: true, work: 'District 4' } } },
      { term: 'LAPTOP-002', found: true, device: 'LAPTOP-002', user: 'john.smith@kiewit.com', enrichment: { legalHold: true, district: { found: true, work: 'District 4' } } },
      { term: 'LAPTOP-999', found: false, enrichment: {} }
    ])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001\nLAPTOP-002\nLAPTOP-999' } })
    fireEvent.click(screen.getByText('Look up all'))

    expect(runBulk).toHaveBeenCalledWith({ mode: 'device', terms: ['LAPTOP-001', 'LAPTOP-002', 'LAPTOP-999'] })

    await screen.findByText('LAPTOP-001')
    expect(screen.getByText('LAPTOP-002')).toBeInTheDocument()
    expect(screen.getAllByText('District 4')).toHaveLength(2)
    expect(screen.getAllByText('Legal hold').length).toBeGreaterThan(0)
    expect(screen.getByText('1 not found')).toBeInTheDocument()
  })

  it('shows both work and home district, even when one is blank', async () => {
    const runBulk = vi.fn().mockResolvedValue([
      {
        term: 'quinn.jones1',
        found: true,
        user: 'Quinn.Jones1@kiewit.com',
        devices: ['A-282QFH4'],
        enrichment: { legalHold: false, district: { found: true, work: '', home: 'District 7' } }
      }
    ])
    mockApi(runBulk)
    useAppStore.setState({ searchMode: 'user' })
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/jsmith/), { target: { value: 'quinn.jones1' } })
    fireEvent.click(screen.getByText('Look up all'))

    await screen.findByText('Quinn.Jones1@kiewit.com')
    expect(screen.getByText('District 7')).toBeInTheDocument()
    expect(screen.getByText('(blank)')).toBeInTheDocument()
  })

  it('switches to single lookup and prefills the term when investigating a not-found entry', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'LAPTOP-999', found: false, enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-999' } })
    fireEvent.click(screen.getByText('Look up all'))

    const investigateButton = await screen.findByRole('button', { name: 'LAPTOP-999' })
    fireEvent.click(investigateButton)

    expect(useAppStore.getState().viewMode).toBe('single')
    expect(useAppStore.getState().searchTerm).toBe('LAPTOP-999')
  })

  it('converts scanned QR URLs into device names before looking them up', async () => {
    const runBulk = vi.fn().mockResolvedValue([])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), {
      target: {
        value: 'https://www.dell.com/support/pid?s=q3&t=282QFH4\nLAPTOP-002\nhttps://uatesupport.lenovo.com/qrcode/PF5A2W5D/21G3S04W00'
      }
    })
    expect(screen.getByText(/3 entries/)).toBeInTheDocument()
    expect(screen.getByText(/2 from scans/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Look up all'))
    await waitFor(() =>
      expect(runBulk).toHaveBeenCalledWith({ mode: 'device', terms: ['A-282QFH4', 'LAPTOP-002', 'A-PF5A2W5D'] })
    )
  })

  it('disables Look up all until a device export is loaded', () => {
    useAppStore.setState({ device: { status: 'empty' } })
    mockApi(vi.fn())
    render(<BulkLookupPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    expect(screen.getByText('Look up all')).toBeDisabled()
  })
})
