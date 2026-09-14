import { describe, expect, it } from 'vitest'
import { buildDeviceIndex } from '../lookupIndex'
import { buildLegalHoldSet } from '../legalHold'
import { buildDistrictMap } from '../district'
import { runSearch } from '../search'

const rows = [
  { Device: 'LAPTOP-001', User: 'jane.doe@kiewit.com' },
  { Device: 'LAPTOP-002', User: 'jane.doe@kiewit.com' },
  { Device: 'LAPTOP-003', User: 'john.smith@kiewit.com' }
]
const index = buildDeviceIndex(rows, 'Device', 'User')
const legalHoldSet = buildLegalHoldSet([{ First: 'Jane', Last: 'Doe' }], 'First', 'Last')
const districtMap = buildDistrictMap(
  [{ First: 'Jane', Last: 'Doe', Work: 'District 4', Home: 'District 2' }],
  'First',
  'Last',
  'Work',
  'Home'
)

describe('runSearch - device mode', () => {
  it('returns an exact match with enrichment', () => {
    const result = runSearch({ mode: 'device', term: 'LAPTOP-001', index, legalHoldSet, districtMap })
    expect(result).toEqual({
      kind: 'exact',
      mode: 'device',
      device: 'LAPTOP-001',
      user: 'jane.doe@kiewit.com',
      enrichment: { legalHold: true, district: { found: true, work: 'District 4', home: 'District 2' } }
    })
  })

  it('falls back to partial matches', () => {
    const result = runSearch({ mode: 'device', term: 'LAPTOP-00', index })
    expect(result.kind).toBe('partial')
    if (result.kind === 'partial') expect(result.rows).toHaveLength(3)
  })

  it('reports no match', () => {
    const result = runSearch({ mode: 'device', term: 'NOPE', index })
    expect(result).toEqual({ kind: 'none', mode: 'device', term: 'NOPE' })
  })
})

describe('runSearch - user mode', () => {
  it('appends the default domain to a bare username for exact match', () => {
    const result = runSearch({ mode: 'user', term: 'jane.doe', index, legalHoldSet, districtMap })
    expect(result).toEqual({
      kind: 'exact',
      mode: 'user',
      user: 'jane.doe@kiewit.com',
      devices: ['LAPTOP-001', 'LAPTOP-002'],
      enrichment: { legalHold: true, district: { found: true, work: 'District 4', home: 'District 2' } }
    })
  })

  it('does not flag legal hold or district when those lists are not loaded', () => {
    const result = runSearch({ mode: 'user', term: 'john.smith', index })
    expect(result.kind).toBe('exact')
    if (result.kind === 'exact') {
      expect(result.enrichment).toEqual({ legalHold: undefined, district: undefined })
    }
  })

  it('matches partially on the raw typed term, without appending the domain', () => {
    const result = runSearch({ mode: 'user', term: 'jane', index })
    expect(result.kind).toBe('partial')
    if (result.kind === 'partial') expect(result.rows[0].label).toBe('jane.doe@kiewit.com')
  })

  it('reports no match for an empty search', () => {
    expect(runSearch({ mode: 'user', term: '   ', index })).toEqual({ kind: 'none', mode: 'user', term: '' })
  })
})
