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
