import { describe, expect, it } from 'vitest'
import { buildDistrictMap, getDistrict } from '../district'

describe('buildDistrictMap / getDistrict', () => {
  it('looks up work/home district by derived name key', () => {
    const rows = [{ First: 'Jane', Last: 'Doe', Work: 'District 4', Home: 'District 2' }]
    const map = buildDistrictMap(rows, 'First', 'Last', 'Work', 'Home')
    expect(getDistrict(map, 'jane.doe@kiewit.com')).toEqual({ found: true, work: 'District 4', home: 'District 2' })
  })

  it('fills in a blank field from a later duplicate row without overwriting a known value', () => {
    const rows = [
      { First: 'Jane', Last: 'Doe', Work: 'District 4', Home: '' },
      { First: 'Jane', Last: 'Doe', Work: 'District 9', Home: 'District 2' }
    ]
    const map = buildDistrictMap(rows, 'First', 'Last', 'Work', 'Home')
    expect(getDistrict(map, 'jane.doe@kiewit.com')).toEqual({ found: true, work: 'District 4', home: 'District 2' })
  })

  it('reports not found for someone absent from the list', () => {
    const map = buildDistrictMap([{ First: 'Jane', Last: 'Doe', Work: 'D4', Home: 'D2' }], 'First', 'Last', 'Work', 'Home')
    expect(getDistrict(map, 'sam.jones@kiewit.com')).toEqual({ found: false })
  })

  it('reports not found when there is no map or no user', () => {
    expect(getDistrict(undefined, 'jane.doe@kiewit.com')).toEqual({ found: false })
    expect(getDistrict(new Map(), undefined)).toEqual({ found: false })
  })
})
