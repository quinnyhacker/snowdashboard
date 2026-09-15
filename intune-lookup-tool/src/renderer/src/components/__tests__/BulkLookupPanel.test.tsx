import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '@renderer/state/store'
import { BulkLookupPanel } from '../BulkLookupPanel'

function mockApi(runBulk: ReturnType<typeof vi.fn>, saveBulkCsv: ReturnType<typeof vi.fn> = vi.fn()): void {
  Object.assign(window, {
    api: {
      app: { getInitialState: vi.fn(), setAlwaysOnTop: vi.fn() },
      device: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      legalHold: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      district: { browse: vi.fn(), confirmColumns: vi.fn(), changeColumns: vi.fn(), refresh: vi.fn() },
      search: { run: vi.fn(), runBulk, saveBulkCsv },
      sync: { onSectionUpdated: vi.fn() }
    }
  })
}

function lookUpAllButton(): HTMLElement {
  return screen.getByRole('button', { name: /Look up all/ })
}

function lastScanned(): ReturnType<typeof within> {
  return within(screen.getByTestId('last-scanned'))
}

beforeEach(() => {
  useAppStore.setState({
    searchMode: 'device',
    bulkInput: '',
    bulkRows: undefined,
    isBulkSearching: false,
    device: { status: 'loaded', fileName: 'export.csv', count: 3 },
    viewMode: 'bulk',
    toast: undefined
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
    fireEvent.click(lookUpAllButton())

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
    fireEvent.click(lookUpAllButton())

    const table = within(await screen.findByRole('table'))
    expect(table.getByText('Quinn.Jones1@kiewit.com')).toBeInTheDocument()
    expect(table.getByText('District 7')).toBeInTheDocument()
    expect(table.getByText('(blank)')).toBeInTheDocument()
  })

  it('switches to single lookup and prefills the term when investigating a not-found entry', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'LAPTOP-999', found: false, enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-999' } })
    fireEvent.click(lookUpAllButton())

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

    fireEvent.click(lookUpAllButton())
    await waitFor(() =>
      expect(runBulk).toHaveBeenCalledWith({ mode: 'device', terms: ['A-282QFH4', 'LAPTOP-002', 'A-PF5A2W5D'] })
    )
  })

  it('disables Look up all until a device export is loaded', () => {
    useAppStore.setState({ device: { status: 'empty' } })
    mockApi(vi.fn())
    render(<BulkLookupPanel />)
    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    expect(lookUpAllButton()).toBeDisabled()
  })

  it('looks up a scanned line immediately on Enter and clears it from the box', async () => {
    const runBulk = vi.fn().mockResolvedValue([
      { term: 'A-001', found: true, device: 'A-001', user: 'jane.doe@kiewit.com', enrichment: { legalHold: false, district: { found: true, work: 'District 4' } } }
    ])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    const textarea = screen.getByPlaceholderText(/LAPTOP-00123/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'A-001' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => expect(runBulk).toHaveBeenCalledWith({ mode: 'device', terms: ['A-001'] }))
    expect(textarea.value).toBe('')
    const table = within(await screen.findByRole('table'))
    expect(table.getByText('A-001')).toBeInTheDocument()
  })

  it('keeps earlier, still-untyped lines in the box when a completed scan line is looked up', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'A-001', found: true, device: 'A-001', enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    const textarea = screen.getByPlaceholderText(/LAPTOP-00123/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'still typing this one\nA-001' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => expect(runBulk).toHaveBeenCalledWith({ mode: 'device', terms: ['A-001'] }))
    expect(textarea.value).toBe('still typing this one\n')
  })

  it('shows a "Last scanned" callout that flags legal hold for the most recent scan', async () => {
    const runBulk = vi.fn().mockResolvedValue([
      { term: 'A-001', found: true, device: 'A-001', user: 'jane.doe@kiewit.com', enrichment: { legalHold: true, district: { found: true, work: 'District 4' } } }
    ])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    const textarea = screen.getByPlaceholderText(/LAPTOP-00123/)
    fireEvent.change(textarea, { target: { value: 'A-001' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await screen.findByTestId('last-scanned')
    const callout = lastScanned()
    expect(callout.getByText('Last scanned')).toBeInTheDocument()
    expect(callout.getByText(/LEGAL HOLD/)).toBeInTheDocument()
  })

  it('shows a "not found" Last scanned callout when a scanned term has no match', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'A-999', found: false, enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    const textarea = screen.getByPlaceholderText(/LAPTOP-00123/)
    fireEvent.change(textarea, { target: { value: 'A-999' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await screen.findByTestId('last-scanned')
    expect(lastScanned().getByText('A-999 — not found')).toBeInTheDocument()
  })

  it('accumulates results across a live scan and a batch lookup instead of replacing them', async () => {
    const runBulk = vi
      .fn()
      .mockResolvedValueOnce([{ term: 'A-001', found: true, device: 'A-001', enrichment: {} }])
      .mockResolvedValueOnce([{ term: 'A-002', found: true, device: 'A-002', enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    const textarea = screen.getByPlaceholderText(/LAPTOP-00123/)
    fireEvent.change(textarea, { target: { value: 'A-001' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('A-001')).toBeInTheDocument())

    fireEvent.change(textarea, { target: { value: 'A-002' } })
    fireEvent.click(lookUpAllButton())

    const table = within(screen.getByRole('table'))
    await waitFor(() => expect(table.getByText('A-002')).toBeInTheDocument())
    expect(table.getByText('A-001')).toBeInTheDocument()
  })

  it('clears accumulated results when "Clear results" is clicked', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', enrichment: {} }])
    mockApi(runBulk)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    fireEvent.click(lookUpAllButton())
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Clear results' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('last-scanned')).not.toBeInTheDocument()
  })

  it('saves the bulk results to a CSV file and reports the saved path', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', enrichment: {} }])
    const saveBulkCsv = vi.fn().mockResolvedValue({ saved: true, path: 'C:\\recoveries\\hardware-recovery-2026-09-15.csv' })
    mockApi(runBulk, saveBulkCsv)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    fireEvent.click(lookUpAllButton())
    const rows = await screen.findByRole('table')
    expect(rows).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Save CSV/ }))

    await waitFor(() =>
      expect(saveBulkCsv).toHaveBeenCalledWith({
        mode: 'device',
        rows: [{ term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', enrichment: {} }]
      })
    )
    await waitFor(() =>
      expect(useAppStore.getState().toast?.message).toBe('Saved to C:\\recoveries\\hardware-recovery-2026-09-15.csv')
    )
  })

  it('does not toast when the save dialog is canceled', async () => {
    const runBulk = vi.fn().mockResolvedValue([{ term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', enrichment: {} }])
    const saveBulkCsv = vi.fn().mockResolvedValue({ saved: false })
    mockApi(runBulk, saveBulkCsv)
    render(<BulkLookupPanel />)

    fireEvent.change(screen.getByPlaceholderText(/LAPTOP-00123/), { target: { value: 'LAPTOP-001' } })
    fireEvent.click(lookUpAllButton())
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: /Save CSV/ }))
    await waitFor(() => expect(saveBulkCsv).toHaveBeenCalled())
    expect(useAppStore.getState().toast).toBeUndefined()
  })
})
