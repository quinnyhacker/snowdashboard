import { describe, expect, it } from 'vitest'
import { evaluateSensitivity, isMarkedSensitive } from '../sensitivity'

describe('isMarkedSensitive', () => {
  it('detects CUI marker', () => {
    expect(isMarkedSensitive('This record contains CUI data')).toBe(true)
  })

  it('detects ITAR/export-controlled language', () => {
    expect(isMarkedSensitive('Export-controlled drawing attached, ITAR applies')).toBe(true)
  })

  it('is case-insensitive for "restricted"', () => {
    expect(isMarkedSensitive('marked RESTRICTED per policy')).toBe(true)
  })

  it('does not flag ordinary text', () => {
    expect(isMarkedSensitive('Printer on 3rd floor is out of toner')).toBe(false)
  })

  it('handles undefined/null/empty input', () => {
    expect(isMarkedSensitive(undefined)).toBe(false)
    expect(isMarkedSensitive(null)).toBe(false)
    expect(isMarkedSensitive('')).toBe(false)
  })
})

describe('evaluateSensitivity', () => {
  it('flags on explicit sensitivity label', () => {
    expect(evaluateSensitivity({ sensitivityLabel: 'Restricted or Highly Regulated' })).toBe(true)
    expect(evaluateSensitivity({ sensitivityLabel: 'CUI' })).toBe(true)
  })

  it('does not flag ordinary labels', () => {
    expect(evaluateSensitivity({ sensitivityLabel: 'Internal' })).toBe(false)
    expect(evaluateSensitivity({ sensitivityLabel: 'Public' })).toBe(false)
  })

  it('flags based on comment body content', () => {
    expect(
      evaluateSensitivity({
        shortDescription: 'VPN issue',
        comments: [{ body: 'Attached doc is FOUO, handle accordingly' }]
      })
    ).toBe(true)
  })

  it('does not flag a clean ticket', () => {
    expect(
      evaluateSensitivity({
        shortDescription: 'Laptop replacement request',
        description: 'User needs a new laptop, current one has a cracked screen.',
        comments: [{ body: 'Approved by manager, ordering now.' }]
      })
    ).toBe(false)
  })
})
