import { describe, expect, it } from 'vitest'
import type { BulkSearchRow } from '../bulkSearch'
import { buildSeedStockTicketText, groupBulkRowsByDistrict, UNKNOWN_DISTRICT_LABEL } from '../seedStock'

describe('groupBulkRowsByDistrict', () => {
  it('groups found rows by work district in device mode', () => {
    const rows: BulkSearchRow[] = [
      { term: 'A-001', found: true, device: 'A-001', user: 'jane', enrichment: { legalHold: false, district: { found: true, work: 'KPE' } } },
      { term: 'A-002', found: true, device: 'A-002', user: 'john', enrichment: { legalHold: false, district: { found: true, work: 'KPE' } } },
      { term: 'A-003', found: true, device: 'A-003', user: 'sam', enrichment: { legalHold: false, district: { found: true, work: 'TIC' } } }
    ]
    const groups = groupBulkRowsByDistrict(rows, 'device')
    expect(groups).toEqual([
      { district: 'KPE', entries: [{ name: 'A-001', legalHold: false }, { name: 'A-002', legalHold: false }] },
      { district: 'TIC', entries: [{ name: 'A-003', legalHold: false }] }
    ])
  })

  it('buckets rows with no district on record instead of dropping them', () => {
    const rows: BulkSearchRow[] = [
      { term: 'A-001', found: true, device: 'A-001', enrichment: { district: { found: false } } },
      { term: 'A-002', found: true, device: 'A-002', enrichment: {} }
    ]
    const groups = groupBulkRowsByDistrict(rows, 'device')
    expect(groups).toEqual([
      { district: UNKNOWN_DISTRICT_LABEL, entries: [{ name: 'A-001', legalHold: false }, { name: 'A-002', legalHold: false }] }
    ])
  })

  it('skips not-found rows', () => {
    const rows: BulkSearchRow[] = [{ term: 'A-999', found: false, enrichment: {} }]
    expect(groupBulkRowsByDistrict(rows, 'device')).toEqual([])
  })

  it('marks legal hold devices instead of excluding them', () => {
    const rows: BulkSearchRow[] = [
      { term: 'A-001', found: true, device: 'A-001', enrichment: { legalHold: true, district: { found: true, work: 'KPE' } } }
    ]
    const groups = groupBulkRowsByDistrict(rows, 'device')
    expect(groups).toEqual([{ district: 'KPE', entries: [{ name: 'A-001', legalHold: true }] }])
  })

  it('expands every device for a user in "by user" mode', () => {
    const rows: BulkSearchRow[] = [
      {
        term: 'jane',
        found: true,
        user: 'jane@kiewit.com',
        devices: ['A-001', 'A-002'],
        enrichment: { legalHold: false, district: { found: true, work: 'KPE' } }
      }
    ]
    const groups = groupBulkRowsByDistrict(rows, 'user')
    expect(groups).toEqual([
      { district: 'KPE', entries: [{ name: 'A-001', legalHold: false }, { name: 'A-002', legalHold: false }] }
    ])
  })
})

describe('buildSeedStockTicketText', () => {
  it('formats a group as a pasteable ticket line', () => {
    const text = buildSeedStockTicketText({
      district: 'KPE',
      entries: [
        { name: 'A-23423423', legalHold: false },
        { name: 'A-345345', legalHold: false },
        { name: 'A-4534534', legalHold: false }
      ]
    })
    expect(text).toBe('KPE Seed Stock: A-23423423, A-345345, A-4534534')
  })

  it('marks legal hold devices inline rather than leaving them silently included', () => {
    const text = buildSeedStockTicketText({
      district: 'KPE',
      entries: [
        { name: 'A-001', legalHold: false },
        { name: 'A-002', legalHold: true }
      ]
    })
    expect(text).toBe('KPE Seed Stock: A-001, A-002 (LEGAL HOLD)')
  })
})
