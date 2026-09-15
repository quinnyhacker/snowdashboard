import { describe, expect, it } from 'vitest'
import type { BulkSearchRow } from '../bulkSearch'
import { buildBulkResultsCsv } from '../bulkCsv'

describe('buildBulkResultsCsv', () => {
  it('builds a header and one row per found device, with district and legal hold', () => {
    const rows: BulkSearchRow[] = [
      {
        term: 'A-001',
        found: true,
        device: 'A-001',
        user: 'jane.doe@kiewit.com',
        enrichment: { legalHold: true, district: { found: true, work: 'KPE', home: 'TIC' } }
      }
    ]
    const csv = buildBulkResultsCsv(rows, 'device')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Input,Device,User,Work District,Home District,Legal Hold,Status')
    expect(lines[1]).toBe('A-001,A-001,jane.doe@kiewit.com,KPE,TIC,Yes,Found')
  })

  it('represents not-found rows with a blank record and a Not found status', () => {
    const rows: BulkSearchRow[] = [{ term: 'A-999', found: false, enrichment: {} }]
    const csv = buildBulkResultsCsv(rows, 'device')
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('A-999,,,,,,Not found')
  })

  it('uses user-mode headers and joins multiple devices', () => {
    const rows: BulkSearchRow[] = [
      { term: 'jane', found: true, user: 'jane@kiewit.com', devices: ['A-001', 'A-002'], enrichment: {} }
    ]
    const csv = buildBulkResultsCsv(rows, 'user')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Input,User,Device(s),Work District,Home District,Legal Hold,Status')
    expect(lines[1]).toBe('jane,jane@kiewit.com,A-001; A-002,,,No,Found')
  })

  it('quotes fields that contain a comma', () => {
    const rows: BulkSearchRow[] = [
      { term: 'A-001', found: true, device: 'A-001', user: 'Doe, Jane', enrichment: {} }
    ]
    const csv = buildBulkResultsCsv(rows, 'device')
    expect(csv.split('\r\n')[1]).toBe('A-001,A-001,"Doe, Jane",,,No,Found')
  })

  it.each(['=SUM(A1:A10)', '+1+1', '-1+1', '@SUM(A1)'])(
    'neutralizes a leading formula trigger (%s) so Excel treats it as text, not a formula',
    (value) => {
      const rows: BulkSearchRow[] = [{ term: value, found: false, enrichment: {} }]
      const csv = buildBulkResultsCsv(rows, 'device')
      expect(csv.split('\r\n')[1]).toBe(`'${value},,,,,,Not found`)
    }
  )
})
