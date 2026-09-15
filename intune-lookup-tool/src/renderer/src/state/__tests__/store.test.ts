import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store'

describe('column picker queueing', () => {
  beforeEach(() => {
    useAppStore.setState({ columnPicker: undefined, columnPickerQueue: [] })
  })

  it('shows the first picker immediately', () => {
    useAppStore.getState().openColumnPicker({ kind: 'device', headers: ['A'], guesses: {} })
    expect(useAppStore.getState().columnPicker?.kind).toBe('device')
    expect(useAppStore.getState().columnPickerQueue).toHaveLength(0)
  })

  it('queues a second picker instead of replacing the first', () => {
    const { openColumnPicker } = useAppStore.getState()
    openColumnPicker({ kind: 'device', headers: ['A'], guesses: {} })
    openColumnPicker({ kind: 'legalHold', headers: ['B'], guesses: {} })

    expect(useAppStore.getState().columnPicker?.kind).toBe('device')
    expect(useAppStore.getState().columnPickerQueue.map((p) => p.kind)).toEqual(['legalHold'])
  })

  it('advances to the next queued picker on close, in order', () => {
    const { openColumnPicker, closeColumnPicker } = useAppStore.getState()
    openColumnPicker({ kind: 'device', headers: ['A'], guesses: {} })
    openColumnPicker({ kind: 'legalHold', headers: ['B'], guesses: {} })
    openColumnPicker({ kind: 'district', headers: ['C'], guesses: {} })

    closeColumnPicker()
    expect(useAppStore.getState().columnPicker?.kind).toBe('legalHold')

    closeColumnPicker()
    expect(useAppStore.getState().columnPicker?.kind).toBe('district')

    closeColumnPicker()
    expect(useAppStore.getState().columnPicker).toBeUndefined()
  })
})

describe('setSection', () => {
  beforeEach(() => {
    useAppStore.setState({
      device: { status: 'empty' },
      sectionOpen: { device: true, legalHold: true, district: true }
    })
  })

  it('collapses a section once it loads successfully', () => {
    useAppStore.getState().setSection('device', { status: 'loaded', fileName: 'export.csv', count: 42 })
    expect(useAppStore.getState().device).toEqual({ status: 'loaded', fileName: 'export.csv', count: 42 })
    expect(useAppStore.getState().sectionOpen.device).toBe(false)
  })

  it('keeps a section expanded when it errors out', () => {
    useAppStore.getState().setSection('device', { status: 'error', message: 'nope' })
    expect(useAppStore.getState().sectionOpen.device).toBe(true)
  })
})

describe('appendBulkRows', () => {
  beforeEach(() => {
    useAppStore.setState({ bulkRows: undefined })
  })

  it('starts a fresh list when nothing has been added yet', () => {
    useAppStore.getState().appendBulkRows([{ term: 'A-001', found: true, device: 'A-001', enrichment: {} }])
    expect(useAppStore.getState().bulkRows).toEqual([{ term: 'A-001', found: true, device: 'A-001', enrichment: {} }])
  })

  it('appends to existing results instead of replacing them, so live scans and a batch run can mix', () => {
    useAppStore.getState().appendBulkRows([{ term: 'A-001', found: true, device: 'A-001', enrichment: {} }])
    useAppStore.getState().appendBulkRows([{ term: 'A-002', found: true, device: 'A-002', enrichment: {} }])
    expect(useAppStore.getState().bulkRows?.map((r) => r.term)).toEqual(['A-001', 'A-002'])
  })
})
