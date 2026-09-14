import { describe, expect, it } from 'vitest'
import { findBestColumn } from '../columnGuess'

describe('findBestColumn', () => {
  it('prefers an exact case-insensitive match', () => {
    const headers = ['Device Name', 'Primary User UPN', 'Serial Number']
    expect(findBestColumn(headers, ['device name', 'hostname'])).toBe('Device Name')
  })

  it('honors pattern priority order for exact matches', () => {
    const headers = ['Computer name', 'Device name']
    expect(findBestColumn(headers, ['Device name', 'Computer name'])).toBe('Device name')
  })

  it('falls back to a substring match when no exact match exists', () => {
    const headers = ['Asset Device Name (Managed)']
    expect(findBestColumn(headers, ['Device name'])).toBe('Asset Device Name (Managed)')
  })

  it('returns undefined when nothing matches at all', () => {
    const headers = ['Serial Number', 'Model']
    expect(findBestColumn(headers, ['Device name', 'Hostname'])).toBeUndefined()
  })
})
