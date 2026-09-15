import { describe, expect, it } from 'vitest'
import { buildDeviceIndex } from '../lookupIndex'
import { buildLegalHoldSet } from '../legalHold'
import { buildDistrictMap } from '../district'
import { parseBulkTerms, runBulkSearch } from '../bulkSearch'

describe('parseBulkTerms', () => {
  it('splits on newlines', () => {
    expect(parseBulkTerms('LAPTOP-001\nLAPTOP-002\nLAPTOP-003')).toEqual(['LAPTOP-001', 'LAPTOP-002', 'LAPTOP-003'])
  })

  it('splits on commas and tabs too, for pasted spreadsheet columns', () => {
    expect(parseBulkTerms('LAPTOP-001, LAPTOP-002\tLAPTOP-003')).toEqual(['LAPTOP-001', 'LAPTOP-002', 'LAPTOP-003'])
  })

  it('trims whitespace and drops blank lines', () => {
    expect(parseBulkTerms('  LAPTOP-001  \n\n\n  LAPTOP-002  \n')).toEqual(['LAPTOP-001', 'LAPTOP-002'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseBulkTerms('   \n\n  ')).toEqual([])
  })
})

const rows = [
  { Device: 'LAPTOP-001', User: 'jane.doe@kiewit.com' },
  { Device: 'LAPTOP-002', User: 'john.smith@kiewit.com' },
  { Device: 'LAPTOP-003', User: 'sam.jones@kiewit.com' }
]
const index = buildDeviceIndex(rows, 'Device', 'User')
const legalHoldSet = buildLegalHoldSet([{ First: 'John', Last: 'Smith' }], 'First', 'Last')
const districtMap = buildDistrictMap(
  [
    { First: 'Jane', Last: 'Doe', Work: 'District 4', Home: 'District 2' },
    { First: 'John', Last: 'Smith', Work: 'District 4', Home: 'District 1' },
    { First: 'Sam', Last: 'Jones', Work: 'District 9', Home: 'District 9' }
  ],
  'First',
  'Last',
  'Work',
  'Home'
)

describe('runBulkSearch', () => {
  it('resolves each line to its own row, in order, tied back to what was typed', () => {
    const result = runBulkSearch({ mode: 'device', terms: ['LAPTOP-001', 'LAPTOP-002'], index, legalHoldSet, districtMap })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ term: 'LAPTOP-001', found: true, device: 'LAPTOP-001', user: 'jane.doe@kiewit.com' })
    expect(result[1]).toMatchObject({ term: 'LAPTOP-002', found: true, device: 'LAPTOP-002', user: 'john.smith@kiewit.com' })
  })

  it('flags legal hold and district in bulk the same as single lookup', () => {
    const [result] = runBulkSearch({ mode: 'device', terms: ['LAPTOP-002'], index, legalHoldSet, districtMap })
    expect(result.enrichment.legalHold).toBe(true)
    expect(result.enrichment.district).toEqual({ found: true, work: 'District 4', home: 'District 1' })
  })

  it('marks an unmatched line as not found rather than guessing at partial matches', () => {
    const [result] = runBulkSearch({ mode: 'device', terms: ['LAPTOP-999'], index })
    expect(result).toEqual({ term: 'LAPTOP-999', found: false, enrichment: {} })
  })

  it('supports bulk lookup by username too, with the default domain applied', () => {
    const [result] = runBulkSearch({ mode: 'user', terms: ['sam.jones'], index, districtMap })
    expect(result.found).toBe(true)
    expect(result.user).toBe('sam.jones@kiewit.com')
    expect(result.devices).toEqual(['LAPTOP-003'])
  })

  it('preserves duplicate input lines as separate rows', () => {
    const result = runBulkSearch({ mode: 'device', terms: ['LAPTOP-001', 'LAPTOP-001'], index })
    expect(result).toHaveLength(2)
  })
})
