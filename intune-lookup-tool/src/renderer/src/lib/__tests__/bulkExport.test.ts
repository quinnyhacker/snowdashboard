import { describe, expect, it } from 'vitest'
import { buildBulkResultsTsv } from '../bulkExport'

describe('buildBulkResultsTsv', () => {
  it('formats device-mode rows with device/user/district columns', () => {
    const tsv = buildBulkResultsTsv(
      [
        {
          term: 'LAPTOP-001',
          found: true,
          device: 'LAPTOP-001',
          user: 'jane.doe@kiewit.com',
          enrichment: { legalHold: false, district: { found: true, work: 'District 4', home: 'District 2' } }
        }
      ],
      'device'
    )
    expect(tsv).toBe(
      'Input\tDevice\tUser\tWork District\tHome District\tLegal Hold\n' +
        'LAPTOP-001\tLAPTOP-001\tjane.doe@kiewit.com\tDistrict 4\tDistrict 2\t'
    )
  })

  it('marks a legal hold row with YES', () => {
    const tsv = buildBulkResultsTsv(
      [
        {
          term: 'LAPTOP-002',
          found: true,
          device: 'LAPTOP-002',
          user: 'john.smith@kiewit.com',
          enrichment: { legalHold: true, district: undefined }
        }
      ],
      'device'
    )
    expect(tsv.split('\n')[1]).toBe('LAPTOP-002\tLAPTOP-002\tjohn.smith@kiewit.com\t\t\tYES')
  })

  it('marks a not-found row distinctly, with blank district/legal hold columns', () => {
    const tsv = buildBulkResultsTsv([{ term: 'LAPTOP-999', found: false, enrichment: {} }], 'device')
    expect(tsv.split('\n')[1]).toBe('LAPTOP-999\tNOT FOUND\t\t\t\t')
  })

  it('joins multiple devices with a semicolon in user mode', () => {
    const tsv = buildBulkResultsTsv(
      [
        {
          term: 'jane.doe',
          found: true,
          user: 'jane.doe@kiewit.com',
          devices: ['LAPTOP-001', 'LAPTOP-002'],
          enrichment: { legalHold: false, district: undefined }
        }
      ],
      'user'
    )
    expect(tsv.split('\n')[0]).toBe('Input\tUser\tDevice(s)\tWork District\tHome District\tLegal Hold')
    expect(tsv.split('\n')[1]).toBe('jane.doe\tjane.doe@kiewit.com\tLAPTOP-001; LAPTOP-002\t\t\t')
  })
})
