import { describe, expect, it } from 'vitest'
import { getNameKey, getNameKeyFromUser, getNameParts, normalizeNamePart } from '../nameMatch'

describe('getNameParts', () => {
  it('parses first.last@domain', () => {
    expect(getNameParts('jane.doe@kiewit.com')).toEqual({ first: 'jane', last: 'doe' })
  })

  it('parses first_last with underscore separator', () => {
    expect(getNameParts('jane_doe')).toEqual({ first: 'jane', last: 'doe' })
  })

  it('parses "first last" with a space', () => {
    expect(getNameParts('jane doe')).toEqual({ first: 'jane', last: 'doe' })
  })

  it('strips trailing disambiguation digits from the last name', () => {
    expect(getNameParts('jane.doe2@kiewit.com')).toEqual({ first: 'jane', last: 'doe' })
  })

  it('returns undefined for a single-token name', () => {
    expect(getNameParts('jane')).toBeUndefined()
  })

  it('returns undefined for empty/undefined/null input', () => {
    expect(getNameParts('')).toBeUndefined()
    expect(getNameParts(undefined)).toBeUndefined()
    expect(getNameParts(null)).toBeUndefined()
  })

  it('uses the first and last pieces when there are more than two', () => {
    expect(getNameParts('jane.q.doe@kiewit.com')).toEqual({ first: 'jane', last: 'doe' })
  })
})

describe('normalizeNamePart', () => {
  it('lowercases and strips non-letters', () => {
    expect(normalizeNamePart("O'Brien")).toBe('obrien')
    expect(normalizeNamePart('Smith-Jones')).toBe('smithjones')
    expect(normalizeNamePart('Doe3')).toBe('doe')
  })

  it('handles empty/undefined input', () => {
    expect(normalizeNamePart('')).toBe('')
    expect(normalizeNamePart(undefined)).toBe('')
  })
})

describe('getNameKey / getNameKeyFromUser', () => {
  it('produces the same key regardless of case or punctuation', () => {
    expect(getNameKey('Jane', 'Doe')).toBe(getNameKey('jane', 'doe'))
    expect(getNameKey("O'Brien", 'Smith')).toBe(getNameKey('obrien', 'smith'))
  })

  it('derives the same key from an email as from raw first/last', () => {
    expect(getNameKeyFromUser('jane.doe@kiewit.com')).toBe(getNameKey('jane', 'doe'))
  })

  it('returns undefined when the user string cannot be parsed', () => {
    expect(getNameKeyFromUser('jane')).toBeUndefined()
  })
})
