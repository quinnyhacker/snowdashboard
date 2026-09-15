import { describe, expect, it } from 'vitest'
import { extractCompletedLineOnEnter } from '../liveScan'

describe('extractCompletedLineOnEnter', () => {
  it('extracts the only line when the cursor is at the end', () => {
    expect(extractCompletedLineOnEnter('A-282QFH4', 9, 9)).toEqual({ line: 'A-282QFH4', remaining: '' })
  })

  it('extracts just the last line, keeping earlier lines in remaining', () => {
    const value = 'A-001\nA-002'
    expect(extractCompletedLineOnEnter(value, value.length, value.length)).toEqual({
      line: 'A-002',
      remaining: 'A-001\n'
    })
  })

  it('trims whitespace off the extracted line', () => {
    const value = 'A-001\n  A-002  '
    expect(extractCompletedLineOnEnter(value, value.length, value.length)).toEqual({
      line: 'A-002',
      remaining: 'A-001\n'
    })
  })

  it('returns undefined when the cursor is not at the end (mid-text edit)', () => {
    const value = 'A-001\nA-002'
    expect(extractCompletedLineOnEnter(value, 3, 3)).toBeUndefined()
  })

  it('returns undefined when there is a text selection rather than a caret', () => {
    const value = 'A-001\nA-002'
    expect(extractCompletedLineOnEnter(value, value.length - 2, value.length)).toBeUndefined()
  })

  it('returns undefined when the last line is blank (e.g. pressing Enter twice)', () => {
    const value = 'A-001\n'
    expect(extractCompletedLineOnEnter(value, value.length, value.length)).toBeUndefined()
  })

  it('returns undefined for a completely empty box', () => {
    expect(extractCompletedLineOnEnter('', 0, 0)).toBeUndefined()
  })
})
