import { describe, expect, it } from 'vitest'
import { buildLegalHoldSet, isOnLegalHold } from '../legalHold'

const rows = [
  { First: 'Jane', Last: 'Doe' },
  { First: 'John', Last: "O'Brien" }
]

describe('legal hold', () => {
  const set = buildLegalHoldSet(rows, 'First', 'Last')

  it('flags a matching user email regardless of punctuation/case differences', () => {
    expect(isOnLegalHold(set, 'jane.doe@kiewit.com')).toBe(true)
    expect(isOnLegalHold(set, 'john.obrien@kiewit.com')).toBe(true)
  })

  it('does not flag a user not on the list', () => {
    expect(isOnLegalHold(set, 'sam.jones@kiewit.com')).toBe(false)
  })

  it('returns false when there is no list loaded, or no user given', () => {
    expect(isOnLegalHold(undefined, 'jane.doe@kiewit.com')).toBe(false)
    expect(isOnLegalHold(set, undefined)).toBe(false)
  })

  it('returns false for a user string that cannot be split into first/last', () => {
    expect(isOnLegalHold(set, 'jane')).toBe(false)
  })
})
