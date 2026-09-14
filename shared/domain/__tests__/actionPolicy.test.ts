import { describe, expect, it } from 'vitest'
import { classifyChangeSet, classifyFieldChange } from '../actionPolicy'

describe('classifyFieldChange', () => {
  it('auto-applies work notes and comments', () => {
    expect(classifyFieldChange({ field: 'work_notes', toValue: 'checked logs' })).toBe('auto')
    expect(classifyFieldChange({ field: 'comments', toValue: 'update sent' })).toBe('auto')
  })

  it('auto-applies non-terminal state changes', () => {
    expect(classifyFieldChange({ field: 'state', fromValue: 'New', toValue: 'In Progress' })).toBe('auto')
  })

  it('requires confirmation to move into a terminal state', () => {
    expect(classifyFieldChange({ field: 'state', fromValue: 'In Progress', toValue: 'Resolved' })).toBe(
      'confirm'
    )
    expect(classifyFieldChange({ field: 'state', fromValue: 'In Progress', toValue: 'Closed' })).toBe(
      'confirm'
    )
    expect(classifyFieldChange({ field: 'state', fromValue: 'New', toValue: 'Cancelled' })).toBe('confirm')
  })

  it('always requires confirmation for reassignment', () => {
    expect(classifyFieldChange({ field: 'assignment_group', toValue: 'Network Ops' })).toBe('confirm')
    expect(classifyFieldChange({ field: 'assigned_to', toValue: 'jane.doe' })).toBe('confirm')
  })

  it('always requires confirmation for priority/urgency/impact', () => {
    expect(classifyFieldChange({ field: 'priority', toValue: '1 - Critical' })).toBe('confirm')
    expect(classifyFieldChange({ field: 'urgency', toValue: '1' })).toBe('confirm')
    expect(classifyFieldChange({ field: 'impact', toValue: '1' })).toBe('confirm')
  })

  it('auto-applies standard descriptive field updates', () => {
    expect(classifyFieldChange({ field: 'short_description', toValue: 'Updated title' })).toBe('auto')
    expect(classifyFieldChange({ field: 'category', toValue: 'hardware' })).toBe('auto')
  })

  it('fails safe (confirm) for unrecognized fields', () => {
    expect(classifyFieldChange({ field: 'some_custom_unusual_field', toValue: 'x' })).toBe('confirm')
  })
})

describe('classifyChangeSet', () => {
  it('is auto only when every change in the batch is auto', () => {
    expect(
      classifyChangeSet([
        { field: 'work_notes', toValue: 'note' },
        { field: 'state', fromValue: 'New', toValue: 'In Progress' }
      ])
    ).toBe('auto')
  })

  it('escalates the whole batch to confirm if any one change is high-impact', () => {
    expect(
      classifyChangeSet([
        { field: 'work_notes', toValue: 'note' },
        { field: 'priority', toValue: '1 - Critical' }
      ])
    ).toBe('confirm')
  })

  it('treats an empty change set as auto (no-op)', () => {
    expect(classifyChangeSet([])).toBe('auto')
  })
})
